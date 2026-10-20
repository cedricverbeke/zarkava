import { useState, useEffect, useCallback } from 'react';
import { Anvil, Check, AlertCircle, CheckCircle2, Send, LogOut, X } from 'lucide-react';
import { useApp, supabase } from '@/store';
import type { FerrageOrder, FerrageOrderHorse } from '@/types';
import { fmtDateLong, todayISO } from '@/lib';
import { Modal } from './ui';

export function FarrierSession({ initialOrder }: { initialOrder: FerrageOrder }) {
  const { setSession } = useApp();
  const [order, setOrder] = useState<FerrageOrder>(initialOrder);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [validated, setValidated] = useState(initialOrder.status === 'completed');
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [photoView, setPhotoView] = useState<string | null>(null);

  const refreshOrder = useCallback(async () => {
    const { data, error } = await supabase
      .from('ferrage_orders')
      .select('*')
      .eq('id', initialOrder.id)
      .maybeSingle();
    if (error || !data) return;
    const row = data as Record<string, unknown>;
    let horses = row.horses as unknown;
    if (typeof horses === 'string') { try { horses = JSON.parse(horses); } catch { horses = []; } }
    const fetched: FerrageOrder = {
      id: row.id as string,
      token: row.token as string,
      createdAt: row.created_at as string,
      expiresAt: row.expires_at as string,
      status: row.status as 'pending' | 'completed',
      completedAt: (row.completed_at as string) ?? undefined,
      marechalId: (row.marechal_id as string) ?? undefined,
      marechalName: (row.marechal_name as string) ?? undefined,
      appliedAt: (row.applied_at as string) ?? undefined,
      trainerObservation: (row.trainer_observation as string) ?? undefined,
      horses: (horses as FerrageOrderHorse[]) ?? [],
    };
    setOrder(fetched);
    setValidated(fetched.status === 'completed');
    setLoading(false);
  }, [initialOrder.id]);

  useEffect(() => {
    const today = todayISO();
    if (initialOrder.expiresAt < today) {
      setExpired(true);
      setLoading(false);
      return;
    }
    refreshOrder();
  }, [initialOrder.expiresAt, refreshOrder]);

  async function toggleDone(horseId: string) {
    if (validated) return;
    const updatedHorses = order.horses.map((h) => h.horseId === horseId ? { ...h, done: !h.done } : h);
    setOrder((o) => ({ ...o, horses: updatedHorses }));
    await supabase.from('ferrage_orders').update({ horses: JSON.stringify(updatedHorses) }).eq('id', order.id);
  }

  async function setNote(horseId: string, note: string) {
    setNotes((n) => ({ ...n, [horseId]: note }));
    const updatedHorses = order.horses.map((h) => h.horseId === horseId ? { ...h, note } : h);
    setOrder((o) => ({ ...o, horses: updatedHorses }));
    await supabase.from('ferrage_orders').update({ horses: JSON.stringify(updatedHorses) }).eq('id', order.id);
  }

  async function setPrice(horseId: string, price: number) {
    if (validated) return;
    const updatedHorses = order.horses.map((h) => h.horseId === horseId ? { ...h, price } : h);
    setOrder((o) => ({ ...o, horses: updatedHorses }));
    await supabase.from('ferrage_orders').update({ horses: JSON.stringify(updatedHorses) }).eq('id', order.id);
  }

  async function validateAll() {
    const today = todayISO();
    await supabase.from('ferrage_orders').update({
      status: 'completed',
      completed_at: today,
      horses: JSON.stringify(order.horses),
    }).eq('id', order.id);
    setOrder((o) => ({ ...o, status: 'completed', completedAt: today }));
    setValidated(true);
  }

  const doneCount = order.horses.filter((h) => h.done).length;
  const allDone = doneCount === order.horses.length;
  const totalPrice = order.horses.filter((h) => h.done).reduce((sum, h) => sum + (h.price ?? 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-stable-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-stable-100 text-stable-400 flex items-center justify-center mx-auto mb-3 animate-pulse"><Anvil size={24} /></div>
          <p className="text-sm text-stable-500">Chargement de l'ordre de ferrage…</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-stable-50 flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4"><AlertCircle size={36} /></div>
          <h2 className="font-display font-bold text-stable-900 text-xl">Lien expiré</h2>
          <p className="text-sm text-stable-600 mt-2">Ce lien n'est plus valable. Il était valable pendant 3 jours. Contactez l'écurie pour obtenir un nouveau lien.</p>
          <button className="btn-outline mt-5" onClick={() => setSession(null)}>Quitter</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stable-50">
      {/* Header */}
      <header className="bg-stable-900 text-white px-5 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-400 text-stable-950 flex items-center justify-center"><Anvil size={20} /></div>
            <div>
              <h1 className="font-display font-bold text-lg leading-tight">Ordre de ferrage</h1>
              <p className="text-xs text-stable-300">{order.marechalName ? `${order.marechalName} · ` : ''}{fmtDateLong(todayISO())}</p>
            </div>
          </div>
          <button className="p-2 rounded-lg text-stable-300 hover:bg-stable-800" onClick={() => setSession(null)} title="Quitter"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 lg:p-6 space-y-4">
        {validated ? (
          <div className="card p-8 text-center animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={36} /></div>
            <h2 className="font-display font-bold text-stable-900 text-xl">Interventions validées</h2>
            <p className="text-sm text-stable-600 mt-2 max-w-sm mx-auto">Merci ! L'écurie a été informée et les échéances de ferrure seront mises à jour automatiquement.</p>
            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-stable-50 p-3"><div className="text-2xl font-display font-bold text-stable-900">{doneCount}</div><div className="text-xs text-stable-500">chevaux ferrés</div></div>
              <div className="rounded-xl bg-stable-50 p-3"><div className="text-2xl font-display font-bold text-stable-900">{order.horses.length - doneCount}</div><div className="text-xs text-stable-500">non réalisés</div></div>
              <div className="rounded-xl bg-stable-50 p-3"><div className="text-2xl font-display font-bold text-stable-900">{totalPrice}€</div><div className="text-xs text-stable-500">total</div></div>
            </div>
          </div>
        ) : (
          <>
            <div className="card p-4 bg-gold-50 border-gold-200">
              <p className="text-sm text-stable-700">Cochez « Ferrage effectué » pour chaque cheval après l'intervention, indiquez le montant de la prestation, puis validez l'ensemble en bas de page.</p>
            </div>

            {/* Trainer observation */}
            {order.trainerObservation && (
              <div className="card p-4 bg-gold-50 border-gold-200">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-gold-700 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-gold-800">Observation de l'entraîneur</div>
                    <div className="text-sm text-stable-700 italic mt-1">« {order.trainerObservation} »</div>
                  </div>
                </div>
              </div>
            )}

            {/* Progress */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-stable-700">Progression</span>
                <span className="text-sm font-bold text-stable-900">{doneCount} / {order.horses.length} · {totalPrice}€</span>
              </div>
              <div className="h-2 rounded-full bg-stable-100 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-300 rounded-full" style={{ width: `${(doneCount / order.horses.length) * 100}%` }} />
              </div>
            </div>

            {/* Horses */}
            <div className="space-y-3">
              {order.horses.map((h) => (
                <div key={h.horseId} className={`card overflow-hidden transition ${h.done ? 'ring-2 ring-emerald-500' : ''}`}>
                  <button onClick={() => toggleDone(h.horseId)} className="w-full flex items-center gap-4 p-5 text-left active:bg-stable-50 transition">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition ${h.done ? 'bg-emerald-500 text-white' : 'bg-stable-100 text-stable-400'}`}>
                      <Check size={24} />
                    </div>
                    {h.photo ? (
                      <img src={h.photo} alt={h.horseName} className="w-14 h-14 rounded-xl object-cover shrink-0" onClick={(e) => { e.stopPropagation(); setPhotoView(h.photo!); }} />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-stable-600 to-stable-800 text-white flex items-center justify-center font-display font-bold text-lg shrink-0">{h.horseName.slice(0, 2)}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-stable-900 text-lg">{h.horseName}</div>
                      <div className="text-sm text-stable-600 mt-0.5">{h.consigne}</div>
                      <div className="text-xs text-stable-500 mt-1">Box {h.box} · {h.ferrureType}</div>
                      {h.lastFerrureNote && (
                        <div className="mt-2 rounded-lg bg-stable-50 border border-stable-100 px-3 py-2">
                          <div className="text-xs text-stable-500">Note du précédent maréchal{h.lastFerrureBy ? ` (${h.lastFerrureBy})` : ''}</div>
                          <div className="text-xs text-stable-700 italic mt-0.5">« {h.lastFerrureNote} »</div>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0">
                      {h.done ? <span className="pill bg-emerald-100 text-emerald-700"><Check size={12} /> Effectué</span> : <span className="pill bg-stable-100 text-stable-500">À faire</span>}
                    </div>
                  </button>
                  <div className="px-5 pb-4 space-y-2">
                    <input
                      className="input text-sm"
                      placeholder="Remarque rapide (ex: Pied droit sensible)"
                      value={notes[h.horseId] ?? h.note ?? ''}
                      onChange={(e) => setNote(h.horseId, e.target.value)}
                    />
                    {h.done && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-stable-500 shrink-0">Montant de la prestation</label>
                        <input type="number" min={0} step="0.5" className="input text-sm w-28" placeholder="€" value={h.price ?? ''} onChange={(e) => setPrice(h.horseId, Number(e.target.value))} />
                        <span className="text-sm text-stable-500">€</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Validate */}
            <div className="sticky bottom-4 pt-2">
              <button
                className={`btn-xl w-full ${allDone ? 'btn-gold' : 'btn-primary'} shadow-lg`}
                disabled={doneCount === 0}
                onClick={validateAll}
              >
                {allDone ? <><Check size={22} /> Valider les interventions · {totalPrice}€</> : <><Send size={20} /> Valider ({doneCount}/{order.horses.length}) · {totalPrice}€</>}
              </button>
              {doneCount === 0 && <p className="text-center text-xs text-stable-500 mt-2">Cochez au moins un cheval pour valider.</p>}
            </div>

            <div className="text-center text-xs text-stable-400 pt-4">
              <AlertCircle size={12} className="inline mr-1" />
              Lien sécurisé · valable jusqu'au {fmtDateLong(order.expiresAt)} · aucune connexion requise
            </div>
          </>
        )}
      </main>

      {photoView && (
        <Modal open onClose={() => setPhotoView(null)} title="" size="md">
          <img src={photoView} alt="" className="w-full rounded-xl object-contain max-h-[70vh]" />
        </Modal>
      )}
    </div>
  );
}
