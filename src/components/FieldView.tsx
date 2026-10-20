import { useMemo, useState } from 'react';
import { LogOut, Check, StickyNote, ClipboardList, Droplets, Sparkles, HeartPulse, AlertTriangle, Sun, Moon, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useApp } from '@/store';
import type { Soin, SoinType } from '@/types';
import { todayISO, tomorrowISO, fmtDate, fmtDateLong, roleLabel, addDays } from '@/lib';
import { Badge, Modal } from './ui';

// Work for day D is visible from day D-1 at 15:00. So before 15:00 the active day is today;
// at/after 15:00 the active day becomes tomorrow (just published by the trainer).
function activeWorkDate(): string {
  const now = new Date();
  return now.getHours() >= 15 ? tomorrowISO() : todayISO();
}

export function FieldView() {
  const { session, setSession, getEmployee } = useApp();
  const employeeId = session?.kind === 'field' ? session.employeeId : null;
  const emp = employeeId ? getEmployee(employeeId) : null;

  if (!emp) return null;

  return (
    <div className="min-h-screen bg-stable-50">
      <header className="bg-stable-900 text-white px-5 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-400 text-stable-950 flex items-center justify-center font-display font-bold">{emp.firstName[0]}{emp.lastName[0]}</div>
            <div>
              <h1 className="font-display font-bold text-lg leading-tight">{emp.firstName} {emp.lastName}</h1>
              <p className="text-xs text-stable-300 capitalize">{roleLabel(emp.role)} · {fmtDateLong(activeWorkDate())}</p>
            </div>
          </div>
          <button className="p-2 rounded-lg text-stable-300 hover:bg-stable-800" onClick={() => setSession(null)} title="Déconnexion"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 lg:p-6">
        {emp.role === 'cavalier' || emp.role === 'lad' ? <CavalierView riderId={emp.id} /> : emp.role === 'palefrenier' ? <PalefrenierView palefrenierId={emp.id} /> : <UnknownRole />}
      </main>
    </div>
  );
}

function UnknownRole() {
  return <div className="card p-8 text-center text-stable-600">Rôle non compatible avec la vue terrain.</div>;
}

/* ============ CAVALIER ============ */

function CavalierView({ riderId }: { riderId: string }) {
  const { planning, getHorse, getTraining, getEmployee, setPlanning } = useApp();
  const minDate = activeWorkDate();
  const [date, setDate] = useState(minDate);
  const [noteEntry, setNoteEntry] = useState<{ id: string; horseName: string; lot: number } | null>(null);
  const [noteText, setNoteText] = useState('');

  const dayEntries = useMemo(() => planning.filter((p) => p.date === date), [planning, date]);
  const lots = useMemo(() => Array.from(new Set(dayEntries.map((p) => p.lot))).sort((a, b) => a - b), [dayEntries]);

  const myEntries = dayEntries.filter((e) => e.riderId === riderId);
  const myDoneCount = myEntries.filter((e) => e.done).length;
  const myTotalCount = myEntries.length;

  function toggleDone(id: string, current: boolean) {
    setPlanning((prev) => prev.map((p) => (p.id === id ? { ...p, done: !current } : p)));
  }

  function saveNote() {
    if (!noteEntry) return;
    setPlanning((prev) => prev.map((p) => (p.id === noteEntry.id ? { ...p, notes: noteText } : p)));
    setNoteEntry(null);
    setNoteText('');
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Date switcher — forward only, no going back to past days */}
      <div className="flex items-center justify-center gap-2">
        <button className="btn-outline px-3 py-2 opacity-40 cursor-not-allowed" disabled title="Les jours passés ne sont pas accessibles"><ChevronLeft size={16} /></button>
        <div className="px-4 py-2 rounded-xl bg-white text-center min-w-[200px] shadow-sm">
          <div className="text-xs text-stable-500">Travail du</div>
          <div className="font-display font-bold text-stable-900 capitalize">{fmtDateLong(date)}</div>
        </div>
        <button className="btn-outline px-3 py-2" onClick={() => setDate(addDays(date, 1))}><ChevronRight size={16} /></button>
      </div>

      {/* Summary — my work */}
      <div className="card p-5 bg-stable-900 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-stable-300">Mes chevaux du jour</div>
            <div className="font-display font-bold text-3xl">{myTotalCount}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-stable-300">Travail validé</div>
            <div className="font-display font-bold text-3xl">{myDoneCount}/{myTotalCount}</div>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-stable-800 overflow-hidden">
          <div className="h-full bg-gold-400 transition-all duration-300" style={{ width: `${myTotalCount ? (myDoneCount / myTotalCount) * 100 : 0}%` }} />
        </div>
      </div>

      {/* All lots — full detail, cavalier validates only their own */}
      {lots.length === 0 ? (
        <div className="card p-8 text-center">
          <Sun size={32} className="text-stable-300 mx-auto mb-3" />
          <h3 className="font-display font-bold text-stable-900">Aucun lot programmé</h3>
          <p className="text-sm text-stable-500 mt-1">Le planning de ce jour n'est pas encore publié. Revenez à partir de 15h la veille.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-stable-600 px-1">
            <ClipboardList size={15} />
            <span>{lots.length} lot{lots.length > 1 ? 's' : ''} au total · {dayEntries.length} cheval(aux) · Vos chevaux sont surlignés en or</span>
          </div>
          {lots.map((lot) => {
            const entries = dayEntries.filter((e) => e.lot === lot).sort((a, b) => a.id.localeCompare(b.id));
            const hasMine = entries.some((e) => e.riderId === riderId);
            const lotDone = entries.filter((e) => e.riderId === riderId).every((e) => e.done);
            return (
              <div key={lot} className={`card overflow-hidden ${hasMine ? 'ring-2 ring-gold-300' : ''}`}>
                <div className={`px-5 py-3 flex items-center gap-3 ${hasMine ? 'bg-gold-50' : 'bg-stable-100'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold ${hasMine ? 'bg-gold-400 text-stable-950' : 'bg-stable-700 text-white'}`}>{lot}</div>
                  <div className="flex-1">
                    <div className="font-display font-bold text-stable-900">Lot {lot}</div>
                    <div className="text-xs text-stable-500">{entries.length} cheval(aux){hasMine ? ' · Vous y participez' : ''}</div>
                  </div>
                  {hasMine && (lotDone ? <Badge level="green"><Check size={11} /> Terminé</Badge> : <Badge level="orange">À faire</Badge>)}
                </div>
                <ul className="divide-y divide-stable-100">
                  {entries.map((e) => {
                    const horse = getHorse(e.horseId);
                    const training = getTraining(e.trainingId);
                    const rider = getEmployee(e.riderId);
                    const mine = e.riderId === riderId;
                    return (
                      <li key={e.id} className={`p-4 ${mine ? 'bg-gold-50/40' : ''}`}>
                        <div className="flex items-center gap-4">
                          {mine ? (
                            <button
                              onClick={() => toggleDone(e.id, e.done)}
                              className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition shrink-0 tap-target ${e.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stable-300 text-transparent active:border-stable-500'}`}
                            ><Check size={26} /></button>
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-stable-100 flex items-center justify-center shrink-0 text-stable-400"><Eye size={20} /></div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-display font-bold text-stable-900 text-lg">{horse?.name}</div>
                            <div className="text-sm text-stable-600">{training?.name}</div>
                            <div className="text-xs text-stable-500 mt-0.5">
                              {mine ? <span className="font-semibold text-gold-700">Votre cheval</span> : <>Cavalier : {rider ? `${rider.firstName} ${rider.lastName}` : '—'}</>}
                            </div>
                            {e.notes && <div className="text-xs text-stable-600 italic mt-1 bg-stable-50 rounded-lg px-2 py-1">« {e.notes} »</div>}
                          </div>
                          {mine && (
                            <button className="p-3 rounded-xl text-stable-500 hover:bg-stable-100 active:bg-stable-200" onClick={() => { setNoteEntry({ id: e.id, horseName: horse?.name ?? '', lot }); setNoteText(e.notes); }}>
                              <StickyNote size={20} />
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Note modal */}
      {noteEntry && (
        <Modal open onClose={() => setNoteEntry(null)} title="Remarque après travail" subtitle={`${noteEntry.horseName} — Lot ${noteEntry.lot}`}
          footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={() => setNoteEntry(null)}>Annuler</button><button className="btn-primary" onClick={saveNote}><Check size={15} /> Enregistrer</button></div>}
        >
          <textarea className="input min-h-[120px] text-base" placeholder="Sensations, comportement, performances…" value={noteText} onChange={(e) => setNoteText(e.target.value)} autoFocus />
        </Modal>
      )}
    </div>
  );
}

/* ============ PALEFRENIER ============ */

const soinTypeLabels: Record<SoinType, string> = {
  nettoyage_box: 'Nettoyage de box',
  vidage_box: 'Vidage complet de box',
  nourriture: 'Nourriture',
  soin_particulier: 'Soin particulier',
};

const soinIcons: Record<SoinType, React.ReactNode> = {
  nettoyage_box: <Droplets size={22} />,
  vidage_box: <Sparkles size={22} />,
  nourriture: <ClipboardList size={22} />,
  soin_particulier: <HeartPulse size={22} />,
};

const soinColors: Record<SoinType, string> = {
  nettoyage_box: 'bg-blue-100 text-blue-700',
  vidage_box: 'bg-gold-100 text-gold-700',
  nourriture: 'bg-emerald-100 text-emerald-700',
  soin_particulier: 'bg-red-100 text-red-700',
};

function PalefrenierView({ palefrenierId }: { palefrenierId: string }) {
  const { soins, setSoins, getHorse, horses } = useApp();
  const minDate = activeWorkDate();
  const [date, setDate] = useState(minDate);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertHorse, setAlertHorse] = useState('');
  const [alertMsg, setAlertMsg] = useState('');

  const mySoins = useMemo(() => soins.filter((s) => s.assignedTo === palefrenierId), [soins, palefrenierId]);
  const daySoins = mySoins.filter((s) => s.date === date);
  const doneCount = daySoins.filter((s) => s.done).length;

  function toggleDone(s: Soin) {
    setSoins((prev) => prev.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)));
  }

  function submitAlert() {
    if (!alertHorse || !alertMsg) return;
    const newSoin: Soin = {
      id: `s${Date.now()}`,
      horseId: alertHorse,
      type: 'soin_particulier',
      date,
      done: false,
      assignedTo: palefrenierId,
      note: `ANOMALIE: ${alertMsg}`,
    };
    setSoins((prev) => [...prev, newSoin]);
    setAlertOpen(false);
    setAlertHorse('');
    setAlertMsg('');
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Date switcher — forward only, no going back to past days */}
      <div className="flex items-center justify-center gap-2">
        <button className="btn-outline px-3 py-2 opacity-40 cursor-not-allowed" disabled title="Les jours passés ne sont pas accessibles"><ChevronLeft size={16} /></button>
        <div className="px-4 py-2 rounded-xl bg-white text-center min-w-[200px] shadow-sm">
          <div className="text-xs text-stable-500">Travail du</div>
          <div className="font-display font-bold text-stable-900 capitalize">{fmtDateLong(date)}</div>
        </div>
        <button className="btn-outline px-3 py-2" onClick={() => setDate(addDays(date, 1))}><ChevronRight size={16} /></button>
      </div>

      {/* Summary */}
      <div className="card p-5 bg-stable-900 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-stable-300">Soins du jour</div>
            <div className="font-display font-bold text-3xl">{doneCount}/{daySoins.length}</div>
          </div>
          <button className="btn-gold" onClick={() => setAlertOpen(true)}><AlertTriangle size={16} /> Signaler</button>
        </div>
        <div className="mt-3 h-2 rounded-full bg-stable-800 overflow-hidden">
          <div className="h-full bg-gold-400 transition-all duration-300" style={{ width: `${daySoins.length ? (doneCount / daySoins.length) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Today soins */}
      <div>
        <h3 className="font-display font-bold text-stable-900 text-lg mb-2 flex items-center gap-2"><Sun size={18} /> {fmtDate(date)}</h3>
        {daySoins.length === 0 ? (
          <div className="card p-6 text-center text-sm text-stable-500">Aucun soin programmé ce jour.</div>
        ) : (
          <div className="space-y-3">
            {daySoins.map((s) => <SoinRow key={s.id} soin={s} getHorse={getHorse} onToggle={() => toggleDone(s)} large />)}
          </div>
        )}
      </div>

      {/* Anomaly modal */}
      {alertOpen && (
        <Modal open onClose={() => setAlertOpen(false)} title="Signaler une anomalie" subtitle="Boiterie, chaleur, comportement inhabituel…"
          footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={() => setAlertOpen(false)}>Annuler</button><button className="btn-danger" disabled={!alertHorse || !alertMsg} onClick={submitAlert}><AlertTriangle size={15} /> Signaler</button></div>}
        >
          <div className="space-y-4">
            <div><label className="label">Cheval</label><select className="input" value={alertHorse} onChange={(e) => setAlertHorse(e.target.value)}><option value="">— Sélectionner —</option>{horses.filter((h) => h.status === 'actif').map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
            <div><label className="label">Description</label><textarea className="input min-h-[100px]" placeholder="Boiterie pied gauche, chaleur détectée, nervosité…" value={alertMsg} onChange={(e) => setAlertMsg(e.target.value)} /></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SoinRow({ soin, getHorse, onToggle, large, compact }: { soin: Soin; getHorse: (id: string) => { name: string; box: string } | undefined; onToggle: () => void; large?: boolean; compact?: boolean }) {
  const horse = getHorse(soin.horseId);
  return (
    <div className={`card flex items-center gap-4 ${large ? 'p-4' : 'p-3'} ${soin.done ? 'opacity-60' : ''}`}>
      <button onClick={onToggle} className={`w-${large ? '14' : '11'} h-${large ? '14' : '11'} rounded-2xl border-2 flex items-center justify-center transition shrink-0 tap-target ${soin.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stable-300 text-transparent active:border-stable-500'}`} style={{ width: large ? 56 : 44, height: large ? 56 : 44 }}><Check size={large ? 24 : 18} /></button>
      <div className={`w-${large ? '12' : '10'} h-${large ? '12' : '10'} rounded-xl flex items-center justify-center shrink-0 ${soinColors[soin.type]}`} style={{ width: large ? 48 : 40, height: large ? 48 : 40 }}>{soinIcons[soin.type]}</div>
      <div className="flex-1 min-w-0">
        <div className={`font-semibold text-stable-900 ${large ? 'text-lg' : 'text-base'}`}>{horse?.name}</div>
        <div className="text-sm text-stable-600">{soinTypeLabels[soin.type]}</div>
        {!compact && <div className="text-xs text-stable-500 mt-0.5">{fmtDate(soin.date)} · Box {horse?.box}{soin.note ? ` · ${soin.note}` : ''}</div>}
      </div>
      {soin.done && <Badge level="green"><Check size={11} /> Fait</Badge>}
    </div>
  );
}
