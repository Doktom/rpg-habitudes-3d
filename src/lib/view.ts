// Données de l'écran Aujourd'hui, calculées à partir du moteur (pur, testable).
import { weekDays, weekIndex } from './dates';
import { orbit } from './engine/orbit';
import { discipline, eventXp, gaugeValue, lootOn, totalXp } from './engine/progress';
import { dayStatus, habitStreak, nextMilestone } from './engine/regularity';
import {
	bonusesOn, habitsForDay, isDone, isDueOn, isMinimumMode, isRestDay, isShielded, logFor, logsInWeek, obligationsOn
} from './engine/schedule';
import { shieldProposal, shieldReserve } from './engine/shields';
import { levelFromXp } from './engine/xp';
import { GAUGES } from './config';
import type { AppData, Habit, HabitLog, ISODate, Moment } from './types';
import { MOMENTS, SECTORS } from './universe';

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
