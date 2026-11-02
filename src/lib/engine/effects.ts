// Effets des modules du vaisseau et des compétences du pilote (brief technique §10).
import { EFFECTS, GAUGES, SHIELD, TIER_FACTOR } from '../config';
import type { AppData, Tier } from '../types';

const mod = (data: AppData, id: keyof AppData['ship']['modules']) => data.ship.modules[id] ?? 0;
const skill = (data: AppData, id: keyof AppData['skills']) => data.skills[id] ?? 0;

export const xpMultiplier = (data: AppData) => 1 + EFFECTS.reactorXp * mod(data, 'reactor');
export const inspirationMultiplier = (data: AppData) => 1 + EFFECTS.antennaInspiration * mod(data, 'antenna');
export const orbitMultiplier = (data: AppData) => 1 + EFFECTS.thrustersOrbit * mod(data, 'thrusters');
export const taskMultiplier = (data: AppData) => 1 + EFFECTS.logisticsTask * skill(data, 'logistics');
export const costMultiplier = (data: AppData) => 1 - EFFECTS.engineeringCost * skill(data, 'engineering');

/** Motivation perdue par obligation ratée (Coque : −10 % par niveau). */
export const missPenalty = (data: AppData) =>
	GAUGES.motivation.obligatoryMissed * (1 - EFFECTS.hullShield * mod(data, 'hull'));

/** Retour vers 50 : 15 % de l'écart, +3 points de % par niveau de Second souffle. */
export const pullRatio = (data: AppData) => GAUGES.motivation.dailyPullRatio + EFFECTS.recoveryPull * skill(data, 'recovery');

/** Facteur d'un palier ; Endurance relève le minimum. */
export function tierFactor(data: AppData, tier: Tier): number {
	if (tier === 'min') return TIER_FACTOR.min + EFFECTS.enduranceMin * skill(data, 'endurance');
	return TIER_FACTOR[tier];
}

/** Réserve maximale de boucliers : 2 + 1 tous les 2 niveaux de Coque. */
export const shieldMax = (data: AppData) => SHIELD.maxBase + Math.floor(mod(data, 'hull') / SHIELD.hullLevelsPerSlot);
