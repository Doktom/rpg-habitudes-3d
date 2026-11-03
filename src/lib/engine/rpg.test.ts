import { describe, expect, it } from 'vitest';
import { addDays, range } from '../dates';
import { createData } from '../seed';
import type { AppData, Habit } from '../types';
import { setHabitTier, upgradeModule } from './actions';
import { addEvent, materials, totalXp } from './progress';
import { initMoments, markSeen, pendingMoments } from './story';
import { bestPerfectStreak, checkTrophies, TROPHIES } from './trophies';

const MON = '2026-11-02';

function habit(id: string, over: Partial<Habit> = {}): Habit {
	return {
		id, name: id, form: 'simple', kind: 'obligatory', frequency: { type: 'daily' }, moment: 'morning',
		difficulty: 'medium', tiers: { min: 'a', normal: 'b', excellent: 'c' }, domains: [{ domainId: 'sport', weight: 100 }],
		createdAt: MON, ...over
	};
}
function blank(habits: Habit[]): AppData {
	const d = createData(MON);
	d.habits = habits;
	d.campaigns = [];
	return d;
}

describe('trophées', () => {
	it('22 trophées, débloqués une seule fois, jamais perdus', () => {
		expect(TROPHIES).toHaveLength(22);
		const d = blank([habit('a')]);
		setHabitTier(d, 'a', MON, 'normal', MON);
		const first = checkTrophies(d, MON);
		expect(first.map((e) => e.source)).toContain('trophy:first-light');
		expect(checkTrophies(d, MON)).toHaveLength(0);
		setHabitTier(d, 'a', MON, 'normal', MON); // décoche
		expect(d.trophies['first-light']).toBe(MON);
		expect(d.events.some((e) => e.source === 'trophy:first-light')).toBe(true);
	});
	it("l'XP des trophées n'est pas multipliée par le Réacteur", () => {
		const d = blank([habit('a')]);
		d.ship.modules.reactor = 2; // (au niveau 3, le trophée Chantier naval tomberait aussi)
		d.habitLogs.push({ id: 'x', habitId: 'a', date: MON, tier: 'min' });
		checkTrophies(d, MON);
		expect(totalXp(d)).toBe(20);
	});
	it('un trophée peut en débloquer un autre (niveau)', () => {
		const d = blank([]);
		addEvent(d, { source: 'x', date: MON, label: 'x', xp: [{ domainId: '', amount: 1800 }] }); // niveau 5 (100 + 283 + 520 + 800)
		const ids = checkTrophies(d, MON).map((e) => e.source);
		expect(ids).toContain('trophy:level-5');
	});
	it('jours de suite : repos neutre, aujourd’hui ne casse pas', () => {
		const d = blank([habit('a')]);
		for (const day of range(MON, addDays(MON, 7))) if (day !== addDays(MON, 3)) d.habitLogs.push({ id: day, habitId: 'a', date: day, tier: 'min' });
		d.restDays = [addDays(MON, 3)];
		expect(bestPerfectStreak(d, addDays(MON, 8))).toBe(7);
	});
	it('chantier naval : un module au niveau 3', () => {
		const d = blank([]);
		addEvent(d, { source: 'x', date: MON, label: 'x', loot: { metal: 500, energy: 500, crystal: 50 } });
		for (let i = 0; i < 3; i++) upgradeModule(d, 'reactor', MON);
		expect(checkTrophies(d, MON).map((e) => e.source)).toContain('trophy:shipyard');
		expect(materials(d).metal).toBe(500 - 20 - 40 - 60 + 10);
	});
});

describe('moments racontés', () => {
	it("à l'ouverture, rien de l'existant n'est rejoué", () => {
		const d = blank([habit('a')]);
		d.habitLogs.push({ id: 'x', habitId: 'a', date: MON, tier: 'min' });
		addEvent(d, { source: 'x', date: MON, label: 'x', xp: [{ domainId: '', amount: 500 }] });
		checkTrophies(d, MON);
		initMoments(d, MON);
		expect(pendingMoments(d, MON)).toHaveLength(0);
	});
	it('palier de série raconté une fois, montée de niveau', () => {
		const d = blank([habit('a', { kind: 'bonus', cue: 'Au saut du lit' })]);
		initMoments(d, MON);
		const end = addDays(MON, 6);
		for (const day of range(MON, end)) setHabitTier(d, 'a', day, 'min', end);
		const m = pendingMoments(d, end);
		const streak = m.find((x) => x.kind === 'streak')!;
		expect(streak.title).toBe('a : 7 jours d’affilée');
		expect(streak.text).toContain('Au saut du lit');
		markSeen(d, streak);
		expect(pendingMoments(d, end).some((x) => x.kind === 'streak')).toBe(false);
		addEvent(d, { source: 'y', date: end, label: 'y', xp: [{ domainId: '', amount: 300 }] });
		const lvl = pendingMoments(d, end).find((x) => x.kind === 'level')!;
		expect(lvl.title).toMatch(/Pilote de niveau \d/);
		markSeen(d, lvl);
		expect(pendingMoments(d, end).some((x) => x.kind === 'level')).toBe(false);
	});
	it('un même moment se raconte toujours pareil', () => {
		const d = blank([habit('a', { kind: 'bonus' })]);
		initMoments(d, MON);
		const end = addDays(MON, 6);
		for (const day of range(MON, end)) setHabitTier(d, 'a', day, 'min', end);
		expect(pendingMoments(d, end)[0].text).toBe(pendingMoments(d, end)[0].text);
	});
});
