-- =====================================================================================
-- Zarkava — schéma complet de la base Supabase
-- À coller dans Supabase → SQL Editor → Run. Peut être relancé sans risque : il crée ce qui
-- manque, complète les colonnes absentes et ne supprime aucune donnée.
-- Il remplace tous les anciens fichiers de supabase/migrations/.
-- =====================================================================================

-- Droits d'accès à l'API de données (au cas où ils ne seraient pas accordés par défaut)
grant usage on schema public to anon, authenticated;

-- ------------------------------------------------------------------ Tables du compte
create table if not exists horses (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  age integer default 4,
  breed text not null default '',
  status text not null default 'actif',
  ferrure_type text not null default '',
  last_ferrure date not null default current_date,
  last_ferrure_by text not null default '',
  last_ferrure_note text default '',
  last_vermifuge date not null default current_date,
  notes text not null default '',
  box text not null default '',
  owners jsonb not null default '[]'::jsonb,
  photo text,
  birth_year int,
  birth_month int
);
alter table horses add column if not exists photo text;
alter table horses add column if not exists birth_year int;
alter table horses add column if not exists birth_month int;
alter table horses add column if not exists last_ferrure_note text default '';
alter table horses alter column age drop not null;

create table if not exists employees (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text not null default '',
  role text not null default 'cavalier',
  pin text,
  pricing jsonb,
  tarif_grid_id text,
  advances jsonb not null default '[]'::jsonb,
  color text,
  roles jsonb,
  tarif_grid_ids jsonb
);
alter table employees add column if not exists color text;
alter table employees add column if not exists roles jsonb;
alter table employees add column if not exists tarif_grid_ids jsonb;

create table if not exists trainings (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  intensity text not null default 'faible',
  duration integer not null default 30,
  category text not null default 'lot'
);

create table if not exists planning (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  lot integer not null default 1,
  horse_id text not null,
  rider_id text not null,
  training_id text not null,
  notes text not null default '',
  done boolean not null default false,
  ecart_note text
);
alter table planning add column if not exists ecart_note text;

create table if not exists soins (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  horse_id text not null,
  type text not null,
  date date not null,
  done boolean not null default false,
  assigned_to text,
  note text not null default '',
  price numeric
);
alter table soins add column if not exists price numeric;

create table if not exists routines (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  palefrenier_id text,                       -- ancienne colonne, remplacée par palefrenier_ids
  palefrenier_ids jsonb not null default '[]'::jsonb,
  weekdays jsonb not null default '[]'::jsonb,
  start_date date not null,
  end_date date not null,
  type text not null,
  horse_ids jsonb not null default '[]'::jsonb,
  note text not null default '',
  week_pattern text not null default 'A',    -- ancienne colonne, plus utilisée
  custom_price numeric
);
alter table routines add column if not exists palefrenier_ids jsonb not null default '[]'::jsonb;
alter table routines add column if not exists week_pattern text not null default 'A';
alter table routines add column if not exists custom_price numeric;
-- L'application n'envoie plus palefrenier_id : s'il restait obligatoire, chaque nouvelle routine était refusée.
alter table routines alter column palefrenier_id drop not null;

create table if not exists tarif_grids (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  role text not null,
  rates jsonb not null default '{}'::jsonb,
  training_rates jsonb default '{}'::jsonb
);
alter table tarif_grids add column if not exists training_rates jsonb default '{}'::jsonb;

create table if not exists douches (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  horse_id text not null,
  assigned_to text not null,
  done boolean not null default false,
  ecart_note text
);
alter table douches add column if not exists ecart_note text;

create table if not exists elevage_horses (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'jument',
  breed text not null default '',
  birth_date date,
  sire text,
  dam_name text,
  notes text not null default '',
  photo text
);

create table if not exists saillies (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  jument_id text not null,
  etalon_id text not null,
  observations text not null default '',
  sauts integer not null default 1,
  status text not null default 'en_attente',
  mise_bas_prevue date,
  refuse_date date
);
alter table saillies add column if not exists refuse_date date;

create table if not exists week_schedules (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null default '',
  week_a_id text,
  week_b_id text,
  week_c_id text,
  week_d_id text,
  start_date date not null default current_date,
  end_date date not null default (current_date + 90),
  created_at timestamptz default now(),
  active boolean not null default true
);
alter table week_schedules add column if not exists active boolean not null default true;

create table if not exists profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  logo_url text
);

-- ------------------------------------------------------------------ Sécurité des tables du compte
-- Une seule règle par table : chaque compte ne voit et ne modifie que ses propres lignes.
-- (Les anciennes règles, créées par les migrations, sont remplacées par celle-ci.)
do $$
declare
  t text;
  p record;
begin
  foreach t in array array['horses','employees','trainings','planning','soins','routines',
                           'tarif_grids','douches','elevage_horses','saillies','week_schedules','profiles'] loop
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('create policy "owner_all" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create index if not exists %I on public.%I (user_id)', 'idx_' || t || '_user_id', t);
  end loop;
end $$;

-- ------------------------------------------------------------------ Logo : sorti du jeton de connexion
-- Un logo stocké dans les métadonnées du compte est recopié dans le jeton envoyé à chaque requête ; trop gros,
-- il fait échouer toutes les lectures (erreur 520, « Failed to fetch »). On le déplace dans la table profiles.
insert into profiles (user_id, logo_url)
  select id, raw_user_meta_data->>'logo_url' from auth.users where raw_user_meta_data ? 'logo_url'
  on conflict (user_id) do nothing;
update auth.users set raw_user_meta_data = raw_user_meta_data - 'logo_url' where raw_user_meta_data ? 'logo_url';

-- ------------------------------------------------------------------ Bons de ferrage (lien magique)
create table if not exists ferrage_orders (
  id text primary key,
  token text unique not null,
  created_at date not null,
  expires_at date not null,
  status text not null default 'pending',
  completed_at date,
  marechal_id text,
  marechal_name text,
  applied_at date,
  trainer_observation text default '',
  horses jsonb not null default '[]'::jsonb,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade
);
alter table ferrage_orders add column if not exists applied_at date;
alter table ferrage_orders add column if not exists trainer_observation text default '';
alter table ferrage_orders add column if not exists user_id uuid references auth.users(id) on delete cascade;
-- Les nouveaux bons créés par un entraîneur connecté lui sont automatiquement rattachés.
alter table ferrage_orders alter column user_id set default auth.uid();
create index if not exists idx_ferrage_orders_token on ferrage_orders (token);
create index if not exists idx_ferrage_orders_user_id on ferrage_orders (user_id);

-- Le maréchal n'a pas de compte : le lien (token) sert de clé d'accès, donc accès ouvert à anon.
alter table ferrage_orders enable row level security;
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'ferrage_orders' loop
    execute format('drop policy %I on public.ferrage_orders', p.policyname);
  end loop;
end $$;
create policy "ferrage_acces_par_lien" on ferrage_orders for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on ferrage_orders to anon, authenticated;

-- ------------------------------------------------------------------ Abonnements Stripe (abandonnés)
-- La table "subscriptions" n'est plus utilisée. Si elle existe encore, vous pouvez la supprimer :
-- drop table if exists subscriptions;

-- Demande à l'API de relire le schéma (évite les erreurs "schema cache" juste après une modification)
notify pgrst, 'reload schema';
