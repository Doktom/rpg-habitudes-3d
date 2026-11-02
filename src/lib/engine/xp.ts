// XP, niveaux, butin (brief technique §5).
import { LEVEL_BASE, LEVEL_EXPONENT, LOOT_BASE, XP_BASE } from '../config';
import type { AppData, Difficulty, DomainShare, Loot, Material, Tier } from '../types';
import { tierFactor } from './effects';

/** XP pour passer du niveau n au niveau n+1. */
export const levelCost = (n: number) => Math.round(LEVEL_BASE * Math.pow(n, LEVEL_EXPONENT));

export interface LevelInfo {
	level: number;
	into: number; // XP déjà gagnée dans le niveau
	need: number; // XP du niveau entier
	ratio: number;
}

export function levelFromXp(xp: number): LevelInfo {
	let level = 1;
	let rest = Math.max(0, xp);
	while (rest >= levelCost(level)) {
		rest -= levelCost(level);
		level++;
	}
	const need = levelCost(level);
	return { level, into: rest, need, ratio: rest / need };
}

/** XP d'une action : base × facteur du palier × (1 + Discipline/100). */
export function actionXp(data: AppData, difficulty: Difficulty, tier: Tier, discipline: number): number {
	return Math.round(XP_BASE[difficulty] * tierFactor(data, tier) * (1 + discipline / 100));
}

/** Bonus fixe : base × (1 + Discipline/100). */
export const bonusXp = (base: number, discipline: number) => Math.round(base * (1 + discipline / 100));

/** Butin d'une action : base selon la difficulté × facteur du palier, arrondi. */
export function actionLoot(data: AppData, difficulty: Difficulty, tier: Tier): Loot {
	const f = tierFactor(data, tier);
	const out: Loot = {};
	for (const [m, n] of Object.entries(LOOT_BASE[difficulty]) as [Material, number][]) {
		const v = Math.round(n * f);
		if (v) out[m] = v;
	}
	return out;
}

/** Répartit l'XP selon les poids ; l'arrondi va au premier domaine. */
export function splitXp(amount: number, shares: DomainShare[]): { domainId: string; amount: number }[] {
	if (!shares.length) return [{ domainId: '', amount }];
	const total = shares.reduce((s, d) => s + d.weight, 0) || 1;
	const parts = shares.map((d) => ({ domainId: d.domainId, amount: Math.floor((amount * d.weight) / total) }));
	parts[0].amount += amount - parts.reduce((s, p) => s + p.amount, 0);
	return parts.filter((p) => p.amount !== 0 || p === parts[0]);
}

export function addLoot(a: Loot, b: Loot | undefined, sign = 1): Loot {
	const out: Loot = { ...a };
	for (const [m, n] of Object.entries(b ?? {}) as [Material, number][]) out[m] = (out[m] ?? 0) + sign * n;
	return out;
}

export function scaleLoot(l: Loot, k: number): Loot {
	const out: Loot = {};
	for (const [m, n] of Object.entries(l) as [Material, number][]) {
		const v = Math.round(n * k);
		if (v) out[m] = v;
	}
	return out;
}
