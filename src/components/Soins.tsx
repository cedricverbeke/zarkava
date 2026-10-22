import { useState } from 'react';
import { Plus, Trash2, Sparkles, Check, ClipboardList, Repeat, AlertCircle, Calendar, FileText, Users, CalendarDays, Play, Pause, Pencil, CheckCircle2, X } from 'lucide-react';
import { useApp } from '@/store';
import type { Soin, SoinType, Routine, Weekday, WeekSchedule, EmployeeRole } from '@/types';
import { todayISO, fmtDate, addDays, roleLabel } from '@/lib';
import { Badge, Confirm, EmptyState, Modal } from './ui';
import { generatePdf } from '@/pdfUtils';

const soinTypeLabels: Record<SoinType, string> = {
  nettoyage_box: 'Nettoyage de box',
  vidage_box: 'Vidage complet de box',
  nourriture: 'Nourriture',
  soin_particulier: 'Soin particulier',
};

const soinTypeColors: Record<SoinType, 'blue' | 'orange' | 'red' | 'green'> = {
  nettoyage_box: 'blue',
  vidage_box: 'orange',
  nourriture: 'green',
  soin_particulier: 'red',
};

const weekdayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const weekLabels = ['A', 'B', 'C', 'D'] as const;

function weekdayOf(iso: string): Weekday {
  return new Date(iso + 'T00:00:00').getDay() as Weekday;
}

export function SoinsPage() {
  const { soins, setSoins, routines, setRoutines, weekSchedules, setWeekSchedules, horses, employees, getHorse, getEmployee, authUser } = useApp();
  const [tab, setTab] = useState<'soins' | 'routines' | 'programme'>('soins');
  const [creating, setCreating] = useState(false);
  const [creatingRoutine, setCreatingRoutine] = useState(false);
  const [creatingSchedule, setCreatingSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WeekSchedule | null>(null);
  const [toDelete, setToDelete] = useState<Soin | null>(null);
  const [routineToDelete, setRoutineToDelete] = useState<Routine | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<WeekSchedule | null>(null);
  const [generatedNotice, setGeneratedNotice] = useState<{ count: number; start: string; end: string } | null>(null);
  const today = todayISO();

  // Inclusion des palefreniers, cavaliers et lads pour les routines et soins
  const routineEmployees = employees.filter((e) => ['palefrenier', 'cavalier', 'lad'].includes(e.role));

  const sortedSoins = [...soins].sort((a, b) => a.date.localeCompare(b.date));
  const pending = sortedSoins.filter((s) => !s.done);
  const done = sortedSoins.filter((s) => s.done);

  function toggleDone(s: Soin) {
    setSoins((prev) => prev.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)));
  }

  function createRoutine(r: Routine) {
    setRoutines((prev) => [...prev, r]);
    const newSoins: Soin[] = [];
    let cur = r.startDate;
    const end = r.endDate;
    let guard = 0;
    while (cur <= end && guard < 400) {
      const wd = weekdayOf(cur);
      if (r.weekdays.includes(wd)) {
        r.horseIds.forEach((hid) => {
          r.palefrenierIds.forEach((pid) => {
            newSoins.push({
              id: `s${Date.now()}${guard}${hid}${pid}${Math.random().toString(36).slice(2, 4)}`,
              horseId: hid, type: r.type, date: cur, done: false, assignedTo: pid, note: r.note,
              price: r.type === 'soin_particulier' ? r.customPrice : undefined,
            });
          });
        });
      }
      cur = addDays(cur, 1);
      guard++;
    }
    setSoins((prev) => [...prev, ...newSoins]);
    setCreatingRoutine(false);
  }

  function deleteRoutine(r: Routine) {
    setRoutines((prev) => prev.filter((x) => x.id !== r.id));
  }

  function applyWeekSchedule(ws: WeekSchedule) {
    const weekRoutines = [ws.weekAId, ws.weekBId, ws.weekCId, ws.weekDId].filter(Boolean) as string[];
    if (weekRoutines.length === 0) { setGeneratedNotice({ count: 0, start: ws.startDate, end: ws.endDate }); return; }
    const newSoins: Soin[] = [];
    let cur = ws.startDate;
    const end = ws.endDate;
    let guard = 0;
    let weekIndex = 0;
    while (cur <= end && guard < 400) {
      const wd = weekdayOf(cur);
      const weekRoutineId = weekRoutines[weekIndex % weekRoutines.length];
      const r = routines.find((x) => x.id === weekRoutineId);
      if (r && r.weekdays.includes(wd)) {
        r.horseIds.forEach((hid) => {
          r.palefrenierIds.forEach((pid) => {
            newSoins.push({
              id: `ws${Date.now()}${guard}${hid}${pid}${Math.random().toString(36).slice(2, 4)}`,
              horseId: hid, type: r.type, date: cur, done: false, assignedTo: pid, note: r.note,
              price: r.type === 'soin_particulier' ? r.customPrice : undefined,
            });
          });
        });
      }
      if (wd === 0) weekIndex++;
      cur = addDays(cur, 1);
      guard++;
    }
    setSoins((prev) => [...prev, ...newSoins]);
    setGeneratedNotice({ count: newSoins.length, start: ws.startDate, end: ws.endDate });
  }

  function toggleScheduleActive(ws: WeekSchedule) {
    setWeekSchedules((prev) => prev.map((x) => (x.id === ws.id ? { ...x, active: !x.active } : x)));
  }

  function exportSoinsPdf() {
    const sections = [
      {
        heading: 'Soins à réaliser',
        table: {
          headers: ['Cheval', 'Type', 'Date', 'Assigné à', 'Note'],
          rows: pending.map((s) => {
            const h = getHorse(s.horseId);
            const e = s.assignedTo ? getEmployee(s.assignedTo) : null;
            return [h?.name ?? '—', soinTypeLabels[s.type], fmtDate(s.date), e ? `${e.firstName} ${e.lastName}` : '—', s.note];
          }),
        },
      },
      {
        heading: 'Soins réalisés',
        table: {
          headers: ['Cheval', 'Type', 'Date', 'Assigné à', 'Note'],
          rows: done.map((s) => {
            const h = getHorse(s.horseId);
            const e = s.assignedTo ? getEmployee(s.assignedTo) : null;
            return [h?.name ?? '—', soinTypeLabels[s.type], fmtDate(s.date), e ? `${e.firstName} ${e.lastName}` : '—', s.note];
          }),
        },
      },
    ];
    generatePdf('Soins & Entretiens', `Zarkava · ${fmtDate(today)}`, sections, { logoUrl: authUser?.logoUrl });
  }

  function exportRoutinesPdf() {
    const sections = [
      {
        heading: 'Routines de soins',
        table: {
          headers: ['Nom', 'Type', 'Jours', 'Intervenants', 'Chevaux'],
          rows: routines.map((r) => {
            const days = r.weekdays.slice().sort().map((d) => weekdayLabels[d]).join(', ');
            const people = r.palefrenierIds.map((id) => { const e = getEmployee(id); return e ? `${e.firstName} ${e.lastName}` : '—'; }).join(', ');
            const hNames = r.horseIds.map((id) => getHorse(id)?.name).filter(Boolean).join(', ');
            return [r.name, soinTypeLabels[r.type], days, people, hNames];
          }),
        },
      },
    ];
    generatePdf('Routines de soins', `Zarkava · ${fmtDate(today)}`, sections, { logoUrl: authUser?.logoUrl });
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex bg-stable-100 rounded-xl p-1 max-w-2xl">
        <button onClick={() => setTab('soins')} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${tab === 'soins' ? 'bg-white text-stable-900 shadow-sm' : 'text-stable-500'}`}><ClipboardList size={15} /> Soins</button>
        <button onClick={() => setTab('routines')} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${tab === 'routines' ? 'bg-white text-stable-900 shadow-sm' : 'text-stable-500'}`}><Repeat size={15} /> Routines</button>
        <button onClick={() => setTab('programme')} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${tab === 'programme' ? 'bg-white text-stable-900 shadow-sm' : 'text-stable-500'}`}><CalendarDays size={15} /> Programme</button>
      </div>

      {tab === 'soins' && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-stable-600">Suivi des tâches et soins quotidiens par intervenant.</p>
            <div className="flex gap-2">
              <button className="btn-outline" onClick={exportSoinsPdf}><FileText size={15} /> PDF</button>
              <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Demande de soin</button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <SoinsColumn title="À réaliser" icon={<AlertCircle size={16} />} soins={pending} getHorse={getHorse} getEmployee={getEmployee} today={today} onToggle={toggleDone} onDelete={(s) => setToDelete(s)} />
            <SoinsColumn title="Réalisés" icon={<Check size={16} />} soins={done} getHorse={getHorse} getEmployee={getEmployee} today={today} onToggle={toggleDone} onDelete={(s) => setToDelete(s)} done />
          </div>

          {creating && <SoinForm horses={horses} palefreniers={routineEmployees} onClose={() => setCreating(false)} onSave={(s) => { setSoins((prev) => [...prev, s]); setCreating(false); }} />}
        </>
      )}

      {tab === 'routines' && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-stable-600">Créez des routines nommées « Semaine A », « Semaine B », etc. Ensuite, programmez-les dans l'onglet Programme.</p>
            <div className="flex gap-2">
              <button className="btn-outline" onClick={exportRoutinesPdf}><FileText size={15} /> PDF</button>
              <button className="btn-primary" onClick={() => setCreatingRoutine(true)}><Plus size={16} /> Nouvelle routine</button>
            </div>
          </div>

          {routines.length === 0 ? (
            <EmptyState icon={<Repeat size={24} />} title="Aucune routine" message="Créez une routine (ex: « Semaine A — Nettoyage ») pour définir les tâches d'une semaine type." />
          ) : (
            <div className="space-y-3">
              {routines.map((r) => {
                const shareCount = r.palefrenierIds.length;
                return (
                  <div key={r.id} className="card p-5 group hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gold-100 text-gold-700 flex items-center justify-center"><Repeat size={20} /></div>
                        <div>
                          <h3 className="font-display font-bold text-stable-900">{r.name}</h3>
                          <p className="text-xs text-stable-500">{fmtDate(r.startDate)} → {fmtDate(r.endDate)}</p>
                        </div>
                      </div>
                      <button className="p-1.5 rounded-lg text-stable-400 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition" onClick={() => setRoutineToDelete(r)}><Trash2 size={15} /></button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge level={soinTypeColors[r.type]}>{soinTypeLabels[r.type]}</Badge>
                      {r.weekdays.slice().sort().map((d) => (
                        <span key={d} className="chip bg-stable-100 text-stable-700 font-semibold">{weekdayLabels[d]}</span>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-stable-600">
                      <div className="flex items-center gap-1.5"><Users size={12} /> {shareCount} intervenant(s) : {r.palefrenierIds.map((id) => { const e = getEmployee(id); return e ? `${e.firstName} ${e.lastName}` : '—'; }).join(', ')}</div>
                      {shareCount > 1 && <div className="text-stable-500 mt-0.5">Montant partagé équitablement entre les {shareCount} intervenants.</div>}
                      <div className="mt-1">{r.horseIds.length} cheval(x) : {r.horseIds.map((id) => getHorse(id)?.name).filter(Boolean).join(', ')}</div>
                      {r.note && <div className="italic">· « {r.note} »</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {creatingRoutine && <RoutineForm horses={horses.filter((h) => h.status !== 'sorti')} palefreniers={routineEmployees} onClose={() => setCreatingRoutine(false)} onSave={createRoutine} />}
        </>
      )}

      {tab === 'programme' && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-stable-600">Programmez l'enchaînement des routines : telle semaine on commence par la routine A, puis B, etc. sur une période donnée.</p>
            <button className="btn-primary" onClick={() => setCreatingSchedule(true)} disabled={routines.length === 0}><Plus size={16} /> Nouveau programme</button>
          </div>

          {routines.length === 0 && (
            <div className="rounded-xl bg-stable-100 border border-stable-200 p-4 text-sm text-stable-600">
              Créez d'abord des routines dans l'onglet « Routines » avant de les programmer.
            </div>
          )}

          {generatedNotice !== null && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3 animate-fade-in">
              <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
              <div className="flex-1 text-sm text-emerald-800">
                {generatedNotice.count > 0
                  ? <>Programme généré : <strong>{generatedNotice.count}</strong> soin{generatedNotice.count > 1 ? 's' : ''} ajouté{generatedNotice.count > 1 ? 's' : ''} à l'onglet « Soins » sur la période du {fmtDate(generatedNotice.start)} au {fmtDate(generatedNotice.end)}.</>
                  : 'Aucune routine associée à ce programme. Ajoutez au moins une semaine (A, B, C ou D) avant de générer.'}
              </div>
              <button className="text-emerald-600 hover:text-emerald-800" onClick={() => setGeneratedNotice(null)}><X size={16} /></button>
            </div>
          )}

          {weekSchedules.length === 0 && routines.length > 0 ? (
            <EmptyState icon={<CalendarDays size={24} />} title="Aucun programme" message="Créez un programme pour enchaîner vos routines sur plusieurs semaines." />
          ) : (
            <div className="space-y-3">
              {weekSchedules.map((ws) => {
                const weekSlots = [
                  { label: 'Semaine A', routineId: ws.weekAId },
                  { label: 'Semaine B', routineId: ws.weekBId },
                  { label: 'Semaine C', routineId: ws.weekCId },
                  { label: 'Semaine D', routineId: ws.weekDId },
                ];
                return (
                  <div key={ws.id} className={`card p-5 group hover:shadow-md transition ${!ws.active ? 'opacity-70' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${ws.active ? 'bg-blue-100 text-blue-700' : 'bg-stable-100 text-stable-400'}`}><CalendarDays size={20} /></div>
                        <div>
                          <h3 className="font-display font-bold text-stable-900 flex items-center gap-2">
                            {ws.name}
                            {ws.active
                              ? <span className="chip bg-emerald-100 text-emerald-700 text-[10px] font-semibold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Actif</span>
                              : <span className="chip bg-stable-100 text-stable-500 text-[10px] font-semibold flex items-center gap-1"><Pause size={10} /> En pause</span>}
                          </h3>
                          <p className="text-xs text-stable-500">{fmtDate(ws.startDate)} → {fmtDate(ws.endDate)}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button className="btn-outline py-2" onClick={() => applyWeekSchedule(ws)} disabled={!ws.active}><Play size={14} /> Générer</button>
                        <button className="btn-outline py-2" onClick={() => toggleScheduleActive(ws)} title={ws.active ? 'Mettre en pause' : 'Activer'}>
                          {ws.active ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Activer</>}
                        </button>
                        <button className="p-1.5 rounded-lg text-stable-400 hover:bg-stable-100 hover:text-stable-700" onClick={() => setEditingSchedule(ws)} title="Modifier"><Pencil size={15} /></button>
                        <button className="p-1.5 rounded-lg text-stable-400 hover:bg-red-50 hover:text-red-600" onClick={() => setScheduleToDelete(ws)} title="Supprimer"><Trash2 size={15} /></button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {weekSlots.map((slot) => {
                        const r = slot.routineId ? routines.find((x) => x.id === slot.routineId) : null;
                        return (
                          <div key={slot.label} className={`rounded-lg px-3 py-2 text-sm ${r ? 'bg-blue-50 border border-blue-200' : 'bg-stable-50 border border-stable-100'}`}>
                            <div className="text-xs text-stable-500 font-semibold">{slot.label}</div>
                            <div className="font-medium text-stable-800 truncate">{r?.name ?? '—'}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {creatingSchedule && <WeekScheduleForm routines={routines} onClose={() => setCreatingSchedule(false)} onSave={(ws) => { setWeekSchedules((prev) => [...prev, { ...ws, active: true }]); setCreatingSchedule(false); }} />}
          {editingSchedule && <WeekScheduleForm routines={routines} initial={editingSchedule} onClose={() => setEditingSchedule(null)} onSave={(ws) => { setWeekSchedules((prev) => prev.map((x) => (x.id === editingSchedule.id ? { ...ws, id: editingSchedule.id, active: editingSchedule.active } : x))); setEditingSchedule(null); }} />}
        </>
      )}

      <Confirm open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => toDelete && setSoins((prev) => prev.filter((s) => s.id !== toDelete.id))} title="Supprimer le soin ?" message="Cette demande de soin sera retirée." confirmLabel="Supprimer" danger />
      <Confirm open={!!routineToDelete} onClose={() => setRoutineToDelete(null)} onConfirm={() => routineToDelete && deleteRoutine(routineToDelete)} title="Supprimer la routine ?" message="La routine sera supprimée. Les soins déjà générés restent inchangés." confirmLabel="Supprimer" danger />
      <Confirm open={!!scheduleToDelete} onClose={() => setScheduleToDelete(null)} onConfirm={() => scheduleToDelete && setWeekSchedules((prev) => prev.filter((ws) => ws.id !== scheduleToDelete.id))} title="Supprimer le programme ?" message="Ce programme sera supprimé. Les soins déjà générés restent inchangés." confirmLabel="Supprimer" danger />
    </div>
  );
}

function SoinsColumn({ title, icon, soins, getHorse, getEmployee, today, onToggle, onDelete, done }: {
  title: string; icon: React.ReactNode; soins: Soin[];
  getHorse: (id: string) => { name: string; box: string } | undefined;
  getEmployee: (id: string) => { firstName: string; lastName: string } | undefined;
  today: string; onToggle: (s: Soin) => void; onDelete: (s: Soin) => void; done?: boolean;
}) {
  return (
    <div className="card p-5">
      <h3 className="font-display font-bold text-stable-900 flex items-center gap-2 mb-4">{icon}{title} <span className="text-stable-400 text-sm font-normal">({soins.length})</span></h3>
      {soins.length === 0 ? (
        <p className="text-sm text-stable-400 py-6 text-center">Aucun soin.</p>
      ) : (
        <ul className="space-y-2">
          {soins.map((s) => {
            const horse = getHorse(s.horseId);
            const emp = s.assignedTo ? getEmployee(s.assignedTo) : null;
            const isOverdue = !done && s.date < today;
            return (
              <li key={s.id} className="flex items-center gap-3 rounded-xl bg-stable-50 px-3 py-3 group">
                <button onClick={() => onToggle(s)} className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition shrink-0 ${s.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stable-300 text-transparent hover:border-stable-500'}`}><Check size={15} /></button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-stable-900 text-sm">{horse?.name}</span>
                    <Badge level={soinTypeColors[s.type]}>{soinTypeLabels[s.type]}</Badge>
                    {isOverdue && <Badge level="red">En retard</Badge>}
                  </div>
                  <div className="text-xs text-stable-500 mt-0.5">{fmtDate(s.date)} · {emp ? `${emp.firstName} ${emp.lastName}` : 'Non assigné'}{s.note ? ` · ${s.note}` : ''}</div>
                </div>
                <button className="p-1.5 rounded-lg text-stable-400 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition" onClick={() => onDelete(s)}><Trash2 size={14} /></button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SoinForm({ horses, palefreniers, onClose, onSave }: { horses: { id: string; name: string }[]; palefreniers: { id: string; firstName: string; lastName: string; role: EmployeeRole }[]; onClose: () => void; onSave: (s: Soin) => void }) {
  const [horseId, setHorseId] = useState(horses[0]?.id ?? '');
  const [type, setType] = useState<SoinType>('nettoyage_box');
  const [date, setDate] = useState(todayISO());
  const [assignedTo, setAssignedTo] = useState(palefreniers[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [price, setPrice] = useState(15);
  return (
    <Modal open onClose={onClose} title="Demande de soin" subtitle="Assignez un soin ou entretien à un membre du personnel"
      footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={!horseId} onClick={() => onSave({ id: `s${Date.now()}`, horseId, type, date, done: false, assignedTo, note, price: type === 'soin_particulier' ? price : undefined })}>Créer</button></div>}
    >
      <div className="space-y-4">
        <div><label className="label">Cheval</label><select className="input" value={horseId} onChange={(e) => setHorseId(e.target.value)}>{horses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
        <div><label className="label">Type de soin</label><select className="input" value={type} onChange={(e) => setType(e.target.value as SoinType)}>{Object.entries(soinTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label">Date</label><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div>
          <label className="label">Intervenant</label>
          <select className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            {palefreniers.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({roleLabel(p.role)})</option>)}
          </select>
        </div>
        {type === 'soin_particulier' && <div><label className="label">Prix (€)</label><input type="number" step="0.5" className="input" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>}
        <div><label className="label">Note</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Précisions, consignes…" /></div>
      </div>
    </Modal>
  );
}

function RoutineForm({ horses, palefreniers, onClose, onSave }: { horses: { id: string; name: string; box: string }[]; palefreniers: { id: string; firstName: string; lastName: string; role: EmployeeRole }[]; onClose: () => void; onSave: (r: Routine) => void }) {
  const [name, setName] = useState('');
  const [palefrenierIds, setPalefrenierIds] = useState<string[]>(palefreniers[0] ? [palefreniers[0].id] : []);
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(addDays(todayISO(), 30));
  const [type, setType] = useState<SoinType>('nettoyage_box');
  const [selectedHorses, setSelectedHorses] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [weekdays, setWeekdays] = useState<Set<Weekday>>(new Set([1, 2, 3, 4, 5]));
  const [customPrice, setCustomPrice] = useState(15);

  function togglePerson(id: string) {
    setPalefrenierIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function toggleHorse(id: string) {
    setSelectedHorses((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function toggleAll() {
    if (selectedHorses.size === horses.length) setSelectedHorses(new Set());
    else setSelectedHorses(new Set(horses.map((h) => h.id)));
  }
  function toggleDay(d: Weekday) {
    setWeekdays((prev) => { const next = new Set(prev); if (next.has(d)) next.delete(d); else next.add(d); return next; });
  }

  const valid = name.trim() && palefrenierIds.length > 0 && selectedHorses.size > 0 && weekdays.size > 0;

  let estCount = 0;
  let cur = startDate;
  let guard = 0;
  while (cur <= endDate && guard < 400) {
    if (weekdays.has(weekdayOf(cur))) estCount += selectedHorses.size * palefrenierIds.length;
    cur = addDays(cur, 1);
    guard++;
  }

  return (
    <Modal open onClose={onClose} title="Nouvelle routine" subtitle="Définissez les tâches d'une semaine type (ex: Semaine A)" size="lg"
      footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={!valid} onClick={() => onSave({ id: `r${Date.now()}`, name, palefrenierIds, weekdays: Array.from(weekdays), startDate, endDate, type, horseIds: Array.from(selectedHorses), note, customPrice: type === 'soin_particulier' ? customPrice : undefined })}><Sparkles size={15} /> Créer & générer</button></div>}
    >
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="label">Nom de la routine</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Semaine A — Entraînement / Soins" /></div>
          <div><label className="label">Type de soin / tâche</label><select className="input" value={type} onChange={(e) => setType(e.target.value as SoinType)}>{Object.entries(soinTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="label">Date de début</label><input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div><label className="label">Date de fin</label><input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div>

        {type === 'soin_particulier' && (
          <div><label className="label">Prix du soin particulier (€)</label><input type="number" step="0.5" className="input max-w-[160px]" value={customPrice} onChange={(e) => setCustomPrice(Number(e.target.value))} /></div>
        )}
        {type !== 'soin_particulier' && (
          <div><label className="label">Note (optionnel)</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: Matin, avant le travail" /></div>
        )}
        {type === 'soin_particulier' && (
          <div><label className="label">Précision</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: Pansement, surveillance boiterie…" /></div>
        )}

        {/* Multiple people selector (Palefreniers, Cavaliers, Lads) */}
        <div>
          <label className="label flex items-center gap-2"><Users size={14} /> Intervenants ({palefrenierIds.length})</label>
          <p className="text-xs text-stable-500 mb-2">Sélectionnez un ou plusieurs intervenants (palefreniers, cavaliers, lads).</p>
          <div className="flex flex-wrap gap-2">
            {palefreniers.map((p) => {
              const sel = palefrenierIds.includes(p.id);
              return (
                <button key={p.id} type="button" onClick={() => togglePerson(p.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${sel ? 'bg-stable-700 text-white' : 'bg-stable-100 text-stable-600 hover:bg-stable-200'}`}>
                  <span>{p.firstName} {p.lastName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${sel ? 'bg-stable-800 text-stable-200' : 'bg-stable-200 text-stable-700'}`}>{roleLabel(p.role)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Weekday selector */}
        <div>
          <label className="label flex items-center gap-2"><Calendar size={13} /> Jours de répétition</label>
          <div className="grid grid-cols-7 gap-1.5">
            {([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((d) => (
              <button key={d} type="button" onClick={() => toggleDay(d)}
                className={`py-2.5 rounded-lg text-xs font-bold transition ${weekdays.has(d) ? 'bg-stable-700 text-white shadow-sm' : 'bg-stable-100 text-stable-500 hover:bg-stable-200'}`}>
                {weekdayLabels[d]}
              </button>
            ))}
          </div>
        </div>

        {/* Horse selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Chevaux concernés ({selectedHorses.size}/{horses.length})</label>
            <button type="button" className="text-xs font-semibold text-stable-700 hover:text-stable-900" onClick={toggleAll}>
              {selectedHorses.size === horses.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-stable-200 divide-y divide-stable-100">
            {horses.map((h) => {
              const sel = selectedHorses.has(h.id);
              return (
                <button key={h.id} type="button" onClick={() => toggleHorse(h.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition ${sel ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-stable-50'}`}>
                  <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition ${sel ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stable-300 text-transparent'}`}><Check size={14} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="font-semibold text-stable-900 text-sm">{h.name}</span>
                    <span className="text-xs text-stable-500 ml-2">Box {h.box}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl bg-stable-50 px-4 py-3 text-sm text-stable-600">
          Cette routine générera <strong className="text-stable-900">{estCount} tâche(s)</strong> sur la période du {fmtDate(startDate)} au {fmtDate(endDate)}{palefrenierIds.length > 1 ? ` · partagées entre ${palefrenierIds.length} intervenants` : ''}.
        </div>
      </div>
    </Modal>
  );
}

function WeekScheduleForm({ routines, initial, onClose, onSave }: { routines: Routine[]; initial?: WeekSchedule; onClose: () => void; onSave: (ws: WeekSchedule) => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(initial?.endDate ?? addDays(todayISO(), 84));
  const [weekAId, setWeekAId] = useState<string>(initial?.weekAId ?? '');
  const [weekBId, setWeekBId] = useState<string>(initial?.weekBId ?? '');
  const [weekCId, setWeekCId] = useState<string>(initial?.weekCId ?? '');
  const [weekDId, setWeekDId] = useState<string>(initial?.weekDId ?? '');

  const valid = name.trim() && (weekAId || weekBId || weekCId || weekDId);

  return (
    <Modal open onClose={onClose} title={initial ? 'Modifier le programme' : "Programmer l'enchaînement des routines"} subtitle="Définissez quelle routine s'applique chaque semaine, sur une période donnée" size="lg"
      footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={!valid} onClick={() => onSave({ id: initial?.id ?? `ws${Date.now()}`, name, weekAId: weekAId || null, weekBId: weekBId || null, weekCId: weekCId || null, weekDId: weekDId || null, startDate, endDate, active: initial?.active ?? true })}><Sparkles size={15} /> {initial ? 'Enregistrer' : 'Créer'}</button></div>}
    >
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3"><label className="label">Nom du programme</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Programme hiver 2025" /></div>
          <div><label className="label">Date de début</label><input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div><label className="label">Date de fin</label><input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {weekLabels.map((label, i) => {
            const value = [weekAId, weekBId, weekCId, weekDId][i];
            const setter = [setWeekAId, setWeekBId, setWeekCId, setWeekDId][i];
            return (
              <div key={label}>
                <label className="label">Semaine {label}</label>
                <select className="input" value={value} onChange={(e) => setter(e.target.value)}>
                  <option value="">— Aucune —</option>
                  {routines.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          À partir de la date de début, la première semaine applique la routine « Semaine A », puis la suivante « Semaine B », etc. Le cycle recommence une fois toutes les semaines remplies atteintes.
        </div>
      </div>
    </Modal>
  );
}