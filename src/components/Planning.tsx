import { useMemo, useState } from 'react';
import { Plus, Trash2, CalendarDays, Copy, Eraser, ChevronLeft, ChevronRight, Check, X, StickyNote, FileText } from 'lucide-react';
import { useApp } from '@/store';
import type { PlanningEntry } from '@/types';
import { todayISO, tomorrowISO, fmtDateLong, fmtDate, addDays, sameWeekday, lotColor } from '@/lib';
import { Badge, Confirm, EmptyState, Modal } from './ui';
import { generatePdf } from '@/pdfUtils';

export function PlanningPage() {
  const { planning, setPlanning, horses, employees, trainings, getHorse, getEmployee, getTraining, authUser } = useApp();
  const [date, setDate] = useState(tomorrowISO());
  const [addLot, setAddLot] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<PlanningEntry | null>(null);
  const [noteEntry, setNoteEntry] = useState<PlanningEntry | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PlanningEntry | null>(null);

  const dayEntries = useMemo(() => planning.filter((p) => p.date === date).sort((a, b) => a.lot - b.lot), [planning, date]);
  const lots = useMemo(() => Array.from(new Set(dayEntries.map((p) => p.lot))).sort((a, b) => a - b), [dayEntries]);

  const assignedHorseIds = useMemo(() => new Set(dayEntries.map((p) => p.horseId)), [dayEntries]);
  const availableHorses = horses.filter((h) => h.status === 'actif' && !assignedHorseIds.has(h.id));
  const riders = employees.filter((e) => e.role === 'cavalier' || e.role === 'lad');

  const lastWeekDate = addDays(date, -7);
  const lastWeekEntries = planning.filter((p) => p.date === lastWeekDate);
  const hasN7Data = lastWeekEntries.length > 0;
  const isPrefilledDay = lastWeekEntries.length > 0 && dayEntries.length === 0;

  function addEntry(lot: number, horseId: string, riderId: string, trainingId: string) {
    const entry: PlanningEntry = {
      id: `p${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      date, lot, horseId, riderId, trainingId, notes: '', done: false,
    };
    setPlanning((prev) => [...prev, entry]);
  }

  function updateEntry(id: string, patch: Partial<PlanningEntry>) {
    setPlanning((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function deleteEntry(id: string) {
    setPlanning((prev) => prev.filter((p) => p.id !== id));
  }

  function clearDay() {
    setPlanning((prev) => prev.filter((p) => p.date !== date));
  }

  function prefillFromN7() {
    const newEntries = lastWeekEntries.map((p) => ({
      ...p, id: `p${Date.now()}${Math.random().toString(36).slice(2, 6)}`, date, done: false, notes: '',
    }));
    setPlanning((prev) => [...prev, ...newEntries]);
  }

  function exportPlanningPdf() {
    const sections = lots.map((lot) => {
      const entries = dayEntries.filter((p) => p.lot === lot);
      return {
        heading: `Lot ${lot}`,
        table: {
          headers: ['Cheval', 'Box', 'Entraînement', 'Cavalier', 'Statut'],
          rows: entries.map((e) => {
            const horse = getHorse(e.horseId);
            const rider = getEmployee(e.riderId);
            const training = getTraining(e.trainingId);
            return [horse?.name ?? '—', horse?.box ?? '—', training?.name ?? '—', rider ? `${rider.firstName} ${rider.lastName}` : '—', e.done ? 'Validé' : 'À faire'];
          }),
        },
      };
    });
    generatePdf(`Planning du ${fmtDate(date)}`, `${fmtDateLong(date)} · ${dayEntries.length} entrée(s) · ${lots.length} lot(s)`, sections, { logoUrl: authUser?.logoUrl });
  }

  const nextLot = (lots.length ? Math.max(...lots) + 1 : 1);

  // Get rider's pastel color for row backgrounds
  function riderColor(riderId: string): string | undefined {
    const rider = employees.find((e) => e.id === riderId);
    return rider?.color;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Date navigation */}
      <div className="card p-4 flex flex-col lg:flex-row gap-4 lg:items-center">
        <div className="flex items-center gap-2">
          <button className="btn-outline px-3 py-2.5" onClick={() => setDate(addDays(date, -1))}><ChevronLeft size={16} /></button>
          <div className="px-3 py-2 rounded-xl bg-stable-50 text-center min-w-[200px]">
            <div className="text-xs text-stable-500">Planning du</div>
            <div className="font-display font-bold text-stable-900 capitalize">{fmtDateLong(date)}</div>
          </div>
          <button className="btn-outline px-3 py-2.5" onClick={() => setDate(addDays(date, 1))}><ChevronRight size={16} /></button>
        </div>
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          <button className="btn-outline" onClick={() => setDate(todayISO())}>Aujourd'hui</button>
          <button className="btn-outline" onClick={() => setDate(tomorrowISO())}>Demain</button>
          <input type="date" className="input max-w-[160px]" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {/* N-7 prefill banner */}
      {hasN7Data && dayEntries.length === 0 && (
        <div className="card p-4 bg-gold-50 border-gold-200 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="font-semibold text-stable-900 flex items-center gap-2"><Copy size={16} /> Semaine précédente détectée</div>
            <p className="text-sm text-stable-600 mt-0.5">{lastWeekEntries.length} entrée(s) trouvées pour le {fmtDateLong(lastWeekDate)}. Pré-remplir cette journée ?</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-gold" onClick={prefillFromN7}><Copy size={15} /> Pré-remplir (N-7)</button>
            <button className="btn-outline" onClick={() => setConfirmClear(true)}><Eraser size={15} /> Feuille blanche</button>
          </div>
        </div>
      )}

      {/* Day summary */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-bold text-stable-900 text-lg">{dayEntries.length} entrée(s) · {lots.length} lot(s)</h2>
          {isPrefilledDay && <Badge level="blue">Pré-rempli N-7</Badge>}
        </div>
        {dayEntries.length > 0 && (
          <div className="flex gap-2">
            <button className="btn-outline" onClick={exportPlanningPdf}><FileText size={15} /> PDF</button>
            <button className="btn-primary" onClick={() => { setPlanning((prev) => prev.map((p) => p.date === date ? { ...p, done: true } : p)); }}><Check size={15} /> Tout valider</button>
            <button className="btn-outline text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirmClear(true)}><Eraser size={15} /> Vider</button>
          </div>
        )}
      </div>

      {/* Lots */}
      {dayEntries.length === 0 ? (
        <EmptyState icon={<CalendarDays size={24} />} title="Journée vide" message="Ajoutez un premier lot ou pré-remplissez depuis la semaine précédente." />
      ) : (
        <div className="space-y-4">
          {lots.map((lot) => {
            const entries = dayEntries.filter((p) => p.lot === lot);
            const allDone = entries.every((e) => e.done);
            const { bg, text: txt } = lotColor(lots.length, lot);
            return (
              <div key={lot} className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-stable-100" style={{ backgroundColor: bg, color: txt }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold" style={{ backgroundColor: txt === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)', color: txt }}>  {lot}</div>
                    <div>
                      <div className="font-display font-bold">Lot {lot}</div>
                      <div className="text-xs opacity-80">{entries.length} cheval(aux) · {allDone ? 'Travail terminé' : `${entries.filter((e) => e.done).length}/${entries.length} validé(s)`}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {allDone ? <Badge level="green"><Check size={11} /> Terminé</Badge> : <Badge level="orange">En cours</Badge>}
                    <button className="btn-outline py-2 bg-white" style={{ borderColor: txt === '#ffffff' ? 'rgba(255,255,255,0.3)' : undefined, color: '#1c302f' }} onClick={() => setAddLot(lot)} disabled={availableHorses.length === 0}><Plus size={14} /> Ajouter</button>
                  </div>
                </div>
                <ul className="divide-y divide-stable-100">
                  {entries.map((e) => {
                    const horse = getHorse(e.horseId);
                    const rider = getEmployee(e.riderId);
                    const training = getTraining(e.trainingId);
                    const rowBg = riderColor(e.riderId);
                    return (
                      <li key={e.id} className="flex items-center gap-3 px-5 py-3 transition group" style={rowBg ? { backgroundColor: rowBg + '60' } : undefined}>
                        <button
                          onClick={() => updateEntry(e.id, { done: !e.done })}
                          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition shrink-0 ${e.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stable-300 text-transparent hover:border-stable-500'}`}
                        ><Check size={15} /></button>
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-stable-600 to-stable-800 text-white flex items-center justify-center font-display font-bold text-sm shrink-0">{horse?.name.slice(0, 2) ?? '??'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-stable-900">{horse?.name}</span>
                            <span className="chip bg-stable-100 text-stable-600">{training?.name ?? '—'}</span>
                          </div>
                          <div className="text-xs text-stable-500">Cavalier : {rider ? `${rider.firstName} ${rider.lastName}` : '—'}</div>
                          {e.notes && <div className="text-xs text-stable-600 italic mt-0.5 truncate">« {e.notes} »</div>}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button className="p-1.5 rounded-lg text-stable-400 hover:bg-stable-100 hover:text-stable-700" onClick={() => setNoteEntry(e)} title="Remarque"><StickyNote size={15} /></button>
                          <button className="p-1.5 rounded-lg text-stable-400 hover:bg-stable-100 hover:text-stable-700" onClick={() => setEditingEntry(e)} title="Modifier"><CalendarDays size={15} /></button>
                          <button className="p-1.5 rounded-lg text-stable-400 hover:bg-red-50 hover:text-red-600" onClick={() => setConfirmDelete(e)} title="Retirer"><Trash2 size={15} /></button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {/* Add new lot button at the BOTTOM for mobile ergonomics */}
          <div className="sticky bottom-4 z-10">
            <button
              className="btn-xl w-full btn-gold shadow-lg"
              onClick={() => setAddLot(nextLot)}
              disabled={availableHorses.length === 0}
            >
              <Plus size={20} /> Ajouter au lot {nextLot}
            </button>
          </div>
        </div>
      )}

      {/* Add entry modal */}
      {addLot !== null && (
        <AddEntryModal
          lot={addLot}
          availableHorses={availableHorses}
          riders={riders}
          trainings={trainings}
          onClose={() => setAddLot(null)}
          onAdd={(horseId, riderId, trainingId) => { addEntry(addLot, horseId, riderId, trainingId); setAddLot(null); }}
        />
      )}

      {/* Edit entry modal */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          horses={horses.filter((h) => h.status === 'actif')}
          riders={riders}
          trainings={trainings}
          onClose={() => setEditingEntry(null)}
          onSave={(patch) => { updateEntry(editingEntry.id, patch); setEditingEntry(null); }}
        />
      )}

      {/* Note modal */}
      {noteEntry && (
        <Modal open onClose={() => setNoteEntry(null)} title="Remarque après travail" subtitle={`${getHorse(noteEntry.horseId)?.name} — Lot ${noteEntry.lot}`}
          footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={() => setNoteEntry(null)}>Annuler</button><button className="btn-primary" onClick={() => setNoteEntry(null)}>Enregistrer</button></div>}
        >
          <textarea className="input min-h-[120px]" placeholder="Sensations, comportement, performances…" value={noteEntry.notes} onChange={(e) => updateEntry(noteEntry.id, { notes: e.target.value })} autoFocus />
        </Modal>
      )}

      <Confirm open={confirmClear} onClose={() => setConfirmClear(false)} onConfirm={clearDay} title="Vider la journée ?" message="Toutes les entrées de cette journée seront supprimées. Action irréversible." confirmLabel="Vider" danger />
      <Confirm open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => confirmDelete && deleteEntry(confirmDelete.id)} title="Retirer du lot ?" message="Cette entrée sera supprimée du planning." confirmLabel="Retirer" danger />
    </div>
  );
}

function AddEntryModal({ lot, availableHorses, riders, trainings, onClose, onAdd }: {
  lot: number;
  availableHorses: { id: string; name: string }[];
  riders: { id: string; firstName: string; lastName: string }[];
  trainings: { id: string; name: string }[];
  onClose: () => void;
  onAdd: (horseId: string, riderId: string, trainingId: string) => void;
}) {
  const [horseId, setHorseId] = useState(availableHorses[0]?.id ?? '');
  const [riderId, setRiderId] = useState(riders[0]?.id ?? '');
  const [trainingId, setTrainingId] = useState(trainings[0]?.id ?? '');

  return (
    <Modal open onClose={onClose} title={`Ajouter au lot ${lot}`} subtitle="Sélectionnez le cheval, le cavalier et l'entraînement"
      footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={!horseId} onClick={() => onAdd(horseId, riderId, trainingId)}>Ajouter</button></div>}
    >
      <div className="space-y-4">
        <div>
          <label className="label">Cheval ({availableHorses.length} disponible{availableHorses.length > 1 ? 's' : ''})</label>
          <select className="input" value={horseId} onChange={(e) => setHorseId(e.target.value)}>
            {availableHorses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <p className="text-xs text-stable-500 mt-1.5">Les chevaux déjà attribués à un lot aujourd'hui sont exclus.</p>
        </div>
        <div>
          <label className="label">Cavalier</label>
          <select className="input" value={riderId} onChange={(e) => setRiderId(e.target.value)}>
            {riders.map((r) => <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Entraînement</label>
          <select className="input" value={trainingId} onChange={(e) => setTrainingId(e.target.value)}>
            {trainings.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

function EditEntryModal({ entry, horses, riders, trainings, onClose, onSave }: {
  entry: PlanningEntry;
  horses: { id: string; name: string }[];
  riders: { id: string; firstName: string; lastName: string }[];
  trainings: { id: string; name: string }[];
  onClose: () => void;
  onSave: (patch: Partial<PlanningEntry>) => void;
}) {
  const [riderId, setRiderId] = useState(entry.riderId);
  const [trainingId, setTrainingId] = useState(entry.trainingId);
  return (
    <Modal open onClose={onClose} title="Modifier l'entrée" subtitle={`Lot ${entry.lot}`}
      footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={onClose}>Annuler</button><button className="btn-primary" onClick={() => onSave({ riderId, trainingId })}>Enregistrer</button></div>}
    >
      <div className="space-y-4">
        <div>
          <label className="label">Cavalier</label>
          <select className="input" value={riderId} onChange={(e) => setRiderId(e.target.value)}>
            {riders.map((r) => <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Entraînement</label>
          <select className="input" value={trainingId} onChange={(e) => setTrainingId(e.target.value)}>
            {trainings.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

export { sameWeekday, X };
