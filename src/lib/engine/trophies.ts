// Trophées : 22, jamais perdus, vérifiés à chaque sauvegarde (brief technique §10).
import { addDays, endOfWeek, range } from '../dates';
import type { AppData, ISODate, Loot, ProgressEvent } from '../types';
import { orbit } from './orbit';
import { addEvent, totalXp, xpByDomain } from './progress';
import { isRestDay, obligationsOn } from './schedule';
import { shipLevelSum } from './ship';
import { levelFromXp } from './xp';

export interface Trophy {
	id: string;
	name: string;
	condition: string;
	xp: number;
	loot: Loot;
	lore: string;
	kanji: string;
	/** Progression vers la condition : [actuel, cible]. */
	progress: (s: TrophyStats) => [number, number];
}

export interface TrophyStats {
	habitLogs: number;
	tasks: number;
	dances: number;
	perfectStreak: number;
	weeklyReviews: number;
	perfectOrbitReview: boolean;
	completeDays: number;
	habit30: boolean;
	weeksComplete: number;
	level: number;
	bestStat: number;
	boss: boolean;
	chapter: boolean;
	campaign: boolean;
	bestModule: number;
	moduleSum: number;
}

const n = (v: number, target: number): [number, number] => [Math.min(v, target), target];
const b = (v: boolean): [number, number] => [v ? 1 : 0, 1];

export const TROPHIES: Trophy[] = [
	{ id: 'first-light', name: 'Premier allumage', condition: '1 habitude validée', xp: 20, loot: { metal: 3 }, lore: 'Les systèmes de bord répondent enfin.', kanji: '灯', progress: (s) => n(s.habitLogs, 1) },
	{ id: 'first-task', name: 'Premier colis', condition: '1 tâche terminée', xp: 20, loot: { metal: 3 }, lore: 'Une corvée de moins dans la soute.', kanji: '荷', progress: (s) => n(s.tasks, 1) },
	{ id: 'tasks-10', name: 'Cargo en route', condition: '10 tâches terminées', xp: 60, loot: { energy: 3 }, lore: 'Dix livraisons, la soute respire.', kanji: '貨', progress: (s) => n(s.tasks, 10) },
	{ id: 'tasks-50', name: 'Chef de soute', condition: '50 tâches terminées', xp: 200, loot: { crystal: 2 }, lore: 'Cinquante colis passés par tes mains.', kanji: '倉', progress: (s) => n(s.tasks, 50) },
	{ id: 'logs-100', name: 'Centurion', condition: '100 habitudes validées', xp: 150, loot: { energy: 5, crystal: 1 }, lore: 'Cent routines de bord accomplies.', kanji: '百', progress: (s) => n(s.habitLogs, 100) },
	{ id: 'dance-10', name: 'Rythme galactique', condition: '10 danses', xp: 80, loot: { energy: 3 }, lore: 'Dix danses, et même les étoiles suivent le tempo.', kanji: '舞', progress: (s) => n(s.dances, 10) },
	{ id: 'streak-7', name: 'Sept jours sans faille', condition: '7 jours de suite, toutes obligations faites', xp: 100, loot: { energy: 4, crystal: 1 }, lore: 'Une semaine entière à pleine puissance.', kanji: '七', progress: (s) => n(s.perfectStreak, 7) },
	{ id: 'streak-30', name: 'Mois stellaire', condition: '30 jours de suite, toutes obligations faites', xp: 400, loot: { crystal: 5 }, lore: 'Trente jours : même Kronos en est jaloux.', kanji: '月', progress: (s) => n(s.perfectStreak, 30) },
	{ id: 'orbit-1', name: 'Première orbite', condition: '1 revue hebdo', xp: 40, loot: { metal: 5 }, lore: 'Tu amarres au Havre pour la première fois.', kanji: '港', progress: (s) => n(s.weeklyReviews, 1) },
	{ id: 'orbit-4', name: 'Quatre orbites', condition: '4 revues hebdo', xp: 120, loot: { energy: 5, crystal: 1 }, lore: 'Un mois de révolutions, la carte se dessine.', kanji: '環', progress: (s) => n(s.weeklyReviews, 4) },
	{ id: 'orbit-perfect', name: 'Orbite parfaite', condition: 'Une semaine revue avec 7 secteurs allumés', xp: 150, loot: { crystal: 3 }, lore: 'Sept secteurs allumés, pas un faux pas.', kanji: '円', progress: (s) => b(s.perfectOrbitReview) },
	{ id: 'days-10', name: 'Pilote fiable', condition: '10 journées complètes', xp: 80, loot: { energy: 4 }, lore: 'Dix journées où tout tourne rond à bord.', kanji: '信', progress: (s) => n(s.completeDays, 10) },
	{ id: 'habit-30', name: 'Habitude ancrée', condition: 'Un palier de série de 30 jours', xp: 250, loot: { crystal: 3 }, lore: 'Trente jours : ce n’est plus un effort, c’est toi.', kanji: '根', progress: (s) => b(s.habit30) },
	{ id: 'weeks-4', name: 'Métronome', condition: '4 semaines sans faille', xp: 300, loot: { crystal: 4 }, lore: 'Quatre semaines sans faille, réglé comme une horloge de bord.', kanji: '律', progress: (s) => n(s.weeksComplete, 4) },
	{ id: 'level-5', name: 'Pilote confirmé', condition: 'Niveau 5', xp: 0, loot: { energy: 4, crystal: 1 }, lore: 'Le cockpit commence à te ressembler.', kanji: '五', progress: (s) => n(s.level, 5) },
	{ id: 'level-10', name: 'As du cockpit', condition: 'Niveau 10', xp: 0, loot: { crystal: 4 }, lore: 'On parle de toi dans les ports de Kronos.', kanji: '十', progress: (s) => n(s.level, 10) },
	{ id: 'stat-5', name: 'Spécialiste', condition: 'Une stat au niveau 5', xp: 100, loot: { energy: 4 }, lore: 'Une discipline devient ta signature.', kanji: '極', progress: (s) => n(s.bestStat, 5) },
	{ id: 'boss', name: 'Chasseur de monstres', condition: '1 boss vaincu', xp: 80, loot: { crystal: 2 }, lore: 'Ce qui te faisait peur gît dans le sas.', kanji: '鬼', progress: (s) => b(s.boss) },
	{ id: 'chapter', name: 'Cap franchi', condition: '1 chapitre terminé', xp: 100, loot: { crystal: 1 }, lore: 'Un chapitre de la carte est enfin lisible.', kanji: '章', progress: (s) => b(s.chapter) },
	{ id: 'campaign', name: 'Destination atteinte', condition: '1 campagne terminée', xp: 300, loot: { crystal: 6 }, lore: 'Un système entier est désormais sur ta carte.', kanji: '着', progress: (s) => b(s.campaign) },
	{ id: 'shipyard', name: 'Chantier naval', condition: 'Un module au niveau 3', xp: 60, loot: { metal: 10 }, lore: 'L’atelier ne désemplit pas.', kanji: '造', progress: (s) => n(s.bestModule, 3) },
	{ id: 'refit', name: 'Grande refonte', condition: '10 niveaux de modules au total', xp: 200, loot: { crystal: 3 }, lore: 'Le Sillage ne ressemble plus à l’épave du départ.', kanji: '改', progress: (s) => n(s.moduleSum, 10) }
];

/** Plus longue suite de jours avec toutes les obligations faites (repos et jours sans obligation neutres). */
export function bestPerfectStreak(data: AppData, todayDate: ISODate): number {
	const first = data.habits.reduce((m, h) => (h.createdAt < m ? h.createdAt : m), todayDate);
	const start = first < addDays(todayDate, -800) ? addDays(todayDate, -800) : first;
	let run = 0;
	let best = 0;
	for (const d of range(start, todayDate)) {
		if (isRestDay(data, d)) continue;
		const o = obligationsOn(data, d);
		if (o.expected === 0) continue;
		if (o.done === o.expected) best = Math.max(best, ++run);
		else if (d !== todayDate) run = 0;
	}
	return best;
}

export function trophyStats(data: AppData, todayDate: ISODate): TrophyStats {
	const src = (p: string) => data.events.filter((e) => e.source.startsWith(p));
	const weekly = data.reviews.filter((r) => r.type === 'weekly');
	const quests = data.campaigns.flatMap((c) => c.chapters.flatMap((ch) => ch.quests));
	const domXp = xpByDomain(data);
	const modules = Object.values(data.ship.modules).map((v) => v ?? 0);
	return {
		habitLogs: data.habitLogs.length,
		tasks: data.tasks.filter((t) => t.done).length,
		dances: data.danceLogs.length,
		perfectStreak: bestPerfectStreak(data, todayDate),
		weeklyReviews: weekly.length,
		perfectOrbitReview: weekly.some((r) => orbit(data, endOfWeek(r.periodStart)).perfect),
		completeDays: src('reg:day:').length,
		habit30: src('reg:streak:').some((e) => Number(e.source.split(':')[3]) >= 30),
		weeksComplete: src('reg:week:').length,
		level: levelFromXp(totalXp(data)).level,
		bestStat: Math.max(1, ...data.domains.map((d) => levelFromXp(domXp[d.id] ?? 0).level)),
		boss: quests.some((q) => q.boss && q.done),
		chapter: data.campaigns.some((c) => c.chapters.some((ch) => ch.done)),
		campaign: data.campaigns.some((c) => c.status === 'done'),
		bestModule: Math.max(0, ...modules),
		moduleSum: shipLevelSum(data)
	};
}

/** Débloque les trophées atteints (une seule fois). Renvoie les nouveaux événements `trophy:`. */
export function checkTrophies(data: AppData, todayDate: ISODate): ProgressEvent[] {
	const out: ProgressEvent[] = [];
	// Un trophée peut faire monter de niveau, qui en débloque un autre : on boucle.
	for (let pass = 0; pass < 4; pass++) {
		const s = trophyStats(data, todayDate);
		const fresh = TROPHIES.filter((t) => !data.trophies[t.id] && t.progress(s)[0] >= t.progress(s)[1]);
		if (!fresh.length) break;
		for (const t of fresh) {
			data.trophies[t.id] = todayDate;
			out.push(
				addEvent(data, {
					source: `trophy:${t.id}`,
					date: todayDate,
					label: `Trophée : ${t.name}`,
					...(t.xp ? { xp: [{ domainId: '', amount: t.xp }] } : {}),
					loot: { ...t.loot }
				})
			);
		}
	}
	return out;
}
