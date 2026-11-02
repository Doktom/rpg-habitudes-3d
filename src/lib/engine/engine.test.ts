import { describe, expect, it } from 'vitest';
import { addDays, range } from '../dates';
import { createData } from '../seed';
import { load, save, KEYS } from '../storage';
import type { AppData, Habit, ISODate } from '../types';
import { buyShield, declineShield, openDay, setHabitTier, toggleRestDay, upgradeModule, learnSkill } from './actions';
import { addEvent, discipline, gaugeValue, materials, totalXp, xpByDomain } from './progress';
import { dayStatus, habitStreak } from './regularity';
import { orbit, sectorState } from './orbit';
import { moduleCost, shipClass, skillPoints } from './ship';
import { shieldProposal, shieldReserve } from './shields';
import { actionXp, levelCost, levelFromXp, splitXp } from './xp';

const MON = '2026-11-02'; // un lundi

function habit(id: string, over: Partial<Habit> = {}): Habit {
	return {
		id, name: id, form: 'simple', kind: 'obligatory', frequency: { type: 'daily' }, moment: 'morning',
		difficulty: 'medium', tiers: { min: 'a', normal: 'b', excellent: 'c' }, domains: [{ domainId: 'sport', weight: 100 }],
		createdAt: '2026-01-01', ...over
	};
}

function blank(habits: Habit[]): AppData {
	const d = createData('2026-01-01');
	d.habits = habits;
	d.campaigns = [];
	return d;
}

const regs = (d: AppData, prefix: string) => d.events.filter((e) => e.source.startsWith(prefix));

describe('XP et niveaux', () => {
	it('coût des niveaux', () => {
		expect(levelCost(1)).toBe(100);
		expect(levelCost(5)).toBe(1118);
		expect(levelCost(10)).toBe(3162);
		expect(levelFromXp(0).level).toBe(1);
		expect(levelFromXp(100).level).toBe(2);
		expect(levelFromXp(99).level).toBe(1);
	});
	it("XP d'une action selon palier et Discipline", () => {
		const d = blank([]);
		expect(actionXp(d, 'medium', 'min', 0)).toBe(10);
		expect(actionXp(d, 'medium', 'normal', 0)).toBe(20);
		expect(actionXp(d, 'medium', 'excellent', 50)).toBe(45);
		d.skills.endurance = 5;
		expect(actionXp(d, 'easy', 'min', 0)).toBe(8); // 10 × 0,8
	});
	it("répartition de l'XP, l'arrondi va au premier", () => {
		expect(splitXp(15, [{ domainId: 'a', weight: 70 }, { domainId: 'b', weight: 30 }])).toEqual([
			{ domainId: 'a', amount: 11 },
			{ domainId: 'b', amount: 4 }
		]);
		expect(splitXp(10, [])).toEqual([{ domainId: '', amount: 10 }]);
	});
	it('le Réacteur multiplie l’XP sauf trophées', () => {
		const d = blank([]);
		d.ship.modules.reactor = 5;
		addEvent(d, { source: 'quest:x', date: MON, label: 'q', xp: [{ domainId: '', amount: 100 }] });
		addEvent(d, { source: 'trophy:x', date: MON, label: 't', xp: [{ domainId: '', amount: 100 }] });
		expect(totalXp(d)).toBe(230);
	});
});

describe('validation', () => {
	it('valider rapporte XP, butin, Motivation ; décocher retire tout', () => {
		const d = blank([habit('a', { kind: 'bonus', createdAt: MON })]);
		const g = setHabitTier(d, 'a', MON, 'normal', MON)!;
		expect(g.xp).toBeGreaterThan(0);
		expect(materials(d).metal).toBeGreaterThan(0);
		expect(gaugeValue(d, 'motivation')).toBe(52);
		expect(setHabitTier(d, 'a', MON, 'normal', MON)).toBeNull();
		expect(d.events).toHaveLength(0);
		expect(d.habitLogs).toHaveLength(0);
	});
	it('changer de palier remplace', () => {
		const d = blank([habit('a', { kind: 'bonus', createdAt: MON })]);
		setHabitTier(d, 'a', MON, 'min', MON);
		setHabitTier(d, 'a', MON, 'excellent', MON);
		expect(d.habitLogs).toHaveLength(1);
		expect(d.habitLogs[0].tier).toBe('excellent');
		expect(totalXp(d)).toBe(30);
	});
	it('XP par domaine : le parent cumule ses sous-compétences', () => {
		const d = blank([habit('s', { domains: [{ domainId: 'salsa', weight: 100 }], kind: 'bonus', createdAt: MON })]);
		setHabitTier(d, 's', MON, 'normal', MON);
		const x = xpByDomain(d);
		expect(x.salsa).toBe(20);
		expect(x.danse).toBe(20);
	});
});

describe('journées', () => {
	it('journée complète puis parfaite ; décocher les défait', () => {
		const d = blank([habit('o', { createdAt: MON }), habit('b', { kind: 'bonus', createdAt: MON })]);
		setHabitTier(d, 'o', MON, 'min', MON);
		expect(dayStatus(d, MON)).toBe('complete');
		expect(regs(d, 'reg:day:')[0].label).toBe('Journée complète');
		setHabitTier(d, 'b', MON, 'min', MON);
		expect(regs(d, 'reg:day:')[0].label).toBe('Journée parfaite');
		setHabitTier(d, 'o', MON, 'min', MON);
		expect(regs(d, 'reg:day:')).toHaveLength(0);
	});
	it('jamais un jour de repos', () => {
		const d = blank([habit('o', { createdAt: MON })]);
		toggleRestDay(d, MON, MON);
		setHabitTier(d, 'o', MON, 'min', MON);
		expect(regs(d, 'reg:day:')).toHaveLength(0);
	});
});

describe('clôture et jauges', () => {
	it('ratés → Motivation, puis retour vers 50', () => {
		const d = blank([habit('o', { createdAt: MON }), habit('p', { createdAt: MON })]);
		d.lastProcessedDay = addDays(MON, -1);
		openDay(d, addDays(MON, 1));
		// 50 − 16 = 34 ; retour de 15 % de 16 = +2,4 → 36
		expect(gaugeValue(d, 'motivation')).toBe(36);
	});
	it('repos : neutre', () => {
		const d = blank([habit('o', { createdAt: MON })]);
		d.restDays = [MON];
		d.lastProcessedDay = addDays(MON, -1);
		openDay(d, addDays(MON, 1));
		expect(gaugeValue(d, 'motivation')).toBe(50);
	});
	it('campagne active sans progrès : −2 Inspiration par jour', () => {
		const d = blank([]);
		d.campaigns = [{ id: 'c', name: 'c', intent: '', domainId: 'sport', status: 'active', chapters: [] }];
		d.lastProcessedDay = addDays(MON, -1);
		openDay(d, addDays(MON, 3));
		expect(gaugeValue(d, 'inspiration')).toBe(44);
	});
	it('Discipline pondérée sur 28 jours, objectifs hebdo le dimanche', () => {
		const d = blank([habit('o', { createdAt: '2026-10-01' })]);
		expect(discipline(d, MON)).toBe(0);
		for (const day of range(addDays(MON, -28), addDays(MON, -1))) d.habitLogs.push({ id: day, habitId: 'o', date: day, tier: 'min' });
		expect(discipline(d, MON)).toBe(100);
		// Raté hier (poids 28) : 1 − 28/406
		d.habitLogs = d.habitLogs.filter((l) => l.date !== addDays(MON, -1));
		expect(discipline(d, MON)).toBe(93);
		const w = blank([habit('w', { frequency: { type: 'weekly', times: 2 }, createdAt: '2026-10-01' })]);
		w.habitLogs.push({ id: 'x', habitId: 'w', date: addDays(MON, -3), tier: 'min' });
		expect(discipline(w, MON)).toBe(20); // 4 dimanches (poids 28, 21, 14, 7), seul le dernier à moitié
	});
});

describe('séries et semaines', () => {
	const fill = (d: AppData, id: string, days: ISODate[], today: ISODate) => {
		for (const day of days) setHabitTier(d, id, day, 'min', today);
	};
	it('repos et jours non dus ne cassent pas la série ; palier versé une fois', () => {
		const d = blank([habit('a', { createdAt: MON, kind: 'bonus' })]);
		const end = addDays(MON, 7);
		const days = range(MON, end).filter((x) => x !== addDays(MON, 3));
		d.restDays = [addDays(MON, 3)];
		fill(d, 'a', days, end);
		expect(habitStreak(d, d.habits[0], end)).toBe(7);
		const m = regs(d, 'reg:streak:');
		expect(m).toHaveLength(1);
		expect(m[0].date).toBe(end);
		expect(m[0].label).toContain('7 jours');
	});
	it('le jour même ne casse pas la série', () => {
		const d = blank([habit('a', { createdAt: MON })]);
		fill(d, 'a', range(MON, addDays(MON, 2)), addDays(MON, 3));
		expect(habitStreak(d, d.habits[0], addDays(MON, 3))).toBe(3);
		expect(habitStreak(d, d.habits[0], addDays(MON, 4))).toBe(0);
	});
	it('semaine pleine d’une habitude et semaine sans faille, le jour où elle se complète', () => {
		const d = blank([habit('a', { createdAt: MON }), habit('b', { frequency: { type: 'weekly', times: 2 }, createdAt: MON })]);
		const sun = addDays(MON, 6);
		fill(d, 'a', range(MON, sun), sun);
		setHabitTier(d, 'b', addDays(MON, 1), 'min', sun);
		expect(regs(d, 'reg:week:')).toHaveLength(0);
		setHabitTier(d, 'b', addDays(MON, 4), 'min', sun);
		expect(regs(d, `reg:hweek:a:${MON}`)[0].date).toBe(sun);
		expect(regs(d, `reg:hweek:b:${MON}`)[0].date).toBe(addDays(MON, 4));
		expect(regs(d, 'reg:week:')[0].date).toBe(sun);
		expect(regs(d, `reg:fweek:sport:${MON}`)).toHaveLength(1);
	});
	it('semaines pleines d’affilée : bonus croissant et cristal à 4', () => {
		const d = blank([habit('a', { createdAt: MON, kind: 'bonus' })]);
		const end = addDays(MON, 27);
		for (const day of range(MON, end)) d.habitLogs.push({ id: day, habitId: 'a', date: day, tier: 'min' });
		setHabitTier(d, 'a', end, 'min', end); // décoche le dernier
		setHabitTier(d, 'a', end, 'min', end); // et le recoche : recalcul
		const weeks = regs(d, 'reg:hweek:a:');
		expect(weeks).toHaveLength(1); // seule la semaine modifiée est recalculée
		expect(weeks.find((e) => e.source.endsWith(addDays(MON, 21)))!.loot!.crystal).toBe(1);
		expect(weeks.find((e) => e.source.endsWith(addDays(MON, 21)))!.label).toContain('4 semaines');
	});
});

describe('boucliers', () => {
	it('gain toutes les 7 journées complètes, achat, plafond', () => {
		const d = blank([habit('o', { createdAt: MON })]);
		const end = addDays(MON, 6);
		for (const day of range(MON, end)) setHabitTier(d, 'o', day, 'min', end);
		expect(shieldReserve(d).count).toBe(1);
		addEvent(d, { source: 'loot', date: MON, label: 'x', loot: { energy: 30 } });
		expect(buyShield(d, end)).toBe(true);
		expect(buyShield(d, end)).toBe(false); // réserve pleine (2)
		expect(shieldReserve(d).count).toBe(2);
	});
	it('proposition après un raté, usage qui sauve la série sans rien rapporter, refus mémorisé', () => {
		const d = blank([habit('o', { createdAt: MON })]);
		for (const day of range(MON, addDays(MON, 6))) setHabitTier(d, 'o', day, 'min', addDays(MON, 6));
		const today = addDays(MON, 8); // raté le jour 7
		const p = shieldProposal(d, today)!;
		expect(p.date).toBe(addDays(MON, 7));
		expect(p.threatened[0].streak).toBe(7);
		const xp = totalXp(d);
		d.shieldedDays.push(p.date);
		addEvent(d, { source: `shield:use:${p.date}`, date: p.date, label: 'b' });
		setHabitTier(d, 'o', today, 'min', today);
		expect(habitStreak(d, d.habits[0], today)).toBe(8);
		expect(totalXp(d)).toBeGreaterThan(xp);
		const e = blank([habit('o', { createdAt: MON })]);
		for (const day of range(MON, addDays(MON, 6))) setHabitTier(e, 'o', day, 'min', addDays(MON, 6));
		declineShield(e, addDays(MON, 7));
		expect(shieldProposal(e, today)).toBeNull();
	});
});

describe('orbite', () => {
	it('états des secteurs, demi-secteurs, butin et orbite parfaite', () => {
		const d = blank([habit('a', { createdAt: MON }), habit('b', { createdAt: MON })]);
		const wed = addDays(MON, 2);
		d.habitLogs.push({ id: '1', habitId: 'a', date: MON, tier: 'min' }, { id: '2', habitId: 'b', date: MON, tier: 'min' });
		d.habitLogs.push({ id: '3', habitId: 'a', date: addDays(MON, 1), tier: 'min' });
		expect(sectorState(d, MON, wed)).toBe('lit');
		expect(sectorState(d, addDays(MON, 1), wed)).toBe('partial');
		expect(sectorState(d, wed, wed)).toBe('today');
		expect(sectorState(d, addDays(MON, 3), wed)).toBe('future');
		d.restDays.push(addDays(MON, 5));
		const o = orbit(d, addDays(MON, 6));
		expect(o.lit).toBe(2);
		expect(o.partial).toBe(1);
		expect(o.loot.metal).toBe(10);
		const p = blank([]);
		const all = orbit(p, addDays(MON, 6));
		expect(all.perfect).toBe(true);
		expect(all.loot).toEqual({ metal: 28, crystal: 3 });
		p.ship.modules.thrusters = 2;
		expect(orbit(p, addDays(MON, 6)).loot).toEqual({ metal: 42, crystal: 5 });
	});
});

describe('vaisseau', () => {
	it('coûts, Antenne, Ingénierie', () => {
		const d = blank([]);
		expect(moduleCost(d, 'reactor', 1)).toEqual({ metal: 20, energy: 8 });
		expect(moduleCost(d, 'reactor', 3)).toEqual({ metal: 60, energy: 24, crystal: 3 });
		expect(moduleCost(d, 'antenna', 2)).toEqual({ metal: 32, energy: 13, crystal: 2 });
		d.skills.engineering = 2;
		expect(moduleCost(d, 'reactor', 1)).toEqual({ metal: 18, energy: 8 });
	});
	it('achat seulement si la soute suffit, classes', () => {
		const d = blank([]);
		expect(upgradeModule(d, 'hull', MON)).toBe(false);
		addEvent(d, { source: 'x', date: MON, label: 'x', loot: { metal: 200, energy: 100, crystal: 10 } });
		expect(upgradeModule(d, 'hull', MON)).toBe(true);
		expect(materials(d)).toEqual({ metal: 180, energy: 92, crystal: 10 });
		expect(shipClass(d).name).toBe('Épave');
		d.ship.modules = { reactor: 2, hull: 1 };
		expect(shipClass(d).name).toBe('Navette');
	});
	it('points de compétence', () => {
		const d = blank([]);
		expect(learnSkill(d, 'recovery')).toBe(false);
		addEvent(d, { source: 'trophy:x', date: MON, label: 'x', xp: [{ domainId: '', amount: 250 }] });
		expect(skillPoints(d)).toBe(1);
		expect(learnSkill(d, 'recovery')).toBe(true);
		expect(skillPoints(d)).toBe(0);
	});
});

describe('stockage', () => {
	const mem = () => {
		const m = new Map<string, string>();
		return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
	};
	it('importe la V3 en lecture seule, puis écrit dans ses propres clés', () => {
		const s = mem();
		const v3 = blank([habit('x')]);
		s.setItem('rpg-habitudes-v3:data', JSON.stringify(v3));
		const before = s.getItem('rpg-habitudes-v3:data');
		const l = load(s, MON);
		expect(l.source).toBe('import-v3');
		expect(l.data.habits.map((h) => h.id)).toEqual(['x']);
		l.data.habits.push(habit('y'));
		save(s, l.data);
		expect(s.getItem('rpg-habitudes-v3:data')).toBe(before);
		expect(load(s, MON).source).toBe('local');
		expect(() => save(s, l.data, 'rpg-habitudes-v3:data')).toThrow();
	});
	it('premier lancement sans données : contenus de départ', () => {
		const l = load(mem(), MON);
		expect(l.source).toBe('new');
		expect(l.data.habits).toHaveLength(9);
		expect(KEYS.data).toBe('rpg-habitudes-3d:data');
	});
	it('premier jour : rien à clôturer, aucune jauge entamée', () => {
		const d = createData(MON);
		openDay(d, MON);
		expect(d.events).toHaveLength(0);
		expect(gaugeValue(d, 'inspiration')).toBe(50);
	});
});
