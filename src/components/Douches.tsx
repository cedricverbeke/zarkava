import { useEffect, useMemo, useState } from 'react';
import { Droplets, Check, Clock, FileText, Calendar, CheckCheck, RefreshCw, Pencil } from 'lucide-react';
import { useApp } from '@/store';
import type { Douche } from '@/types';
import { employeeHasRole, todayISO, fmtDate } from '@/lib';
import { generatePdf } from '@/pdfUtils';
import { Badge, EmptyState, Modal } from './ui';

export function DouchesPage() {
  const { horses, employees, douches, setDouches, planning, getHorse, getEmployee, authUser } = useApp();
  const [date, setDate] = useState(todayISO());
  const [editing, setEditing] = useState<Douche | null>(null);

  const activeHorses = horses.filter((h) => h.status === 'actif');
  const assignables = employees.filter((e) => employeeHasRole(e, 'cavalier') || employeeHasRole(e, 'lad') || employeeHasRole(e, 'palefrenier'));

  const dayDouches = useMemo(() => douches.filter((d) => d.date === date), [douches, date]);

  // Build horseId -> riderId from planning on that date
  const riderByHorse = useMemo(() => {
    const map = new Map<string, string>();
    planning.filter((p) => p.date === date).forEach((p) => {
      map.set(p.horseId, p.riderId);
    });
    return map;
  }, [planning, date]);

  const dayHorseIds = useMemo(() => new Set(dayDouches.map((d) => d.horseId)), [dayDouches]);

  // Auto pre-fill: whenever the date or planning changes, create a douche row for any
  // planned horse that doesn't yet have one. Editable afterwards (user can reassign or clear).
  useEffect(() => {
    if (activeHorses.length === 0) return;
    const toCreate: Douche[] = [];
    activeHorses.forEach((h) => {
      if (dayHorseIds.has(h.id)) return;
      const riderId = riderByHorse.get(h.id);
      if (!riderId) return; // only pre-fill horses present in the planning
      toCreate.push({ id: `d${Date.now()}${h.id}${Math.random().toString(36).slice(2, 5)}`, date, horseId: h.id, assignedTo: riderId, done: false });
    });
    if (toCreate.length > 0) {
      setDouches((prev) => [...prev, ...toCreate]);
    }
  }, [date, riderByHorse, activeHorses, dayHorseIds, setDouches]);

  function getDoucheForHorse(horseId: string): Douche | undefined {
    return dayDouches.find((d) => d.horseId === horseId);
  }

  function assign(horseId: string, assignedTo: string) {
    const existing = getDoucheForHorse(horseId);
    if (existing) {
      setDouches((prev) => prev.map((d) => (d.id === existing.id ? { ...d, assignedTo } : d)));
    } else {
      const newDouche: Douche = { id: `d${Date.now()}${horseId}`, date, horseId, assignedTo, done: false };
      setDouches((prev) => [...prev, newDouche]);
    }
  }

  function toggleDone(horseId: string) {
    const existing = getDoucheForHorse(horseId);
    if (existing) setDouches((prev) => prev.map((d) => (d.id === existing.id ? { ...d, done: !d.done } : d)));
  }

  function refillFromPlanning() {
    // Force re-sync: remove empty (not done, no ecart note) douches for horses no longer in planning,
    // and create missing ones for planned horses. Keeps user edits (done, ecartNote, manual reassign).
    const plannedHorseIds = new Set(planning.filter((p) => p.date === date).map((p) => p.horseId));
    setDouches((prev) => {
      const kept = prev.filter((d) => d.date !== date || d.done || d.ecartNote || plannedHorseIds.has(d.horseId));
      const existingIds = new Set(kept.filter((d) => d.date === date).map((d) => d.horseId));
      const toAdd: Douche[] = [];
      plannedHorseIds.forEach((hid) => {
        if (existingIds.has(hid)) return;
        const riderId = riderByHorse.get(hid);
        if (!riderId) return;
        toAdd.push({ id: `d${Date.now()}${hid}${Math.random().toString(36).slice(2, 5)}`, date, horseId: hid, assignedTo: riderId, done: false });
      });
      return [...kept, ...toAdd];
    });
  }

  function validateAllDouches() {
    setDouches((prev) => prev.map((d) => (d.date === date ? { ...d, done: true } : d)));
  }

  function saveEdit(patch: Partial<Douche>) {
    if (!editing) return;
    setDouches((prev) => prev.map((d) => (d.id === editing.id ? { ...d, ...patch } : d)));
    setEditing(null);
  }

  function exportPdf() {
    const rows = activeHorses.map((h) => {
      const d = getDoucheForHorse(h.id);
      const emp = d ? getEmployee(d.assignedTo) : null;
      return [h.name, `Box ${h.box}`, emp ? `${emp.firstName} ${emp.lastName}` : '—', d?.done ? 'Fait' : 'À faire', d?.ecartNote ?? ''];
    });
    const sections = [{
      heading: `Douches du ${fmtDate(date)}`,
      table: { headers: ['Cheval', 'Box', 'Assigné à', 'Statut', 'Écart'], rows },
    }];
    generatePdf('Douches', `Zarkava · ${fmtDate(date)}`, sections, { logoUrl: authUser?.logoUrl });
  }

  const doneCount = dayDouches.filter((d) => d.done).length;
  const assignedCount = dayDouches.length;
  const plannedCount = activeHorses.filter((h) => riderByHorse.has(h.id)).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center"><Droplets size={22} /></div>
          <div>
            <h2 className="font-display font-bold text-stable-900 text-lg">Douches</h2>
            <p className="text-sm text-stable-600">Pré-remplies depuis le planning. Reste éditable à tout moment.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:ml-auto items-center">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-stable-400" />
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button className="btn-outline" onClick={exportPdf} disabled={assignedCount === 0}><FileText size={15} /> PDF</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-outline" onClick={refillFromPlanning}>
          <RefreshCw size={15} /> Re-sync depuis le planning
        </button>
        {assignedCount > 0 && (
          <button className="btn-primary" onClick={validateAllDouches} disabled={doneCount === assignedCount}>
            <CheckCheck size={15} /> Tout valider ({doneCount}/{assignedCount})
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4"><div className="text-2xl font-display font-bold text-stable-900">{plannedCount}</div><div className="text-xs text-stable-500">Chevaux au planning</div></div>
        <div className="card p-4"><div className="text-2xl font-display font-bold text-blue-700">{assignedCount}</div><div className="text-xs text-stable-500">Douches assignées</div></div>
        <div className="card p-4"><div className="text-2xl font-display font-bold text-emerald-700">{doneCount}</div><div className="text-xs text-stable-500">Faits</div></div>
      </div>

      {activeHorses.length === 0 ? (
        <EmptyState icon={<Droplets size={24} />} title="Aucun cheval actif" message="Ajoutez des chevaux pour gérer les douches." />
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-stable-100">
            {activeHorses.map((h) => {
              const d = getDoucheForHorse(h.id);
              const emp = d ? getEmployee(d.assignedTo) : null;
              const plannedRiderId = riderByHorse.get(h.id);
              const riderChanged = d && plannedRiderId && d.assignedTo !== plannedRiderId;
              return (
                <div key={h.id} className="flex items-center gap-3 px-4 py-3 hover:bg-stable-50/50 transition group">
                  <button onClick={() => d && toggleDone(h.id)} className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition ${d?.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stable-300 text-transparent hover:border-stable-500'}`}><Check size={15} /></button>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-stable-900 text-sm truncate">{h.name}</div>
                    <div className="text-xs text-stable-500">Box {h.box}</div>
                  </div>
                  {riderChanged && <Badge level="orange">Repris</Badge>}
                  {d?.ecartNote && <Badge level="red">Écart</Badge>}
                  {d?.done && <Badge level="green"><Check size={11} /> Fait</Badge>}
                  {!d?.done && d && <Badge level="blue"><Clock size={11} /> En attente</Badge>}
                  {!d && plannedRiderId && <Badge level="blue">Pré-rempli</Badge>}
                  <select className="input text-sm max-w-[180px]" value={d?.assignedTo ?? ''} onChange={(e) => assign(h.id, e.target.value)}>
                    <option value="">— Non assigné —</option>
                    {assignables.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
                  </select>
                  {d && (
                    <button className="p-1.5 rounded-lg text-stable-400 hover:bg-stable-100 hover:text-stable-700 opacity-0 group-hover:opacity-100 transition" onClick={() => setEditing(d)} title="Éditer"><Pencil size={15} /></button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editing && (
        <Modal open onClose={() => setEditing(null)} title="Éditer la douche" subtitle={`${getHorse(editing.horseId)?.name} · ${fmtDate(date)}`}
          footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={() => setEditing(null)}>Annuler</button><button className="btn-primary" onClick={() => saveEdit({})}>Enregistrer</button></div>}
        >
          <div className="space-y-4">
            <div>
              <label className="label">Assigné à</label>
              <select className="input" value={editing.assignedTo} onChange={(e) => setEditing({ ...editing, assignedTo: e.target.value })}>
                <option value="">— Non assigné —</option>
                {assignables.map((a) => <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Statut</label>
              <select className="input" value={editing.done ? 'done' : 'todo'} onChange={(e) => setEditing({ ...editing, done: e.target.value === 'done' })}>
                <option value="todo">À faire</option>
                <option value="done">Fait</option>
              </select>
            </div>
            <div>
              <label className="label">Écart / remarque (optionnel)</label>
              <input className="input" value={editing.ecartNote ?? ''} onChange={(e) => setEditing({ ...editing, ecartNote: e.target.value })} placeholder="Ex: douche reportée, cheval refusé…" />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
