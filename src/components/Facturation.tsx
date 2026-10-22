import { useMemo, useState } from 'react';
import { Receipt, Download, Plus, TrendingUp, Wallet, FileText, Check, Trash2, Info, Droplets } from 'lucide-react';
import { useApp } from '@/store';
import type { Employee, TrainingCategory } from '@/types';
import { roleLabel, fmtDate, todayISO, addDays } from '@/lib';
import { generatePdf } from '@/pdfUtils';
import { Confirm, EmptyState, Modal } from './ui';

type Period = 'day' | 'week' | 'month';

interface DetailRow { label: string; qty: number; unit: number; total: number }

export function FacturationPage() {
  const { employees, tarifGrids, setEmployees, soins, planning, trainings, douches, authUser } = useApp();
  const [period, setPeriod] = useState<Period>('month');
  const [advancingEmp, setAdvancingEmp] = useState<Employee | null>(null);
  const [toDeleteAdvance, setToDeleteAdvance] = useState<{ emp: Employee; advanceId: string } | null>(null);

  const { start, end } = useMemo(() => {
    const today = todayISO();
    if (period === 'day') return { start: today, end: today };
    if (period === 'week') return { start: addDays(today, -6), end: today };
    return { start: addDays(today, -29), end: today };
  }, [period]);

  const rows = useMemo(() => {
    return employees
      .filter((e) => e.role === 'cavalier' || e.role === 'lad' || e.role === 'palefrenier')
      .map((emp) => {
        const grid = tarifGrids.find((g) => g.id === emp.tarifGridId);
        const detail: DetailRow[] = [];
        let total = 0;

if (emp.role === 'cavalier' || emp.role === 'lad') {
  // Count from planning entries done in the period, grouped by training category.
  const periodEntries = planning.filter((p) => p.riderId === emp.id && p.date >= start && p.date <= end && p.done);
  const counts: Record<TrainingCategory, number> = { lot: 0, longe: 0, natation: 0, paddock: 0, autre: 0 };
  periodEntries.forEach((p) => {
    const tr = trainings.find((t) => t.id === p.trainingId);
    const cat = tr?.category ?? 'lot';
    counts[cat] += 1;
  });
  const r = grid?.rates ?? { lot: 0, longe: 0, natation: 0, paddock: 0, douche: 0, nettoyage: 0, vidage: 0, nourriture: 0 };
  const tr = grid?.trainingRates ?? {};
  
  const perTrainingTotals = new Map<string, { name: string; qty: number; unit: number }>();
  const categoryTotals: Record<string, { qty: number; unit: number }> = {};
  
  periodEntries.forEach((p) => {
    const training = trainings.find((t) => t.id === p.trainingId);
    const cat = training?.category ?? 'lot';
    const customPrice = tr[p.trainingId];
    
    if (customPrice !== undefined) {
      const existing = perTrainingTotals.get(p.trainingId);
      if (existing) existing.qty += 1;
      else perTrainingTotals.set(p.trainingId, { name: training?.name ?? p.trainingId, qty: 1, unit: customPrice });
    } else {
      // Pour le paddock, le tarif unitaire est de 0€ par défaut
      const defaultUnit = cat === 'paddock' ? 0 : (r[cat as keyof typeof r] ?? 0);
      if (!categoryTotals[cat]) categoryTotals[cat] = { qty: 0, unit: defaultUnit };
      categoryTotals[cat].qty += 1;
    }
  });

  // Push per-training rows
  perTrainingTotals.forEach((v) => {
    if (v.qty > 0) { // On autorise l'affichage même si unit === 0 pour le paddock si souhaité
      const t = v.qty * v.unit;
      detail.push({ label: v.name, qty: v.qty, unit: v.unit, total: t });
      total += t;
    }
  });

  // Push category rows
  const catLabels: Record<string, string> = { lot: 'Lots montés', longe: 'Longes', natation: 'Natation', paddock: 'Paddock', autre: 'Autres' };
  Object.entries(categoryTotals).forEach(([cat, { qty, unit }]) => {
    if (qty > 0 && (unit > 0 || cat === 'paddock')) { // Permet d'afficher les paddocks à 0€ dans le récapitulatif
      const t = qty * unit;
      detail.push({ label: catLabels[cat] ?? cat, qty, unit, total: t });
      total += t;
    }
  });

  // Douches assigned to this rider
  const periodDouches = douches.filter((d) => d.assignedTo === emp.id && d.date >= start && d.date <= end && d.done);
  if (periodDouches.length > 0 && r.douche > 0) {
    detail.push({ label: 'Douches', qty: periodDouches.length, unit: r.douche, total: periodDouches.length * r.douche });
    total += periodDouches.length * r.douche;
          }
        } else if (emp.role === 'palefrenier') {
          const periodSoins = soins.filter((s) => s.assignedTo === emp.id && s.date >= start && s.date <= end && s.done);
          const nettoyages = periodSoins.filter((s) => s.type === 'nettoyage_box').length;
          const vidages = periodSoins.filter((s) => s.type === 'vidage_box').length;
          const nourritureDays = new Set(periodSoins.filter((s) => s.type === 'nourriture').map((s) => s.date)).size;
          const particulier = periodSoins.filter((s) => s.type === 'soin_particulier');
          const r = emp.pricing ?? { nettoyage: 0, vidage: 0, nourriture: 0, soinParticulier: 0 };
          const items: [string, number, number][] = [
            ['Nettoyages de box', nettoyages, r.nettoyage],
            ['Vidages complets', vidages, r.vidage],
            ['Nourriture (forfait/jour)', nourritureDays, r.nourriture],
          ];
          items.filter(([, qty, unit]) => qty > 0 && unit > 0).forEach(([label, qty, unit]) => {
            const t = qty * unit;
            detail.push({ label, qty, unit, total: t });
            total += t;
          });
          // Soin particulier with custom price
          particulier.forEach((s) => {
            const unit = s.price ?? r.soinParticulier ?? 15;
            detail.push({ label: 'Soin particulier', qty: 1, unit, total: unit });
            total += unit;
          });
          // Douches assigned to this palefrenier
          const periodDouches = douches.filter((d) => d.assignedTo === emp.id && d.date >= start && d.date <= end && d.done);
          if (periodDouches.length > 0) {
            const doucheRate = tarifGrids.find((g) => g.role === 'palefrenier')?.rates.douche ?? 5;
            detail.push({ label: 'Douches', qty: periodDouches.length, unit: doucheRate, total: periodDouches.length * doucheRate });
            total += periodDouches.length * doucheRate;
          }
        }

        const advances = emp.advances ?? [];
        const advancesTotal = advances.reduce((s, a) => s + a.amount, 0);
        const net = total - advancesTotal;
        return { emp, detail, total, advances, advancesTotal, net };
      });
  }, [employees, tarifGrids, soins, planning, trainings, douches, start, end]);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const grandAdvances = rows.reduce((s, r) => s + r.advancesTotal, 0);
  const grandNet = grandTotal - grandAdvances;
  const activeRows = rows.filter((r) => r.detail.length > 0 || r.advances.length > 0);

  function exportCSV() {
    const lines = ['Employé,Rôle,Acte,Quantité,Tarif unitaire,Total'];
    rows.forEach((r) => {
      if (r.detail.length === 0) lines.push(`${r.emp.firstName} ${r.emp.lastName},${roleLabel(r.emp.role)},—,0,0,0`);
      r.detail.forEach((d) => lines.push(`${r.emp.firstName} ${r.emp.lastName},${roleLabel(r.emp.role)},"${d.label}",${d.qty},${d.unit},${d.total}`));
    });
    lines.push('', `Total brut,,,,,${grandTotal}€`, `Avances,,,,,${grandAdvances}€`, `Net à payer,,,,,${grandNet}€`);
    downloadBlob(lines.join('\n'), `facturation-${period}-${todayISO()}.csv`, 'text/csv;charset=utf-8');
  }

  function exportPDF() {
    const sections = [{
      heading: 'Relevé d\'interventions',
      table: {
        headers: ['Employé', 'Rôle', 'Acte', 'Qté', 'Prix unit.', 'Total'],
        rows: rows.flatMap((r) => {
          const base: string[][] = r.detail.length ? r.detail.map((d) => [`${r.emp.firstName} ${r.emp.lastName}`, roleLabel(r.emp.role), d.label, String(d.qty), `${d.unit}€`, `${d.total}€`]) : [[`${r.emp.firstName} ${r.emp.lastName}`, roleLabel(r.emp.role), 'Aucune prestation', '0', '0€', '0€']];
          r.advances.forEach((a) => base.push([`${r.emp.firstName} ${r.emp.lastName}`, roleLabel(r.emp.role), `Avance (${a.method})`, '1', '—', `-${a.amount}€`]));
          base.push([`${r.emp.firstName} ${r.emp.lastName}`, roleLabel(r.emp.role), 'NET À PAYER', '', '', `${r.net}€`]);
          return base;
        }),
      },
    }];
    generatePdf('Facturation', `${fmtDate(start)} → ${fmtDate(end)} · Total écurie: ${grandNet}€`, sections, { logoUrl: authUser?.logoUrl });
  }

  function addAdvance(emp: Employee, amount: number, method: string) {
    const advance = { id: `a${Date.now()}`, date: todayISO(), amount, method };
    setEmployees((prev) => prev.map((e) => e.id === emp.id ? { ...e, advances: [...(e.advances ?? []), advance] } : e));
    setAdvancingEmp(null);
  }

  function deleteAdvance(empId: string, advanceId: string) {
    setEmployees((prev) => prev.map((e) => e.id === empId ? { ...e, advances: (e.advances ?? []).filter((a) => a.id !== advanceId) } : e));
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card p-5 flex flex-col lg:flex-row gap-4 lg:items-center">
        <div>
          <h2 className="font-display font-bold text-stable-900 text-lg flex items-center gap-2"><Receipt size={20} /> Facturation & coûts</h2>
          <p className="text-sm text-stable-600 mt-1">Calcul automatique depuis le planning d'entraînement et les soins réalisés.</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          <div className="flex bg-stable-100 rounded-xl p-1">
            {(['day', 'week', 'month'] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition ${period === p ? 'bg-white text-stable-900 shadow-sm' : 'text-stable-500'}`}>
                {p === 'day' ? 'Jour' : p === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
          <button className="btn-outline" onClick={exportCSV}><Download size={15} /> CSV</button>
          <button className="btn-outline" onClick={exportPDF}><FileText size={15} /> PDF</button>
        </div>
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-start gap-3 text-sm text-blue-800">
        <Info size={16} className="shrink-0 mt-0.5" />
        <div>Pour les cavaliers, le calcul compte chaque entraînement validé dans le planning selon sa catégorie (lot monté, longe ou natation). Pour les palefreniers, le calcul compte chaque soin validé. Pensez à cocher « travail effectué » dans le planning et les soins pour les voir apparaître ici.</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <SummaryCard icon={<TrendingUp size={18} />} label="Total brut" value={`${grandTotal}€`} sub={`${activeRows.length} employé(s) actif(s)`} color="emerald" />
        <SummaryCard icon={<Wallet size={18} />} label="Avances" value={`${grandAdvances}€`} sub="versées" color="gold" />
        <SummaryCard icon={<Receipt size={18} />} label="Net à payer" value={`${grandNet}€`} sub="après avances" color="blue" />
      </div>

      <p className="text-xs text-stable-500">Période : {fmtDate(start)} → {fmtDate(end)}</p>

      {rows.length === 0 ? (
        <EmptyState icon={<Receipt size={24} />} title="Aucun employé" message="Ajoutez des cavaliers, lads ou palefreniers pour calculer les prestations." />
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.emp.id} className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-stable-50 border-b border-stable-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stable-700 text-white flex items-center justify-center font-semibold shrink-0">{r.emp.firstName[0]}{r.emp.lastName[0]}</div>
                  <div>
                    <div className="font-semibold text-stable-900">{r.emp.firstName} {r.emp.lastName}</div>
                    <div className="text-xs text-stable-500">{roleLabel(r.emp.role)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-stable-500">Net</div>
                    <div className="font-display font-bold text-stable-900 text-lg">{r.net}€</div>
                  </div>
                  <button className="btn-outline py-2" onClick={() => setAdvancingEmp(r.emp)}><Plus size={14} /> Avance</button>
                </div>
              </div>
              <div className="p-5">
                {r.detail.length === 0 ? (
                  <p className="text-sm text-stable-400">Aucune prestation sur la période. Validez des entrées dans le planning ou les soins pour alimenter la facturation.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-stable-500 uppercase tracking-wide"><th className="pb-2">Acte</th><th className="pb-2 text-right">Qté</th><th className="pb-2 text-right">Prix unit.</th><th className="pb-2 text-right">Total</th></tr></thead>
                    <tbody>
                      {r.detail.map((d, i) => (
                        <tr key={i} className="border-t border-stable-100"><td className="py-2">{d.label}</td><td className="py-2 text-right">{d.qty}</td><td className="py-2 text-right">{d.unit}€</td><td className="py-2 text-right font-semibold">{d.total}€</td></tr>
                      ))}
                      {r.advances.map((a) => (
                        <tr key={a.id} className="border-t border-stable-100 text-gold-700 group">
                          <td className="py-2"><span className="inline-flex items-center gap-2"><Wallet size={13} /> Avance ({a.method}) — {fmtDate(a.date)} <button className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700" onClick={() => setToDeleteAdvance({ emp: r.emp, advanceId: a.id })}><Trash2 size={12} /></button></span></td>
                          <td className="py-2 text-right">1</td><td className="py-2 text-right">—</td><td className="py-2 text-right font-semibold">-{a.amount}€</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t-2 border-stable-200"><td colSpan={3} className="py-3 font-semibold">Net à payer</td><td className="py-3 text-right font-display font-bold text-lg">{r.net}€</td></tr></tfoot>
                  </table>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {advancingEmp && <AdvanceModal emp={advancingEmp} onClose={() => setAdvancingEmp(null)} onSave={addAdvance} />}
      <Confirm open={!!toDeleteAdvance} onClose={() => setToDeleteAdvance(null)} onConfirm={() => toDeleteAdvance && deleteAdvance(toDeleteAdvance.emp.id, toDeleteAdvance.advanceId)} title="Supprimer l'avance ?" message="Cette avance sera retirée du décompte." confirmLabel="Supprimer" danger />
    </div>
  );
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click(); URL.revokeObjectURL(url);
}

function SummaryCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: 'emerald' | 'gold' | 'blue' }) {
  const colors: Record<string, string> = { emerald: 'bg-emerald-100 text-emerald-700', gold: 'bg-gold-100 text-gold-700', blue: 'bg-blue-100 text-blue-700' };
  return (
    <div className="card p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${colors[color]}`}>{icon}</div>
      <div className="font-display font-bold text-stable-900 text-2xl">{value}</div>
      <div className="text-sm font-semibold text-stable-700">{label}</div>
      <div className="text-xs text-stable-500">{sub}</div>
    </div>
  );
}

function AdvanceModal({ emp, onClose, onSave }: { emp: Employee; onClose: () => void; onSave: (e: Employee, amount: number, method: string) => void }) {
  const [amount, setAmount] = useState(50);
  const [method, setMethod] = useState('espèces');
  return (
    <Modal open onClose={onClose} title="Ajouter une avance" subtitle={`${emp.firstName} ${emp.lastName}`}
      footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={onClose}>Annuler</button><button className="btn-primary" onClick={() => onSave(emp, amount, method)}><Check size={15} /> Enregistrer</button></div>}
    >
      <div className="space-y-4">
        <div><label className="label">Montant (€)</label><input type="number" className="input" value={amount} onChange={(e) => setAmount(Number(e.target.value))} min={0} /></div>
        <div><label className="label">Mode de versement</label><select className="input" value={method} onChange={(e) => setMethod(e.target.value)}><option value="espèces">Espèces</option><option value="virement">Virement</option><option value="chèque">Chèque</option></select></div>
      </div>
    </Modal>
  );
}
