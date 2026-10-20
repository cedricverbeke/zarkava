import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'none';

export interface SubscriptionState {
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  currentPeriodEnd: string | null;
  loading: boolean;
  daysLeft: number | null; // days until trial or grace expires
}

export function useSubscription(userId: string | null | undefined): SubscriptionState & {
  startCheckout: () => Promise<{ url?: string; error?: string }>;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<SubscriptionState>({
    status: 'none',
    trialEndsAt: null,
    graceEndsAt: null,
    currentPeriodEnd: null,
    loading: true,
    daysLeft: null,
  });

  const refresh = useCallback(async () => {
    if (!userId) {
      setState({ status: 'none', trialEndsAt: null, graceEndsAt: null, currentPeriodEnd: null, loading: false, daysLeft: null });
      return;
    }
    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, trial_ends_at, grace_ends_at, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) {
      setState({ status: 'none', trialEndsAt: null, graceEndsAt: null, currentPeriodEnd: null, loading: false, daysLeft: null });
      return;
    }
    const row = data as { status: SubscriptionStatus; trial_ends_at: string | null; grace_ends_at: string | null; current_period_end: string | null };
    const daysLeft = computeDaysLeft(row);
    setState({
      status: row.status,
      trialEndsAt: row.trial_ends_at,
      graceEndsAt: row.grace_ends_at,
      currentPeriodEnd: row.current_period_end,
      loading: false,
      daysLeft,
    });
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startCheckout = useCallback(async (): Promise<{ url?: string; error?: string }> => {
    if (!userId) return { error: 'Non connecté' };
    const { data: session } = await supabase.auth.getSession();
    const accessToken = session.session?.access_token;
    if (!accessToken) return { error: 'Session expirée' };

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      return { error: `Erreur Stripe (${res.status}): ${msg}` };
    }
    const body = await res.json();
    if (!body || typeof body.url !== 'string') return { error: 'Réponse Stripe invalide' };
    return { url: body.url };
  }, [userId]);

  return { ...state, startCheckout, refresh };
}

function computeDaysLeft(row: { status: SubscriptionStatus; trial_ends_at: string | null; grace_ends_at: string | null; current_period_end: string | null }): number | null {
  const now = Date.now();
  if (row.status === 'trialing' && row.trial_ends_at) {
    return Math.max(0, Math.ceil((new Date(row.trial_ends_at).getTime() - now) / 86400000));
  }
  if (row.status === 'past_due' && row.grace_ends_at) {
    return Math.max(0, Math.ceil((new Date(row.grace_ends_at).getTime() - now) / 86400000));
  }
  return null;
}
