// Ferrure cycle: 21 days. Vermifuge cycle: 180 days.

export const FERRURE_CYCLE_DAYS = 21;
export const VERMIFUGE_CYCLE_DAYS = 180;

export function daysSince(isoDate: string): number {
  const d = new Date(isoDate + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((now.getTime() - d.getTime()) / 86400000);
  return diff;
}

export function daysUntilNext(isoDate: string, cycle: number): number {
  return cycle - daysSince(isoDate);
}

export type AlertLevel = 'green' | 'orange' | 'red';

export function alertLevel(isoDate: string, cycle: number): AlertLevel {
  const remaining = daysUntilNext(isoDate, cycle);
  if (remaining <= 3) return 'red';
  if (remaining <= 6) return 'orange';
  return 'green';
}

export function progressPercent(isoDate: string, cycle: number): number {
  const elapsed = daysSince(isoDate);
  return Math.max(0, Math.min(100, (elapsed / cycle) * 100));
}

export function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtDateLong(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function sameWeekday(isoA: string, isoB: string): boolean {
  return new Date(isoA + 'T00:00:00').getDay() === new Date(isoB + 'T00:00:00').getDay();
}

export function randomToken(len = 24): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    cavalier: 'Cavalier',
    lad: 'Lad',
    palefrenier: 'Palefrenier',
    marechal: 'Maréchal-ferrant',
    trainer: 'Entraîneur',
  };
  return map[role] ?? role;
}

// Compute horse age in years from birth month/year
export function horseAge(birthYear: number, birthMonth: number): number {
  const now = new Date();
  let age = now.getFullYear() - birthYear;
  if (now.getMonth() + 1 < birthMonth) age--;
  return Math.max(0, age);
}

export function ageLabel(birthYear: number, birthMonth: number): string {
  const age = horseAge(birthYear, birthMonth);
  if (age <= 0) {
    const months = (new Date().getFullYear() - birthYear) * 12 + (new Date().getMonth() + 1) - birthMonth;
    return `${Math.max(0, months)} mois`;
  }
  return `${age} an${age > 1 ? 's' : ''}`;
}

export const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

// Lot colors — blue gradient that adapts to total number of lots
// We generate a smooth gradient from light blue to dark blue
export function lotColors(totalLots: number): { bg: string; text: string }[] {
  const max = Math.max(2, Math.min(12, totalLots));
  const result: { bg: string; text: string }[] = [];
  // Light blue: #e0edf7, Dark blue: #1e3a5f
  const startR = 0xe0, startG = 0xed, startB = 0xf7;
  const endR = 0x1e, endG = 0x3a, endB = 0x5f;
  for (let i = 0; i < max; i++) {
    const t = max > 1 ? i / (max - 1) : 0;
    const r = Math.round(startR + (endR - startR) * t);
    const g = Math.round(startG + (endG - startG) * t);
    const b = Math.round(startB + (endB - startB) * t);
    const bg = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    // White text for darker lots (t > 0.55)
    const text = t > 0.55 ? '#ffffff' : '#1c302f';
    result.push({ bg, text });
  }
  return result;
}

export function lotColor(totalLots: number, lot: number): { bg: string; text: string } {
  const colors = lotColors(totalLots);
  const idx = Math.min(Math.max(0, lot - 1), colors.length - 1);
  return colors[idx];
}

// Default palefrenier pricing
export const DEFAULT_PALEFRENIER_PRICING = {
  nettoyage: 2.5,
  vidage: 5,
  nourriture: 10,
  soinParticulier: 15,
};
