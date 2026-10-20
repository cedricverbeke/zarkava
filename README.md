# Zarkava — Gestion d'écurie de course

Application web de gestion d'écurie (chevaux, employés, planning, ferrage, soins, facturation).

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- Supabase (auth, base de données, edge functions)
- Stripe (abonnement mensuel via Hosted Checkout)

## Développement local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build      # génère ./dist
npm run preview    # prévisualise le build localement
```

## Déploiement sur Netlify via GitHub

Le projet est pré-configuré pour un déploiement automatique sur Netlify à
chaque `push` sur la branche `main`.

### 1. Pousser le projet sur GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin git@github.com:<votre-compte>/<repo>.git
git push -u origin main
```

### 2. Créer le site sur Netlify

- Sur https://app.netlify.com → **Add new site → Import an existing project** → GitHub → sélectionner le dépôt.
- Netlify détecte automatiquement `netlify.toml` :
  - **Build command** : `npm run build`
  - **Publish directory** : `dist`
  - **Node version** : 20

### 3. Configurer les variables d'environnement Netlify

Dans **Site settings → Environment variables**, ajouter :

| Variable | Valeur |
|----------|--------|
| `VITE_SUPABASE_URL` | l'URL Supabase (visible dans `.env`) |
| `VITE_SUPABASE_ANON_KEY` | la clé anon Supabase (visible dans `.env`) |

Ces deux variables sont nécessaires au frontend. **Ne pas** mettre
`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` sur Netlify :
ce sont des secrets serveur déjà configurés sur les edge functions Supabase
via le panneau Stripe de Bolt.

### 4. (Optionnel) Déploiement automatique par GitHub Actions

Le workflow `.github/workflows/deploy-netlify.yml` déploie à chaque push sur
`main`. Pour l'activer, ajouter deux secrets dans le repo GitHub
(**Settings → Secrets and variables → Actions**) :

- `NETLIFY_AUTH_TOKEN` — token perso : https://app.netlify.com/user/applications
- `NETLIFY_SITE_ID` — API ID du site : Netlify → Site settings → General → Site details

Si vous préférez laisser Netlify déploiement auto via son intégration GitHub
(recommandé), vous pouvez ignorer le workflow.

### 5. Webhook Stripe

Le webhook qui met à jour l'abonnement pointe vers :

```
https://<votre-site>.netlify.app  →  (le frontend)
https://<projet-supabase>.supabase.co/functions/v1/stripe-webhook  →  (edge function)
```

Dans le dashboard Stripe → Developers → Webhooks, l'endpoint doit être
`https://<projet-supabase>.supabase.co/functions/v1/stripe-webhook`
(l'edge function Supabase, pas Netlify). Bolt configure ce webhook
automatiquement via le panneau Stripe.

### 6. Mise en production Stripe

- Passer du mode test au mode live dans le panneau Stripe de Bolt.
- Mettre à jour `STRIPE_PRICE_ID` avec l'ID d'un prix **live** (dashboard Stripe → Produits).

## Structure

```
netlify.toml                      # config build + SPA redirect
public/_redirects                 # fallback SPA (backup)
.github/workflows/deploy-netlify.yml  # CI optionnelle
supabase/
  config.toml                     # config edge functions
  functions/
    create-checkout-session/      # création session Stripe Checkout
    stripe-webhook/               # webhook Stripe (abonnement, factures)
  migrations/                     # schéma SQL Supabase
src/                              # application React
STRIPE_INTEGRATION_TODO.md        # guide d'intégration Stripe
```
