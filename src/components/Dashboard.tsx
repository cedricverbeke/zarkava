import { AlertTriangle, CalendarDays, Anvil, HeartPulse, Users, Zap, TrendingUp, ChevronRight, Activity } from 'lucide-react';
import { useApp } from '@/store';
import { alertLevel, daysUntilNext, fmtDateLong, FERRURE_CYCLE_DAYS, VERMIFUGE_CYCLE_DAYS, todayISO, roleLabel } from '@/lib';
import type { TrainerPage } from './TrainerShell';
import { Badge, ProgressGauge } from './ui';

export function Dashboard({ setPage }: { setPage: (p: TrainerPage) => void }) {
  const { horses, planning, soins, employees, ferrageOrders } = useApp();
  const today = todayISO();

  const activeHorses = horses.filter((h) => h.status === 'actif');
  const reposHorses = horses.filter((h) => h.status === 'repos');

  const ferrureAlerts = activeHorses
    .map((h) => ({ h, level: alertLevel(h.lastFerrure, FERRURE_CYCLE_DAYS), remaining: daysUntilNext(h.lastFerrure, FERRURE_CYCLE_DAYS) }))
    .filter((x) => x.level !== 'green')
    .sort((a, b) => a.remaining - b.remaining);

  const vermifugeAlerts = activeHorses
    .map((h) => ({ h, level: alertLevel(h.lastVermifuge, VERMIFUGE_CYCLE_DAYS), remaining: daysUntilNext(h.lastVermifuge, VERMIFUGE_CYCLE_DAYS) }))
    .filter((x) => x.level !== 'green')
    .sort((a, b) => a.remaining - b.remaining);

  const todayPlanning = planning.filter((p) => p.date === today);
  const todayLots = Array.from(new Set(todayPlanning.map((p) => p.lot))).sort();
  const pendingSoins = soins.filter((s) => s.date <= today && !s.done);
  const pendingFerrageOrders = ferrageOrders.filter((o) => o.status === 'pending');

  const counts = {
    horses: activeHorses.length,
    riders: employees.filter((e) => e.role === 'cavalier' || e.role === 'lad').length,
    palefreniers: employees.filter((e) => e.role === 'palefrenier').length,
    todayLots: todayLots.length,
    pendingSoins: pendingSoins.length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-stable-900 text-white p-6 lg:p-8 shadow-card">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 85% 20%, #d6a23c 0, transparent 45%)' }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-stable-300 text-sm capitalize">{fmtDateLong(today)}</p>
            <h2 className="font-display text-2xl lg:text-3xl font-bold mt-1">Bonjour, Angela</h2>
            <p className="text-stable-300 mt-2 text-sm max-w-lg">Voici l'état de votre écurie aujourd'hui. {ferrureAlerts.length > 0 && <span className="text-gold-300">{ferrureAlerts.length} alerte(s) de ferrage à traiter.</span>}</p>
          </div>
          <div className="flex gap-3">
            <button className="btn-gold" onClick={() => setPage('planning')}><CalendarDays size={16} /> Planning</button>
            <button className="btn-outline bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setPage('ferrage')}><Anvil size={16} /> Ferrage</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<HeartPulse size={20} />} label="Chevaux actifs" value={counts.horses} sub={`${reposHorses.length} au repos`} color="emerald" onClick={() => setPage('horses')} />
        <StatCard icon={<Zap size={20} />} label="Lots du jour" value={counts.todayLots} sub={todayPlanning.length + ' chevaux programmés'} color="gold" onClick={() => setPage('planning')} />
        <StatCard icon={<Anvil size={20} />} label="Alertes ferrage" value={ferrureAlerts.length} sub={ferrureAlerts.filter((a) => a.level === 'red').length + ' critiques'} color="red" onClick={() => setPage('ferrage')} />
        <StatCard icon={<Users size={20} />} label="Équipe" value={counts.riders + counts.palefreniers} sub={`${counts.riders} cavaliers · ${counts.palefreniers} palefreniers`} color="blue" onClick={() => setPage('team')} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Ferrage alerts */}
        <SectionCard title="Alertes ferrage" icon={<Anvil size={18} />} onAction={() => setPage('ferrage')}>
          {ferrureAlerts.length === 0 ? (
            <Empty text="Aucune alerte. Tout l'effectif est à jour." />
          ) : (
            <ul className="space-y-3">
              {ferrureAlerts.slice(0, 5).map(({ h, level, remaining }) => (
                <li key={h.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stable-100 flex items-center justify-center text-stable-700 font-display font-bold text-sm shrink-0">{h.name.slice(0, 2)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-stable-900 text-sm truncate">{h.name}</span>
                      <Badge level={level}>{remaining > 0 ? `J-${remaining}` : 'Dépassé'}</Badge>
                    </div>
                    <ProgressGauge percent={Math.min(100, (FERRURE_CYCLE_DAYS - Math.max(0, remaining)) / FERRURE_CYCLE_DAYS * 100)} level={level} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Today planning */}
        <SectionCard title="Lots du jour" icon={<CalendarDays size={18} />} onAction={() => setPage('planning')}>
          {todayPlanning.length === 0 ? (
            <Empty text="Aucun lot programmé aujourd'hui." />
          ) : (
            <ul className="space-y-2.5">
              {todayLots.map((lot) => {
                const entries = todayPlanning.filter((p) => p.lot === lot);
                const doneCount = entries.filter((e) => e.done).length;
                return (
                  <li key={lot} className="flex items-center gap-3 rounded-xl bg-stable-50 px-3 py-2.5">
                    <div className="w-9 h-9 rounded-lg bg-stable-700 text-white flex items-center justify-center font-bold text-sm shrink-0">{lot}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-stable-900">Lot {lot} — {entries.length} cheval(aux)</div>
                      <div className="text-xs text-stable-500 truncate">{entries.map((e) => e.horseId).map((id) => horses.find((h) => h.id === id)?.name).join(', ')}</div>
                    </div>
                    <Badge level={doneCount === entries.length ? 'green' : 'neutral'}>{doneCount}/{entries.length} done</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        {/* Soins + vermifuge */}
        <SectionCard title="Soins & Vermifuge" icon={<HeartPulse size={18} />} onAction={() => setPage('soins')}>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-stable-50 px-3 py-2.5">
              <span className="text-sm text-stable-700">Soins en attente</span>
              <Badge level={pendingSoins.length > 0 ? 'orange' : 'green'}>{pendingSoins.length}</Badge>
            </div>
            {vermifugeAlerts.slice(0, 3).map(({ h, level, remaining }) => (
              <div key={h.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-stable-100 flex items-center justify-center text-stable-700 font-display font-bold text-xs shrink-0">{h.name.slice(0, 2)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-stable-800 truncate">{h.name}</span>
                    <Badge level={level}>Vermifuge {remaining > 0 ? `J-${remaining}` : 'à faire'}</Badge>
                  </div>
                </div>
              </div>
            ))}
            {vermifugeAlerts.length === 0 && <Empty text="Vermifuge à jour." />}
          </div>
        </SectionCard>
      </div>

      {/* Pending ferrage orders */}
      {pendingFerrageOrders.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-stable-900 flex items-center gap-2"><Activity size={18} /> Bons de ferrage en cours</h3>
            <button className="text-sm text-stable-600 font-semibold hover:text-stable-900" onClick={() => setPage('ferrage')}>Voir tout <ChevronRight size={14} className="inline" /></button>
          </div>
          <ul className="space-y-2">
            {pendingFerrageOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between rounded-xl bg-stable-50 px-4 py-3">
                <div>
                  <div className="font-semibold text-stable-900 text-sm">{o.horses.length} cheval(aux) à ferrer</div>
                  <div className="text-xs text-stable-500">Token: {o.token.slice(0, 12)}… · créé {fmtDateLong(o.createdAt)}</div>
                </div>
                <Badge level="orange">En attente maréchal</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickAction icon={<TrendingUp size={18} />} label="Facturation du mois" onClick={() => setPage('facturation')} />
        <QuickAction icon={<Zap size={18} />} label="Gérer les entraînements" onClick={() => setPage('trainings')} />
        <QuickAction icon={<Users size={18} />} label="Inviter un membre" onClick={() => setPage('team')} />
        <QuickAction icon={<AlertTriangle size={18} />} label="Déclarer un soin" onClick={() => setPage('soins')} />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color, onClick }: { icon: React.ReactNode; label: string; value: number | string; sub: string; color: 'emerald' | 'gold' | 'red' | 'blue'; onClick: () => void }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    gold: 'bg-gold-100 text-gold-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
  };
  return (
    <button onClick={onClick} className="card p-5 text-left hover:shadow-soft transition group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>{icon}</div>
      <div className="text-3xl font-display font-bold text-stable-900">{value}</div>
      <div className="text-sm font-semibold text-stable-700 mt-0.5">{label}</div>
      <div className="text-xs text-stable-500 mt-1">{sub}</div>
    </button>
  );
}

function SectionCard({ title, icon, children, onAction }: { title: string; icon: React.ReactNode; children: React.ReactNode; onAction: () => void }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-stable-900 flex items-center gap-2">{icon}{title}</h3>
        <button onClick={onAction} className="text-stable-400 hover:text-stable-700"><ChevronRight size={18} /></button>
      </div>
      {children}
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card p-4 flex items-center gap-3 hover:shadow-soft transition text-left">
      <span className="w-9 h-9 rounded-lg bg-stable-100 text-stable-700 flex items-center justify-center shrink-0">{icon}</span>
      <span className="text-sm font-semibold text-stable-800">{label}</span>
      <ChevronRight size={16} className="ml-auto text-stable-400" />
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-stable-500 py-2">{text}</p>;
}

export { roleLabel };
