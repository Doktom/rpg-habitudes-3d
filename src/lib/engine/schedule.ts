// Ce qui est dû un jour donné (brief technique §11).
import { addDays, startOfWeek, weekday } from '../dates';
import type { AppData, DanceClass, DanceLog, DanceParty, Habit, HabitLog, ISODate, RoutineVersion } from '../types';

export const isRestDay = (data: AppData, date: ISODate) => data.restDays.includes(date);
export const isShielded = (data: AppData, date: ISODate) => data.shieldedDays.includes(date);
export const isMinimumMode = (data: AppData, date: ISODate) => data.minimumModeDays.includes(date);

export function isActiveOn(h: Habit, date: ISODate): boolean {
	return !h.archived && h.createdAt <= date;
}

/** Due un jour précis : quotidienne ou jours fixes. Les « X fois par semaine » ne le sont jamais. */
export function isDueOn(h: Habit, date: ISODate): boolean {
	if (!isActiveOn(h, date)) return false;
	if (h.frequency.type === 'daily') return true;
	if (h.frequency.type === 'days') return h.frequency.days.includes(weekday(date));
	return false;
}

/** Habitudes affichées un jour : dues, ou hebdo actives cette semaine. */
export function habitsForDay(data: AppData, date: ISODate): Habit[] {
	return data.habits.filter((h) => (h.frequency.type === 'weekly' ? isActiveOn(h, date) : isDueOn(h, date)));
}

export function logFor(data: AppData, habitId: string, date: ISODate): HabitLog | undefined {
	return data.habitLogs.find((l) => l.habitId === habitId && l.date === date);
}

// Index des validations (habitude|date), reconstruit quand le tableau change.
const logIndex = new WeakMap<object, { n: number; set: Set<string> }>();
function indexOf(list: { date: ISODate }[], key: (l: never) => string): Set<string> {
	const cached = logIndex.get(list);
	if (cached && cached.n === list.length) return cached.set;
	const set = new Set(list.map((l) => key(l as never) + '|' + l.date));
	logIndex.set(list, { n: list.length, set });
	return set;
}

export const isDone = (data: AppData, habitId: string, date: ISODate) =>
	indexOf(data.habitLogs, (l: HabitLog) => l.habitId).has(habitId + '|' + date);

export function logsInWeek(data: AppData, habitId: string, date: ISODate): HabitLog[] {
	const mon = startOfWeek(date);
	const sun = addDays(mon, 6);
	return data.habitLogs.filter((l) => l.habitId === habitId && l.date >= mon && l.date <= sun);
}

export function onVacation(data: AppData, date: ISODate): boolean {
	return data.vacations.some((v) => v.start <= date && date <= v.end);
}

export function danceClassesOn(data: AppData, date: ISODate): DanceClass[] {
	if (onVacation(data, date)) return [];
	return data.danceClasses.filter((c) => c.weekday === weekday(date) && !c.cancelled.includes(date));
}

export function dancePartiesOn(data: AppData, date: ISODate): DanceParty[] {
	return data.danceParties.filter((p) => p.date === date);
}

export const danceDone = (data: AppData, refId: string, date: ISODate) => indexOf(data.danceLogs, (l: DanceLog) => l.refId).has(refId + '|' + date);

/** Obligations d'un jour (hors repos) : habitudes obligatoires dues + cours obligatoires. */
export function obligationsOn(data: AppData, date: ISODate): { expected: number; done: number } {
	if (isRestDay(data, date)) return { expected: 0, done: 0 };
	let expected = 0;
	let done = 0;
	for (const h of data.habits) {
		if (h.kind !== 'obligatory' || !isDueOn(h, date)) continue;
		expected++;
		if (isDone(data, h.id, date)) done++;
	}
	for (const c of danceClassesOn(data, date)) {
		if (c.kind !== 'obligatory') continue;
		expected++;
		if (danceDone(data, c.id, date)) done++;
	}
	return { expected, done };
}

/** Bonus dus un jour : habitudes bonus dues, cours bonus et soirées. */
export function bonusesOn(data: AppData, date: ISODate): { expected: number; done: number } {
	if (isRestDay(data, date)) return { expected: 0, done: 0 };
	let expected = 0;
	let done = 0;
	for (const h of data.habits) {
		if (h.kind !== 'bonus' || !isDueOn(h, date)) continue;
		expected++;
		if (isDone(data, h.id, date)) done++;
	}
	for (const c of danceClassesOn(data, date)) {
		if (c.kind !== 'bonus') continue;
		expected++;
		if (danceDone(data, c.id, date)) done++;
	}
	for (const p of dancePartiesOn(data, date)) {
		expected++;
		if (danceDone(data, p.id, date)) done++;
	}
	return { expected, done };
}

/** Objectifs « X fois par semaine » obligatoires non atteints, évalués le dimanche. */
export function weeklyMisses(data: AppData, sunday: ISODate): number {
	let misses = 0;
	for (const h of data.habits) {
		if (h.kind !== 'obligatory' || h.frequency.type !== 'weekly') continue;
		if (h.archived || h.createdAt > startOfWeek(sunday)) continue;
		misses += Math.max(0, h.frequency.times - logsInWeek(data, h.id, sunday).length);
	}
	return misses;
}

/** Routine du jour : la dernière version dont la date de début est ≤ au jour. */
export function routineOn(h: Habit, date: ISODate): RoutineVersion | undefined {
	return [...(h.routine ?? [])].filter((v) => v.from <= date).sort((a, b) => b.from.localeCompare(a.from))[0];
}
