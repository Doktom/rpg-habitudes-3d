// Journal d'événements, totaux dérivés, jauges et clôture des journées (brief technique §4 et §6).
import { GAUGES, ROLLOVER_MAX_DAYS } from '../config';
import { addDays, daysBetween, range, startOfWeek, weekday } from '../dates';
import type { AppData, Gauge, ISODate, Loot, Material, ProgressEvent } from '../types';
import { inspirationMultiplier, missPenalty, pullRatio, xpMultiplier } from './effects';
import { isRestDay, logsInWeek, obligationsOn, weeklyMisses } from './schedule';

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Ordre de rejeu : par date, puis par `at` dans une même journée. */
export function sortedEvents(events: ProgressEvent[]): ProgressEvent[] {
	return [...events].sort((a, b) => a.date.localeCompare(b.date) || a.at.localeCompare(b.at));
}

export type NewEvent = Omit<ProgressEvent, 'id' | 'at'> & { at?: string };

/**
 * Ajoute un événement (remplace celui de même source). L'XP est multipliée par le Réacteur
 * (sauf trophées), l'Inspiration positive par l'Antenne.
 */
export function addEvent(data: AppData, e: NewEvent): ProgressEvent {
	const xm = e.source.startsWith('trophy:') ? 1 : xpMultiplier(data);
	const ev: ProgressEvent = {
		...e,
		id: e.source,
		at: e.at ?? new Date().toISOString(),
		xp: e.xp?.map((x) => ({ domainId: x.domainId, amount: Math.round(x.amount * xm) }))
	};
	if (!ev.xp) delete ev.xp;
	const insp = ev.gauge?.inspiration;
	if (insp && insp > 0) ev.gauge = { ...ev.gauge, inspiration: Math.round(insp * inspirationMultiplier(data)) };
	removeEvent(data, e.source);
	data.events.push(ev);
	return ev;
}

export function removeEvent(data: AppData, source: string) {
	data.events = data.events.filter((x) => x.source !== source);
}

export const eventXp = (e: ProgressEvent) => (e.xp ?? []).reduce((s, x) => s + x.amount, 0);

export function totalXp(data: AppData, from?: ISODate, to?: ISODate): number {
	let sum = 0;
	for (const e of data.events) {
		if ((from && e.date < from) || (to && e.date > to)) continue;
		sum += eventXp(e);
	}
	return sum;
}

/** XP par domaine ; un domaine parent cumule ses sous-compétences. */
export function xpByDomain(data: AppData): Record<string, number> {
	const own: Record<string, number> = {};
	for (const e of data.events) for (const x of e.xp ?? []) own[x.domainId] = (own[x.domainId] ?? 0) + x.amount;
	const out: Record<string, number> = {};
	for (const d of data.domains) {
		out[d.id] = (out[d.id] ?? 0) + (own[d.id] ?? 0);
		if (d.parentId) out[d.parentId] = (out[d.parentId] ?? 0) + (own[d.id] ?? 0);
	}
	return out;
}

/** Matériaux en soute = somme des butins (gains et dépenses). */
export function materials(data: AppData): Record<Material, number> {
	const out: Record<Material, number> = { metal: 0, energy: 0, crystal: 0 };
	for (const e of data.events) for (const [m, n] of Object.entries(e.loot ?? {}) as [Material, number][]) out[m] += n;
	return out;
}

export function lootOn(data: AppData, date: ISODate): Loot {
	const out: Loot = {};
	for (const e of data.events) {
		if (e.date !== date) continue;
		for (const [m, n] of Object.entries(e.loot ?? {}) as [Material, number][]) if (n > 0) out[m] = (out[m] ?? 0) + n;
	}
	return out;
}

/** Motivation / Inspiration : rejeu ordonné, borné à 0-100 à chaque pas. */
export function gaugeValue(data: AppData, gauge: Gauge, upTo?: ISODate): number {
	let v: number = gauge === 'motivation' ? GAUGES.motivationStart : GAUGES.inspirationStart;
	for (const e of sortedEvents(data.events)) {
		if (upTo && e.date > upTo) continue;
		const delta = e.gauge?.[gauge];
		if (delta) v = clamp(v + delta);
	}
	return Math.round(v);
}

/** Discipline : réussite pondérée des obligations sur les 28 derniers jours terminés. */
export function discipline(data: AppData, asOf: ISODate): number {
	const window = GAUGES.disciplineWindowDays;
	let total = 0;
	let got = 0;
	for (let age = 1; age <= window; age++) {
		const date = addDays(asOf, -age);
		const weight = window + 1 - age;
		const { expected, done } = obligationsOn(data, date);
		total += expected * weight;
		got += done * weight;
		if (weekday(date) === 0) {
			for (const h of data.habits) {
				if (h.kind !== 'obligatory' || h.frequency.type !== 'weekly') continue;
				if (h.archived || h.createdAt > startOfWeek(date)) continue;
				const count = logsInWeek(data, h.id, date).length;
				total += 2 * weight;
				got += 2 * weight * Math.min(1, count / h.frequency.times);
			}
		}
	}
	return total === 0 ? 0 : Math.round((100 * got) / total);
}

/** Événement de clôture d'un jour passé : ratés → Motivation, retour vers 50, campagnes au point mort. */
export function closeDay(data: AppData, date: ISODate): ProgressEvent | null {
	let motivation = 0;
	let inspiration = 0;
	const parts: string[] = [];
	if (!isRestDay(data, date)) {
		const { expected, done } = obligationsOn(data, date);
		let missed = expected - done;
		if (weekday(date) === 0) missed += weeklyMisses(data, date);
		if (missed > 0) {
			motivation += missed * missPenalty(data);
			parts.push(`${missed} raté${missed > 1 ? 's' : ''}`);
		}
	}
	const current = gaugeValue(data, 'motivation', date) + motivation;
	motivation += (GAUGES.motivation.dailyPullToward - current) * pullRatio(data);
	motivation = Math.round(motivation);

	for (const c of data.campaigns) {
		if (c.status !== 'active') continue;
		if (!data.events.some((e) => e.date === date && e.campaignId === c.id)) inspiration += GAUGES.inspiration.idleCampaignPerDay;
	}
	if (inspiration < 0) parts.push('campagnes sans progrès');
	if (motivation === 0 && inspiration === 0) return null;
	return {
		id: `day:${date}`,
		source: `day:${date}`,
		at: date + 'T23:59:59.000Z',
		date,
		label: parts.length ? `Bilan du jour : ${parts.join(', ')}` : 'Bilan du jour',
		gauge: { motivation, inspiration }
	};
}

/** Jours à clôturer entre la dernière clôture et hier (60 au plus). */
export function daysToClose(data: AppData, todayDate: ISODate): ISODate[] {
	const yesterday = addDays(todayDate, -1);
	const first = data.lastProcessedDay ? addDays(data.lastProcessedDay, 1) : yesterday;
	if (first > yesterday) return [];
	const start = daysBetween(first, yesterday) > ROLLOVER_MAX_DAYS ? addDays(yesterday, -ROLLOVER_MAX_DAYS) : first;
	return range(start, yesterday);
}

/** Clôture les jours en attente, dans l'ordre. Renvoie le premier jour clôturé (ou null). */
export function rollover(data: AppData, todayDate: ISODate): ISODate | null {
	const days = daysToClose(data, todayDate);
	for (const d of days) {
		removeEvent(data, `day:${d}`);
		const ev = closeDay(data, d);
		if (ev) data.events.push(ev);
		data.lastProcessedDay = d;
	}
	return days[0] ?? null;
}

/** Re-clôture les jours déjà clôturés à partir de `from` (après une modification d'un jour passé). */
export function recloseFrom(data: AppData, from: ISODate) {
	if (!data.lastProcessedDay || from > data.lastProcessedDay) return;
	for (const d of range(from, data.lastProcessedDay)) {
		removeEvent(data, `day:${d}`);
		const ev = closeDay(data, d);
		if (ev) data.events.push(ev);
	}
}
