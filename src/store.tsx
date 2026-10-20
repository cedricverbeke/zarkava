import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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
import { supabase } from './supabaseClient';
import { usePersistentCollection, ferrageRowToOrder, ferrageOrderToRow } from './persistence';
import type { AuthSession } from '@supabase/supabase-js';

interface AppState {
  session: Session | null;
  setSession: (s: Session | null) => void;
  authMode: AuthMode;
  authLoading: boolean;
  authUser: User | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateLogo: (logoUrl: string) => Promise<void>;
  biometricEnabled: boolean;
  setBiometricEnabled: (b: boolean) => void;

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
  const meta = s.user.user_metadata as { name?: string; logo_url?: string } | null;
  return {
    id: s.user.id,
    email: s.user.email ?? '',
    name: meta?.name ?? s.user.email ?? 'Entraîneur',
    role: 'trainer',
    logoUrl: meta?.logo_url,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [authMode, setAuthMode] = useState<AuthMode>('demo');
  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const [ferrageOrders, setFerrageOrders] = useState<FerrageOrder[]>(mockFerrageOrders);

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

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    const u = data.session ? authSessionToUser(data.session) : null;
    setAuthUser(u);
    setAuthMode('live');
    if (u) setSession({ kind: 'trainer', user: u });
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { error: error.message };
    const u = data.session ? authSessionToUser(data.session) : null;
    // Create a 30-day trial subscription row for this new trainer.
    if (u) {
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 30);
      await supabase.from('subscriptions').upsert({
        user_id: u.id,
        status: 'trialing',
        trial_started_at: new Date().toISOString(),
        trial_ends_at: trialEnds.toISOString(),
      }, { onConflict: 'user_id' });
    }
    setAuthUser(u);
    setAuthMode('live');
    if (u) setSession({ kind: 'trainer', user: u });
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setAuthMode('demo');
    setSession(null);
  }, []);

  const updateLogo = useCallback(async (logoUrl: string) => {
    setAuthUser((u) => u ? { ...u, logoUrl } : u);
    setSession((s) => s?.kind === 'trainer' ? { ...s, user: { ...s.user, logoUrl } } : s);
    const { error } = await supabase.auth.updateUser({ data: { logo_url: logoUrl } });
    if (error) console.warn('updateLogo:', error.message);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const u = authSessionToUser(data.session);
        setAuthUser(u);
        setAuthMode('live');
        setSession({ kind: 'trainer', user: u });
      }
      setAuthLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      (async () => {
        if (s) {
          const u = authSessionToUser(s);
          setAuthUser(u);
          setAuthMode('live');
          setSession({ kind: 'trainer', user: u });
        } else {
          setAuthUser(null);
          setAuthMode('demo');
        }
      })();
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const refreshFerrageOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('ferrage_orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return;
    setFerrageOrders((data as Record<string, unknown>[]).map(ferrageRowToOrder));
  }, []);

  const fetchFerrageOrderByToken = useCallback(async (token: string): Promise<FerrageOrder | null> => {
    const { data, error } = await supabase
      .from('ferrage_orders')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    if (error || !data) return null;
    return ferrageRowToOrder(data as Record<string, unknown>);
  }, []);

  useEffect(() => {
    refreshFerrageOrders();
  }, [refreshFerrageOrders]);

  useEffect(() => {
    const tryRestore = async () => {
      const hash = window.location.hash || '';
      const match = hash.match(/ferrage\/session\?token=([^&]+)/);
      if (match) {
        const token = decodeURIComponent(match[1]);
        const order = await fetchFerrageOrderByToken(token);
        if (order) {
          setSession({ kind: 'farrier', order });
          return true;
        }
      }
      return false;
    };
    tryRestore();
    const onHashChange = () => { tryRestore(); };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getHorse = useCallback((id: string) => horses.find((h) => h.id === id), [horses]);
  const getEmployee = useCallback((id: string) => employees.find((e) => e.id === id), [employees]);
  const getTraining = useCallback((id: string) => trainings.find((t) => t.id === id), [trainings]);

  const value = useMemo<AppState>(
    () => ({
      session, setSession,
      authMode, authLoading, authUser,
      signIn, signUp, signOut, updateLogo,
      biometricEnabled, setBiometricEnabled,
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
    [session, authMode, authLoading, authUser, signIn, signUp, signOut, updateLogo, biometricEnabled, horses, employees, trainings, planning, soins, routines, tarifGrids, douches, elevageHorses, saillies, weekSchedules, ferrageOrders, refreshFerrageOrders, fetchFerrageOrderByToken, getHorse, getEmployee, getTraining],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { supabase, ferrageOrderToRow, ferrageRowToOrder, trainerUser };
