// L'orbite hebdomadaire : 7 secteurs, du lundi au dimanche (brief technique §9).
import { LOOT_REWARDS } from '../config';
import { weekDays } from '../dates';
import type { AppData, ISODate, Loot } from '../types';
import { orbitMultiplier } from './effects';
import { isRestDay, obligationsOn } from './schedule';
import { scaleLoot } from './xp';

export type SectorState = 'future' | 'rest' | 'lit' | 'today' | 'partial' | 'missed';

export function sectorState(data: AppData, date: ISODate, ref: ISODate): SectorState {
	if (date > ref) return 'future';
	if (isRestDay(data, date)) return 'rest';
	const { expected, done } = obligationsOn(data, date);
	if (expected === 0 || done >= expected) return 'lit';
	if (date === ref) return 'today';
	return done * 2 >= expected ? 'partial' : 'missed';
}

export interface Orbit {
	days: { date: ISODate; state: SectorState; expected: number; done: number }[];
	lit: number;
	partial: number;
	points: number;
	perfect: boolean;
	loot: Loot;
}

/** Orbite de la semaine de `weekOf` vue à la date `ref`, avec le butin versé à l’amarrage. */
export function orbit(data: AppData, ref: ISODate, weekOf: ISODate = ref): Orbit {
	const days = weekDays(weekOf).map((date) => ({ date, state: sectorState(data, date, ref), ...obligationsOn(data, date) }));
	const lit = days.filter((d) => d.state === 'lit' || d.state === 'rest').length;
	const partial = days.filter((d) => d.state === 'partial').length;
	const points = lit + 0.5 * partial;
	const perfect = lit === 7;
	const k = orbitMultiplier(data);
	const loot = scaleLoot({ metal: (LOOT_REWARDS.orbitSector.metal ?? 0) * points }, k);
	if (perfect) loot.crystal = Math.round((LOOT_REWARDS.orbitPerfect.crystal ?? 0) * k);
	return { days, lit, partial, points, perfect, loot };
}
