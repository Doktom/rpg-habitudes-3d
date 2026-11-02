// Régularité : journées, séries, semaines pleines (brief technique §7).
import { REGULARITY, REGULARITY_MAX_DAYS } from '../config';
import { addDays, range, startOfWeek } from '../dates';
import type { AppData, DanceClass, Habit, ISODate, Loot, ProgressEvent } from '../types';
import { addEvent, discipline } from './progress';
import {
	bonusesOn, danceClassesOn, danceDone, isActiveOn, isDone, isDueOn, isRestDay, isShielded, obligationsOn
} from './schedule';
import { bonusXp, splitXp } from './xp';

const REG_AT = (date: ISODate) => date + 'T23:00:00.000Z';

/** Journée complète : toutes les obligations faites (au moins une). Parfaite : et tous les bonus dus. */
export function dayStatus(data: AppData, date: ISODate): 'perfect' | 'complete' | null {
	if (isRestDay(data, date)) return null;
	const o = obligationsOn(data, date);
	if (o.expected === 0 || o.done < o.expected) return null;
	const b = bonusesOn(data, date);
	return b.done >= b.expected ? 'perfect' : 'complete';
}

const streakable = (h: Habit) => h.frequency.type !== 'weekly';

/** Parcourt les jours dus d'une habitude et appelle `onDay` avec la série courante. */
function walkStreak(data: AppData, h: Habit, to: ISODate, todayDate: ISODate, onDay?: (d: ISODate, run: number, grew: boolean) => void): number {
	let run = 0;
	const first = h.createdAt > addDays(todayDate, -REGULARITY_MAX_DAYS - 400) ? h.createdAt : addDays(todayDate, -REGULARITY_MAX_DAYS - 400);
	for (let d = first; d <= to; d = addDays(d, 1)) {
		if (!isDueOn(h, d) || isRestDay(data, d) || isShielded(data, d)) continue;
		if (isDone(data, h.id, d)) {
			run++;
			onDay?.(d, run, true);
		} else if (d < todayDate) run = 0; // le jour même ne casse pas la série
	}
	return run;
}

/** Série d'une habitude quotidienne / à jours fixes à une date. */
export function habitStreak(data: AppData, h: Habit, asOf: ISODate, todayDate = asOf): number {
	if (!streakable(h)) return weeklyStreak(data, h, asOf);
	return walkStreak(data, h, asOf, todayDate);
}

/** Prochain palier de série (7, 14, 30…) au-delà de n. */
export function nextMilestone(n: number): number | null {
	return REGULARITY.streakMilestones.find((m) => m.days > n)?.days ?? null;
}

// ——— Semaines ———

interface WeekResult {
	items: number;
	/** date où la semaine devient complète, null si incomplète */
	completedOn: ISODate | null;
}

/** Éléments d'une habitude sur une semaine : jours dus (hors repos et boucliers), ou objectif « X fois ». */
function habitWeek(data: AppData, h: Habit, monday: ISODate, todayDate: ISODate): WeekResult {
	const days = range(monday, addDays(monday, 6));
	if (h.frequency.type === 'weekly') {
		if (!isActiveOn(h, days[6]) && !days.some((d) => isActiveOn(h, d))) return { items: 0, completedOn: null };
		const times = h.frequency.times;
		const done = days.filter((d) => isDone(data, h.id, d) && d <= todayDate);
		return { items: times, completedOn: done.length >= times ? done[times - 1] : null };
	}
	let items = 0;
	let last: ISODate | null = null;
	let ok = true;
	for (const d of days) {
		if (!isDueOn(h, d) || isRestDay(data, d) || isShielded(data, d)) continue;
		items++;
		if (isDone(data, h.id, d) && d <= todayDate) last = d;
		else ok = false;
	}
	return { items, completedOn: ok && items > 0 ? last : null };
}

function classWeek(data: AppData, c: DanceClass, monday: ISODate, todayDate: ISODate): WeekResult {
	let items = 0;
	let last: ISODate | null = null;
	let ok = true;
	for (const d of range(monday, addDays(monday, 6))) {
		if (isRestDay(data, d) || !danceClassesOn(data, d).includes(c)) continue;
		items++;
		if (danceDone(data, c.id, d) && d <= todayDate) last = d;
		else ok = false;
	}
	return { items, completedOn: ok && items > 0 ? last : null };
}

function combine(results: WeekResult[]): WeekResult {
	const items = results.reduce((s, r) => s + r.items, 0);
	let last: ISODate | null = null;
	for (const r of results) {
		if (r.items === 0) continue;
		if (!r.completedOn) return { items, completedOn: null };
		if (!last || r.completedOn > last) last = r.completedOn;
	}
	return { items, completedOn: last };
}

/** Domaine de premier niveau d'un domaine. */
export function topDomain(data: AppData, domainId: string): string {
	return data.domains.find((d) => d.id === domainId)?.parentId ?? domainId;
}

/** Série hebdo d'une habitude « X fois par semaine » : semaines d'affilée tenues. */
export function weeklyStreak(data: AppData, h: Habit, asOf: ISODate): number {
	let n = 0;
	let monday = startOfWeek(asOf);
	const cur = habitWeek(data, h, monday, asOf);
	if (cur.completedOn) n++;
	for (monday = addDays(monday, -7); monday >= startOfWeek(h.createdAt); monday = addDays(monday, -7)) {
		if (!habitWeek(data, h, monday, asOf).completedOn) break;
		n++;
	}
	return n;
}

// ——— Recalcul ———

/**
 * Recalcule toutes les récompenses de régularité de la semaine de `from` jusqu'à aujourd'hui :
 * les anciennes `reg:` de la période sont supprimées puis recréées. Renvoie les nouvelles.
 */
export function recomputeRegularity(data: AppData, from: ISODate, todayDate: ISODate): ProgressEvent[] {
	const floor = addDays(todayDate, -REGULARITY_MAX_DAYS);
	const start = startOfWeek(from < floor ? floor : from);
	if (start > todayDate) return [];
	const before = new Set(data.events.filter((e) => e.source.startsWith('reg:')).map((e) => e.source));
	data.events = data.events.filter((e) => !(e.source.startsWith('reg:') && e.date >= start));

	const discCache = new Map<ISODate, number>();
	const disc = (d: ISODate) => {
		if (!discCache.has(d)) discCache.set(d, discipline(data, d));
		return discCache.get(d)!;
	};
	const emit = (source: string, date: ISODate, label: string, base: number, loot: Loot, xpTo: { domainId: string; weight: number }[] = []) =>
		addEvent(data, { source, date, at: REG_AT(date), label, xp: splitXp(bonusXp(base, disc(date)), xpTo), loot: { ...loot } });

	// Journées complètes / parfaites
	for (const d of range(start, todayDate)) {
		const s = dayStatus(data, d);
		if (s === 'perfect') emit(`reg:day:${d}`, d, 'Journée parfaite', REGULARITY.dayPerfect.xp, REGULARITY.dayPerfect.loot);
		else if (s === 'complete') emit(`reg:day:${d}`, d, 'Journée complète', REGULARITY.dayComplete.xp, REGULARITY.dayComplete.loot);
	}

	// Paliers de série
	for (const h of data.habits.filter(streakable)) {
		walkStreak(data, h, todayDate, todayDate, (d, run) => {
			if (d < start) return;
			const m = REGULARITY.streakMilestones.find((x) => x.days === run);
			if (m) emit(`reg:streak:${h.id}:${run}:${d}`, d, `Palier de série : ${h.name} · ${run} jours`, m.xp, m.loot, h.domains);
		});
	}

	// Semaines pleines d'une habitude (avec le compte des semaines d'affilée)
	for (const h of data.habits) {
		let run = 0;
		for (let mon = startOfWeek(h.createdAt); mon <= todayDate; mon = addDays(mon, 7)) {
			const w = habitWeek(data, h, mon, todayDate);
			if (w.items < REGULARITY.habitWeekMinItems) continue; // semaine neutre
			if (!w.completedOn) {
				if (addDays(mon, 6) < todayDate) run = 0;
				continue;
			}
			run++;
			if (mon < start) continue;
			const cfg = REGULARITY.habitWeek;
			const xp = cfg.xp + cfg.perStreakWeek * Math.min(cfg.maxStreakBonus, run - 1);
			const loot: Loot = { ...cfg.loot };
			if (REGULARITY.habitWeekMilestones.includes(run)) loot.crystal = (loot.crystal ?? 0) + 1;
			const label = run > 1 ? `Semaine pleine : ${h.name} (${run} semaines d'affilée)` : `Semaine pleine : ${h.name}`;
			emit(`reg:hweek:${h.id}:${mon}`, w.completedOn, label, xp, loot, h.domains);
		}
	}

	for (let mon = start; mon <= todayDate; mon = addDays(mon, 7)) {
		// Semaine pleine d'une discipline
		for (const dom of data.domains.filter((d) => !d.parentId)) {
			const habits = data.habits.filter(
				(h) => h.domains[0] && topDomain(data, h.domains[0].domainId) === dom.id && range(mon, addDays(mon, 6)).some((d) => isActiveOn(h, d))
			);
			const classes = data.danceClasses.filter((c) => topDomain(data, c.style) === dom.id);
			if (habits.length + classes.length < 2) continue;
			const w = combine([...habits.map((h) => habitWeek(data, h, mon, todayDate)), ...classes.map((c) => classWeek(data, c, mon, todayDate))]);
			if (w.items < REGULARITY.familyWeek.minItems || !w.completedOn) continue;
			emit(`reg:fweek:${dom.id}:${mon}`, w.completedOn, `Semaine pleine · ${dom.stat}`, REGULARITY.familyWeek.xp, REGULARITY.familyWeek.loot, [{ domainId: dom.id, weight: 100 }]);
		}
		// Semaine sans faille : toutes les obligations
		const w = combine([
			...data.habits.filter((h) => h.kind === 'obligatory').map((h) => habitWeek(data, h, mon, todayDate)),
			...data.danceClasses.filter((c) => c.kind === 'obligatory').map((c) => classWeek(data, c, mon, todayDate))
		]);
		if (w.items >= REGULARITY.weekComplete.minItems && w.completedOn)
			emit(`reg:week:${mon}`, w.completedOn, 'Semaine sans faille', REGULARITY.weekComplete.xp, REGULARITY.weekComplete.loot);
	}

	return data.events.filter((e) => e.source.startsWith('reg:') && !before.has(e.source));
}
