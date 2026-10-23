// Domain types for the stable management app

export type HorseStatus = 'actif' | 'repos' | 'sorti';

export type EmployeeRole = 'cavalier' | 'lad' | 'palefrenier' | 'marechal';

export interface Owner {
  id: string;
  name: string;
  phone: string;
  email: string;
  share: number; // percentage
}

export interface Horse {
  id: string;
  name: string;
  birthYear: number;
  birthMonth: number; // 1-12
  breed: string;
  status: HorseStatus;
  owners: Owner[];
  ferrureType: string;
  lastFerrure: string; // ISO date
  lastFerrureBy: string; // maréchal name who last shoed the horse
  lastFerrureNote: string; // note from last maréchal
  lastVermifuge: string; // ISO date
  notes: string;
  box: string;
  photo?: string; // compressed data URL
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: EmployeeRole;
  roles?: EmployeeRole[];
  pin?: string;
  color?: string; // pastel color for planning rows (hex)
  // Palefrenier pricing (à l'acte)
  pricing?: {
    nettoyage: number; // per horse
    vidage: number; // per horse
    nourriture: number; // flat rate for all horses
    soinParticulier: number;
  };
  tarifGridId?: string;
  tarifGridIds?: Partial<Record<EmployeeRole, string>>;
  advances?: { id: string; date: string; amount: number; method: string }[];
}

export interface TarifGrid {
  id: string;
  name: string;
  role: EmployeeRole;
  rates: {
    lot: number;
    longe: number;
    natation: number;
    paddock: number;
    douche: number;
    nettoyage: number;
    vidage: number;
    nourriture: number;
  };
  trainingRates: Record<string, number>; // trainingId -> price (overrides category rates)
}

// Category drives how a planning entry is billed for the rider.
export type TrainingCategory = 'lot' | 'longe' | 'paddock' |'natation' | 'autre';

export interface Training {
  id: string;
  name: string;
  description: string;
  intensity: 'faible' | 'moyen' | 'fort';
  duration: number; // minutes
  category: TrainingCategory;
}

export interface PlanningEntry {
  id: string;
  date: string; // ISO date
  lot: number;
  horseId: string;
  riderId: string;
  trainingId: string;
  notes: string;
  done: boolean;
  ecartNote?: string; // free-text change vs. prévision, edited from Récapitulatif
}

export type SoinType = 'nettoyage_box' | 'vidage_box' | 'nourriture' | 'soin_particulier';

export interface Soin {
  id: string;
  horseId: string;
  type: SoinType;
  date: string;
  done: boolean;
  assignedTo?: string; // employee id
  note: string;
  price?: number; // for soin_particulier, custom price
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday ... 6 = Saturday

// A routine defines care tasks for specific weekdays
export interface Routine {
  id: string;
  name: string;
  palefrenierIds: string[]; // multiple people, amount split equally
  weekdays: Weekday[];
  startDate: string;
  endDate: string;
  type: SoinType;
  horseIds: string[];
  note: string;
  customPrice?: number;
}

// A week schedule assigns routines to specific weeks (A/B/C/D) over a date range
export interface WeekSchedule {
  id: string;
  name: string;
  weekAId: string | null;
  weekBId: string | null;
  weekCId: string | null;
  weekDId: string | null;
  startDate: string;
  endDate: string;
  active: boolean;
}

// Douches — shower assignment per horse for a given day
export interface Douche {
  id: string;
  date: string;
  horseId: string;
  assignedTo: string; // employee id (rider or palefrenier)
  done: boolean;
  ecartNote?: string; // free-text change vs. prévision, edited from Récapitulatif
}

export interface FerrageOrderHorse {
  horseId: string;
  horseName: string;
  box: string;
  ferrureType: string;
  consigne: string;
  done: boolean;
  note: string;
  price?: number; // amount charged for this horse's ferrure
  photo?: string; // horse photo data URL for farrier view
  // Previous ferrure info shown to maréchal
  lastFerrureBy: string;
  lastFerrureNote: string;
}

export interface FerrageOrder {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  horses: FerrageOrderHorse[];
  status: 'pending' | 'completed';
  completedAt?: string;
  marechalId?: string;
  marechalName?: string;
  appliedAt?: string;
  trainerObservation?: string;
}

// --- Élevage ---

export type ElevageCategory = 'jument' | 'etalon' | 'poulain' | 'pouliche';

export interface ElevageHorse {
  id: string;
  name: string;
  category: ElevageCategory;
  breed: string;
  birthDate?: string;
  sire?: string;
  damName?: string;
  notes: string;
  photo?: string;
}

export type SaillieStatus = 'refuse' | 'confirmee' | 'en_attente';

export interface Saillie {
  id: string;
  date: string;
  jumentId: string;
  etalonId: string;
  observations: string;
  sauts: number;
  status: SaillieStatus;
  miseBasPrevue?: string;
  refuseDate?: string; // date when refusal was determined
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'trainer';
  isDemo?: boolean;
  logoUrl?: string;
}

export type Session =
  | { kind: 'trainer'; user: User }
  | { kind: 'field'; employeeId: string }
  | { kind: 'farrier'; order: FerrageOrder };

export type AuthMode = 'demo' | 'live';
