import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from './types';
import { supabase } from './supabaseClient';

// Convert DB row (snake_case) -> app entity (camelCase). Keys not in mapping pass through.
type ColumnMap = Record<string, string>; // db column -> app field
type JsonbField = 'json' | 'jsonArray' | 'jsonObject';

interface TableConfig {
  table: string;
  columnMap: ColumnMap; // db -> app
  jsonbFields: Record<string, JsonbField>; // app field -> type
}

const TABLES: Record<string, TableConfig> = {
  horses: {
    table: 'horses',
    columnMap: { user_id: 'userId', ferrure_type: 'ferrureType', last_ferrure: 'lastFerrure', last_ferrure_by: 'lastFerrureBy', last_ferrure_note: 'lastFerrureNote', last_vermifuge: 'lastVermifuge', birth_year: 'birthYear', birth_month: 'birthMonth' },
    jsonbFields: { owners: 'jsonArray' },
  },
  employees: {
    table: 'employees',
    columnMap: { user_id: 'userId', first_name: 'firstName', last_name: 'lastName', tarif_grid_id: 'tarifGridId', tarif_grid_ids: 'tarifGridIds' },
    jsonbFields: { pricing: 'jsonObject', advances: 'jsonArray', roles: 'jsonArray', tarifGridIds: 'jsonObject' },
  },
  trainings: {
    table: 'trainings',
    columnMap: { user_id: 'userId' },
    jsonbFields: {},
  },
  planning: {
    table: 'planning',
    columnMap: { user_id: 'userId', horse_id: 'horseId', rider_id: 'riderId', training_id: 'trainingId', ecart_note: 'ecartNote' },
    jsonbFields: {},
  },
  soins: {
    table: 'soins',
    columnMap: { user_id: 'userId', horse_id: 'horseId', assigned_to: 'assignedTo' },
    jsonbFields: {},
  },
  routines: {
    table: 'routines',
    columnMap: { user_id: 'userId', palefrenier_ids: 'palefrenierIds', start_date: 'startDate', end_date: 'endDate', horse_ids: 'horseIds', custom_price: 'customPrice' },
    jsonbFields: { weekdays: 'jsonArray', horseIds: 'jsonArray', palefrenierIds: 'jsonArray' },
  },
  tarifGrids: {
    table: 'tarif_grids',
    columnMap: { user_id: 'userId' },
    jsonbFields: { rates: 'jsonObject', trainingRates: 'jsonObject' },
  },
  douches: {
    table: 'douches',
    columnMap: { user_id: 'userId', horse_id: 'horseId', assigned_to: 'assignedTo', ecart_note: 'ecartNote' },
    jsonbFields: {},
  },
  elevageHorses: {
    table: 'elevage_horses',
    columnMap: { user_id: 'userId', birth_date: 'birthDate', dam_name: 'damName' },
    jsonbFields: {},
  },
  saillies: {
    table: 'saillies',
    columnMap: { user_id: 'userId', jument_id: 'jumentId', etalon_id: 'etalonId', mise_bas_prevue: 'miseBasPrevue', refuse_date: 'refuseDate' },
    jsonbFields: {},
  },
  weekSchedules: {
    table: 'week_schedules',
    columnMap: { user_id: 'userId', week_a_id: 'weekAId', week_b_id: 'weekBId', week_c_id: 'weekCId', week_d_id: 'weekDId', start_date: 'startDate', end_date: 'endDate' },
    jsonbFields: {},
  }, // 'active' column shares the same name in DB and app, passes through automatically
};

function invert(map: ColumnMap): ColumnMap {
  const out: ColumnMap = {};
  for (const [db, app] of Object.entries(map)) out[app] = db;
  return out;
}

function rowToEntity<T>(config: TableConfig, row: Record<string, unknown>): T {
  const inv = invert(config.columnMap);
  const out: Record<string, unknown> = {};
  for (const [dbKey, value] of Object.entries(row)) {
    if (dbKey === 'user_id') continue; // don't expose user_id in app entities
    const appKey = inv[dbKey] ?? dbKey;
    out[appKey] = value;
  }
  // Parse jsonb fields (they come as strings from some supabase versions, or already parsed)
  for (const [appField, kind] of Object.entries(config.jsonbFields)) {
    if (out[appField] !== undefined && typeof out[appField] === 'string') {
      try { out[appField] = JSON.parse(out[appField] as string); } catch { /* leave as-is */ }
    }
    if (kind === 'jsonArray' && !Array.isArray(out[appField])) {
      out[appField] = out[appField] === null ? [] : out[appField];
    }
    if (kind === 'jsonObject' && out[appField] === null) {
      out[appField] = {};
    }
  }
  return out as T;
}

function entityToRow(config: TableConfig, entity: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [appKey, value] of Object.entries(entity)) {
    if (appKey === 'userId') continue; // user_id is set by DB default
    const dbKey = config.columnMap[appKey] ?? appKey;
    if (config.jsonbFields[appKey] && typeof value !== 'string') {
      out[dbKey] = JSON.stringify(value);
    } else {
      out[dbKey] = value;
    }
  }
  return out;
}

function reportPersistenceError(collection: string, operation: 'read' | 'write', error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${collection} persistence:`, message);
  window.dispatchEvent(new CustomEvent('zarkava:persistence-error', {
    detail: { collection, operation, message },
  }));
}

export function usePersistentCollection<T extends { id: string }>(
  key: keyof typeof TABLES,
  user: User | null,
  demoData: T[],
): [T[], React.Dispatch<React.SetStateAction<T[]>>, () => Promise<void>] {
  const [items, setItems] = useState<T[]>(demoData);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadRequestRef = useRef(0);

  const config = TABLES[key];
  const userId = user?.id ?? null;
  const isDemo = !user || user.isDemo === true;

  const load = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoadedForUserId(null);
    if (isDemo) {
      setItems(demoData);
      return;
    }
    setItems([]);
    try {
      const { data, error } = await supabase.from(config.table).select('*');
      if (requestId !== loadRequestRef.current) return;
      if (error) {
        reportPersistenceError(key, 'read', error.message);
        return;
      }
      setItems((data ?? []).map((row) => rowToEntity<T>(config, row as Record<string, unknown>)));
      setLoadedForUserId(userId);
    } catch (error) {
      if (requestId === loadRequestRef.current) reportPersistenceError(key, 'read', error);
    }
  }, [isDemo, userId, demoData, config, key]);

  // Load when user changes
  useEffect(() => {
    load();
  }, [load]);

  // Debounced upsert sync (only for live users)
  useEffect(() => {
    if (isDemo || !userId || loadedForUserId !== userId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const rows = items.map((it) => entityToRow(config, it as Record<string, unknown>));
      if (rows.length === 0) return;
      // Upsert all rows (idempotent on PK)
      try {
        const { error } = await supabase.from(config.table).upsert(rows, { onConflict: 'id' });
        if (error) reportPersistenceError(key, 'write', error.message);
      } catch (error) {
        reportPersistenceError(key, 'write', error);
      }
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [items, userId, isDemo, loadedForUserId, key, config]);

  return [items, setItems, load];
}

// --- Ferrage orders: token-based access, separate handling ---

export function ferrageRowToOrder(row: Record<string, unknown>): import('./types').FerrageOrder {
  let horses = row.horses as unknown;
  if (typeof horses === 'string') { try { horses = JSON.parse(horses); } catch { horses = []; } }
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
    horses: (horses as import('./types').FerrageOrderHorse[]) ?? [],
  };
}

export function ferrageOrderToRow(o: import('./types').FerrageOrder): Record<string, unknown> {
  return {
    id: o.id,
    token: o.token,
    created_at: o.createdAt,
    expires_at: o.expiresAt,
    status: o.status,
    completed_at: o.completedAt ?? null,
    marechal_id: o.marechalId ?? null,
    marechal_name: o.marechalName ?? null,
    applied_at: o.appliedAt ?? null,
    trainer_observation: o.trainerObservation ?? null,
    horses: JSON.stringify(o.horses),
  };
}
