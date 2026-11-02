import { useEffect, useRef, useState } from 'react';
import type { FerrageOrder, FerrageOrderHorse, User } from './types';
import { supabase, reportSupabaseProblem } from './supabaseClient';

// --- Description des tables ---------------------------------------------------------------
// columns : colonne SQL (snake_case) -> champ de l'application (camelCase). Les autres colonnes gardent leur nom.
// json    : champs stockés en jsonb ; ils valent toujours un tableau ou un objet côté application.
interface TableConfig {
  table: string;
  columns: Record<string, string>;
  json: Record<string, 'array' | 'object'>;
}

const TABLES = {
  horses: {
    table: 'horses',
    columns: { ferrure_type: 'ferrureType', last_ferrure: 'lastFerrure', last_ferrure_by: 'lastFerrureBy', last_ferrure_note: 'lastFerrureNote', last_vermifuge: 'lastVermifuge', birth_year: 'birthYear', birth_month: 'birthMonth' },
    json: { owners: 'array' },
  },
  employees: {
    table: 'employees',
    columns: { first_name: 'firstName', last_name: 'lastName', tarif_grid_id: 'tarifGridId', tarif_grid_ids: 'tarifGridIds' },
    json: { pricing: 'object', advances: 'array', roles: 'array', tarifGridIds: 'object' },
  },
  trainings: { table: 'trainings', columns: {}, json: {} },
  planning: {
    table: 'planning',
    columns: { horse_id: 'horseId', rider_id: 'riderId', training_id: 'trainingId', ecart_note: 'ecartNote' },
    json: {},
  },
  soins: {
    table: 'soins',
    columns: { horse_id: 'horseId', assigned_to: 'assignedTo' },
    json: {},
  },
  routines: {
    table: 'routines',
    columns: { palefrenier_ids: 'palefrenierIds', start_date: 'startDate', end_date: 'endDate', horse_ids: 'horseIds', custom_price: 'customPrice' },
    json: { weekdays: 'array', horseIds: 'array', palefrenierIds: 'array' },
  },
  tarifGrids: {
    table: 'tarif_grids',
    // training_rates était absent de l'ancien mapping : la colonne n'était ni lue ni écrite correctement.
    columns: { training_rates: 'trainingRates' },
    json: { rates: 'object', trainingRates: 'object' },
  },
  douches: {
    table: 'douches',
    columns: { horse_id: 'horseId', assigned_to: 'assignedTo', ecart_note: 'ecartNote' },
    json: {},
  },
  elevageHorses: {
    table: 'elevage_horses',
    columns: { birth_date: 'birthDate', dam_name: 'damName' },
    json: {},
  },
  saillies: {
    table: 'saillies',
    columns: { jument_id: 'jumentId', etalon_id: 'etalonId', mise_bas_prevue: 'miseBasPrevue', refuse_date: 'refuseDate' },
    json: {},
  },
  weekSchedules: {
    table: 'week_schedules',
    columns: { week_a_id: 'weekAId', week_b_id: 'weekBId', week_c_id: 'weekCId', week_d_id: 'weekDId', start_date: 'startDate', end_date: 'endDate' },
    json: {},
  },
} satisfies Record<string, TableConfig>;

export type TableKey = keyof typeof TABLES;

const invert = (map: Record<string, string>) => Object.fromEntries(Object.entries(map).map(([db, app]) => [app, db]));
const TO_DB = Object.fromEntries(Object.entries(TABLES).map(([key, cfg]) => [key, invert(cfg.columns)])) as Record<TableKey, Record<string, string>>;

// --- Conversion ligne SQL <-> objet de l'application ------------------------------------
function rowToEntity<T>(key: TableKey, row: Record<string, unknown>): T {
  const cfg: TableConfig = TABLES[key];
  const entity: Record<string, unknown> = {};
  for (const [dbKey, value] of Object.entries(row)) {
    if (dbKey === 'user_id') continue;
    entity[cfg.columns[dbKey] ?? dbKey] = value;
  }
  for (const [field, kind] of Object.entries(cfg.json)) {
    let value = entity[field];
    // Anciennes lignes enregistrées comme du texte JSON : on les relit.
    if (typeof value === 'string') {
      try { value = JSON.parse(value); } catch { /* on garde la valeur telle quelle */ }
    }
    entity[field] = value ?? (kind === 'array' ? [] : {});
  }
  return entity as T;
}

function entityToRow(key: TableKey, entity: object, userId: string): Record<string, unknown> {
  const toDb = TO_DB[key];
  const row: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(entity)) {
    if (field === 'userId') continue;
    row[toDb[field] ?? field] = value; // les champs jsonb partent tels quels (objets/tableaux)
  }
  row.user_id = userId;
  return row;
}

// --- Hook : une collection synchronisée avec Supabase ------------------------------------
/**
 * Renvoie [éléments, setÉléments]. Compte réel : lecture de la table au chargement, puis envoi des seules
 * modifications (ajouts, changements, suppressions) 0,8 s après le dernier changement.
 * Mode démo (user absent ou isDemo) : données fictives en mémoire, rien n'est envoyé.
 */
export function usePersistentCollection<T extends { id: string }>(
  key: TableKey,
  user: User | null,
  demoData: T[],
): [T[], React.Dispatch<React.SetStateAction<T[]>>] {
  const table = TABLES[key].table;
  const userId = user?.id ?? null;
  const isDemo = !user || user.isDemo === true;

  const [items, setItems] = useState<T[]>(demoData);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const synced = useRef(new Map<string, string>()); // id -> JSON de la version connue en base

  // Lecture
  useEffect(() => {
    let cancelled = false; // vrai si l'utilisateur a changé entre-temps : la réponse est alors ignorée
    synced.current = new Map();
    setLoadedFor(null);

    if (isDemo) {
      setItems(demoData);
      return;
    }
    setItems([]);

    (async () => {
      try {
        const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
        if (cancelled) return;
        if (error) { reportSupabaseProblem(key, 'read', error); return; }
        const loaded = (data ?? []).map((row) => rowToEntity<T>(key, row as Record<string, unknown>));
        synced.current = new Map(loaded.map((item) => [item.id, JSON.stringify(item)]));
        setItems(loaded);
        setLoadedFor(userId);
      } catch (error) {
        if (!cancelled) reportSupabaseProblem(key, 'read', error);
      }
    })();

    return () => { cancelled = true; };
  }, [isDemo, userId, demoData, table, key]);

  // Écriture (uniquement ce qui a changé depuis la dernière synchronisation)
  useEffect(() => {
    if (isDemo || !userId || loadedFor !== userId) return;
    const known = synced.current; // si la collection est rechargée entre-temps, synced.current change : on abandonne

    const timer = setTimeout(async () => {
      const snapshots = new Map(items.map((item) => [item.id, JSON.stringify(item)]));
      const changed = items.filter((item) => known.get(item.id) !== snapshots.get(item.id));
      const removed = [...known.keys()].filter((id) => !snapshots.has(id));

      try {
        if (changed.length > 0) {
          const rows = changed.map((item) => entityToRow(key, item, userId));
          const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id', defaultToNull: false });
          if (known !== synced.current) return;
          if (error) reportSupabaseProblem(key, 'write', error);
          else changed.forEach((item) => known.set(item.id, snapshots.get(item.id)!));
        }
        if (removed.length > 0) {
          const { error } = await supabase.from(table).delete().in('id', removed);
          if (known !== synced.current) return;
          if (error) reportSupabaseProblem(key, 'write', error);
          else removed.forEach((id) => known.delete(id));
        }
      } catch (error) {
        if (known === synced.current) reportSupabaseProblem(key, 'write', error);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [items, isDemo, userId, loadedFor, table, key]);

  return [items, setItems];
}

// --- Bons de ferrage (table ferrage_orders, accessible par lien magique) ----------------
export function ferrageRowToOrder(row: Record<string, unknown>): FerrageOrder {
  let horses = row.horses as unknown;
  if (typeof horses === 'string') {
    try { horses = JSON.parse(horses); } catch { horses = []; }
  }
  return {
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
}

export function ferrageOrderToRow(order: FerrageOrder): Record<string, unknown> {
  return {
    id: order.id,
    token: order.token,
    created_at: order.createdAt,
    expires_at: order.expiresAt,
    status: order.status,
    completed_at: order.completedAt ?? null,
    marechal_id: order.marechalId ?? null,
    marechal_name: order.marechalName ?? null,
    applied_at: order.appliedAt ?? null,
    trainer_observation: order.trainerObservation ?? null, // absent avant : l'observation de l'entraîneur n'était jamais enregistrée
    horses: order.horses,
  };
}
