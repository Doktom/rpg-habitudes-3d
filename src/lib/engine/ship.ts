// Le vaisseau : coûts des modules, classe, compétences (brief technique §10).
import { MODULE_MAX_LEVEL, SKILL_MAX_LEVEL } from '../config';
import type { AppData, Loot, Material, ModuleId, SkillId } from '../types';
import { MODULES, SHIP_CLASSES } from '../universe';
import { costMultiplier } from './effects';
import { materials, totalXp } from './progress';
import { levelFromXp } from './xp';

export const moduleLevel = (data: AppData, id: ModuleId) => data.ship.modules[id] ?? 0;

/** Coût du niveau n : Alliage 20n, Cellules 8n, Cristaux ⌈1,5(n−1)⌉ ; × facteur du module × Ingénierie, arrondi au-dessus. */
export function moduleCost(data: AppData, id: ModuleId, n: number): Loot {
	const k = MODULES[id].factor * costMultiplier(data);
	const cost: Loot = { metal: Math.ceil(20 * n * k - 1e-9), energy: Math.ceil(8 * n * k - 1e-9) };
	if (n >= 2) cost.crystal = Math.ceil(Math.ceil(1.5 * (n - 1)) * k - 1e-9);
	return cost;
}

/** Ce qui manque en soute pour une amélioration (vide si achetable). */
export function missingFor(data: AppData, cost: Loot): Loot {
	const have = materials(data);
	const out: Loot = {};
	for (const [m, n] of Object.entries(cost) as [Material, number][]) if (have[m] < n) out[m] = n - have[m];
	return out;
}

export function canUpgrade(data: AppData, id: ModuleId): boolean {
	const lvl = moduleLevel(data, id);
	return lvl < MODULE_MAX_LEVEL && Object.keys(missingFor(data, moduleCost(data, id, lvl + 1))).length === 0;
}

export function shipLevelSum(data: AppData): number {
	return (Object.keys(MODULES) as ModuleId[]).reduce((s, id) => s + moduleLevel(data, id), 0);
}

export function shipClass(data: AppData): { name: string; index: number; next?: { name: string; from: number }; sum: number } {
	const sum = shipLevelSum(data);
	let index = 0;
	SHIP_CLASSES.forEach((c, i) => {
		if (sum >= c.from) index = i;
	});
	return { name: SHIP_CLASSES[index].name, index, next: SHIP_CLASSES[index + 1], sum };
}

export const pilotLevel = (data: AppData) => levelFromXp(totalXp(data)).level;

/** Points de compétence = niveau du pilote − 1 − points dépensés. */
export function skillPoints(data: AppData): number {
	const spent = Object.values(data.skills).reduce((s, n) => s + (n ?? 0), 0);
	return pilotLevel(data) - 1 - spent;
}

export const canLearn = (data: AppData, id: SkillId) => skillPoints(data) > 0 && (data.skills[id] ?? 0) < SKILL_MAX_LEVEL;
