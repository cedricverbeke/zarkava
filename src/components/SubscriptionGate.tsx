import { CreditCard, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useSubscription } from '@/useSubscription';
import { useApp } from '@/store';

/**
 * Full-screen gate shown to authenticated trainers whose trial has ended or
 * whose payment is past the grace period. Lets them start a Stripe checkout.
 * Demo users never see this — they use mock data and have no Supabase account.
 */
export function SubscriptionGate({ userId, children }: { userId: string; children: React.ReactNode }) {
  const sub = useSubscription(userId);
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState('');
  const { authUser } = useApp();

  if (sub.loading) {
    return (
      <div className="min-h-screen bg-stable-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-stable-400" size={28} />
      </div>
    );
  }

  // Active or trialing with time left => full access.
  if (sub.status === 'active' || (sub.status === 'trialing' && (sub.daysLeft ?? 0) > 0)) {
    return <>{children}</>;
  }

  // past_due still in grace => show banner but keep access; only block once grace expired.
  if (sub.status === 'past_due' && (sub.daysLeft ?? 0) > 0) {
    return (
      <div className="min-h-screen bg-stable-50">
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-3 text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> Votre dernier paiement a échoué. Il vous reste{' '}
          <strong>{sub.daysLeft} jour{sub.daysLeft === 1 ? '' : 's'}</strong> pour régulariser, après quoi vos données seront supprimées.
        </div>
        {children}
      </div>
    );
  }

  // Blocked: trial ended, grace expired, or canceled. Show checkout screen.
  const trialEnded = sub.status === 'trialing' && (sub.daysLeft ?? 0) <= 0;
  const graceExpired = sub.status === 'past_due' && (sub.daysLeft ?? 0) <= 0;

  async function handleCheckout() {
    setErr(''); setStarting(true);
    const { url, error } = await sub.startCheckout();
    setStarting(false);
    if (error) { setErr(error); return; }
    if (url) window.location.href = url;
  }

  return (
    <div className="min-h-screen bg-stable-950 text-white flex items-center justify-center p-6">
      <div className="relative max-w-md w-full rounded-2xl bg-stable-900 border border-stable-800 p-8 shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-gold-400 text-stable-950 flex items-center justify-center font-display font-bold text-xl mb-5">Z</div>
        <h1 className="font-display text-2xl font-bold mb-2">
          {trialEnded ? 'Votre essai gratuit est terminé' : graceExpired ? 'Paiement en retard' : 'Abonnement requis'}
        </h1>
        <p className="text-stable-300 text-sm leading-relaxed mb-6">
          {trialEnded
            ? "Vous avez profité de votre mois d'essai gratuit. Pour continuer à utiliser Zarkava et conserver vos données, activez votre abonnement mensuel de 49 €."
            : graceExpired
            ? "Le délai de grâce de 14 jours est dépassé. Activez votre abonnement dès maintenant pour retrouver l'accès à vos données avant leur suppression définitive."
            : "Activez votre abonnement mensuel de 49 € pour accéder à Zarkava."}
        </p>

        {err && <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-sm px-4 py-2">{err}</div>}

        <button onClick={handleCheckout} disabled={starting} className="btn-gold w-full btn-lg flex items-center justify-center gap-2">
          {starting ? <><Loader2 size={18} className="animate-spin" /> Redirection…</> : <><CreditCard size={18} /> S'abonner — 49 €/mois</>}
        </button>

        <div className="mt-5 space-y-2 text-xs text-stable-400">
          <div className="flex items-center gap-2"><CheckCircle2 size={13} className="text-gold-400" /> Paiement sécurisé par Stripe</div>
          <div className="flex items-center gap-2"><CheckCircle2 size={13} className="text-gold-400" /> Sans engagement, annulable à tout moment</div>
          <div className="flex items-center gap-2"><CheckCircle2 size={13} className="text-gold-400" /> Tarif fixe</div>
        </div>

        {authUser && (
          <div className="mt-6 text-center text-xs text-stable-500">
            Connecté : {authUser.email}
          </div>
        )}
      </div>
    </div>
  );
}
