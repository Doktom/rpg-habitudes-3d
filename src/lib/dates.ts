// Dates en chaînes 'YYYY-MM-DD', calculées en UTC. Semaine du lundi au dimanche.
import type { ISODate } from './types';

let clock: ISODate | null = null;

/** Horloge simulée (mode test). null = vraie date du jour. */
export function setClock(date: ISODate | null) {
	clock = date;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toUtc = (d: ISODate) => new Date(d + 'T00:00:00Z');
const fromUtc = (d: Date): ISODate => d.toISOString().slice(0, 10);

/** Date du jour dans le fuseau de l'appareil. */
export function today(): ISODate {
	if (clock) return clock;
	const d = new Date();
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(date: ISODate, n: number): ISODate {
	const d = toUtc(date);
	d.setUTCDate(d.getUTCDate() + n);
	return fromUtc(d);
}

export function daysBetween(a: ISODate, b: ISODate): number {
	return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86400000);
}

/** 0 = dimanche … 6 = samedi */
export function weekday(date: ISODate): number {
	return toUtc(date).getUTCDay();
}

/** Index dans la semaine : 0 = lundi … 6 = dimanche */
export function weekIndex(date: ISODate): number {
	return (weekday(date) + 6) % 7;
}

export function startOfWeek(date: ISODate): ISODate {
	return addDays(date, -weekIndex(date));
}

export function endOfWeek(date: ISODate): ISODate {
	return addDays(startOfWeek(date), 6);
}

/** Dates de from à to inclus. */
export function range(from: ISODate, to: ISODate): ISODate[] {
	const out: ISODate[] = [];
	for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
	return out;
}

export function weekDays(date: ISODate): ISODate[] {
	const mon = startOfWeek(date);
	return range(mon, addDays(mon, 6));
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export function formatLong(date: ISODate): string {
	const d = toUtc(date);
	return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
