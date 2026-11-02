import { createClient } from '@supabase/supabase-js';

// --- Lecture et nettoyage de la configuration ------------------------------------------
// Une URL ou une clé collée avec un espace, un retour à la ligne, des guillemets ou un "/"
// final suffit à faire échouer toutes les requêtes ("Failed to fetch"). On nettoie donc ici.
const clean = (value: unknown) => String(value ?? '').trim().replace(/^["']+|["']+$/g, '').trim();

const url = clean(import.meta.env.VITE_SUPABASE_URL).replace(/\/+$/, '');
const anonKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY);

function jwtPayload(token: string): Record<string, unknown> | null {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
  } catch {
    return null;
  }
}

function findConfigError(): string | null {
  if (!url || !anonKey) {
    return "Configuration Supabase manquante : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définies au moment du build "
      + "(fichier .env en local ; variables Netlify ou secrets GitHub en production), puis le site doit être redéployé.";
  }
  if (!/^https:\/\/[^/\s]+$/i.test(url)) {
    return `VITE_SUPABASE_URL est invalide (« ${url} »). Format attendu : https://xxxxxxxx.supabase.co — sans /rest/v1, sans espace.`;
  }
  if (/\s/.test(anonKey)) {
    return 'VITE_SUPABASE_ANON_KEY contient un espace ou un retour à la ligne : recopiez la clé sur une seule ligne.';
  }
  if (anonKey.startsWith('sb_secret_')) {
    return 'VITE_SUPABASE_ANON_KEY contient une clé secrète. Utilisez la clé publique (anon / publishable) : une clé secrète ne doit jamais être dans le navigateur.';
  }
  if (anonKey.startsWith('eyJ')) {
    const payload = jwtPayload(anonKey);
    if (!payload) return 'VITE_SUPABASE_ANON_KEY est illisible (clé tronquée ?). Recopiez-la en entier depuis Supabase → Project Settings → API.';
    if (payload.role === 'service_role') {
      return 'VITE_SUPABASE_ANON_KEY contient la clé service_role. Utilisez la clé « anon » : la clé service_role ne doit jamais être dans le navigateur.';
    }
    const host = url.replace('https://', '');
    const urlRef = host.endsWith('.supabase.co') ? host.split('.')[0] : null;
    if (urlRef && typeof payload.ref === 'string' && payload.ref !== urlRef) {
      return `La clé appartient au projet « ${payload.ref} » mais l'URL au projet « ${urlRef} ». Prenez l'URL et la clé du même projet.`;
    }
  }
  return null;
}

/** Texte expliquant ce qui ne va pas dans la configuration, ou null si tout est correct. */
export const supabaseConfigError: string | null = findConfigError();

// Sans configuration valide, on crée quand même un client (pour que l'application s'affiche
// et explique le problème) mais plus aucune requête n'est envoyée : voir supabaseConfigError.
export const supabase = createClient(
  url || 'https://configuration-manquante.invalid',
  anonKey || 'configuration-manquante',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // L'application utilise des liens en #… (ex. #ferrage/session?token=…) : Supabase ne doit pas les lire.
      detectSessionInUrl: false,
    },
  },
);

// --- Messages d'erreur lisibles ---------------------------------------------------------
const RULES: [RegExp, string][] = [
  [/failed to fetch|networkerror|load failed|network request failed/i,
    "Impossible de joindre Supabase. Vérifiez que le projet n'est pas en pause (tableau de bord Supabase → Restore project), "
    + "que l'URL du projet est correcte dans la version déployée du site, et qu'une coupure réseau ou un bloqueur de publicités n'empêche pas la requête."],
  [/invalid login credentials/i, 'E-mail ou mot de passe incorrect.'],
  [/email not confirmed/i, 'Adresse e-mail non confirmée : cliquez sur le lien reçu par e-mail, puis reconnectez-vous.'],
  [/already registered|already been registered/i, 'Un compte existe déjà avec cette adresse e-mail.'],
  [/password should be at least/i, 'Mot de passe trop court (6 caractères minimum).'],
  [/rate limit|too many requests/i, 'Trop de tentatives : patientez quelques minutes avant de réessayer.'],
  [/invalid api key|no api key found/i, "Clé API refusée : vérifiez VITE_SUPABASE_ANON_KEY (clé « anon » du même projet que l'URL)."],
  [/jwt expired|invalid jwt|invalid refresh token|refresh token not found/i, 'Session expirée ou invalide : reconnectez-vous.'],
  [/schema cache|does not exist|could not find the .*(table|column)/i,
    'Table ou colonne absente de la base : exécutez supabase/schema.sql dans le SQL Editor de Supabase.'],
  [/row-level security|permission denied/i,
    'Accès refusé par la base (droits ou sécurité RLS) : reconnectez-vous ; si cela persiste, relancez supabase/schema.sql.'],
];

export function rawErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return String(error);
}

/** Traduit une erreur Supabase/réseau en message compréhensible (renvoie le message d'origine si inconnu). */
export function explainSupabaseError(error: unknown): string {
  const message = rawErrorMessage(error);
  return RULES.find(([pattern]) => pattern.test(message))?.[1] ?? message;
}

// --- Signalement à l'interface -----------------------------------------------------------
export interface SupabaseProblem {
  collection: string;
  operation: 'read' | 'write';
  message: string; // message lisible
  detail: string; // message technique d'origine
}

/** Affiche le bandeau d'erreur (voir PersistenceNotice dans App.tsx) et journalise dans la console. */
export function reportSupabaseProblem(collection: string, operation: 'read' | 'write', error: unknown) {
  const detail = rawErrorMessage(error);
  console.error(`[Supabase] ${collection} (${operation === 'read' ? 'lecture' : 'écriture'}) :`, detail);
  window.dispatchEvent(new CustomEvent<SupabaseProblem>('zarkava:persistence-error', {
    detail: { collection, operation, message: explainSupabaseError(error), detail },
  }));
}
