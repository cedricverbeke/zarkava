import { useState } from 'react';
import { Anvil, MessageCircle, Plus, Trash2, Check, Clock, Copy, ExternalLink, AlertTriangle, X, CheckCircle2, Pencil, Eye } from 'lucide-react';
import { useApp, supabase, ferrageOrderToRow } from '@/store';
import type { FerrageOrder } from '@/types';
import { alertLevel, daysUntilNext, FERRURE_CYCLE_DAYS, fmtDate, fmtDateLong, todayISO, randomToken, addDays } from '@/lib';
import { Badge, Confirm, Modal, ProgressGauge, EmptyState } from './ui';

const FERRAGE_LINK_DURATION_DAYS = 3;

export function FerragePage() {
  const { horses, ferrageOrders, setFerrageOrders, setHorses, employees, authMode } = useApp();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [consignes, setConsignes] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [generatedOrder, setGeneratedOrder] = useState<FerrageOrder | null>(null);
  const [toDelete, setToDelete] = useState<FerrageOrder | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedMarechalId, setSelectedMarechalId] = useState<string>('');
  const [showTextOrder, setShowTextOrder] = useState<FerrageOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<FerrageOrder | null>(null);
  const [trainerObservation, setTrainerObservation] = useState('');
  const [editingPrices, setEditingPrices] = useState<FerrageOrder | null>(null);

  const marechaux = employees.filter((e) => e.role === 'marechal');
  const marechal = employees.find((e) => e.id === selectedMarechalId) ?? marechaux[0];
  const activeHorses = horses.filter((h) => h.status === 'actif');

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function generateOrder() {
    if (!marechal) return;
    const order: FerrageOrder = {
      id: `fo${Date.now()}`,
      token: randomToken(),
      createdAt: todayISO(),
      expiresAt: addDays(todayISO(), FERRAGE_LINK_DURATION_DAYS),
      horses: Array.from(selected).map((hid) => {
        const horse = horses.find((h) => h.id === hid);
        return {
          horseId: hid,
          horseName: horse?.name ?? 'Cheval',
          box: horse?.box ?? '',
          ferrureType: horse?.ferrureType ?? '',
          consigne: consignes[hid] ?? horse?.ferrureType ?? 'Fers aux 4',
          done: false,
          note: '',
          price: 0,
          photo: horse?.photo,
          lastFerrureBy: horse?.lastFerrureBy ?? '',
          lastFerrureNote: horse?.lastFerrureNote ?? '',
        };
      }),
      status: 'pending',
      marechalId: marechal.id,
      marechalName: `${marechal.firstName} ${marechal.lastName}`,
      trainerObservation: trainerObservation || undefined,
    };
    const { error } = await supabase.from('ferrage_orders').insert(ferrageOrderToRow(order));
    if (error) {
      alert('Erreur lors de la création du bon: ' + error.message);
      return;
    }
    setFerrageOrders((prev) => [order, ...prev]);
    setGeneratedOrder(order);
    setSelected(new Set());
    setConsignes({});
    setTrainerObservation('');
    setCreating(false);
  }

  // Apply a completed farrier order back to the horses table (update lastFerrure + lastFerrureBy)
  async function applyFarrierCompletion(order: FerrageOrder) {
    const today = todayISO();
    const farrierName = order.marechalName ?? '';
    setHorses((prev) => prev.map((h) => {
      const entry = order.horses.find((x) => x.horseId === h.id && x.done);
      return entry ? { ...h, lastFerrure: today, lastFerrureBy: farrierName, lastFerrureNote: entry.note || '' } : h;
    }));
    await supabase.from('ferrage_orders').update({ applied_at: today, horses: JSON.stringify(order.horses) }).eq('id', order.id);
    setFerrageOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, appliedAt: today } : o)));
  }

  async function deleteOrder(order: FerrageOrder) {
    await supabase.from('ferrage_orders').delete().eq('id', order.id);
    setFerrageOrders((prev) => prev.filter((o) => o.id !== order.id));
  }

  async function updateOrder(updated: FerrageOrder) {
    const { error } = await supabase.from('ferrage_orders').update(ferrageOrderToRow(updated)).eq('id', updated.id);
    if (error) { alert('Erreur: ' + error.message); return; }
    setFerrageOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setEditingOrder(null);
  }

  function buildWhatsAppMessage(order: FerrageOrder): string {
    const link = `${window.location.origin}/#/ferrage/session?token=${order.token}`;
    return `Bonjour ${order.marechalName ?? ''}, voici l'ordre de ferrage :\n\n${order.horses.map((h) => `• ${h.horseName} — ${h.consigne}`).join('\n')}${order.trainerObservation ? `\n\nObservation : ${order.trainerObservation}` : ''}\n\nLien sécurisé pour valider les interventions (valable ${FERRAGE_LINK_DURATION_DAYS} jours) :\n${link}`;
  }

  const sorted = [...activeHorses].sort((a, b) => daysUntilNext(a.lastFerrure, FERRURE_CYCLE_DAYS) - daysUntilNext(b.lastFerrure, FERRURE_CYCLE_DAYS));
  const pendingOrders = ferrageOrders.filter((o) => o.status === 'pending');
  const completedOrders = ferrageOrders.filter((o) => o.status === 'completed');
  const needsApplyOrders = completedOrders.filter((o) => !o.appliedAt);

  const magicLink = generatedOrder ? `${window.location.origin}/#/ferrage/session?token=${generatedOrder.token}` : '';
  const whatsappMessage = generatedOrder ? buildWhatsAppMessage(generatedOrder) : '';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-stable-900 text-white p-6 lg:p-8">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 90% 10%, #d6a23c 0, transparent 40%)' }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold flex items-center gap-2"><Anvil className="text-gold-400" /> Bon de ferrage WhatsApp</h2>
            <p className="text-stable-300 mt-2 text-sm max-w-lg">Sélectionnez le maréchal et les chevaux à ferrer, puis envoyez un lien sécurisé. Le maréchal valide son travail sur sa page dédiée — le lien reste valable {FERRAGE_LINK_DURATION_DAYS} jours.</p>
          </div>
          <button className="btn-gold shrink-0" onClick={() => setCreating(true)} disabled={activeHorses.length === 0 || marechaux.length === 0}><Plus size={16} /> Créer un ordre</button>
        </div>
      </div>

      {authMode === 'demo' && ferrageOrders.length === 0 && (
        <div className="rounded-xl bg-stable-100 border border-stable-200 p-4 text-sm text-stable-600">
          En mode démo, les bons de ferrage créés sont stockés dans la base de données en ligne et restent accessibles au maréchal via le lien magique. Les autres données (chevaux, employés…) ne sont pas sauvegardées en démo — créez un compte pour tout sauvegarder.
        </div>
      )}

      {/* Overview table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-stable-100 flex items-center justify-between">
          <h3 className="font-display font-bold text-stable-900">État du ferrage — Effectif actif</h3>
          <span className="text-xs text-stable-500">Cycle de 3 semaines</span>
        </div>
        <div className="divide-y divide-stable-100">
          {sorted.map((h) => {
            const level = alertLevel(h.lastFerrure, FERRURE_CYCLE_DAYS);
            const remaining = daysUntilNext(h.lastFerrure, FERRURE_CYCLE_DAYS);
            return (
              <div key={h.id} className="flex items-center gap-4 px-5 py-3 hover:bg-stable-50/50 transition">
                <div className="w-10 h-10 rounded-xl bg-stable-100 flex items-center justify-center font-display font-bold text-sm text-stable-700 shrink-0">{h.name.slice(0, 2)}</div>
                <div className="w-40 shrink-0 min-w-0">
                  <div className="font-semibold text-stable-900 text-sm truncate">{h.name}</div>
                  <div className="text-xs text-stable-500">Box {h.box}</div>
                </div>
                <div className="flex-1 hidden sm:block max-w-xs">
                  <ProgressGauge percent={Math.min(100, (FERRURE_CYCLE_DAYS - Math.max(0, remaining)) / FERRURE_CYCLE_DAYS * 100)} level={level} pulse={level === 'red'} />
                </div>
                <div className="hidden md:block text-xs text-stable-500 w-28">{fmtDate(h.lastFerrure)}</div>
                {h.lastFerrureNote && (
                  <div className="hidden lg:block flex-1 min-w-0 max-w-[200px]">
                    <div className="text-xs text-stable-500">Note du dernier maréchal</div>
                    <div className="text-xs text-stable-700 italic truncate">« {h.lastFerrureNote} »</div>
                  </div>
                )}
                <div className="w-24 text-right shrink-0 ml-auto">
                  {level === 'red' ? <Badge level="red"><AlertTriangle size={11} /> {remaining > 0 ? `J-${remaining}` : 'Dépassé'}</Badge> : level === 'orange' ? <Badge level="orange">J-{remaining}</Badge> : <Badge level="green">J-{remaining}</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Needs apply banner */}
      {needsApplyOrders.length > 0 && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-display font-bold text-stable-900">Interventions à intégrer ({needsApplyOrders.length})</h3>
              <p className="text-sm text-stable-600 mt-1">Le maréchal a validé ces bons. Vérifiez les montants et appliquez-les pour mettre à jour les dates de ferrure.</p>
              <div className="mt-3 space-y-2">
                {needsApplyOrders.map((o) => {
                  const orderTotal = o.horses.filter((h) => h.done).reduce((sum, h) => sum + (h.price ?? 0), 0);
                  const hasPrices = o.horses.some((h) => h.done && (h.price ?? 0) > 0);
                  return (
                    <div key={o.id} className="bg-white rounded-xl px-4 py-2.5 border border-emerald-100">
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="font-semibold text-stable-900">{o.horses.filter((h) => h.done).length} cheval(aux) ferré(s)</span>
                          <span className="text-stable-500"> · {o.marechalName ?? 'Maréchal'} · validé le {o.completedAt ? fmtDate(o.completedAt) : '—'}{orderTotal > 0 ? ` · ${orderTotal}€` : ''}</span>
                        </div>
                        <div className="flex gap-2">
                          <button className="btn-outline py-2" onClick={() => setEditingPrices(o)}><Pencil size={14} /> {hasPrices ? 'Voir/modifier' : 'Saisir montants'}</button>
                          <button className="btn-primary py-2" onClick={() => applyFarrierCompletion(o)}><Check size={15} /> Appliquer</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending orders */}
      <div>
        <h3 className="font-display font-bold text-stable-900 text-lg mb-3">Bons de ferrage en attente ({pendingOrders.length})</h3>
        {pendingOrders.length === 0 ? (
          <EmptyState icon={<Clock size={24} />} title="Aucun bon en attente" message="Créez un ordre de ferrage pour l'envoyer au maréchal-ferrant via WhatsApp." />
        ) : (
          <div className="space-y-3">
            {pendingOrders.map((o) => (
              <OrderCard key={o.id} order={o} onDelete={() => setToDelete(o)} onShowText={() => setShowTextOrder(o)} onEdit={() => setEditingOrder(o)} />
            ))}
          </div>
        )}
      </div>

      {completedOrders.length > 0 && (
        <div>
          <h3 className="font-display font-bold text-stable-900 text-lg mb-3">Bons terminés ({completedOrders.length})</h3>
          <div className="space-y-3">
            {completedOrders.map((o) => (
              <div key={o.id} className="card p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-stable-900 text-sm">{o.horses.filter((h) => h.done).length} cheval(aux) ferré(s){o.marechalName ? ` par ${o.marechalName}` : ''}</div>
                  <div className="text-xs text-stable-500">Terminé le {o.completedAt ? fmtDateLong(o.completedAt) : '—'}{o.appliedAt ? ` · appliqué le ${fmtDate(o.appliedAt)}` : ' · non appliqué'}</div>
                </div>
                {o.appliedAt ? <Badge level="green"><Check size={11} /> Appliqué</Badge> : <Badge level="orange">À appliquer</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create order modal */}
      {creating && (
        <Modal open onClose={() => setCreating(false)} title="Créer un ordre de ferrage" subtitle="Sélectionnez le maréchal, les chevaux et leurs consignes" size="lg"
          footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={() => setCreating(false)}>Annuler</button><button className="btn-whatsapp" disabled={selected.size === 0 || !selectedMarechalId} onClick={() => generateOrder()}><MessageCircle size={16} /> Générer le lien WhatsApp</button></div>}
        >
          <div className="space-y-4">
            {/* Maréchal selector */}
            <div>
              <label className="label">Maréchal-ferrant destinataire *</label>
              <select className="input" value={selectedMarechalId} onChange={(e) => setSelectedMarechalId(e.target.value)}>
                <option value="">— Choisir un maréchal —</option>
                {marechaux.map((m) => (
                  <option key={m.id} value={m.id}>{m.firstName} {m.lastName} · {m.phone}</option>
                ))}
              </select>
              {marechaux.length === 0 && <p className="text-xs text-stable-500 mt-1">Aucun maréchal dans l'équipe. Ajoutez-en dans la page « Équipe ».</p>}
            </div>

            {/* Horse selection */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {sorted.map((h) => {
                const isSel = selected.has(h.id);
                const level = alertLevel(h.lastFerrure, FERRURE_CYCLE_DAYS);
                const remaining = daysUntilNext(h.lastFerrure, FERRURE_CYCLE_DAYS);
                return (
                  <div key={h.id} className={`rounded-xl border p-3 transition ${isSel ? 'border-gold-400 bg-gold-50' : 'border-stable-200 bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleSelect(h.id)} className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition ${isSel ? 'bg-gold-400 border-gold-400 text-stable-950' : 'border-stable-300 text-transparent'}`}><Check size={14} /></button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-stable-900 text-sm">{h.name}</span>
                          {level === 'red' && <Badge level="red">J-{remaining}</Badge>}
                          {level === 'orange' && <Badge level="orange">J-{remaining}</Badge>}
                        </div>
                        <div className="text-xs text-stable-500">Dernier ferrage : {fmtDate(h.lastFerrure)}{h.lastFerrureBy ? ` par ${h.lastFerrureBy}` : ''} · {h.ferrureType}</div>
                      </div>
                    </div>
                    {isSel && (
                      <div className="mt-2.5 pl-9">
                        <input className="input text-sm" placeholder="Consigne spécifique (ex: Fers aux 4, changement de pinçons)" defaultValue={h.ferrureType} onChange={(e) => setConsignes((c) => ({ ...c, [h.id]: e.target.value }))} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-stable-500">{selected.size} cheval(x) sélectionné(s).</p>

            <div>
              <label className="label">Observation pour le maréchal (optionnel)</label>
              <textarea className="input min-h-[60px]" value={trainerObservation} onChange={(e) => setTrainerObservation(e.target.value)} placeholder="Précisions ou consignes générales pour le maréchal…" />
            </div>
          </div>
        </Modal>
      )}

      {/* Generated order modal */}
      {generatedOrder && (
        <Modal open onClose={() => setGeneratedOrder(null)} title="Lien magique généré" subtitle={`Envoyez ce message à ${generatedOrder.marechalName ?? 'votre maréchal'}`}
          footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={() => setGeneratedOrder(null)}>Fermer</button></div>}
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
              <Check size={18} className="text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-sm text-emerald-800">Un lien sécurisé unique a été généré. Le maréchal accède directement à la liste des chevaux sans connexion. Le lien reste valable {FERRAGE_LINK_DURATION_DAYS} jours.</div>
            </div>

            <div>
              <label className="label">Lien magique (à copier et envoyer)</label>
              <div className="flex gap-2">
                <input className="input font-mono text-xs" readOnly value={magicLink} />
                <button className="btn-outline shrink-0" onClick={() => { navigator.clipboard?.writeText(magicLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copié' : 'Copier'}</button>
              </div>
              <p className="text-xs text-stable-500 mt-1.5">Le maréchal ouvre ce lien dans son navigateur (téléphone ou ordinateur) — il voit sa page dédiée sans avoir à se connecter.</p>
            </div>

            <div>
              <label className="label">Message WhatsApp pré-rempli</label>
              <textarea readOnly className="input min-h-[160px] text-sm font-mono whitespace-pre-wrap" value={whatsappMessage} />
            </div>

            <a
              href={`https://wa.me/${marechal?.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-whatsapp w-full btn-lg"
            >
              <MessageCircle size={20} /> Ouvrir WhatsApp <ExternalLink size={15} />
            </a>
          </div>
        </Modal>
      )}

      {/* Re-show paste text modal */}
      {showTextOrder && (
        <Modal open onClose={() => setShowTextOrder(null)} title="Texte à coller" subtitle={`Bon de ferrage · ${showTextOrder.marechalName ?? ''}`}
          footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={() => setShowTextOrder(null)}>Fermer</button></div>}
        >
          <div className="space-y-4">
            <div>
              <label className="label">Lien magique</label>
              <div className="flex gap-2">
                <input className="input font-mono text-xs" readOnly value={`${window.location.origin}/#/ferrage/session?token=${showTextOrder.token}`} />
                <button className="btn-outline shrink-0" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/#/ferrage/session?token=${showTextOrder.token}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copié' : 'Copier'}</button>
              </div>
            </div>
            <div>
              <label className="label">Message WhatsApp</label>
              <textarea readOnly className="input min-h-[160px] text-sm font-mono whitespace-pre-wrap" value={buildWhatsAppMessage(showTextOrder)} />
            </div>
            <a href={`https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(showTextOrder))}`} target="_blank" rel="noreferrer" className="btn-whatsapp w-full btn-lg"><MessageCircle size={20} /> Ouvrir WhatsApp <ExternalLink size={15} /></a>
          </div>
        </Modal>
      )}

      {/* Edit order modal */}
      {editingOrder && (
        <EditOrderModal order={editingOrder} marechaux={employees.filter((e) => e.role === 'marechal')} onClose={() => setEditingOrder(null)} onSave={updateOrder} />
      )}

      <Confirm open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => toDelete && deleteOrder(toDelete)} title="Supprimer le bon ?" message="Ce bon de ferrage sera définitivement supprimé." confirmLabel="Supprimer" danger />

      {editingPrices && (
        <Modal open onClose={() => setEditingPrices(null)} title="Montants de la ferrure" subtitle={`${editingPrices.marechalName ?? ''} · ${editingPrices.horses.filter((h) => h.done).length} cheval(aux) ferré(s)`}
          footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={() => setEditingPrices(null)}>Fermer</button><button className="btn-primary" onClick={async () => { await supabase.from('ferrage_orders').update(ferrageOrderToRow(editingPrices)).eq('id', editingPrices.id); setFerrageOrders((prev) => prev.map((o) => o.id === editingPrices.id ? editingPrices : o)); setEditingPrices(null); }}><Check size={15} /> Enregistrer</button></div>}
        >
          <div className="space-y-3">
            {editingPrices.horses.filter((h) => h.done).map((h) => (
              <div key={h.horseId} className="flex items-center gap-3 rounded-xl border border-stable-200 p-3">
                <div className="flex-1">
                  <div className="font-semibold text-stable-900 text-sm">{h.horseName}</div>
                  <div className="text-xs text-stable-500">{h.consigne}{h.note ? ` · « ${h.note} »` : ''}</div>
                </div>
                <input type="number" min={0} step="0.5" className="input w-28 text-sm" placeholder="0" value={h.price ?? ''} onChange={(e) => setEditingPrices((prev) => prev ? { ...prev, horses: prev.horses.map((x) => x.horseId === h.horseId ? { ...x, price: Number(e.target.value) } : x) } : prev)} />
                <span className="text-sm text-stable-500">€</span>
              </div>
            ))}
            <div className="rounded-xl bg-stable-50 px-4 py-3 text-sm text-stable-700 flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-display font-bold text-lg">{editingPrices.horses.filter((h) => h.done).reduce((sum, h) => sum + (h.price ?? 0), 0)}€</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function OrderCard({ order, onDelete, onShowText, onEdit }: { order: FerrageOrder; onDelete: () => void; onShowText: () => void; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const doneCount = order.horses.filter((h) => h.done).length;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gold-100 text-gold-700 flex items-center justify-center"><Anvil size={18} /></div>
          <div className="min-w-0">
            <div className="font-semibold text-stable-900 text-sm">{order.horses.length} cheval(aux) à ferrer{order.marechalName ? ` · ${order.marechalName}` : ''}</div>
            <div className="text-xs text-stable-500 truncate">Expire le {fmtDate(order.expiresAt)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge level={doneCount === order.horses.length ? 'green' : 'orange'}>{doneCount}/{order.horses.length} fait(s)</Badge>
          <button className="btn-outline py-2" onClick={() => setExpanded((e) => !e)}>{expanded ? 'Réduire' : 'Détails'}</button>
          <button className="p-2 rounded-lg text-stable-400 hover:bg-stable-100 hover:text-stable-700" title="Revoir le texte à coller" onClick={onShowText}><Eye size={15} /></button>
          <button className="p-2 rounded-lg text-stable-400 hover:bg-stable-100 hover:text-stable-700" title="Modifier le bon" onClick={onEdit}><Pencil size={15} /></button>
          <button className="p-2 rounded-lg text-stable-400 hover:bg-red-50 hover:text-red-600" onClick={onDelete}><Trash2 size={15} /></button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-stable-100 p-4 bg-stable-50/50">
          {order.trainerObservation && (
            <div className="mb-3 rounded-lg bg-gold-50 border border-gold-200 px-3 py-2">
              <div className="text-xs font-semibold text-gold-800">Observation de l'entraîneur</div>
              <div className="text-sm text-stable-700 italic mt-0.5">« {order.trainerObservation} »</div>
            </div>
          )}
          <ul className="space-y-1.5">
            {order.horses.map((h) => (
              <li key={h.horseId} className="flex items-center gap-2 text-sm">
                {h.done ? <Check size={14} className="text-emerald-600" /> : <Clock size={14} className="text-stable-400" />}
                <span className="font-medium text-stable-800">{h.horseName}</span>
                <span className="text-stable-500 text-xs">— {h.consigne}</span>
                {h.note && <span className="text-xs text-stable-600 italic">« {h.note} »</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EditOrderModal({ order, marechaux, onClose, onSave }: { order: FerrageOrder; marechaux: { id: string; firstName: string; lastName: string; phone: string }[]; onClose: () => void; onSave: (o: FerrageOrder) => void }) {
  const [form, setForm] = useState<FerrageOrder>(JSON.parse(JSON.stringify(order)));
  function setHorseConsigne(idx: number, consigne: string) {
    setForm((f) => ({ ...f, horses: f.horses.map((h, i) => (i === idx ? { ...h, consigne } : h)) }));
  }
  function removeHorse(idx: number) {
    setForm((f) => ({ ...f, horses: f.horses.filter((_, i) => i !== idx) }));
  }
  const marechal = marechaux.find((m) => m.id === form.marechalId);
  return (
    <Modal open onClose={onClose} title="Modifier le bon de ferrage" subtitle="Ajustez les consignes ou le maréchal" size="lg"
      footer={<div className="flex gap-3 justify-end"><button className="btn-outline" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={form.horses.length === 0} onClick={() => onSave({ ...form, marechalName: marechal ? `${marechal.firstName} ${marechal.lastName}` : form.marechalName })}><Check size={15} /> Enregistrer</button></div>}
    >
      <div className="space-y-4">
        <div>
          <label className="label">Maréchal-ferrant</label>
          <select className="input" value={form.marechalId ?? ''} onChange={(e) => setForm((f) => ({ ...f, marechalId: e.target.value }))}>
            {marechaux.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName} · {m.phone}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="label">Chevaux ({form.horses.length})</label>
          {form.horses.map((h, i) => (
            <div key={h.horseId} className="flex items-center gap-2 rounded-xl border border-stable-200 p-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-stable-900 truncate">{h.horseName} <span className="text-xs text-stable-500 font-normal">· Box {h.box}</span></div>
                <input className="input text-sm mt-1.5" value={h.consigne} onChange={(e) => setHorseConsigne(i, e.target.value)} />
              </div>
              <button className="p-1.5 rounded-lg text-stable-400 hover:bg-red-50 hover:text-red-600" onClick={() => removeHorse(i)}><Trash2 size={14} /></button>
            </div>
          ))}
          {form.horses.length === 0 && <p className="text-sm text-stable-500">Aucun cheval dans ce bon.</p>}
        </div>
      </div>
    </Modal>
  );
}

export { X };
