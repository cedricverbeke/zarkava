import { useState } from 'react';
import { Plus, Pencil, Trash2, Zap, Clock, Flame } from 'lucide-react';
import { useApp } from '@/store';
import type { Training, TrainingCategory } from '@/types';
import { Confirm, EmptyState, Modal, Badge } from './ui';

const intensityColors: Record<Training['intensity'], 'green' | 'orange' | 'red'> = {
  faible: 'green',
  moyen: 'orange',
  fort: 'red',
};

const intensityLabels: Record<Training['intensity'], string> = {
  faible: 'Faible',
  moyen: 'Moyen',
  fort: 'Fort',
};

const categoryLabels: Record<TrainingCategory, string> = {
  lot: 'Lot monté',
  longe: 'Longe',
  natation: 'Natation',
  paddock: 'Paddock',
  autre: 'Autre',
};

const categoryColors: Record<TrainingCategory, 'blue' | 'orange' | 'green' | 'purple' | 'neutral'> = {
  lot: 'blue',
  longe: 'orange',
  natation: 'green',
  paddock: 'purple',
  autre: 'neutral',
};

export function TrainingsPage() {
  const { trainings, setTrainings } = useApp();
  const [editing, setEditing] = useState<Training | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Training | null>(null);

  function save(t: Training) {
    setTrainings((prev) => {
      const exists = prev.some((x) => x.id === t.id);
      return exists ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t];
    });
    setEditing(null);
    setCreating(false);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-stable-600">Ces entraînements sont proposés dans le menu dérounant lors de la création du planning. La catégorie détermine la facturation du cavalier (lot, longe ou natation).</p>
        <div className="flex gap-2 shrink-0">
          <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Nouvel entraînement</button>
        </div>
      </div>

      {trainings.length === 0 ? (
        <EmptyState icon={<Zap size={24} />} title="Aucun entraînement" message="Créez vos types d'entraînements pour les proposer dans le planning." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainings.map((t) => (
            <div key={t.id} className="card p-5 group hover:shadow-md transition">
              <div className="flex items-start justify-between gap-3">
                <div className="w-11 h-11 rounded-xl bg-stable-100 text-stable-700 flex items-center justify-center"><Zap size={20} /></div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button className="p-1.5 rounded-lg text-stable-400 hover:bg-stable-100 hover:text-stable-700" onClick={() => setEditing(t)}><Pencil size={15} /></button>
                  <button className="p-1.5 rounded-lg text-stable-400 hover:bg-red-50 hover:text-red-600" onClick={() => setToDelete(t)}><Trash2 size={15} /></button>
                </div>
              </div>
              <h3 className="font-display font-bold text-stable-900 text-lg mt-3">{t.name}</h3>
              <p className="text-sm text-stable-600 mt-1">{t.description}</p>
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <Badge level={categoryColors[t.category]}>{categoryLabels[t.category]}</Badge>
                <Badge level={intensityColors[t.intensity]}><Flame size={11} /> {intensityLabels[t.intensity]}</Badge>
                <span className="chip bg-stable-100 text-stable-600"><Clock size={11} /> {t.duration} min</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && <TrainingForm training={editing} onClose={() => { setEditing(null); setCreating(false); }} onSave={save} />}
      <Confirm open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => toDelete && setTrainings((prev) => prev.filter((t) => t.id !== toDelete.id))} title="Supprimer l'entraînement ?" message={`« ${toDelete?.name} » ne sera plus proposé dans le planning.`} confirmLabel="Supprimer" danger />
    </div>
  );
}

function TrainingForm({ training, onClose, onSave }: { training: Training | null; onClose: () => void; onSave: (t: Training) => void }) {
  const [form, setForm] = useState<Training>(training ?? { id: `t${Date.now()}`, name: '', description: '', intensity: 'moyen', duration: 30, category: 'lot' });
  return (
    <Modal open onClose={onClose} title={training ? 'Modifier l\'entraînement' : 'Nouvel entraînement'}
      footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={!form.name} onClick={() => onSave(form)}>Enregistrer</button></div>}
    >
      <div className="space-y-4">
        <div><label className="label">Nom *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Description</label><textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Catégorie (facturation)</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TrainingCategory })}>
              <option value="lot">Lot monté</option><option value="longe">Longe</option><option value="paddock">Paddock (0€)</option><option value="natation">Natation</option><option value="autre">Autre</option>
            </select>
          </div>
          <div><label className="label">Intensité</label>
            <select className="input" value={form.intensity} onChange={(e) => setForm({ ...form, intensity: e.target.value as Training['intensity'] })}>
              <option value="faible">Faible</option><option value="moyen">Moyen</option><option value="fort">Fort</option>
            </select>
          </div>
        </div>
        <div><label className="label">Durée (min)</label><input type="number" className="input" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} min={5} step={5} /></div>
        <p className="text-xs text-stable-500">La catégorie détermine comment cet entraînement est facturé au cavalier : « Lot monté » = tarif lot, « Longe » = tarif longe, « Natation » = tarif natation.</p>
      </div>
    </Modal>
  );
}
