import { useState } from 'react';
import { Plus, Pencil, Trash2, Users, Phone, Grid3x3, Save, X, Palette } from 'lucide-react';
import { useApp } from '@/store';
import type { Employee, EmployeeRole, TarifGrid } from '@/types';
import { employeeHasRole, employeeRoleLabels, employeeTarifGridId, roleLabel, DEFAULT_PALEFRENIER_PRICING } from '@/lib';
import { Badge, Confirm, EmptyState, Modal } from './ui';

const roles: EmployeeRole[] = ['cavalier', 'lad', 'palefrenier', 'marechal'];

const PALETTE = [
  '#dbeafe', '#bfdbfe', '#fef3c7', '#fde68a', '#dcfce7', '#bbf7d0',
  '#fce7f3', '#fbcfe8', '#e0e7ff', '#c7d2fe', '#ffedd5', '#fed7aa',
  '#ecfccb', '#d9f99d', '#fae8ff', '#f5d0fe',
];

export function TeamPage() {
  const { employees, setEmployees, tarifGrids, setTarifGrids, planning, soins, trainings } = useApp();
  const [tab, setTab] = useState<'team' | 'tarifs'>('team');
  const [editing, setEditing] = useState<Employee | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Employee | null>(null);
  const [editingGrid, setEditingGrid] = useState<TarifGrid | null>(null);
  const [creatingGrid, setCreatingGrid] = useState(false);
  const [gridToDelete, setGridToDelete] = useState<TarifGrid | null>(null);

  const riderStats = computeRiderStats(planning, soins, employees);

  function saveEmployee(emp: Employee) {
    setEmployees((prev) => {
      const exists = prev.some((x) => x.id === emp.id);
      return exists ? prev.map((x) => (x.id === emp.id ? emp : x)) : [...prev, emp];
    });
    setEditing(null); setCreating(false);
  }

  function saveGrid(g: TarifGrid) {
    setTarifGrids((prev) => {
      const exists = prev.some((x) => x.id === g.id);
      return exists ? prev.map((x) => (x.id === g.id ? g : x)) : [...prev, g];
    });
    setEditingGrid(null); setCreatingGrid(false);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex bg-stable-100 rounded-xl p-1 max-w-md">
        <button onClick={() => setTab('team')} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${tab === 'team' ? 'bg-white text-stable-900 shadow-sm' : 'text-stable-500'}`}><Users size={15} /> Équipe</button>
        <button onClick={() => setTab('tarifs')} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${tab === 'tarifs' ? 'bg-white text-stable-900 shadow-sm' : 'text-stable-500'}`}><Grid3x3 size={15} /> Grilles tarifaires</button>
      </div>

      {tab === 'team' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-stable-600">Annuaire du personnel, rôles et codes PIN terrain. La couleur attribuée à chaque cavalier apparaît dans le planning.</p>
            <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Ajouter</button>
          </div>

          {employees.length === 0 ? (
            <EmptyState icon={<Users size={24} />} title="Aucun membre" message="Ajoutez les membres de votre écurie." />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map((e) => {
                const stats = riderStats[e.id];
                const riderRole = (['cavalier', 'lad'] as const).find((role) => employeeHasRole(e, role));
                const riderGrid = riderRole && tarifGrids.find((g) => g.id === employeeTarifGridId(e, riderRole) && g.role === riderRole);
                const palefrenierGrid = employeeHasRole(e, 'palefrenier')
                  ? tarifGrids.find((g) => g.id === employeeTarifGridId(e, 'palefrenier') && g.role === 'palefrenier')
                  : undefined;
                return (
                  <div key={e.id} className="card p-5 group hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl text-white flex items-center justify-center font-semibold shrink-0" style={{ backgroundColor: e.color ?? '#2c4a47' }}>{e.firstName[0]}{e.lastName[0]}</div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-stable-900 truncate">{e.firstName} {e.lastName}</h3>
                          <Badge level="neutral">{employeeRoleLabels(e)}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button className="p-1.5 rounded-lg text-stable-400 hover:bg-stable-100 hover:text-stable-700" onClick={() => setEditing(e)}><Pencil size={15} /></button>
                        <button className="p-1.5 rounded-lg text-stable-400 hover:bg-red-50 hover:text-red-600" onClick={() => setToDelete(e)}><Trash2 size={15} /></button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm text-stable-600">
                      <div className="flex items-center gap-2"><Phone size={13} className="text-stable-400" /> {e.phone}</div>
                      {e.pin && <div className="flex items-center gap-2"><span className="text-stable-400 text-xs">PIN</span> <span className="font-mono tracking-widest text-stable-800">••••</span></div>}
                      {riderRole && e.color && (
                        <div className="flex items-center gap-2"><Palette size={13} className="text-stable-400" /> <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: e.color }} /> Couleur planning</div>
                      )}
                      {stats && (stats.lots > 0 || stats.longes > 0 || stats.natation > 0) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="chip bg-blue-50 text-blue-700">Lots: {stats.lots}</span>
                          <span className="chip bg-gold-100 text-gold-700">Longes: {stats.longes}</span>
                          <span className="chip bg-emerald-100 text-emerald-700">Natation: {stats.natation}</span>
                        </div>
                      )}
                      {riderGrid && (
                        <div className="text-xs text-stable-500 mt-2">
                          <div className="font-medium text-stable-700">Grille {roleLabel(riderRole)} : {riderGrid.name}</div>
                          <>Lot: {riderGrid.rates.lot}€ · Longe: {riderGrid.rates.longe}€ · Natation: {riderGrid.rates.natation}€</>
                        </div>
                      )}
                      {palefrenierGrid && (
                        <div className="text-xs text-stable-500 mt-2">
                          <div className="font-medium text-stable-700">Grille Palefrenier : {palefrenierGrid.name}</div>
                          Nettoyage: {palefrenierGrid.rates.nettoyage}€ · Vidage: {palefrenierGrid.rates.vidage}€ · Nourriture: {palefrenierGrid.rates.nourriture}€ · Douche: {palefrenierGrid.rates.douche}€
                        </div>
                      )}
                      {employeeHasRole(e, 'palefrenier') && !palefrenierGrid && e.pricing && <div className="text-xs text-stable-500 mt-2">Tarif personnalisé — Nettoyage: {e.pricing.nettoyage}€ · Vidage: {e.pricing.vidage}€ · Nourriture: {e.pricing.nourriture}€</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(editing || creating) && <EmployeeForm employee={editing} tarifGrids={tarifGrids} onClose={() => { setEditing(null); setCreating(false); }} onSave={saveEmployee} />}
          <Confirm open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => toDelete && setEmployees((prev) => prev.filter((e) => e.id !== toDelete.id))} title="Supprimer le membre ?" message={`« ${toDelete?.firstName} ${toDelete?.lastName} » sera retiré de l'équipe.`} confirmLabel="Supprimer" danger />
        </>
      )}

      {tab === 'tarifs' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-stable-600">Grilles de tarifs applicables par catégorie d'employés. Pour les palefreniers : nettoyage, vidage, nourriture et douche.</p>
            <button className="btn-primary" onClick={() => setCreatingGrid(true)}><Plus size={16} /> Nouvelle grille</button>
          </div>

          {tarifGrids.length === 0 ? (
            <EmptyState icon={<Grid3x3 size={24} />} title="Aucune grille" message="Créez une grille tarifaire pour calculer automatiquement les prestations." />
          ) : (
            <div className="space-y-3">
              {tarifGrids.map((g) => (
                <div key={g.id} className="card p-5 group hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display font-bold text-stable-900 text-lg">{g.name}</h3>
                      <Badge level="blue">{roleLabel(g.role)}</Badge>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button className="p-1.5 rounded-lg text-stable-400 hover:bg-stable-100 hover:text-stable-700" onClick={() => setEditingGrid(g)}><Pencil size={15} /></button>
                      <button className="p-1.5 rounded-lg text-stable-400 hover:bg-red-50 hover:text-red-600" onClick={() => setGridToDelete(g)}><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {Object.entries(g.rates).filter(([, v]) => v > 0).map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-stable-50 px-3 py-2"><span className="text-stable-500 capitalize text-xs">{k}</span><div className="font-bold text-stable-900">{v}€{g.role === 'palefrenier' && (k === 'nettoyage' || k === 'vidage') ? '/cheval' : ''}{g.role === 'palefrenier' && k === 'nourriture' ? ' (forfait)' : ''}</div></div>
                    ))}
                  </div>
                  {g.role !== 'palefrenier' && Object.keys(g.trainingRates).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stable-100">
                      <div className="text-xs font-semibold text-stable-600 mb-2">Tarifs par entraînement spécifique</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(g.trainingRates).map(([tid, price]) => {
                          const t = trainings.find((tr) => tr.id === tid);
                          return (
                            <span key={tid} className="chip bg-blue-50 text-blue-700">{t?.name ?? tid}: {price}€</span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {(editingGrid || creatingGrid) && <TarifForm grid={editingGrid} trainings={trainings} onClose={() => { setEditingGrid(null); setCreatingGrid(false); }} onSave={saveGrid} />}
          <Confirm open={!!gridToDelete} onClose={() => setGridToDelete(null)} onConfirm={() => gridToDelete && setTarifGrids((prev) => prev.filter((g) => g.id !== gridToDelete.id))} title="Supprimer la grille ?" message="Cette grille tarifaire sera supprimée." confirmLabel="Supprimer" danger />
        </>
      )}
    </div>
  );
}

function computeRiderStats(
  planning: { riderId: string; trainingId: string; done: boolean; date: string }[],
  _soins: unknown,
  employees: Employee[],
): Record<string, { lots: number; longes: number; natation: number }> {
  const out: Record<string, { lots: number; longes: number; natation: number }> = {};
  employees.filter((e) => employeeHasRole(e, 'cavalier') || employeeHasRole(e, 'lad')).forEach((e) => {
    out[e.id] = { lots: 0, longes: 0, natation: 0 };
  });
  return out;
}

function EmployeeForm({ employee, tarifGrids, onClose, onSave }: { employee: Employee | null; tarifGrids: TarifGrid[]; onClose: () => void; onSave: (e: Employee) => void }) {
  const [form, setForm] = useState<Employee>(
    employee ? {
      ...employee,
      tarifGridIds: employee.tarifGridIds ?? { [employee.role]: employee.tarifGridId },
    } : {
      id: `e${Date.now()}`,
      firstName: '', lastName: '', phone: '', role: 'cavalier', pin: '',
      color: PALETTE[employees_colorIndex(employee, tarifGrids) % PALETTE.length],
    },
  );

  function set<K extends keyof Employee>(k: K, v: Employee[K]) { setForm((f) => ({ ...f, [k]: v })); }
  function setPrice(k: keyof NonNullable<Employee['pricing']>, v: number) { setForm((f) => ({ ...f, pricing: { ...f.pricing!, [k]: v } })); }
  function setRole(role: EmployeeRole) {
    setForm((f) => ({
      ...f,
      role,
      roles: undefined,
      pricing: role === 'palefrenier' ? f.pricing ?? { ...DEFAULT_PALEFRENIER_PRICING } : f.pricing,
    }));
  }
  function setPalefrenierRole(enabled: boolean) {
    setForm((f) => ({
      ...f,
      roles: enabled ? [...new Set([f.role, 'palefrenier' as const])] : undefined,
      pricing: enabled ? f.pricing ?? { ...DEFAULT_PALEFRENIER_PRICING } : f.pricing,
    }));
  }
  function setGrid(role: EmployeeRole, id: string) {
    setForm((f) => ({
      ...f,
      tarifGridIds: { ...f.tarifGridIds, [role]: id || undefined },
      tarifGridId: f.role === role ? id || undefined : f.tarifGridId,
    }));
  }

  const hasRiderRole = form.role === 'cavalier' || form.role === 'lad';
  const hasPalefrenierRole = form.role === 'palefrenier' || employeeHasRole(form, 'palefrenier');
  const showPin = form.role !== 'marechal';
  const riderGrids = hasRiderRole ? tarifGrids.filter((g) => g.role === form.role) : [];
  const palefrenierGrids = hasPalefrenierRole ? tarifGrids.filter((g) => g.role === 'palefrenier') : [];
  const selectedPalefrenierGrid = palefrenierGrids.find((g) => g.id === employeeTarifGridId(form, 'palefrenier'));
  const showColor = hasRiderRole;

  return (
    <Modal open onClose={onClose} title={employee ? 'Modifier le membre' : 'Nouveau membre'} size="lg"
      footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={!form.firstName || !form.lastName} onClick={() => onSave({ ...form, roles: [...new Set([form.role, ...(form.roles ?? [])])] })}><Save size={15} /> Enregistrer</button></div>}
    >
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">Prénom *</label><input className="input" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></div>
          <div><label className="label">Nom *</label><input className="input" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></div>
          <div><label className="label">Téléphone</label><input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+33 6 ..." /></div>
          <div><label className="label">Rôle principal</label><select className="input" value={form.role} onChange={(e) => setRole(e.target.value as EmployeeRole)}>{roles.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select></div>
          {showPin && <div><label className="label">Code PIN (4 chiffres)</label><input className="input tracking-[0.4em] text-center" maxLength={4} value={form.pin ?? ''} onChange={(e) => set('pin', e.target.value.replace(/\D/g, ''))} placeholder="••••" inputMode="numeric" /></div>}
        </div>

        {hasRiderRole && (
          <label className="flex items-center gap-2 text-sm text-stable-700">
            <input type="checkbox" checked={employeeHasRole(form, 'palefrenier')} onChange={(e) => setPalefrenierRole(e.target.checked)} />
            Cette personne est aussi palefrenier
          </label>
        )}

        {showColor && (
          <div>
            <label className="label flex items-center gap-2"><Palette size={14} /> Couleur dans le planning</label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button key={c} type="button" onClick={() => set('color', c)}
                  className={`w-8 h-8 rounded-lg border-2 transition ${form.color === c ? 'border-stable-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <p className="text-xs text-stable-500 mt-1">Cette couleur teinte les lignes du planning associées à ce cavalier.</p>
          </div>
        )}

        {showColor && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
            Les volumes (lots, longes, natation) sont calculés automatiquement à partir du planning d'entraînement.
          </div>
        )}

        {hasRiderRole && riderGrids.length > 0 && (
          <div>
            <label className="label">Grille tarifaire {roleLabel(form.role)}</label>
            <select className="input" value={employeeTarifGridId(form, form.role) ?? ''} onChange={(e) => setGrid(form.role, e.target.value)}>
              <option value="">— Tarif personnalisé —</option>
              {riderGrids.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}

        {hasPalefrenierRole && (
          <div className="space-y-3">
            {palefrenierGrids.length > 0 && (
              <div>
                <label className="label">Grille tarifaire Palefrenier</label>
                <select className="input" value={employeeTarifGridId(form, 'palefrenier') ?? ''} onChange={(e) => setGrid('palefrenier', e.target.value)}>
                  <option value="">— Tarif personnalisé —</option>
                  {palefrenierGrids.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            )}
            {!selectedPalefrenierGrid && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><label className="label">Nettoyage box (€)</label><input type="number" step="0.5" className="input" value={form.pricing?.nettoyage ?? 0} onChange={(e) => setPrice('nettoyage', Number(e.target.value))} /></div>
                <div><label className="label">Vidage box (€)</label><input type="number" step="0.5" className="input" value={form.pricing?.vidage ?? 0} onChange={(e) => setPrice('vidage', Number(e.target.value))} /></div>
                <div><label className="label">Nourriture (€)</label><input type="number" step="0.5" className="input" value={form.pricing?.nourriture ?? 0} onChange={(e) => setPrice('nourriture', Number(e.target.value))} /></div>
                <div><label className="label">Soin particulier (€)</label><input type="number" step="0.5" className="input" value={form.pricing?.soinParticulier ?? 0} onChange={(e) => setPrice('soinParticulier', Number(e.target.value))} /></div>
              </div>
            )}
            {selectedPalefrenierGrid && <p className="text-xs text-stable-500">La grille sélectionnée s'applique au nettoyage, au vidage, à la nourriture et aux douches. Le tarif du soin particulier reste personnalisé.</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}

function employees_colorIndex(_emp: Employee | null, _grids: TarifGrid[]): number {
  return Math.floor(Math.random() * PALETTE.length);
}

function TarifForm({ grid, trainings, onClose, onSave }: { grid: TarifGrid | null; trainings: { id: string; name: string }[]; onClose: () => void; onSave: (g: TarifGrid) => void }) {
  const [form, setForm] = useState<TarifGrid>(grid ?? {
    id: `g${Date.now()}`, name: '', role: 'cavalier',
    rates: { lot: 0, longe: 0, natation: 0, paddock: 0, douche: 0, nettoyage: 0, vidage: 0, nourriture: 0 },
    trainingRates: {},
  });
  const [selectedTraining, setSelectedTraining] = useState('');
  function setRate(k: keyof TarifGrid['rates'], v: number) { setForm((f) => ({ ...f, rates: { ...f.rates, [k]: v } })); }
  function addTrainingRate() {
    if (!selectedTraining) return;
    const existing = form.trainingRates[selectedTraining];
    const price = existing ?? form.rates.lot ?? 0;
    setForm((f) => ({ ...f, trainingRates: { ...f.trainingRates, [selectedTraining]: price } }));
    setSelectedTraining('');
  }
  function setTrainingRate(tid: string, v: number) { setForm((f) => ({ ...f, trainingRates: { ...f.trainingRates, [tid]: v } })); }
  function removeTrainingRate(tid: string) { setForm((f) => { const next = { ...f.trainingRates }; delete next[tid]; return { ...f, trainingRates: next }; }); }
  const isPalefrenier = form.role === 'palefrenier';
  const cavalierKeys: (keyof TarifGrid['rates'])[] = isPalefrenier ? ['nettoyage', 'vidage', 'nourriture', 'douche'] : ['lot', 'longe', 'natation', 'paddock', 'douche'];
  const rateLabels: Record<keyof TarifGrid['rates'], string> = {
    lot: 'Lot monté', longe: 'Longe', natation: 'Natation', paddock: 'Paddock', douche: 'Douche',
    nettoyage: 'Nettoyage box', vidage: 'Vidage box', nourriture: 'Nourriture',
  };
  const rateSuffix: Partial<Record<keyof TarifGrid['rates'], string>> = isPalefrenier ? { nettoyage: '/cheval', vidage: '/cheval', nourriture: ' (forfait)' } : {};
  const availableTrainings = trainings.filter((t) => !form.trainingRates[t.id]);
  return (
    <Modal open onClose={onClose} title={grid ? 'Modifier la grille' : 'Nouvelle grille tarifaire'}
      footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={!form.name} onClick={() => onSave(form)}><Save size={15} /> Enregistrer</button></div>}
    >
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">Nom de la grille *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Catégorie</label><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as EmployeeRole })}>{roles.filter((r) => r !== 'marechal').map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select></div>
        </div>
        <div>
          <label className="label">Tarifs unitaires (€)</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cavalierKeys.map((k) => (
              <div key={k}>
                <div className="text-[11px] text-stable-500 mb-1">{rateLabels[k]}{rateSuffix[k] && <span className="text-stable-400"> ({rateSuffix[k]})</span>}</div>
                <input type="number" min={0} step="0.5" className="input" value={form.rates[k]} onChange={(e) => setRate(k, Number(e.target.value))} />
              </div>
            ))}
          </div>
          {isPalefrenier && <p className="text-xs text-stable-500 mt-2">Nettoyage et vidage : tarif par cheval. Nourriture : forfait pour tous les chevaux.</p>}
        </div>

        {!isPalefrenier && (
          <div>
            <label className="label">Tarifs spécifiques par entraînement</label>
            <p className="text-xs text-stable-500 mb-2">Définissez un tarif différent pour un entraînement précis (ex: Natation, Longe). Ce tarif remplace le tarif par catégorie.</p>
            <div className="flex gap-2 mb-2">
              <select className="input" value={selectedTraining} onChange={(e) => setSelectedTraining(e.target.value)}>
                <option value="">— Choisir un entraînement —</option>
                {availableTrainings.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button type="button" className="btn-outline shrink-0" disabled={!selectedTraining} onClick={addTrainingRate}><Plus size={15} /> Ajouter</button>
            </div>
            {Object.keys(form.trainingRates).length > 0 && (
              <div className="space-y-2">
                {Object.entries(form.trainingRates).map(([tid, price]) => {
                  const t = trainings.find((tr) => tr.id === tid);
                  return (
                    <div key={tid} className="flex items-center gap-2 rounded-xl border border-stable-200 p-3">
                      <div className="flex-1 text-sm font-medium text-stable-800">{t?.name ?? tid}</div>
                      <input type="number" min={0} step="0.5" className="input w-24 text-sm" value={price} onChange={(e) => setTrainingRate(tid, Number(e.target.value))} />
                      <span className="text-xs text-stable-500">€</span>
                      <button type="button" className="p-1.5 rounded-lg text-stable-400 hover:bg-red-50 hover:text-red-600" onClick={() => removeTrainingRate(tid)}><X size={14} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export { X };
