// Données de l'écran Aujourd'hui, calculées à partir du moteur (pur, testable).
import { weekDays, weekIndex } from './dates';
import { orbit } from './engine/orbit';
import { discipline, eventXp, gaugeValue, lootOn, materials, sortedEvents, totalXp, xpByDomain } from './engine/progress';
import { canLearn, canUpgrade, missingFor, moduleCost, moduleLevel, shipClass, skillPoints } from './engine/ship';
import { trophyStats, TROPHIES } from './engine/trophies';
import { dayStatus, habitStreak, nextMilestone } from './engine/regularity';
import {
	bonusesOn, habitsForDay, isDone, isDueOn, isMinimumMode, isRestDay, isShielded, logFor, logsInWeek, obligationsOn
} from './engine/schedule';
import { shieldProposal, shieldReserve } from './engine/shields';
import { levelFromXp } from './engine/xp';
import { GAUGES, MODULE_MAX_LEVEL, SHIELD, SKILL_MAX_LEVEL } from './config';
import type { AppData, Habit, HabitLog, ISODate, Moment, ModuleId, SkillId } from './types';
import { MODULE_KANJI, MODULES, MOMENTS, RANKS, SECTORS, SKILL_KANJI, SKILLS, moduleEffect, rankOf, skillEffect } from './universe';

export type Pip = 'done' | 'missed' | 'todo' | 'future' | 'free' | 'shield';

export interface HabitRow {
	habit: Habit;
	log?: HabitLog;
	streak: number;
	next: number | null;
	weekly?: { done: number; times: number };
	pips: Pip[];
	gainXp: number;
	suggested: 'min' | 'normal';
}

export interface MomentGroup {
	moment: Moment;
	name: string;
	title: string;
	kana: string;
	rows: HabitRow[];
	done: number;
}

export function habitPips(data: AppData, h: Habit, date: ISODate, todayDate: ISODate): Pip[] {
	return weekDays(date).map((d) => {
		if (isDone(data, h.id, d)) return 'done';
		if (d > todayDate) return 'future';
		if (h.frequency.type === 'weekly' || !isDueOn(h, d) || isRestDay(data, d)) return 'free';
		if (isShielded(data, d)) return 'shield';
		return d === todayDate ? 'todo' : 'missed';
	});
}

export function habitRow(data: AppData, h: Habit, date: ISODate, todayDate: ISODate): HabitRow {
	const log = logFor(data, h.id, date);
	const streak = habitStreak(data, h, date, todayDate);
	const ev = log && data.events.find((e) => e.source === `habit:${log.id}`);
	return {
		habit: h,
		log,
		streak,
		next: h.frequency.type === 'weekly' ? null : nextMilestone(streak),
		weekly: h.frequency.type === 'weekly' ? { done: logsInWeek(data, h.id, date).length, times: h.frequency.times } : undefined,
		pips: habitPips(data, h, date, todayDate),
		gainXp: ev ? eventXp(ev) : 0,
		suggested: isMinimumMode(data, date) || gaugeValue(data, 'motivation', date) < GAUGES.minimumModeBelow ? 'min' : 'normal'
	};
}

export function momentGroups(data: AppData, date: ISODate, todayDate: ISODate): MomentGroup[] {
	const habits = habitsForDay(data, date);
	return (Object.keys(MOMENTS) as Moment[])
		.map((m) => {
			const rows = habits
				.filter((h) => h.moment === m)
				.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'obligatory' ? -1 : 1))
				.map((h) => habitRow(data, h, date, todayDate));
			return { moment: m, ...MOMENTS[m], rows, done: rows.filter((r) => r.log).length };
		})
		.filter((g) => g.rows.length > 0);
}

export function statusLine(data: AppData, date: ISODate, todayDate: ISODate): { text: string; tone: 'lit' | 'wait' | 'rest' | 'perfect' | 'past' } {
	const sector = SECTORS[weekIndex(date)].name;
	if (isRestDay(data, date)) return { text: 'Jour de repos : le secteur reste allumé.', tone: 'rest' };
	const o = obligationsOn(data, date);
	const s = dayStatus(data, date);
	if (s === 'perfect' && o.expected > 0) return { text: `Journée parfaite : ${sector} brille de tous ses feux.`, tone: 'perfect' };
	if (o.expected === 0 || o.done >= o.expected) return { text: `Secteur ${sector} allumé.`, tone: 'lit' };
	const left = o.expected - o.done;
	if (date > todayDate) return { text: `${o.expected} obligation${o.expected > 1 ? 's' : ''} prévue${o.expected > 1 ? 's' : ''} dans ce secteur.`, tone: 'past' };
	if (date < todayDate)
		return { text: o.done * 2 >= o.expected ? `Secteur ${sector} à moitié allumé.` : `Secteur ${sector} resté dans l'ombre. Ça ne retire rien.`, tone: 'past' };
	return { text: `Le secteur attend : encore ${left} obligation${left > 1 ? 's' : ''} pour allumer ${sector}.`, tone: 'wait' };
}

export function todayView(data: AppData, date: ISODate, todayDate: ISODate) {
	const xp = totalXp(data);
	const motivation = gaugeValue(data, 'motivation');
	return {
		sectorIndex: weekIndex(date),
		sector: SECTORS[weekIndex(date)],
		obligations: obligationsOn(data, date),
		bonuses: bonusesOn(data, date),
		status: statusLine(data, date, todayDate),
		rest: isRestDay(data, date),
		minimum: isMinimumMode(data, date),
		xpDay: totalXp(data, date, date),
		lootDay: lootOn(data, date),
		xp,
		level: levelFromXp(xp),
		shields: shieldReserve(data),
		proposal: date === todayDate ? shieldProposal(data, todayDate) : null,
		gauges: { discipline: discipline(data, todayDate), motivation, inspiration: gaugeValue(data, 'inspiration') },
		lowMotivation: motivation < GAUGES.minimumModeBelow,
		orbit: orbit(data, todayDate, date),
		groups: momentGroups(data, date, todayDate)
	};
}

export type TodayView = ReturnType<typeof todayView>;

// ——— Vaisseau ———

export function shipView(data: AppData, todayDate: ISODate) {
	const mats = materials(data);
	const cls = shipClass(data);
	const modules = (Object.keys(MODULES) as ModuleId[]).map((id) => {
		const level = moduleLevel(data, id);
		const max = level >= MODULE_MAX_LEVEL;
		const cost = max ? {} : moduleCost(data, id, level + 1);
		return { id, ...MODULES[id], kanji: MODULE_KANJI[id], level, max, cost, missing: max ? {} : missingFor(data, cost), can: canUpgrade(data, id), now: moduleEffect(id, level), next: max ? null : moduleEffect(id, level + 1) };
	});
	const s = trophyStats(data, todayDate);
	const trophies = TROPHIES.map((t) => ({ ...t, got: data.trophies[t.id] as ISODate | undefined, prog: t.progress(s) })).sort(
		(a, b) => (a.got && b.got ? b.got.localeCompare(a.got) : a.got ? -1 : b.got ? 1 : b.prog[0] / b.prog[1] - a.prog[0] / a.prog[1])
	);
	const reserve = shieldReserve(data);
	return {
		mats,
		cls,
		modules,
		trophies,
		trophyCount: Object.keys(data.trophies).length,
		shields: reserve,
		canCraft: reserve.count < reserve.max && mats.energy >= (SHIELD.cost.energy ?? 0),
		orbit: orbit(data, todayDate)
	};
}

// ——— Pilote ———

export function pilotView(data: AppData, todayDate: ISODate) {
	const xp = totalXp(data);
	const level = levelFromXp(xp);
	const byDomain = xpByDomain(data);
	const stats = data.domains
		.filter((d) => !d.parentId)
		.map((d) => ({
			...d,
			xp: byDomain[d.id] ?? 0,
			level: levelFromXp(byDomain[d.id] ?? 0),
			subs: data.domains.filter((s) => s.parentId === d.id).map((s) => ({ ...s, xp: byDomain[s.id] ?? 0, level: levelFromXp(byDomain[s.id] ?? 0) }))
		}))
		.sort((a, b) => b.xp - a.xp);
	const skills = (Object.keys(SKILLS) as SkillId[]).map((id) => {
		const lv = data.skills[id] ?? 0;
		return { id, ...SKILLS[id], kanji: SKILL_KANJI[id], level: lv, now: lv ? skillEffect(id, lv) : 'Pas encore apprise', next: lv < SKILL_MAX_LEVEL ? skillEffect(id, lv + 1) : null, can: canLearn(data, id) };
	});
	const streaks = data.habits
		.filter((h) => !h.archived && h.frequency.type !== 'weekly')
		.map((h) => ({ habit: h, streak: habitStreak(data, h, todayDate), next: nextMilestone(habitStreak(data, h, todayDate)) }))
		.filter((s) => s.streak > 0)
		.sort((a, b) => b.streak - a.streak)
		.slice(0, 5);
	const log = sortedEvents(data.events)
		.reverse()
		.filter((e) => eventXp(e) !== 0 || e.loot || e.gauge)
		.slice(0, 40);
	return {
		xp,
		level,
		rank: rankOf(level.level),
		nextRank: RANKS.find((r) => r.from > level.level),
		points: skillPoints(data),
		stats,
		skills,
		streaks,
		log,
		gauges: { discipline: discipline(data, todayDate), motivation: gaugeValue(data, 'motivation'), inspiration: gaugeValue(data, 'inspiration') }
	};
}
