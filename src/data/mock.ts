import type {
  Employee,
  ElevageHorse,
  FerrageOrder,
  Horse,
  PlanningEntry,
  Routine,
  Saillie,
  Soin,
  TarifGrid,
  Training,
  Douche,
  WeekSchedule,
} from '../types';

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return iso(d);
};
const daysAhead = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return iso(d);
};

export const mockHorses: Horse[] = [
  {
    id: 'h1', name: 'Éclair du Sud', birthYear: 2021, birthMonth: 3, breed: 'Pur-sang anglais', status: 'actif',
    owners: [{ id: 'o1', name: 'Haras de Bellevue', phone: '+33 6 12 34 56 78', email: 'contact@bellevue.fr', share: 100 }],
    ferrureType: 'Fers aux 4 — Pinçons', lastFerrure: daysAgo(20), lastFerrureBy: 'Pascal Mercier', lastFerrureNote: 'Pied droit légèrement compact, surveiller la corne.', lastVermifuge: daysAgo(150),
    notes: 'Cheval très réactif, attention au pied droit.', box: 'A-12',
  },
  {
    id: 'h2', name: 'Étoile de Nuit', birthYear: 2022, birthMonth: 5, breed: 'Pur-sang anglais', status: 'actif',
    owners: [{ id: 'o2', name: 'M. Laurent Dupont', phone: '+33 6 98 76 54 32', email: 'laurent.dupont@email.fr', share: 60 }],
    ferrureType: 'Déferré des postérieurs', lastFerrure: daysAgo(18), lastFerrureBy: 'Pascal Mercier', lastFerrureNote: '', lastVermifuge: daysAgo(170),
    notes: 'Belle progression sur les longues distances.', box: 'A-14',
  },
  {
    id: 'h3', name: 'Galop Royal', birthYear: 2020, birthMonth: 1, breed: 'Pur-sang anglais', status: 'actif',
    owners: [{ id: 'o3', name: 'Écurie du Soleil', phone: '+33 6 11 22 33 44', email: 'ecurie@soleil.fr', share: 50 }],
    ferrureType: 'Fers aux 4', lastFerrure: daysAgo(15), lastFerrureBy: 'Pascal Mercier', lastFerrureNote: 'Bonne ferrure, pas de particularité.', lastVermifuge: daysAgo(120),
    notes: 'Très bon galop, à surveiller sur les virages.', box: 'B-02',
  },
  {
    id: 'h4', name: 'Tempête d\'Argent', birthYear: 2019, birthMonth: 6, breed: 'Pur-sang anglais', status: 'actif',
    owners: [{ id: 'o4', name: 'Mme Claire Moreau', phone: '+33 6 44 55 66 77', email: 'claire.moreau@email.fr', share: 100 }],
    ferrureType: 'Fers aux 4 — Pinçons longs', lastFerrure: daysAgo(12), lastFerrureBy: 'Pascal Mercier', lastFerrureNote: '', lastVermifuge: daysAgo(90),
    notes: 'Cheval solide, travaille bien sous la pluie.', box: 'B-04',
  },
  {
    id: 'h5', name: 'Plume d\'Espoir', birthYear: 2023, birthMonth: 2, breed: 'Pur-sang anglais', status: 'actif',
    owners: [{ id: 'o5', name: 'Groupe Cap Vert', phone: '+33 6 33 44 55 66', email: 'capvert@email.fr', share: 100 }],
    ferrureType: 'Fers aux 4', lastFerrure: daysAgo(2), lastFerrureBy: 'Pascal Mercier', lastFerrureNote: 'Premier ferrage, tout s\'est bien passé.', lastVermifuge: daysAgo(30),
    notes: 'Jeune cheval, en progression.', box: 'C-08',
  },
  {
    id: 'h6', name: 'Vif Argent', birthYear: 2021, birthMonth: 9, breed: 'Pur-sang anglais', status: 'repos',
    owners: [{ id: 'o6', name: 'Haras du Vent', phone: '+33 6 22 33 44 55', email: 'vent@haras.fr', share: 100 }],
    ferrureType: 'Déferré des antérieurs', lastFerrure: daysAgo(25), lastFerrureBy: 'Pascal Mercier', lastFerrureNote: '', lastVermifuge: daysAgo(160),
    notes: 'Légère boiterie, au repos 2 semaines.', box: 'C-10',
  },
  {
    id: 'h7', name: 'Bel Ami', birthYear: 2022, birthMonth: 4, breed: 'Pur-sang anglais', status: 'actif',
    owners: [{ id: 'o7', name: 'M. Paul Girard', phone: '+33 6 55 66 77 88', email: 'paul.girard@email.fr', share: 70 }],
    ferrureType: 'Fers aux 4', lastFerrure: daysAgo(19), lastFerrureBy: 'Pascal Mercier', lastFerrureNote: '', lastVermifuge: daysAgo(140),
    notes: 'Sensible au bruit, éviter le bord de piste.', box: 'A-16',
  },
  {
    id: 'h8', name: 'Queen du Ber', birthYear: 2020, birthMonth: 7, breed: 'Pur-sang anglais', status: 'actif',
    owners: [{ id: 'o8', name: 'Écurie du Ber', phone: '+33 6 77 88 99 00', email: 'ber@ecurie.fr', share: 100 }],
    ferrureType: 'Fers aux 4 — Pinçons', lastFerrure: daysAgo(11), lastFerrureBy: 'Pascal Mercier', lastFerrureNote: 'Pinçons ajustés, bonne accroche.', lastVermifuge: daysAgo(180),
    notes: 'Belle championne, finale en octobre.', box: 'B-06',
  },
];

export const mockTrainings: Training[] = [
  { id: 't1', name: 'Trotting léger', description: '30 min de trot sur piste en herbe', intensity: 'faible', duration: 30, category: 'lot' },
  { id: 't2', name: 'Galop intermittent', description: 'Galop 800m x 3, récupération 5 min', intensity: 'fort', duration: 45, category: 'lot' },
  { id: 't3', name: 'Longe en liberté', description: 'Travail sur longe 25 min', intensity: 'faible', duration: 25, category: 'longe' },
  { id: 't4', name: 'Natation', description: 'Bassin 20 min', intensity: 'moyen', duration: 20, category: 'natation' },
  { id: 't5', name: 'Sprint ligne droite', description: 'Sprint 600m x 4', intensity: 'fort', duration: 40, category: 'lot' },
  { id: 't6', name: 'Marche en main', description: 'Marche 40 min en forêt', intensity: 'faible', duration: 40, category: 'lot' },
  { id: 't7', name: 'Douche + récupération', description: 'Douche + marche 15 min', intensity: 'faible', duration: 15, category: 'lot' },
];

export const mockEmployees: Employee[] = [
  { id: 'e1', firstName: 'Karim', lastName: 'Benali', phone: '+33 6 11 11 11 11', role: 'cavalier', pin: '1234', color: '#dbeafe', tarifGridId: 'g1' },
  { id: 'e2', firstName: 'Sophie', lastName: 'Martin', phone: '+33 6 22 22 22 22', role: 'cavalier', pin: '2345', color: '#fef3c7', tarifGridId: 'g1' },
  { id: 'e3', firstName: 'Marc', lastName: 'Dubois', phone: '+33 6 33 33 33 33', role: 'lad', pin: '3456', color: '#dcfce7', tarifGridId: 'g2' },
  { id: 'e4', firstName: 'Lucia', lastName: 'Fernandez', phone: '+33 6 44 44 44 44', role: 'palefrenier', pin: '4567', color: '#fce7f3', pricing: { nettoyage: 2.5, vidage: 5, nourriture: 10, soinParticulier: 15 } },
  { id: 'e5', firstName: 'Antoine', lastName: 'Roux', phone: '+33 6 55 55 55 55', role: 'palefrenier', pin: '5678', color: '#e0e7ff', pricing: { nettoyage: 2.5, vidage: 5, nourriture: 10, soinParticulier: 15 } },
  { id: 'e6', firstName: 'Pascal', lastName: 'Mercier', phone: '+33 6 66 66 66 66', role: 'marechal' },
];

export const mockTarifGrids: TarifGrid[] = [
  { id: 'g1', name: 'Grille Cavalier standard', role: 'cavalier', rates: { lot: 22, longe: 8, natation: 10, douche: 5, nettoyage: 0, vidage: 0, nourriture: 0 }, trainingRates: {} },
  { id: 'g2', name: 'Grille Lad', role: 'lad', rates: { lot: 18, longe: 6, natation: 8, douche: 5, nettoyage: 0, vidage: 0, nourriture: 0 }, trainingRates: {} },
];

const tomorrow = daysAhead(1);
const yesterday = daysAgo(1);
const lastWeek = daysAgo(7);

export const mockPlanning: PlanningEntry[] = [
  { id: 'p1', date: yesterday, lot: 1, horseId: 'h1', riderId: 'e1', trainingId: 't2', notes: 'Très bon travail, finit fort.', done: true },
  { id: 'p2', date: yesterday, lot: 1, horseId: 'h3', riderId: 'e2', trainingId: 't5', notes: 'Sprint excellent.', done: true },
  { id: 'p3', date: yesterday, lot: 2, horseId: 'h4', riderId: 'e1', trainingId: 't4', notes: 'Natation bien supportée.', done: true },
  { id: 'p4', date: yesterday, lot: 3, horseId: 'h5', riderId: 'e3', trainingId: 't1', notes: 'Trot léger, cheval détendu.', done: true },
  { id: 'p5', date: lastWeek, lot: 1, horseId: 'h2', riderId: 'e2', trainingId: 't2', notes: 'Galop intermittent.', done: true },
  { id: 'p6', date: lastWeek, lot: 1, horseId: 'h7', riderId: 'e1', trainingId: 't5', notes: 'Sprint ligne droite.', done: true },
  { id: 'p7', date: lastWeek, lot: 2, horseId: 'h8', riderId: 'e3', trainingId: 't4', notes: 'Natation + récup.', done: true },
  { id: 'p8', date: lastWeek, lot: 3, horseId: 'h5', riderId: 'e2', trainingId: 't6', notes: 'Marche en main.', done: true },
  { id: 'p9', date: tomorrow, lot: 1, horseId: 'h2', riderId: 'e2', trainingId: 't2', notes: '', done: false },
  { id: 'p10', date: tomorrow, lot: 1, horseId: 'h7', riderId: 'e1', trainingId: 't5', notes: '', done: false },
  { id: 'p11', date: tomorrow, lot: 2, horseId: 'h8', riderId: 'e3', trainingId: 't4', notes: '', done: false },
  { id: 'p12', date: tomorrow, lot: 3, horseId: 'h5', riderId: 'e2', trainingId: 't6', notes: '', done: false },
];

export const mockSoins: Soin[] = [
  { id: 's1', horseId: 'h1', type: 'nettoyage_box', date: daysAgo(0), done: true, assignedTo: 'e4', note: 'Box propre.' },
  { id: 's2', horseId: 'h2', type: 'vidage_box', date: daysAgo(0), done: false, assignedTo: 'e5', note: 'Vidage complet.' },
  { id: 's3', horseId: 'h6', type: 'soin_particulier', date: daysAgo(0), done: false, assignedTo: 'e4', note: 'Boiterie à surveiller — pied gauche.' },
  { id: 's4', horseId: 'h3', type: 'nettoyage_box', date: daysAhead(1), done: false, assignedTo: 'e5', note: '' },
];

export const mockRoutines: Routine[] = [
  { id: 'r1', name: 'Semaine A — Nettoyage matinal', palefrenierIds: ['e4'], weekdays: [1, 2, 3, 4, 5], startDate: daysAgo(1), endDate: daysAhead(90), type: 'nettoyage_box', horseIds: ['h1', 'h3'], note: 'Matin' },
  { id: 'r2', name: 'Semaine B — Nourriture', palefrenierIds: ['e5'], weekdays: [1, 2, 3, 4, 5, 6], startDate: daysAgo(1), endDate: daysAhead(90), type: 'nourriture', horseIds: ['h1', 'h2', 'h3', 'h4', 'h5', 'h7', 'h8'], note: '' },
];

export const mockWeekSchedules: WeekSchedule[] = [
  { id: 'ws1', name: 'Programme principal', weekAId: 'r1', weekBId: 'r2', weekCId: 'r1', weekDId: 'r2', startDate: daysAgo(1), endDate: daysAhead(180), active: true },
];

export const mockDouches: Douche[] = [];

export const mockElevageHorses: ElevageHorse[] = [
  { id: 'eh1', name: 'Belle du Vivier', category: 'jument', breed: 'Pur-sang anglais', notes: 'Très bonne reproductrice.', sire: 'FR-12345' },
  { id: 'eh2', name: 'Titan Royal', category: 'etalon', breed: 'Pur-sang anglais', notes: 'Étalon performant, excellente lignée.' },
  { id: 'eh3', name: 'Petit Tonnerre', category: 'poulain', breed: 'Pur-sang anglais', birthDate: daysAgo(120), damName: 'Belle du Vivier', notes: 'Poulain vigoureux.' },
];

export const mockSaillies: Saillie[] = [
  { id: 'sa1', date: daysAgo(60), jumentId: 'eh1', etalonId: 'eh2', observations: 'Saut confirmé, jument réceptive.', sauts: 1, status: 'confirmee', miseBasPrevue: daysAhead(300) },
];

export const mockFerrageOrders: FerrageOrder[] = [];

export const trainerUser = {
  id: 'u1', email: 'trainer@zarkava.fr', name: 'M. Antoine Lemaire', role: 'trainer' as const,
};
