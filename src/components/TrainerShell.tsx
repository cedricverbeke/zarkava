import { LogOut, Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useApp } from '@/store';
import { roleLabel } from '@/lib';

export type TrainerPage =
  | 'dashboard'
  | 'horses'
  | 'planning'
  | 'trainings'
  | 'soins'
  | 'douches'
  | 'ferrage'
  | 'elevage'
  | 'team'
  | 'recap'
  | 'facturation'
  | 'profile';

interface NavItem {
  id: TrainerPage;
  label: string;
  icon: ReactNode;
}

export function TrainerShell({
  page,
  setPage,
  children,
}: {
  page: TrainerPage;
  setPage: (p: TrainerPage) => void;
  children: ReactNode;
}) {
  const { session, setSession, employees, authMode, signOut, authUser } = useApp();
  const [open, setOpen] = useState(false);

  const nav: NavItem[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <DashIcon /> },
    { id: 'horses', label: 'Effectif (Chevaux)', icon: <HorseIcon /> },
    { id: 'planning', label: 'Planning', icon: <CalendarIcon /> },
    { id: 'trainings', label: 'Entraînements', icon: <BoltIcon /> },
    { id: 'soins', label: 'Soins & Routines', icon: <HeartIcon /> },
    { id: 'douches', label: 'Douches', icon: <DropletIcon /> },
    { id: 'ferrage', label: 'Bon de ferrage', icon: <HorseshoeIcon /> },
    { id: 'elevage', label: 'Élevage', icon: <EggIcon /> },
    { id: 'team', label: 'Équipe & Tarifs', icon: <UsersIcon /> },
    { id: 'recap', label: 'Récapitulatif', icon: <ClipboardIcon /> },
    { id: 'facturation', label: 'Facturation', icon: <ReceiptIcon /> },
    { id: 'profile', label: 'Profil', icon: <UserIcon /> },
  ];

  const activeLabel = nav.find((n) => n.id === page)?.label ?? '';
  const user = session?.kind === 'trainer' ? session.user : null;
  const cavaliers = employees.filter((e) => e.role === 'cavalier' || e.role === 'lad').length;
  const palefreniers = employees.filter((e) => e.role === 'palefrenier').length;

  return (
    <div className="min-h-screen bg-stable-50 flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-stable-900 text-stable-200 fixed inset-y-0 left-0 z-30">
        <SidebarContent nav={nav} page={page} setPage={setPage} user={user} cavaliers={cavaliers} palefreniers={palefreniers} onLogout={() => authMode === 'live' ? signOut() : setSession(null)} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-stable-950/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-stable-900 text-stable-200 flex flex-col animate-fade-in">
            <button className="absolute right-3 top-3 p-2 text-stable-400 hover:text-white" onClick={() => setOpen(false)}><X size={20} /></button>
            <SidebarContent nav={nav} page={page} setPage={(p) => { setPage(p); setOpen(false); }} user={user} cavaliers={cavaliers} palefreniers={palefreniers} onLogout={() => authMode === 'live' ? signOut() : setSession(null)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-stable-100">
          <div className="flex items-center gap-3 px-4 lg:px-8 h-16">
            <button className="lg:hidden p-2 -ml-2 rounded-lg text-stable-700 hover:bg-stable-100" onClick={() => setOpen(true)}><Menu size={22} /></button>
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-stable-900 text-lg truncate">{activeLabel}</h1>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-sm">
              <div className="text-right">
                <div className="font-semibold text-stable-900 leading-tight">{user?.name}</div>
                <div className="text-xs text-stable-500">{roleLabel('trainer')} · Zarkava</div>
              </div>
              {authUser?.logoUrl ? (
                <img src={authUser.logoUrl} alt="Logo" className="w-9 h-9 rounded-full object-contain bg-stable-50 border border-stable-200" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-stable-700 text-white flex items-center justify-center font-semibold text-sm">{user?.name?.[0] ?? 'T'}</div>
              )}
            </div>
            <button className="lg:hidden p-2 rounded-lg text-stable-600 hover:bg-stable-100" onClick={() => authMode === 'live' ? signOut() : setSession(null)} title="Déconnexion"><LogOut size={18} /></button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  nav, page, setPage, user, cavaliers, palefreniers, onLogout,
}: {
  nav: NavItem[];
  page: TrainerPage;
  setPage: (p: TrainerPage) => void;
  user: { name: string; email: string } | null;
  cavaliers: number;
  palefreniers: number;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="p-5 flex items-center gap-3 border-b border-stable-800">
        <div className="w-10 h-10 rounded-xl bg-gold-400 text-stable-950 flex items-center justify-center font-display font-bold text-lg">Z</div>
        <div>
          <div className="font-display font-bold text-white">Zarkava</div>
          <div className="text-[11px] text-stable-400">Écurie de course</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {nav.map((n) => (
          <button
            key={n.id}
            onClick={() => setPage(n.id)}
            className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${page === n.id ? 'bg-gold-400 text-stable-950' : 'text-stable-300 hover:bg-stable-800 hover:text-white'}`}
          >
            <span className="shrink-0">{n.icon}</span>
            <span className="truncate">{n.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-stable-800 space-y-3">
        <div className="text-xs text-stable-400 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-stable-800 px-2.5 py-2"><div className="text-stable-300">Cavaliers/Lads</div><div className="text-white font-bold text-base">{cavaliers}</div></div>
          <div className="rounded-lg bg-stable-800 px-2.5 py-2"><div className="text-stable-300">Palefreniers</div><div className="text-white font-bold text-base">{palefreniers}</div></div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-stable-300 hover:bg-stable-800 hover:text-white transition">
          <LogOut size={16} /> Déconnexion
        </button>
      </div>
    </>
  );
}

/* Inline icons (lucide wrappers kept minimal) */
import { LayoutDashboard, HeartPulse, CalendarDays, Zap, Anvil, Users, Receipt, User as UserIconC, Droplets, Egg, ClipboardList } from 'lucide-react';
const DashIcon = () => <LayoutDashboard size={18} />;
const HorseIcon = () => <HeartPulse size={18} />;
const CalendarIcon = () => <CalendarDays size={18} />;
const BoltIcon = () => <Zap size={18} />;
const HeartIcon = () => <HeartPulse size={18} />;
const DropletIcon = () => <Droplets size={18} />;
const HorseshoeIcon = () => <Anvil size={18} />;
const EggIcon = () => <Egg size={18} />;
const UsersIcon = () => <Users size={18} />;
const ReceiptIcon = () => <Receipt size={18} />;
const ClipboardIcon = () => <ClipboardList size={18} />;
const UserIcon = () => <UserIconC size={18} />;
