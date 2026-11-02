// Boucliers de série : jokers rares, toujours au choix de l'utilisateur (brief technique §8).
import { SHIELD } from '../config';
import { addDays } from '../dates';
import type { AppData, Habit, ISODate } from '../types';
import { shieldMax } from './effects';
import { sortedEvents } from './progress';
import { habitStreak } from './regularity';
import { isDone, isDueOn, isRestDay, isShielded } from './schedule';

/** Réserve rejouée dans l'ordre : +1 toutes les 7 journées complètes (sans dépasser le max), +1 par achat, −1 par usage. */
export function shieldReserve(data: AppData): { count: number; max: number; towardNext: number } {
	const max = shieldMax(data);
	let count = 0;
	let days = 0;
	for (const e of sortedEvents(data.events)) {
		if (e.source.startsWith('reg:day:')) {
			days++;
			if (days % SHIELD.earnEvery === 0) count = Math.min(max, count + 1);
		} else if (e.source.startsWith('shield:buy:')) count = Math.min(max, count + 1);
		else if (e.source.startsWith('shield:use:')) count = Math.max(0, count - 1);
	}
	return { count, max, towardNext: days % SHIELD.earnEvery };
}

/** Séries menacées un jour donné : due, non faite, série d'au moins 3 jours la veille. */
export function threatenedOn(data: AppData, date: ISODate): { habit: Habit; streak: number }[] {
	if (isRestDay(data, date) || isShielded(data, date)) return [];
	const out: { habit: Habit; streak: number }[] = [];
	for (const h of data.habits) {
		if (h.frequency.type === 'weekly' || !isDueOn(h, date) || isDone(data, h.id, date)) continue;
		const streak = habitStreak(data, h, addDays(date, -1));
		if (streak >= SHIELD.minStreak) out.push({ habit: h, streak });
	}
	return out;
}

/** Proposition de bouclier pour avant-hier puis hier (le plus ancien d'abord). */
export function shieldProposal(data: AppData, todayDate: ISODate): { date: ISODate; threatened: { habit: Habit; streak: number }[] } | null {
	for (const date of [addDays(todayDate, -2), addDays(todayDate, -1)]) {
		if (data.shieldDeclined.includes(date)) continue;
		const threatened = threatenedOn(data, date);
		if (threatened.length) return { date, threatened };
	}
	return null;
}
