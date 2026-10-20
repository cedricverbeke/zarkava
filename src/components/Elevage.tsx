import { useState } from 'react';
import { Plus, Pencil, Trash2, Heart, Camera, CalendarDays, X, Save, ChevronRight } from 'lucide-react';
import { useApp } from '@/store';
import type { ElevageHorse, ElevageCategory, Saillie, SaillieStatus } from '@/types';
import { fmtDate, todayISO, addDays } from '@/lib';
import { compressImage } from '@/imageUtils';
import { Badge, Confirm, EmptyState, Modal } from './ui';

const categoryLabels: Record<ElevageCategory, string> = {
  jument: 'Jument', etalon: 'Étalon', poulain: 'Poulain', pouliche: 'Pouliche',
};
const categoryColors: Record<ElevageCategory, 'red' | 'blue' | 'green' | 'orange'> = {
  jument: 'red', etalon: 'blue', poulain: 'green', pouliche: 'orange',
};
const statusLabels: Record<SaillieStatus, string> = {
  refuse: 'Refusé', confirmee: 'Confirmée', en_attente: 'En attente',
};
const statusColors: Record<SaillieStatus, 'red' | 'green' | 'orange'> = {
  refuse: 'red', confirmee: 'green', en_attente: 'orange',
};
const FOALING_DAYS = 340;

export function ElevagePage() {
  const { elevageHorses, setElevageHorses, saillies, setSaillies } = useApp();
  const [tab, setTab] = useState<'effectif' | 'saillies'>('effectif');
  const [categoryFilter, setCategoryFilter] = useState<ElevageCategory | 'all'>('all');
  const [editing, setEditing] = useState<ElevageHorse | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<ElevageHorse | null>(null);
  const [editingSaillie, setEditingSaillie] = useState<Saillie | null>(null);
  const [creatingSaillie, setCreatingSaillie] = useState(false);
  const [saillieToDelete, setSaillieToDelete] = useState<Saillie | null>(null);
  const [jumentDetail, setJumentDetail] = useState<ElevageHorse | null>(null);

  function saveHorse(h: ElevageHorse) {
    setElevageHorses((prev) => {
      const exists = prev.some((x) => x.id === h.id);
      return exists ? prev.map((x) => (x.id === h.id ? h : x)) : [...prev, h];
    });
    setEditing(null); setCreating(false);
  }
  function saveSaillie(s: Saillie) {
    setSaillies((prev) => {
      let updated = prev;
      if (s.status === 'confirmee') {
        const today = todayISO();
        updated = updated.map((x) =>
          x.id !== s.id && x.jumentId === s.jumentId && x.status === 'en_attente'
            ? { ...x, status: 'refuse' as const, refuseDate: today }
            : x
        );
      }
      const exists = updated.some((x) => x.id === s.id);
      return exists ? updated.map((x) => (x.id === s.id ? s : x)) : [...updated, s];
    });
    setEditingSaillie(null); setCreatingSaillie(false);
  }

  const juments = elevageHorses.filter((h) => h.category === 'jument');
  const etalons = elevageHorses.filter((h) => h.category === 'etalon');
  const filtered = categoryFilter === 'all' ? elevageHorses : elevageHorses.filter((h) => h.category === categoryFilter);
  const sortedSaillies = [...saillies].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex bg-stable-100 rounded-xl p-1 max-w-md">
        <button onClick={() => setTab('effectif')} className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${tab === 'effectif' ? 'bg-white text-stable-900 shadow-sm' : 'text-stable-500'}`}>Effectif</button>
        <button onClick={() => setTab('saillies')} className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${tab === 'saillies' ? 'bg-white text-stable-900 shadow-sm' : 'text-stable-500'}`}>Saillies</button>
      </div>

      {tab === 'effectif' && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'jument', 'etalon', 'poulain', 'pouliche'] as const).map((c) => (
                <button key={c} onClick={() => setCategoryFilter(c)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${categoryFilter === c ? 'bg-stable-700 text-white' : 'bg-stable-100 text-stable-600 hover:bg-stable-200'}`}>
                  {c === 'all' ? 'Tous' : categoryLabels[c]} ({c === 'all' ? elevageHorses.length : elevageHorses.filter((h) => h.category === c).length})
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Ajouter</button>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<Heart size={24} />} title="Aucun cheval d'élevage" message="Ajoutez vos juments, étalons, poulains et pouliches." />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((h) => (
                <div key={h.id} className="card p-5 group hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {h.photo ? (
                        <img src={h.photo} alt={h.name} className="w-12 h-12 rounded-2xl object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-stable-600 to-stable-800 text-white flex items-center justify-center font-display font-bold text-lg shrink-0">{h.name.slice(0, 2)}</div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-display font-bold text-stable-900 truncate">{h.name}</h3>
                        <Badge level={categoryColors[h.category]}>{categoryLabels[h.category]}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button className="p-1.5 rounded-lg text-stable-400 hover:bg-stable-100 hover:text-stable-700" onClick={() => setEditing(h)}><Pencil size={15} /></button>
                      <button className="p-1.5 rounded-lg text-stable-400 hover:bg-red-50 hover:text-red-600" onClick={() => setToDelete(h)}><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-stable-600">
                    <div>{h.breed}</div>
                    {h.birthDate && <div className="flex items-center gap-1.5"><CalendarDays size={13} className="text-stable-400" /> Né(e) le {fmtDate(h.birthDate)}</div>}
                    {h.sire && <div className="text-xs text-stable-500">Sire: {h.sire}</div>}
                    {h.damName && <div className="text-xs text-stable-500">Mère: {h.damName}</div>}
                    {h.notes && <p className="text-xs italic bg-stable-50 rounded-lg px-3 py-2 mt-2">« {h.notes} »</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {(editing || creating) && <ElevageHorseForm horse={editing} onClose={() => { setEditing(null); setCreating(false); }} onSave={saveHorse} />}
          <Confirm open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => toDelete && setElevageHorses((prev) => prev.filter((h) => h.id !== toDelete.id))} title="Supprimer ?" message={`« ${toDelete?.name} » sera retiré de l'effectif d'élevage.`} confirmLabel="Supprimer" danger />
        </>
      )}

      {tab === 'saillies' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-stable-600">Suivi des saillies. Cliquez sur une jument pour voir le détail des sauts par étalon.</p>
            <button className="btn-primary" onClick={() => setCreatingSaillie(true)}><Plus size={16} /> Nouvelle saillie</button>
          </div>

          {sortedSaillies.length === 0 ? (
            <EmptyState icon={<Heart size={24} />} title="Aucune saillie" message="Enregistrez les saillies pour suivre les mises bas." />
          ) : (
            <div className="space-y-3">
              {/* Group by jument */}
              {juments.filter((j) => saillies.some((s) => s.jumentId === j.id)).map((jument) => {
                const jumentSaillies = sortedSaillies.filter((s) => s.jumentId === jument.id);
                const totalSauts = jumentSaillies.length;
                const confirmed = jumentSaillies.filter((s) => s.status === 'confirmee');
                const refused = jumentSaillies.filter((s) => s.status === 'refuse');
                const etalonsUsed = new Set(jumentSaillies.map((s) => s.etalonId));
                return (
                  <div key={jument.id} className="card p-5 group hover:shadow-md transition cursor-pointer" onClick={() => setJumentDetail(jument)}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center"><Heart size={20} /></div>
                        <div>
                          <h3 className="font-display font-bold text-stable-900">{jument.name}</h3>
                          <p className="text-xs text-stable-500">{etalonsUsed.size} étalon(s) · {totalSauts} saut(s)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {confirmed.length > 0 && <Badge level="green">{confirmed.length} confirmée(s)</Badge>}
                        {refused.length > 0 && <Badge level="red">{refused.length} refus</Badge>}
                        {jumentSaillies.some((s) => s.status === 'en_attente') && <Badge level="orange">En attente</Badge>}
                        <ChevronRight size={18} className="text-stable-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {jumentDetail && (
            <JumentSaillieDetail jument={jumentDetail} saillies={sortedSaillies.filter((s) => s.jumentId === jumentDetail.id)} elevageHorses={elevageHorses} onClose={() => setJumentDetail(null)} onEdit={(s) => { setJumentDetail(null); setEditingSaillie(s); }} onDelete={(s) => { setJumentDetail(null); setSaillieToDelete(s); }} />
          )}

          {(editingSaillie || creatingSaillie) && (
            <SaillieForm saillie={editingSaillie} juments={juments} etalons={etalons} onClose={() => { setEditingSaillie(null); setCreatingSaillie(false); }} onSave={saveSaillie} />
          )}
          <Confirm open={!!saillieToDelete} onClose={() => setSaillieToDelete(null)} onConfirm={() => saillieToDelete && setSaillies((prev) => prev.filter((s) => s.id !== saillieToDelete.id))} title="Supprimer la saillie ?" message="Cette saillie sera supprimée." confirmLabel="Supprimer" danger />
        </>
      )}
    </div>
  );
}

function ElevageHorseForm({ horse, onClose, onSave }: { horse: ElevageHorse | null; onClose: () => void; onSave: (h: ElevageHorse) => void }) {
  const [form, setForm] = useState<ElevageHorse>(horse ?? { id: `e${Date.now()}`, name: '', category: 'jument', breed: '', notes: '' });
  const [photoLoading, setPhotoLoading] = useState(false);
  function set<K extends keyof ElevageHorse>(k: K, v: ElevageHorse[K]) { setForm((f) => ({ ...f, [k]: v })); }
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    try { set('photo', await compressImage(file)); } catch { alert('Erreur'); }
    setPhotoLoading(false);
  }
  const showBirthDate = form.category === 'poulain' || form.category === 'pouliche';
  return (
    <Modal open onClose={onClose} title={horse ? 'Modifier' : 'Nouveau cheval d\'élevage'} size="lg"
      footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={!form.name} onClick={() => onSave(form)}><Save size={15} /> Enregistrer</button></div>}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          {form.photo ? <img src={form.photo} alt="" className="w-16 h-16 rounded-xl object-cover" /> : <div className="w-16 h-16 rounded-xl bg-stable-100 flex items-center justify-center text-stable-400"><Camera size={24} /></div>}
          <label className="btn-outline cursor-pointer"><Camera size={15} /> {photoLoading ? 'Chargement…' : 'Photo'}<input type="file" accept="image/*" className="hidden" onChange={handlePhoto} /></label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">Nom *</label><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div><label className="label">Catégorie</label><select className="input" value={form.category} onChange={(e) => set('category', e.target.value as ElevageCategory)}><option value="jument">Jument</option><option value="etalon">Étalon</option><option value="poulain">Poulain</option><option value="pouliche">Pouliche</option></select></div>
          <div><label className="label">Race</label><input className="input" value={form.breed} onChange={(e) => set('breed', e.target.value)} /></div>
          {showBirthDate && <div><label className="label">Date de naissance</label><input type="date" className="input" value={form.birthDate ?? ''} onChange={(e) => set('birthDate', e.target.value)} /></div>}
          <div><label className="label">Numéro Sire</label><input className="input" value={form.sire ?? ''} onChange={(e) => set('sire', e.target.value)} /></div>
          <div><label className="label">Nom de la mère</label><input className="input" value={form.damName ?? ''} onChange={(e) => set('damName', e.target.value)} /></div>
        </div>
        <div><label className="label">Remarques</label><textarea className="input min-h-[60px]" value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
      </div>
    </Modal>
  );
}

function SaillieForm({ saillie, juments, etalons, onClose, onSave }: { saillie: Saillie | null; juments: ElevageHorse[]; etalons: ElevageHorse[]; onClose: () => void; onSave: (s: Saillie) => void }) {
  const [form, setForm] = useState<Saillie>(saillie ?? { id: `s${Date.now()}`, date: todayISO(), jumentId: juments[0]?.id ?? '', etalonId: etalons[0]?.id ?? '', observations: '', sauts: 1, status: 'en_attente' });
  function set<K extends keyof Saillie>(k: K, v: Saillie[K]) { setForm((f) => ({ ...f, [k]: v })); }
  return (
    <Modal open onClose={onClose} title={saillie ? 'Modifier la saillie' : 'Nouvelle saillie'}
      footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={!form.jumentId || !form.etalonId} onClick={() => {
        const today = todayISO();
        let miseBas: string | undefined;
        let refuseDate: string | undefined;
        if (form.status === 'confirmee') {
          const baseDate = form.refuseDate ?? form.date;
          miseBas = addDays(baseDate, FOALING_DAYS);
        } else if (form.status === 'refuse') {
          refuseDate = today;
        }
        onSave({ ...form, sauts: 1, miseBasPrevue: miseBas, refuseDate });
      }}><Save size={15} /> Enregistrer</button></div>}
    >
      <div className="space-y-4">
        <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">Jument *</label><select className="input" value={form.jumentId} onChange={(e) => set('jumentId', e.target.value)}>{juments.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}</select></div>
          <div><label className="label">Étalon *</label><select className="input" value={form.etalonId} onChange={(e) => set('etalonId', e.target.value)}>{etalons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        </div>
        <div><label className="label">Statut</label><select className="input" value={form.status} onChange={(e) => set('status', e.target.value as SaillieStatus)}><option value="en_attente">En attente</option><option value="confirmee">Confirmée</option><option value="refuse">Refusé</option></select></div>
        <div><label className="label">Observations</label><textarea className="input min-h-[60px]" value={form.observations} onChange={(e) => set('observations', e.target.value)} /></div>
        {form.status === 'confirmee' && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
            Date présumée de mise bas: {fmtDate(addDays(form.refuseDate ?? form.date, FOALING_DAYS))}
            <p className="text-xs text-rose-500 mt-1">Calculée à partir de la date de refus (ou de la saillie si pas de refus).</p>
          </div>
        )}
        {form.status === 'refuse' && (
          <div><label className="label">Date de refus</label><input type="date" className="input" value={form.refuseDate ?? todayISO()} onChange={(e) => set('refuseDate', e.target.value)} /></div>
        )}
      </div>
    </Modal>
  );
}

function JumentSaillieDetail({ jument, saillies, elevageHorses, onClose, onEdit, onDelete }: {
  jument: ElevageHorse;
  saillies: Saillie[];
  elevageHorses: ElevageHorse[];
  onClose: () => void;
  onEdit: (s: Saillie) => void;
  onDelete: (s: Saillie) => void;
}) {
  const totalSauts = saillies.length;
  const confirmed = saillies.filter((s) => s.status === 'confirmee');
  const refused = saillies.filter((s) => s.status === 'refuse');
  const pending = saillies.filter((s) => s.status === 'en_attente');

  // Group by étalon
  const byEtalon = new Map<string, Saillie[]>();
  saillies.forEach((s) => {
    const arr = byEtalon.get(s.etalonId) ?? [];
    arr.push(s);
    byEtalon.set(s.etalonId, arr);
  });

  return (
    <Modal open onClose={onClose} title={jument.name} subtitle={`${totalSauts} saut(s) · ${byEtalon.size} étalon(s)`} size="lg"
      footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={onClose}>Fermer</button></div>}
    >
      <div className="space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-stable-50 px-3 py-3 text-center">
            <div className="font-display font-bold text-stable-900 text-2xl">{totalSauts}</div>
            <div className="text-xs text-stable-500">Total sauts</div>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-3 text-center">
            <div className="font-display font-bold text-emerald-700 text-2xl">{confirmed.length}</div>
            <div className="text-xs text-emerald-600">Confirmée(s)</div>
          </div>
          <div className="rounded-xl bg-red-50 px-3 py-3 text-center">
            <div className="font-display font-bold text-red-700 text-2xl">{refused.length}</div>
            <div className="text-xs text-red-600">Refus</div>
          </div>
        </div>

        {pending.length > 0 && (
          <div className="rounded-xl bg-gold-50 border border-gold-200 px-4 py-2.5 text-sm text-gold-700">
            {pending.length} saillie(s) en attente de confirmation
          </div>
        )}

        {/* Per étalon breakdown */}
        <div className="space-y-4">
          {Array.from(byEtalon.entries()).map(([etalonId, etalonSaillies]) => {
            const etalon = elevageHorses.find((h) => h.id === etalonId);
            const etalonConfirmed = etalonSaillies.filter((s) => s.status === 'confirmee');
            const etalonRefused = etalonSaillies.filter((s) => s.status === 'refuse');
            return (
              <div key={etalonId} className="rounded-xl border border-stable-200 overflow-hidden">
                <div className="flex items-center justify-between bg-stable-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Heart size={16} className="text-rose-600" />
                    <span className="font-display font-bold text-stable-900">{etalon?.name ?? '—'}</span>
                  </div>
                  <span className="chip bg-stable-100 text-stable-700 font-semibold">{etalonSaillies.length} saut(s)</span>
                </div>
                <div className="divide-y divide-stable-100">
                  {etalonSaillies.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-stable-900">{fmtDate(s.date)}</span>
                          <Badge level={statusColors[s.status]}>{statusLabels[s.status]}</Badge>
                        </div>
                        {s.miseBasPrevue && <div className="text-xs text-rose-600 mt-0.5 flex items-center gap-1"><CalendarDays size={11} /> Mise bas prévue: {fmtDate(s.miseBasPrevue)}</div>}
                        {s.observations && <div className="text-xs text-stable-500 italic mt-0.5">« {s.observations} »</div>}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button className="p-1.5 rounded-lg text-stable-400 hover:bg-stable-100 hover:text-stable-700" onClick={() => onEdit(s)}><Pencil size={14} /></button>
                        <button className="p-1.5 rounded-lg text-stable-400 hover:bg-red-50 hover:text-red-600" onClick={() => onDelete(s)}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                {(etalonConfirmed.length > 0 || etalonRefused.length > 0) && (
                  <div className="px-4 py-2 bg-stable-50 border-t border-stable-100 text-xs text-stable-600 flex flex-wrap gap-3">
                    {etalonConfirmed.length > 0 && <span className="text-emerald-700">Confirmée(s): {etalonConfirmed.map((s) => fmtDate(s.date)).join(', ')}</span>}
                    {etalonRefused.length > 0 && <span className="text-red-700">Refus: {etalonRefused.map((s) => fmtDate(s.date)).join(', ')}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

export { X };
