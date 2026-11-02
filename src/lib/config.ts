// Constantes de jeu (brief technique §24), reprises telles quelles.
import type { Difficulty, Loot, Tier } from './types';

export const XP_BASE: Record<Difficulty, number> = { easy: 10, medium: 20, hard: 40 };
export const TIER_FACTOR: Record<Tier, number> = { min: 0.5, normal: 1, excellent: 1.5 };
export const XP_REWARDS = { chapter: 300, campaign: 1000, weeklyReview: 50, monthlyReview: 150 };
export const LOOT_BASE: Record<Difficulty, Loot> = {
	easy: { metal: 2 },
	medium: { metal: 2, energy: 1 },
	hard: { metal: 3, energy: 2, crystal: 1 }
};
export const LOOT_REWARDS: Record<string, Loot> = {
	quest: { metal: 2, energy: 2 },
	boss: { energy: 2, crystal: 2 },
	chapter: { crystal: 3 },
	campaign: { crystal: 10 },
	weeklyReview: { energy: 3 },
	monthlyReview: { energy: 5, crystal: 1 },
	orbitSector: { metal: 4 },
	orbitPerfect: { crystal: 3 }
};

export const REGULARITY = {
	dayComplete: { xp: 25, loot: { energy: 1 } as Loot },
	dayPerfect: { xp: 45, loot: { energy: 2, metal: 2 } as Loot },
	streakMilestones: [
		{ days: 7, xp: 40, loot: { energy: 2 } },
		{ days: 14, xp: 80, loot: { energy: 3 } },
		{ days: 30, xp: 200, loot: { crystal: 2 } },
		{ days: 60, xp: 400, loot: { crystal: 3 } },
		{ days: 100, xp: 700, loot: { crystal: 5 } },
		{ days: 200, xp: 1200, loot: { crystal: 8 } },
		{ days: 365, xp: 2000, loot: { crystal: 12 } }
	] as { days: number; xp: number; loot: Loot }[],
	habitWeek: { xp: 30, perStreakWeek: 10, maxStreakBonus: 7, loot: { metal: 3 } as Loot },
	habitWeekMilestones: [4, 8, 12, 26, 52],
	habitWeekMinItems: 2,
	familyWeek: { xp: 60, loot: { energy: 3 } as Loot, minItems: 3 },
	weekComplete: { xp: 150, loot: { crystal: 2 } as Loot, minItems: 3 }
};

export const SHIELD = { earnEvery: 7, maxBase: 2, hullLevelsPerSlot: 2, cost: { energy: 6 } as Loot, minStreak: 3 };

export const EFFECTS = {
	reactorXp: 0.06,
	hullShield: 0.1,
	antennaInspiration: 0.2,
	thrustersOrbit: 0.25,
	recoveryPull: 0.03,
	logisticsTask: 0.15,
	enduranceMin: 0.06,
	engineeringCost: 0.05
};
export const MODULE_MAX_LEVEL = 5;
export const SKILL_MAX_LEVEL = 5;
export const LEVEL_BASE = 100;
export const LEVEL_EXPONENT = 1.5;

export const GAUGES = {
	disciplineWindowDays: 28,
	motivationStart: 50,
	inspirationStart: 50,
	motivation: { obligatoryDone: 3, bonusDone: 2, questDone: 6, obligatoryMissed: -8, dailyPullToward: 50, dailyPullRatio: 0.15 },
	inspiration: { weeklyReview: 25, chapterDone: 15, campaignDone: 30, newChallenge: 10, idleCampaignPerDay: -2 },
	minimumModeBelow: 30,
	momentumFrom: 80
};
export const DANCE_XP_DIFFICULTY: Difficulty = 'medium';
export const CONTENT_VERSION = 3;
export const ROLLOVER_MAX_DAYS = 60;
export const REGULARITY_MAX_DAYS = 400;
