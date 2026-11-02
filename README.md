# Zarkava — Gestion d'écurie de course

Application web de gestion d'écurie (chevaux, employés, planning, ferrage, soins, facturation).

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- Supabase (authentification et base de données)

Après la création d'un compte, toutes les fonctionnalités et données du compte
sont accessibles sans abonnement ni paiement. Les données restent isolées par
compte.

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
| `VITE_SUPABASE_URL` | l'URL Supabase |
| `VITE_SUPABASE_ANON_KEY` | la clé anon Supabase |

Ces deux variables sont nécessaires au frontend.
Après les avoir ajoutées ou modifiées, déclenchez un nouveau déploiement : Vite
intègre ces valeurs au moment du build, elles ne sont pas lues à chaud.

### 4. Préparer la base Supabase

Le déploiement du site ne crée pas les tables. Dans le **SQL Editor** du projet Supabase correspondant à
l'URL configurée, collez le contenu de `supabase/schema.sql` et cliquez sur **Run**. Ce script unique remplace
les anciennes migrations : il crée les tables manquantes, ajoute les colonnes absentes et remet les règles de
sécurité à plat. Il peut être relancé à tout moment sans perdre de données.

Si des Edge Functions `create-checkout-session` ou `stripe-webhook` sont encore déployées sur Supabase (reste de
l'ancien paiement Stripe), supprimez-les, désactivez le webhook côté Stripe et révoquez les clés Stripe.
Retirer les fichiers du dépôt ne les désinstalle pas.

### 5. (Optionnel) Déploiement automatique par GitHub Actions

Le workflow `.github/workflows/deploy-netlify.yml` déploie à chaque push sur
`main`. Il construit le site dans GitHub Actions avant de l'envoyer à Netlify :
les variables configurées uniquement dans Netlify ne sont donc pas disponibles
pendant ce build. Ajouter ces quatre secrets dans le repo GitHub
(**Settings → Secrets and variables → Actions**) :

- `NETLIFY_AUTH_TOKEN` — token perso : https://app.netlify.com/user/applications
- `NETLIFY_SITE_ID` — API ID du site : Netlify → Site settings → General → Site details
- `VITE_SUPABASE_URL` — URL du projet Supabase
- `VITE_SUPABASE_ANON_KEY` — clé anon du même projet Supabase

Si Netlify déploie directement depuis GitHub, configurez les variables Supabase
dans Netlify et désactivez ce workflow dans GitHub Actions pour éviter deux
déploiements indépendants à chaque push. Le script `supabase/schema.sql`
reste à exécuter séparément dans les deux cas.

## Dépannage : « Failed to fetch » / chargement des données impossible

Le bandeau rouge en bas de l'écran indique la cause probable. Dans l'ordre :

1. **Projet Supabase en pause** (offre gratuite après une semaine d'inactivité) : tableau de bord Supabase →
   *Restore project*. Tant qu'il est en pause, toutes les requêtes échouent avec « Failed to fetch ».
2. **Variables absentes ou erronées dans la version déployée** : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont
   figées au moment du build. Après toute modification (secrets GitHub ou variables Netlify), relancez un déploiement.
   L'URL et la clé doivent venir du même projet (clé « anon », jamais « service_role »).
3. **Tables ou colonnes manquantes** : exécutez `supabase/schema.sql` (voir plus haut).
4. **Confirmation d'e-mail activée** : un nouveau compte doit cliquer sur le lien reçu avant de pouvoir se connecter.

## Structure

```
netlify.toml                      # config build + SPA redirect
public/_redirects                 # fallback SPA (backup)
.github/workflows/deploy-netlify.yml  # CI optionnelle
supabase/
  schema.sql                      # schéma SQL Supabase complet (à exécuter dans le SQL Editor)
src/                              # application React
```
