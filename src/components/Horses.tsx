import { useState } from 'react';
import { Plus, Search, HeartPulse, Pencil, Trash2, Bed, LogOut, AlertTriangle, Pill, Camera } from 'lucide-react';
import { useApp } from '@/store';
import type { Horse, HorseStatus } from '@/types';
import { alertLevel, daysUntilNext, FERRURE_CYCLE_DAYS, VERMIFUGE_CYCLE_DAYS, progressPercent, fmtDate, todayISO, ageLabel, MONTHS } from '@/lib';
import { compressImage } from '@/imageUtils';
import { Badge, Confirm, EmptyState, Modal, ProgressGauge } from './ui';

export function HorsesPage() {
  const { horses, setHorses } = useApp();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | HorseStatus>('all');
  const [editing, setEditing] = useState<Horse | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Horse | null>(null);
  const [photoView, setPhotoView] = useState<{ name: string; photo: string } | null>(null);

  const filtered = horses.filter((h) => {
    if (statusFilter !== 'all' && h.status !== statusFilter) return false;
    if (query && !h.name.toLowerCase().includes(query.toLowerCase()) && !h.breed.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  function saveHorse(h: Horse) {
    setHorses((prev) => {
      const exists = prev.some((x) => x.id === h.id);
      return exists ? prev.map((x) => (x.id === h.id ? h : x)) : [...prev, h];
    });
    setEditing(null);
    setCreating(false);
  }

  function deleteHorse(id: string) {
    setHorses((prev) => prev.filter((h) => h.id !== id));
  }

  const counts = {
    all: horses.length,
    actif: horses.filter((h) => h.status === 'actif').length,
    repos: horses.filter((h) => h.status === 'repos').length,
    sorti: horses.filter((h) => h.status === 'sorti').length,
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stable-400" />
          <input className="input pl-9" placeholder="Rechercher un cheval…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex bg-stable-100 rounded-xl p-1 overflow-x-auto no-scrollbar">
          {(['all', 'actif', 'repos', 'sorti'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${statusFilter === s ? 'bg-white text-stable-900 shadow-sm' : 'text-stable-500'}`}>
              {s === 'all' ? 'Tous' : s === 'actif' ? 'Actifs' : s === 'repos' ? 'Au repos' : 'Sortis'} <span className="opacity-60">({counts[s]})</span>
            </button>
          ))}
        </div>
        <button className="btn-primary shrink-0" onClick={() => setCreating(true)}><Plus size={16} /> Ajouter</button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={<HeartPulse size={24} />} title="Aucun cheval" message="Aucun cheval ne correspond à votre recherche." action={<button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Ajouter un cheval</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((h) => (
            <HorseCard key={h.id} horse={h} onEdit={() => setEditing(h)} onDelete={() => setToDelete(h)} onPhoto={() => h.photo && setPhotoView({ name: h.name, photo: h.photo })} />
          ))}
        </div>
      )}

      {(editing || creating) && (
        <HorseFormModal
          horse={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={saveHorse}
        />
      )}

      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteHorse(toDelete.id)}
        title="Retirer le cheval ?"
        message={`Confirmez la sortie définitive de « ${toDelete?.name} » de l'effectif.`}
        confirmLabel="Retirer"
        danger
      />

      {photoView && (
        <Modal open onClose={() => setPhotoView(null)} title={photoView.name} size="md">
          <img src={photoView.photo} alt={photoView.name} className="w-full rounded-xl object-contain max-h-[70vh]" />
        </Modal>
      )}
    </div>
  );
}

function HorseCard({ horse, onEdit, onDelete, onPhoto }: { horse: Horse; onEdit: () => void; onDelete: () => void; onPhoto: () => void }) {
  const ferrureLevel = alertLevel(horse.lastFerrure, FERRURE_CYCLE_DAYS);
  const ferrureRemaining = daysUntilNext(horse.lastFerrure, FERRURE_CYCLE_DAYS);
  const vermifugeLevel = alertLevel(horse.lastVermifuge, VERMIFUGE_CYCLE_DAYS);
  const vermifugeRemaining = daysUntilNext(horse.lastVermifuge, VERMIFUGE_CYCLE_DAYS);

  const statusBadge = horse.status === 'actif' ? <Badge level="green">Actif</Badge> : horse.status === 'repos' ? <Badge level="orange">Au repos</Badge> : <Badge level="neutral">Sorti</Badge>;

  return (
    <div className="card p-5 hover:shadow-soft transition group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {horse.photo ? (
            <img src={horse.photo} alt={horse.name} className="w-12 h-12 rounded-2xl object-cover shrink-0 cursor-pointer" onClick={onPhoto} />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-stable-700 to-stable-900 text-white flex items-center justify-center font-display font-bold text-lg shrink-0">
              {horse.name.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-display font-bold text-stable-900 text-lg truncate">{horse.name}</h3>
            <p className="text-xs text-stable-500">{ageLabel(horse.birthYear, horse.birthMonth)} · {horse.breed} · Box {horse.box}</p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button className="p-1.5 rounded-lg text-stable-400 hover:bg-stable-100 hover:text-stable-700" onClick={onEdit}><Pencil size={15} /></button>
          <button className="p-1.5 rounded-lg text-stable-400 hover:bg-red-50 hover:text-red-600" onClick={onDelete}><Trash2 size={15} /></button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {statusBadge}
        <span className="text-xs text-stable-500">{horse.owners.length} propriétaire(s)</span>
      </div>

      <div className="mt-4 space-y-3">
        {/* Ferrure */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-stable-700 flex items-center gap-1.5"><HeartPulse size={13} /> Ferrure {horse.lastFerrureBy ? `· ${horse.lastFerrureBy}` : ''}</span>
            <div className="flex items-center gap-2">
              <span className="text-stable-500">{fmtDate(horse.lastFerrure)}</span>
              {ferrureLevel === 'red' ? (
                <Badge level="red"><AlertTriangle size={11} /> {ferrureRemaining > 0 ? `J-${ferrureRemaining}` : 'Dépassé'}</Badge>
              ) : ferrureLevel === 'orange' ? (
                <Badge level="orange">J-{ferrureRemaining}</Badge>
              ) : (
                <Badge level="green">J-{ferrureRemaining}</Badge>
              )}
            </div>
          </div>
          <ProgressGauge percent={progressPercent(horse.lastFerrure, FERRURE_CYCLE_DAYS)} level={ferrureLevel} pulse={ferrureLevel === 'red'} />
          <p className="text-[11px] text-stable-500 mt-1">{horse.ferrureType}</p>
          {horse.lastFerrureNote && <p className="text-[11px] text-stable-600 italic mt-1 bg-stable-50 rounded px-2 py-1">Note du maréchal : « {horse.lastFerrureNote} »</p>}
        </div>

        {/* Vermifuge */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-stable-700 flex items-center gap-1.5"><Pill size={13} /> Vermifuge</span>
            <div className="flex items-center gap-2">
              <span className="text-stable-500">{fmtDate(horse.lastVermifuge)}</span>
              <Badge level={vermifugeLevel}>{vermifugeRemaining > 0 ? `J-${vermifugeRemaining}` : 'À faire'}</Badge>
            </div>
          </div>
          <ProgressGauge percent={progressPercent(horse.lastVermifuge, VERMIFUGE_CYCLE_DAYS)} level={vermifugeLevel} pulse={vermifugeLevel === 'red'} />
        </div>
      </div>

      {horse.notes && <p className="mt-3 text-xs text-stable-600 italic bg-stable-50 rounded-lg px-3 py-2">« {horse.notes} »</p>}
    </div>
  );
}

function HorseFormModal({ horse, onClose, onSave }: { horse: Horse | null; onClose: () => void; onSave: (h: Horse) => void }) {
  const [form, setForm] = useState<Horse>(
    horse ?? {
      id: `h${Date.now()}`,
      name: '',
      birthYear: new Date().getFullYear() - 4,
      birthMonth: 1,
      breed: 'Pur-sang anglais',
      status: 'actif',
      owners: [{ id: `o${Date.now()}`, name: '', phone: '', email: '', share: 100 }],
      ferrureType: 'Fers aux 4',
      lastFerrure: todayISO(),
      lastFerrureBy: '',
      lastFerrureNote: '',
      lastVermifuge: todayISO(),
      notes: '',
      box: '',
    },
  );
  const [photoLoading, setPhotoLoading] = useState(false);

  function set<K extends keyof Horse>(k: K, v: Horse[K]) { setForm((f) => ({ ...f, [k]: v })); }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    try {
      const dataUrl = await compressImage(file);
      set('photo', dataUrl);
    } catch { alert('Erreur lors du chargement de la photo'); }
    setPhotoLoading(false);
  }

  return (
    <Modal open onClose={onClose} title={horse ? 'Modifier le cheval' : 'Nouveau cheval'} size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <button className="btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn-primary" disabled={!form.name} onClick={() => onSave(form)}>Enregistrer</button>
        </div>
      }
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Nom *</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nom du cheval" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Photo du cheval</label>
          <div className="flex items-center gap-4">
            {form.photo ? (
              <img src={form.photo} alt="Aperçu" className="w-20 h-20 rounded-xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-stable-100 flex items-center justify-center text-stable-400"><Camera size={24} /></div>
            )}
            <div className="flex flex-col gap-2">
              <label className="btn-outline cursor-pointer">
                <Camera size={15} /> {photoLoading ? 'Chargement…' : form.photo ? 'Changer' : 'Ajouter une photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
              {form.photo && <button type="button" className="text-xs text-red-500 hover:text-red-700" onClick={() => set('photo', undefined)}>Supprimer la photo</button>}
            </div>
          </div>
        </div>
        <div>
          <label className="label">Mois de naissance</label>
          <select className="input" value={form.birthMonth} onChange={(e) => set('birthMonth', Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Année de naissance</label>
          <input type="number" className="input" value={form.birthYear} onChange={(e) => set('birthYear', Number(e.target.value))} min={2000} max={new Date().getFullYear()} />
        </div>
        <div className="text-sm text-stable-600 sm:col-span-2">Âge calculé : {ageLabel(form.birthYear, form.birthMonth)}</div>
        <div>
          <label className="label">Box</label>
          <input className="input" value={form.box} onChange={(e) => set('box', e.target.value)} placeholder="A-12" />
        </div>
        <div>
          <label className="label">Race</label>
          <input className="input" value={form.breed} onChange={(e) => set('breed', e.target.value)} />
        </div>
        <div>
          <label className="label">Statut</label>
          <select className="input" value={form.status} onChange={(e) => set('status', e.target.value as HorseStatus)}>
            <option value="actif">Actif</option>
            <option value="repos">Au repos</option>
            <option value="sorti">Sortie définitive</option>
          </select>
        </div>
        <div>
          <label className="label">Type de ferrure</label>
          <input className="input" value={form.ferrureType} onChange={(e) => set('ferrureType', e.target.value)} />
        </div>
        <div>
          <label className="label">Dernière ferrure</label>
          <input type="date" className="input" value={form.lastFerrure} onChange={(e) => set('lastFerrure', e.target.value)} />
        </div>
        <div>
          <label className="label">Ferré par (maréchal)</label>
          <input className="input" value={form.lastFerrureBy} onChange={(e) => set('lastFerrureBy', e.target.value)} placeholder="Nom du maréchal" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Note du dernier maréchal</label>
          <textarea className="input min-h-[50px]" value={form.lastFerrureNote} onChange={(e) => set('lastFerrureNote', e.target.value)} placeholder="Précisions du maréchal sur la dernière ferrure…" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Dernier vermifuge</label>
          <input type="date" className="input" value={form.lastVermifuge} onChange={(e) => set('lastVermifuge', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Remarques</label>
          <textarea className="input min-h-[80px]" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Notes d'entraînement, particularités…" />
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Propriétaires</label>
          <button className="text-xs font-semibold text-stable-700 hover:text-stable-900" onClick={() => set('owners', [...form.owners, { id: `o${Date.now()}`, name: '', phone: '', email: '', share: 0 }])}><Plus size={12} className="inline" /> Ajouter</button>
        </div>
        <div className="space-y-2">
          {form.owners.map((o, i) => (
            <div key={o.id} className="grid grid-cols-12 gap-2 items-center">
              <input className="input col-span-5" placeholder="Nom" value={o.name} onChange={(e) => { const owners = [...form.owners]; owners[i] = { ...o, name: e.target.value }; set('owners', owners); }} />
              <input className="input col-span-4" placeholder="Téléphone" value={o.phone} onChange={(e) => { const owners = [...form.owners]; owners[i] = { ...o, phone: e.target.value }; set('owners', owners); }} />
              <input type="number" className="input col-span-2" placeholder="%" value={o.share} onChange={(e) => { const owners = [...form.owners]; owners[i] = { ...o, share: Number(e.target.value) }; set('owners', owners); }} />
              <button className="col-span-1 p-2 rounded-lg text-stable-400 hover:bg-red-50 hover:text-red-600" onClick={() => set('owners', form.owners.filter((_, idx) => idx !== i))}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// re-export to satisfy unused-import lint in some builds
export { Bed, LogOut };
