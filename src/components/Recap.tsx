import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Check, FileText, Pencil, Trash2, AlertTriangle, Info } from 'lucide-react';
import { useApp } from '@/store';
import { todayISO, fmtDateLong, fmtDate, addDays } from '@/lib';
import { Badge, Confirm, EmptyState, Modal } from './ui';
import { generatePdf } from '@/pdfUtils';
import type { Employee, PlanningEntry, Soin, Douche, SoinType } from '@/types';

type Source = 'planning' | 'soins' | 'douches' | 'ferrage';

interface RecapRow {
  id: string; // recap-internal id
  source: Source;
  sourceId: string; // id of underlying record
  employeeId: string;
  employeeName: string;
  horseId: string;
  horseName: string;
  description: string;
  amount: number;
  done: boolean;
  ecartNote?: string;
  // editable fields used by the modal
  lot?: number;
  trainingId?: string;
  soinType?: SoinType;
  assignedTo?: string;
}

const soinLabels: Record<SoinType, string> = {
  nettoyage_box: 'Nettoyage box',
  vidage_box: 'Vidage box',
  nourriture: 'Nourriture',
  soin_particulier: 'Soin particulier',
};

export function RecapPage() {
  const {
    planning, setPlanning,
    soins, setSoins,
    douches, setDouches,
    ferrageOrders, employees, horses, trainings,
    getHorse, getEmployee, authUser,
  } = useApp();
  const [date, setDate] = useState(todayISO());
  const [editing, setEditing] = useState<RecapRow | null>(null);
  const [toRemove, setToRemove] = useState<RecapRow | null>(null);

  const rows = useMemo<RecapRow[]>(() => {
    const out: RecapRow[] = [];

    planning.filter((p) => p.date === date).forEach((p) => {
      const emp = getEmployee(p.riderId);
      const horse = getHorse(p.horseId);
      const training = trainings.find((t) => t.id === p.trainingId);
      out.push({
        id: `plan-${p.id}`,
        source: 'planning',
        sourceId: p.id,
        employeeId: p.riderId,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : '—',
        horseId: p.horseId,
        horseName: horse?.name ?? '—',
        description: training?.name ?? 'Entraînement',
        amount: 0,
        done: p.done,
        ecartNote: p.ecartNote,
        lot: p.lot,
        trainingId: p.trainingId,
      });
    });

    soins.filter((s) => s.date === date).forEach((s) => {
      const emp = s.assignedTo ? getEmployee(s.assignedTo) : null;
      const horse = getHorse(s.horseId);
      out.push({
        id: `soin-${s.id}`,
        source: 'soins',
        sourceId: s.id,
        employeeId: s.assignedTo ?? '',
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : '—',
        horseId: s.horseId,
        horseName: horse?.name ?? '—',
        description: soinLabels[s.type] ?? s.type,
        amount: s.price ?? 0,
        done: s.done,
        ecartNote: undefined,
        soinType: s.type,
        assignedTo: s.assignedTo,
      });
    });

    douches.filter((d) => d.date === date).forEach((d) => {
      const emp = getEmployee(d.assignedTo);
      const horse = getHorse(d.horseId);
      out.push({
        id: `douche-${d.id}`,
        source: 'douches',
        sourceId: d.id,
        employeeId: d.assignedTo,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : '—',
        horseId: d.horseId,
        horseName: horse?.name ?? '—',
        description: 'Douche',
        amount: 0,
        done: d.done,
        ecartNote: d.ecartNote,
        assignedTo: d.assignedTo,
      });
    });

    ferrageOrders.filter((o) => o.status === 'completed' && o.appliedAt === date).forEach((o) => {
      o.horses.filter((h) => h.done).forEach((h) => {
        out.push({
          id: `ferrage-${o.id}-${h.horseId}`,
          source: 'ferrage',
          sourceId: o.id,
          employeeId: o.marechalId ?? '',
          employeeName: o.marechalName ?? 'Maréchal',
          horseId: '',
          horseName: h.horseName,
          description: h.consigne || 'Ferrure',
          amount: h.price ?? 0,
          done: true,
        });
      });
    });

    return out;
  }, [planning, soins, douches, ferrageOrders, date, getEmployee, getHorse, trainings]);

  const byEmployee = useMemo(() => {
    const map = new Map<string, { employee: Employee | undefined; rows: RecapRow[] }>();
    rows.forEach((r) => {
      const emp = employees.find((e) => e.id === r.employeeId);
      const key = r.employeeId || r.employeeName;
      const existing = map.get(key);
      if (existing) existing.rows.push(r);
      else map.set(key, { employee: emp, rows: [r] });
    });
    return Array.from(map.entries()).map(([, v]) => v);
  }, [rows, employees]);

  const sourceLabels: Record<Source, string> = { planning: 'Planning', soins: 'Soins', douches: 'Douche', ferrage: 'Ferrage' };
  const sourceColors: Record<Source, 'blue' | 'green' | 'orange' | 'red'> = { planning: 'blue', soins: 'green', douches: 'orange', ferrage: 'red' };

  // --- Sync helpers: edits in Recap propagate back to the source collection ---

  function applyEdit(row: RecapRow, patch: Partial<RecapRow> & { ecartNote?: string }) {
    if (row.source === 'planning') {
      setPlanning((prev) => prev.map((p) => {
        if (p.id !== row.sourceId) return p;
        const next: PlanningEntry = { ...p };
        if (patch.employeeId !== undefined) next.riderId = patch.employeeId;
        if (patch.horseId !== undefined) next.horseId = patch.horseId;
        if (patch.trainingId !== undefined) next.trainingId = patch.trainingId;
        if (patch.done !== undefined) next.done = patch.done;
        if (patch.ecartNote !== undefined) next.ecartNote = patch.ecartNote || undefined;
        return next;
      }));
    } else if (row.source === 'soins') {
      setSoins((prev) => prev.map((s) => {
        if (s.id !== row.sourceId) return s;
        const next: Soin = { ...s };
        if (patch.assignedTo !== undefined) next.assignedTo = patch.assignedTo || undefined;
        if (patch.horseId !== undefined) next.horseId = patch.horseId;
        if (patch.soinType !== undefined) next.type = patch.soinType;
        if (patch.amount !== undefined) next.price = patch.amount || undefined;
        if (patch.done !== undefined) next.done = patch.done;
        return next;
      }));
    } else if (row.source === 'douches') {
      setDouches((prev) => prev.map((d) => {
        if (d.id !== row.sourceId) return d;
        const next: Douche = { ...d };
        if (patch.assignedTo !== undefined) next.assignedTo = patch.assignedTo;
        if (patch.horseId !== undefined) next.horseId = patch.horseId;
        if (patch.done !== undefined) next.done = patch.done;
        if (patch.ecartNote !== undefined) next.ecartNote = patch.ecartNote || undefined;
        return next;
      }));
    }
    setEditing(null);
  }

  function toggleDone(row: RecapRow) {
    applyEdit(row, { done: !row.done });
  }

  function removeRow(row: RecapRow) {
    if (row.source === 'planning') setPlanning((prev) => prev.filter((p) => p.id !== row.sourceId));
    else if (row.source === 'soins') setSoins((prev) => prev.filter((s) => s.id !== row.sourceId));
    else if (row.source === 'douches') setDouches((prev) => prev.filter((d) => d.id !== row.sourceId));
    setToRemove(null);
  }

  function exportPdf() {
    const sections = byEmployee.map((grp) => ({
      heading: grp.employee ? `${grp.employee.firstName} ${grp.employee.lastName}` : grp.rows[0]?.employeeName ?? '—',
      table: {
        headers: ['Acte', 'Cheval', 'Source', 'Statut', 'Écart', 'Montant'],
        rows: grp.rows.map((r) => [
          r.description,
          r.horseName,
          sourceLabels[r.source],
          r.done ? 'Fait' : 'À faire',
          r.ecartNote ?? '',
          r.amount > 0 ? `${r.amount}€` : '—',
        ]),
      },
    }));
    if (sections.length === 0) {
      sections.push({ heading: 'Aucune activité', table: { headers: ['—'], rows: [['Aucune activité ce jour']] } });
    }
    generatePdf(`Récapitulatif du ${fmtDate(date)}`, fmtDateLong(date), sections, { logoUrl: authUser?.logoUrl });
  }

  const ecartCount = rows.filter((r) => r.ecartNote).length;
  const grandTotal = rows.reduce((sum, r) => sum + (r.done ? r.amount : 0), 0);

  // Rider/soin/douche assignable employees
  const assignableEmployees = employees.filter((e) => e.role === 'cavalier' || e.role === 'lad' || e.role === 'palefrenier');
  const activeHorses = horses.filter((h) => h.status === 'actif');

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card p-4 flex flex-col lg:flex-row gap-4 lg:items-center">
        <div className="flex items-center gap-2">
          <button className="btn-outline px-3 py-2.5" onClick={() => setDate(addDays(date, -1))}><ChevronLeft size={16} /></button>
          <div className="px-3 py-2 rounded-xl bg-stable-50 text-center min-w-[200px]">
            <div className="text-xs text-stable-500">Récapitulatif du</div>
            <div className="font-display font-bold text-stable-900 capitalize">{fmtDateLong(date)}</div>
          </div>
          <button className="btn-outline px-3 py-2.5" onClick={() => setDate(addDays(date, 1))}><ChevronRight size={16} /></button>
        </div>
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          <button className="btn-outline" onClick={() => setDate(todayISO())}>Aujourd'hui</button>
          <input type="date" className="input max-w-[160px]" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn-outline" onClick={exportPdf} disabled={rows.length === 0}><FileText size={15} /> PDF</button>
        </div>
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-start gap-3 text-sm text-blue-800">
        <Info size={16} className="shrink-0 mt-0.5" />
        <div>Tout ce qui était prévu s'affiche ici : lots du planning, douches, nourriture, soins, ferrures. Cliquez sur une ligne pour la modifier (cavalier, cheval, entraînement, statut) — la correction se répercute automatiquement dans le planning, les soins et les douches. Ajoutez un « écart » pour tracer ce qui a changé par rapport à la prévision.</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4"><div className="text-2xl font-display font-bold text-stable-900">{rows.length}</div><div className="text-sm text-stable-500">Actes au total</div></div>
        <div className="card p-4"><div className="text-2xl font-display font-bold text-stable-900">{byEmployee.length}</div><div className="text-sm text-stable-500">Intervenants</div></div>
        <div className="card p-4"><div className="text-2xl font-display font-bold text-amber-700">{ecartCount}</div><div className="text-sm text-stable-500">Écarts signalés</div></div>
        <div className="card p-4"><div className="text-2xl font-display font-bold text-stable-900">{grandTotal}€</div><div className="text-sm text-stable-500">Total du jour</div></div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<CalendarDays size={24} />} title="Aucune activité" message="Aucune intervention enregistrée ce jour. Le récapitulatif se remplit automatiquement depuis le planning, les soins, les douches et les ferrures." />
      ) : (
        <div className="space-y-4">
          {byEmployee.map((grp) => {
            const empTotal = grp.rows.reduce((sum, r) => sum + (r.done ? r.amount : 0), 0);
            const empDone = grp.rows.filter((r) => r.done).length;
            const emp = grp.employee;
            return (
              <div key={emp?.id ?? grp.rows[0]?.employeeName} className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-stable-50 border-b border-stable-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stable-700 text-white flex items-center justify-center font-semibold shrink-0">{emp ? `${emp.firstName[0]}${emp.lastName[0]}` : '?'}</div>
                    <div>
                      <div className="font-semibold text-stable-900">{emp ? `${emp.firstName} ${emp.lastName}` : grp.rows[0]?.employeeName}</div>
                      <div className="text-xs text-stable-500">{grp.rows.length} acte(s) · {empDone} fait(s)</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-stable-500">Total du jour</div>
                    <div className="font-display font-bold text-stable-900">{empTotal}€</div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-stable-500 uppercase tracking-wide">
                        <th className="px-5 pb-2 pt-3">Acte</th>
                        <th className="px-5 pb-2 pt-3">Cheval</th>
                        <th className="px-5 pb-2 pt-3">Source</th>
                        <th className="px-5 pb-2 pt-3 text-center">Statut</th>
                        <th className="px-5 pb-2 pt-3">Écart</th>
                        <th className="px-5 pb-2 pt-3 text-right">Montant</th>
                        <th className="px-5 pb-2 pt-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {grp.rows.map((r) => (
                        <tr key={r.id} className="border-t border-stable-100 group hover:bg-stable-50/60 transition">
                          <td className="px-5 py-2.5">{r.description}</td>
                          <td className="px-5 py-2.5">{r.horseName}</td>
                          <td className="px-5 py-2.5"><Badge level={sourceColors[r.source]}>{sourceLabels[r.source]}</Badge></td>
                          <td className="px-5 py-2.5 text-center">
                            <button onClick={() => toggleDone(r)} className={`pill ${r.done ? 'bg-emerald-100 text-emerald-700' : 'bg-stable-100 text-stable-500'} hover:opacity-80 transition`}>
                              {r.done ? <><Check size={11} /> Fait</> : 'À faire'}
                            </button>
                          </td>
                          <td className="px-5 py-2.5">
                            {r.ecartNote ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 max-w-[220px] truncate" title={r.ecartNote}>
                                <AlertTriangle size={12} /> {r.ecartNote}
                              </span>
                            ) : <span className="text-stable-300">—</span>}
                          </td>
                          <td className="px-5 py-2.5 text-right font-semibold">{r.amount > 0 ? `${r.amount}€` : '—'}</td>
                          <td className="px-5 py-2.5 text-right">
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition">
                              <button className="p-1.5 rounded-lg text-stable-400 hover:bg-stable-100 hover:text-stable-700" onClick={() => setEditing(r)} title="Modifier"><Pencil size={15} /></button>
                              {r.source !== 'ferrage' && (
                                <button className="p-1.5 rounded-lg text-stable-400 hover:bg-red-50 hover:text-red-600" onClick={() => setToRemove(r)} title="Retirer"><Trash2 size={15} /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <RecapEditModal
          row={editing}
          employees={assignableEmployees}
          horses={activeHorses}
          trainings={trainings}
          onClose={() => setEditing(null)}
          onSave={(patch) => applyEdit(editing, patch)}
        />
      )}

      <Confirm
        open={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={() => toRemove && removeRow(toRemove)}
        title="Retirer cette ligne ?"
        message={toRemove ? `« ${toRemove.description} » pour ${toRemove.horseName} sera supprimé définitivement de ${sourceLabels[toRemove.source]}.` : ''}
        confirmLabel="Retirer"
        danger
      />
    </div>
  );
}

function RecapEditModal({ row, employees, horses, trainings, onClose, onSave }: {
  row: RecapRow;
  employees: Employee[];
  horses: { id: string; name: string }[];
  trainings: { id: string; name: string }[];
  onClose: () => void;
  onSave: (patch: Partial<RecapRow> & { ecartNote?: string }) => void;
}) {
  const [employeeId, setEmployeeId] = useState(row.employeeId);
  const [horseId, setHorseId] = useState(row.horseId);
  const [trainingId, setTrainingId] = useState(row.trainingId ?? '');
  const [soinType, setSoinType] = useState<SoinType | ''>(row.soinType ?? '');
  const [amount, setAmount] = useState(row.amount);
  const [done, setDone] = useState(row.done);
  const [ecartNote, setEcartNote] = useState(row.ecartNote ?? '');

  const isPlanning = row.source === 'planning';
  const isSoin = row.source === 'soins';
  const isDouche = row.source === 'douches';

  function save() {
    const patch: Partial<RecapRow> & { ecartNote?: string } = { done, ecartNote };
    if (isPlanning) {
      patch.employeeId = employeeId;
      patch.horseId = horseId;
      patch.trainingId = trainingId;
    } else if (isSoin) {
      patch.assignedTo = employeeId;
      patch.horseId = horseId;
      patch.soinType = (soinType || undefined) as SoinType | undefined;
      patch.amount = amount;
    } else if (isDouche) {
      patch.assignedTo = employeeId;
      patch.horseId = horseId;
    }
    onSave(patch);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Modifier l'acte"
      subtitle={`${row.horseName} · ${row.description}`}
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <button className="btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={save}><Check size={15} /> Enregistrer</button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Intervenant</label>
            <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">— Non assigné —</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Cheval</label>
            <select className="input" value={horseId} onChange={(e) => setHorseId(e.target.value)}>
              {horses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        </div>

        {isPlanning && (
          <div>
            <label className="label">Entraînement</label>
            <select className="input" value={trainingId} onChange={(e) => setTrainingId(e.target.value)}>
              {trainings.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        {isSoin && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Type de soin</label>
              <select className="input" value={soinType} onChange={(e) => setSoinType(e.target.value as SoinType)}>
                {(Object.keys(soinLabels) as SoinType[]).map((k) => <option key={k} value={k}>{soinLabels[k]}</option>)}
              </select>
            </div>
            {soinType === 'soin_particulier' && (
              <div>
                <label className="label">Montant (€)</label>
                <input type="number" step="0.5" className="input" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </div>
            )}
          </div>
        )}

        <div>
          <label className="label">Statut</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDone(false)} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${!done ? 'bg-stable-700 text-white' : 'bg-stable-100 text-stable-600 hover:bg-stable-200'}`}>À faire</button>
            <button type="button" onClick={() => setDone(true)} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${done ? 'bg-emerald-500 text-white' : 'bg-stable-100 text-stable-600 hover:bg-stable-200'}`}>Fait</button>
          </div>
        </div>

        <div>
          <label className="label flex items-center gap-2"><AlertTriangle size={14} className="text-amber-600" /> Écart par rapport à la prévision</label>
          <input className="input" value={ecartNote} onChange={(e) => setEcartNote(e.target.value)} placeholder="Ex: cavalier remplacé, entraînement adapté, cheval absent…" />
          <p className="text-xs text-stable-500 mt-1.5">Ce champ trace les modifications. Il est visible ici et dans le PDF, sans modifier le commentaire métier de l'acte.</p>
        </div>

        {row.source === 'ferrage' && (
          <div className="rounded-xl bg-stable-50 border border-stable-100 px-4 py-3 text-sm text-stable-600">
            Les ferrures sont validées par le maréchal et ne sont pas modifiables depuis ce récapitulatif.
          </div>
        )}
      </div>
    </Modal>
  );
}
