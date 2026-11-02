import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthSession } from '@supabase/supabase-js';
import type {
  AuthMode,
  Douche,
  Employee,
  ElevageHorse,
  FerrageOrder,
  Horse,
  PlanningEntry,
  Routine,
  Saillie,
  Session,
  Soin,
  TarifGrid,
  Training,
  User,
  WeekSchedule,
} from './types';
import {
  mockDouches,
  mockElevageHorses,
  mockEmployees,
  mockFerrageOrders,
  mockHorses,
  mockPlanning,
  mockRoutines,
  mockSaillies,
  mockSoins,
  mockTarifGrids,
  mockTrainings,
  mockWeekSchedules,
  trainerUser,
} from './data/mock';
import { supabase, supabaseConfigError, explainSupabaseError, reportSupabaseProblem } from './supabaseClient';
import { usePersistentCollection, ferrageRowToOrder, ferrageOrderToRow } from './persistence';

interface AppState {
  session: Session | null;
  setSession: (s: Session | null) => void;
  authMode: AuthMode;
  authLoading: boolean;
  authError: string | null;
  authUser: User | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateLogo: (logoUrl: string) => Promise<void>;

  horses: Horse[];
  setHorses: React.Dispatch<React.SetStateAction<Horse[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  trainings: Training[];
  setTrainings: React.Dispatch<React.SetStateAction<Training[]>>;
  planning: PlanningEntry[];
  setPlanning: React.Dispatch<React.SetStateAction<PlanningEntry[]>>;
  soins: Soin[];
  setSoins: React.Dispatch<React.SetStateAction<Soin[]>>;
  routines: Routine[];
  setRoutines: React.Dispatch<React.SetStateAction<Routine[]>>;
  tarifGrids: TarifGrid[];
  setTarifGrids: React.Dispatch<React.SetStateAction<TarifGrid[]>>;
  douches: Douche[];
  setDouches: React.Dispatch<React.SetStateAction<Douche[]>>;
  elevageHorses: ElevageHorse[];
  setElevageHorses: React.Dispatch<React.SetStateAction<ElevageHorse[]>>;
  saillies: Saillie[];
  setSaillies: React.Dispatch<React.SetStateAction<Saillie[]>>;
  weekSchedules: WeekSchedule[];
  setWeekSchedules: React.Dispatch<React.SetStateAction<WeekSchedule[]>>;
  ferrageOrders: FerrageOrder[];
  setFerrageOrders: React.Dispatch<React.SetStateAction<FerrageOrder[]>>;
  refreshFerrageOrders: () => Promise<void>;
  fetchFerrageOrderByToken: (token: string) => Promise<FerrageOrder | null>;

  getHorse: (id: string) => Horse | undefined;
  getEmployee: (id: string) => Employee | undefined;
  getTraining: (id: string) => Training | undefined;
}

const Ctx = createContext<AppState | null>(null);

function authSessionToUser(s: AuthSession): User {
  // Le logo n'est PAS dans les métadonnées du compte : elles sont recopiées dans le jeton envoyé à chaque
  // requête, et un logo (plusieurs dizaines de Ko) le rend trop gros (erreur 520). Il est dans la table profiles.
  const meta = s.user.user_metadata as { name?: string } | null;
  return {
    id: s.user.id,
    email: s.user.email ?? '',
    name: meta?.name ?? s.user.email ?? 'Entraîneur',
    role: 'trainer',
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null); // compte Supabase connecté (null en démo / terrain / maréchal)
  const [session, setSession] = useState<Session | null>(null);
  const [ferrageOrders, setFerrageOrders] = useState<FerrageOrder[]>(mockFerrageOrders);

  const authMode: AuthMode = authUser ? 'live' : 'demo';
  const authUserId = authUser?.id ?? null;

  const [horses, setHorses] = usePersistentCollection<Horse>('horses', authUser, mockHorses);
  const [employees, setEmployees] = usePersistentCollection<Employee>('employees', authUser, mockEmployees);
  const [trainings, setTrainings] = usePersistentCollection<Training>('trainings', authUser, mockTrainings);
  const [planning, setPlanning] = usePersistentCollection<PlanningEntry>('planning', authUser, mockPlanning);
  const [soins, setSoins] = usePersistentCollection<Soin>('soins', authUser, mockSoins);
  const [routines, setRoutines] = usePersistentCollection<Routine>('routines', authUser, mockRoutines);
  const [tarifGrids, setTarifGrids] = usePersistentCollection<TarifGrid>('tarifGrids', authUser, mockTarifGrids);
  const [douches, setDouches] = usePersistentCollection<Douche>('douches', authUser, mockDouches);
  const [elevageHorses, setElevageHorses] = usePersistentCollection<ElevageHorse>('elevageHorses', authUser, mockElevageHorses);
  const [saillies, setSaillies] = usePersistentCollection<Saillie>('saillies', authUser, mockSaillies);
  const [weekSchedules, setWeekSchedules] = usePersistentCollection<WeekSchedule>('weekSchedules', authUser, mockWeekSchedules);

  // --- Authentification -----------------------------------------------------------------
  // Un seul point d'entrée pour tous les événements d'authentification (démarrage, connexion,
  // renouvellement du jeton, déconnexion, session expirée).
  const applyAuthSession = useCallback((s: AuthSession | null) => {
    if (s) {
      const user = authSessionToUser(s);
      // Le renouvellement du jeton ne doit pas effacer le logo déjà chargé.
      setAuthUser((prev) => ({ ...user, logoUrl: prev?.id === user.id ? prev.logoUrl : undefined }));
      // On ne remplace pas une session maréchal / terrain ouverte par un lien ou un code.
      setSession((prev) => {
        if (prev && prev.kind !== 'trainer') return prev;
        const logoUrl = prev?.kind === 'trainer' && prev.user.id === user.id ? prev.user.logoUrl : undefined;
        return { kind: 'trainer', user: { ...user, logoUrl } };
      });
    } else {
      setAuthUser(null);
      // Session Supabase terminée : on revient à l'écran de connexion au lieu d'afficher
      // silencieusement les données de démonstration sous un compte censé être réel.
      setSession((prev) => (prev?.kind === 'trainer' && !prev.user.isDemo ? null : prev));
    }
  }, []);

  useEffect(() => {
    if (supabaseConfigError) {
      setAuthError(supabaseConfigError);
      setAuthLoading(false);
      return;
    }
    let active = true;

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError(explainSupabaseError(error));
        applyAuthSession(data.session);
      })
      .catch((error) => { if (active) setAuthError(explainSupabaseError(error)); })
      .finally(() => { if (active) setAuthLoading(false); });

    // Pas d'appel Supabase dans ce callback (risque de blocage) : on ne fait que mettre l'état à jour.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => applyAuthSession(s));

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [applyAuthSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (supabaseConfigError) return { error: supabaseConfigError };
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: explainSupabaseError(error) };
      setAuthError(null);
      applyAuthSession(data.session);
      return { error: null };
    } catch (error) {
      return { error: explainSupabaseError(error) };
    }
  }, [applyAuthSession]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    if (supabaseConfigError) return { error: supabaseConfigError };
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      if (error) return { error: explainSupabaseError(error) };
      // Adresse déjà inscrite : Supabase renvoie alors un utilisateur sans identité, sans erreur.
      if (data.user && data.user.identities?.length === 0) {
        return { error: 'Un compte existe déjà avec cette adresse e-mail.' };
      }
      // Confirmation d'e-mail activée côté Supabase : pas de session tant que le lien n'a pas été cliqué.
      if (!data.session) {
        return { error: "Compte créé. Cliquez sur le lien de confirmation reçu par e-mail, puis connectez-vous. (Cette confirmation se désactive dans les réglages d'authentification de Supabase.)" };
      }
      setAuthError(null);
      applyAuthSession(data.session);
      return { error: null };
    } catch (error) {
      return { error: explainSupabaseError(error) };
    }
  }, [applyAuthSession]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* hors ligne : on déconnecte quand même localement */
    }
    applyAuthSession(null);
  }, [applyAuthSession]);

  const applyLogo = useCallback((logoUrl: string) => {
    setAuthUser((u) => (u ? { ...u, logoUrl } : u));
    setSession((s) => (s?.kind === 'trainer' ? { ...s, user: { ...s.user, logoUrl } } : s));
  }, []);

  // Logo : lu et écrit dans la table profiles (une ligne par compte).
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('logo_url').eq('user_id', authUserId).maybeSingle();
        if (cancelled) return;
        if (error) { reportSupabaseProblem('profil', 'read', error); return; }
        if (data?.logo_url) applyLogo(data.logo_url);
      } catch (error) {
        if (!cancelled) reportSupabaseProblem('profil', 'read', error);
      }
    })();
    return () => { cancelled = true; };
  }, [authUserId, applyLogo]);

  const updateLogo = useCallback(async (logoUrl: string) => {
    applyLogo(logoUrl);
    if (!authUserId) return; // démo : le logo reste en mémoire
    const { error } = await supabase.from('profiles').upsert({ user_id: authUserId, logo_url: logoUrl }, { onConflict: 'user_id' });
    if (error) reportSupabaseProblem('profil', 'write', error);
  }, [applyLogo, authUserId]);

  // --- Bons de ferrage ---------------------------------------------------------------------
  // Compte réel : ses bons (et les anciens bons sans propriétaire). Démo : bons fictifs, rien n'est lu en base.
  const refreshFerrageOrders = useCallback(async () => {
    if (!authUserId) {
      setFerrageOrders(mockFerrageOrders);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('ferrage_orders')
        .select('*')
        .or(`user_id.eq.${authUserId},user_id.is.null`)
        .order('created_at', { ascending: false });
      if (error) { reportSupabaseProblem('ferrage', 'read', error); return; }
      setFerrageOrders((data ?? []).map((row) => ferrageRowToOrder(row as Record<string, unknown>)));
    } catch (error) {
      reportSupabaseProblem('ferrage', 'read', error);
    }
  }, [authUserId]);

  useEffect(() => {
    refreshFerrageOrders();
  }, [refreshFerrageOrders]);

  // Accès maréchal : le lien magique est la clé d'accès (pas de compte).
  const fetchFerrageOrderByToken = useCallback(async (token: string): Promise<FerrageOrder | null> => {
    if (supabaseConfigError) return null;
    const { data, error } = await supabase.from('ferrage_orders').select('*').eq('token', token).maybeSingle();
    if (error || !data) return null;
    return ferrageRowToOrder(data as Record<string, unknown>);
  }, []);

  useEffect(() => {
    const openFarrierLink = async () => {
      const match = window.location.hash.match(/ferrage\/session\?token=([^&]+)/);
      if (!match) return;
      const order = await fetchFerrageOrderByToken(decodeURIComponent(match[1]));
      if (order) setSession({ kind: 'farrier', order });
    };
    openFarrierLink();
    window.addEventListener('hashchange', openFarrierLink);
    return () => window.removeEventListener('hashchange', openFarrierLink);
  }, [fetchFerrageOrderByToken]);

  // --- Accès rapides ---------------------------------------------------------------------
  const getHorse = useCallback((id: string) => horses.find((h) => h.id === id), [horses]);
  const getEmployee = useCallback((id: string) => employees.find((e) => e.id === id), [employees]);
  const getTraining = useCallback((id: string) => trainings.find((t) => t.id === id), [trainings]);

  const value = useMemo<AppState>(
    () => ({
      session, setSession,
      authMode, authLoading, authError, authUser,
      signIn, signUp, signOut, updateLogo,
      horses, setHorses,
      employees, setEmployees,
      trainings, setTrainings,
      planning, setPlanning,
      soins, setSoins,
      routines, setRoutines,
      tarifGrids, setTarifGrids,
      douches, setDouches,
      elevageHorses, setElevageHorses,
      saillies, setSaillies,
      weekSchedules, setWeekSchedules,
      ferrageOrders, setFerrageOrders,
      refreshFerrageOrders, fetchFerrageOrderByToken,
      getHorse, getEmployee, getTraining,
    }),
    [session, authMode, authLoading, authError, authUser, signIn, signUp, signOut, updateLogo, horses, employees, trainings, planning, soins, routines, tarifGrids, douches, elevageHorses, saillies, weekSchedules, ferrageOrders, refreshFerrageOrders, fetchFerrageOrderByToken, getHorse, getEmployee, getTraining],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { supabase, ferrageOrderToRow, ferrageRowToOrder, trainerUser };
