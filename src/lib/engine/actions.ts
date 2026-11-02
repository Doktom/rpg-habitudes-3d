// Actions de jeu, pures sur un AppData (mutation en place). Chaque action écrit dans le journal
// d'événements puis recalcule ce qui en dépend (clôtures passées, régularité).
import { GAUGES, MODULE_MAX_LEVEL, SHIELD } from '../config';
import type { AppData, ISODate, Loot, ModuleId, ProgressEvent, SkillId, Tier } from '../types';
import { MODULES } from '../universe';
import { addEvent, discipline, materials, recloseFrom, removeEvent, rollover } from './progress';
import { recomputeRegularity } from './regularity';
import { logFor } from './schedule';
import { shieldMax } from './effects';
import { canLearn, canUpgrade, moduleCost, moduleLevel } from './ship';
import { shieldReserve } from './shields';
import { actionLoot, actionXp, splitXp } from './xp';
import { uid } from '../seed';

export interface Gain {
	/** Événements créés par l'action elle-même et ceux de régularité qu'elle a déclenchés. */
	events: ProgressEvent[];
	xp: number;
	loot: Loot;
}

function summarize(events: ProgressEvent[]): Gain {
	const loot: Loot = {};
	let xp = 0;
	for (const e of events) {
		for (const x of e.xp ?? []) xp += x.amount;
		for (const [m, n] of Object.entries(e.loot ?? {})) loot[m as keyof Loot] = (loot[m as keyof Loot] ?? 0) + (n as number);
	}
	return { events, xp, loot };
}

/** Après une modification datée : re-clôture des jours passés concernés et recalcul de la régularité. */
function settle(data: AppData, date: ISODate, todayDate: ISODate): ProgressEvent[] {
	recloseFrom(data, date);
	return recomputeRegularity(data, date, todayDate);
}

/**
 * Valide une habitude à un palier. Re-choisir le même palier décoche ; un autre palier remplace.
 * Renvoie le gain (null si l'action a décoché).
 */
export function setHabitTier(data: AppData, habitId: string, date: ISODate, tier: Tier, todayDate: ISODate, extra: { session?: string; doneExercises?: string[] } = {}): Gain | null {
	const h = data.habits.find((x) => x.id === habitId);
	if (!h) return null;
	const existing = logFor(data, habitId, date);
	if (existing) {
		removeEvent(data, `habit:${existing.id}`);
		data.habitLogs = data.habitLogs.filter((l) => l.id !== existing.id);
		if (existing.tier === tier) {
			settle(data, date, todayDate);
			return null;
		}
	}
	const log = { id: uid(), habitId, date, tier, ...extra };
	data.habitLogs.push(log);
	const amount = actionXp(data, h.difficulty, tier, discipline(data, date));
	const ev = addEvent(data, {
		source: `habit:${log.id}`,
		date,
		label: `${h.name} · ${tier === 'min' ? 'Min' : tier === 'normal' ? 'Normal' : 'Excellent'}`,
		xp: splitXp(amount, h.domains),
		loot: actionLoot(data, h.difficulty, tier),
		gauge: { motivation: h.kind === 'obligatory' ? GAUGES.motivation.obligatoryDone : GAUGES.motivation.bonusDone },
		...(h.campaignId ? { campaignId: h.campaignId } : {})
	});
	const reg = settle(data, date, todayDate);
	return summarize([ev, ...reg]);
}

export function toggleRestDay(data: AppData, date: ISODate, todayDate: ISODate) {
	data.restDays = data.restDays.includes(date) ? data.restDays.filter((d) => d !== date) : [...data.restDays, date];
	return summarize(settle(data, date, todayDate));
}

export function toggleMinimumMode(data: AppData, date: ISODate) {
	data.minimumModeDays = data.minimumModeDays.includes(date) ? data.minimumModeDays.filter((d) => d !== date) : [...data.minimumModeDays, date];
}

/** Bouclier : protège un jour raté ; les séries le sautent, mais il reste un raté pour les jauges. */
export function useShield(data: AppData, date: ISODate, todayDate: ISODate): boolean {
	if (shieldReserve(data).count < 1 || data.shieldedDays.includes(date)) return false;
	data.shieldedDays = [...data.shieldedDays, date];
	addEvent(data, { source: `shield:use:${date}`, date, at: date + 'T23:30:00.000Z', label: 'Bouclier utilisé' });
	settle(data, date, todayDate);
	return true;
}

export function declineShield(data: AppData, date: ISODate) {
	if (!data.shieldDeclined.includes(date)) data.shieldDeclined = [...data.shieldDeclined, date];
}

export function buyShield(data: AppData, todayDate: ISODate): boolean {
	const r = shieldReserve(data);
	if (r.count >= shieldMax(data)) return false;
	const cost = SHIELD.cost;
	const have = materials(data).energy;
	if (have < (cost.energy ?? 0)) return false;
	addEvent(data, { source: `shield:buy:${uid()}`, date: todayDate, label: 'Bouclier fabriqué', loot: { energy: -(cost.energy ?? 0) } });
	return true;
}

export function upgradeModule(data: AppData, id: ModuleId, todayDate: ISODate): boolean {
	if (!canUpgrade(data, id)) return false;
	const n = moduleLevel(data, id) + 1;
	const cost = moduleCost(data, id, n);
	const neg: Loot = {};
	for (const [m, v] of Object.entries(cost)) neg[m as keyof Loot] = -(v as number);
	addEvent(data, { source: `ship:${id}:${n}`, date: todayDate, label: `${MODULES[id].name} · niveau ${n}`, loot: neg });
	data.ship.modules[id] = Math.min(MODULE_MAX_LEVEL, n);
	return true;
}

export function learnSkill(data: AppData, id: SkillId): boolean {
	if (!canLearn(data, id)) return false;
	data.skills[id] = (data.skills[id] ?? 0) + 1;
	return true;
}

/** À l'ouverture : clôture des jours passés puis recalcul de la régularité depuis le premier jour clôturé. */
export function openDay(data: AppData, todayDate: ISODate): ProgressEvent[] {
	const first = rollover(data, todayDate);
	return first ? recomputeRegularity(data, first, todayDate) : [];
}
