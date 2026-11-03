// Le conteur : moments forts racontés en plein écran, un à la fois, une seule fois (brief technique §16).
// Ton chaleureux, jamais culpabilisant ; variantes choisies de façon déterministe par hachage de la clé.
import { REGULARITY } from '../config';
import { addDays } from '../dates';
import type { AppData, ISODate, ProgressEvent } from '../types';
import { eventXp, totalXp } from './progress';
import { shipClass } from './ship';
import { TROPHIES } from './trophies';
import { levelFromXp } from './xp';

export interface StoryMoment {
	key: string;
	kind: 'streak' | 'week' | 'habit-weeks' | 'trophy' | 'level' | 'ship' | 'chapter' | 'boss' | 'campaign';
	kicker: string;
	title: string;
	text: string;
	kanji: string;
	xp?: number;
}

export function hash(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
	return h >>> 0;
}
const pick = <T>(key: string, list: T[]) => list[hash(key) % list.length];

const STREAK_TEXT: Record<number, string[]> = {
	7: ['Une orbite entière sans lâcher. Le premier palier est franchi : c’est souvent le plus dur à atteindre.', 'Sept passages devant l’étoile, sept fois au rendez-vous. Le premier palier est derrière toi.'],
	14: ['Deux orbites d’affilée : ce n’est plus une tentative, c’est un rituel de bord.', 'Quatorze jours. Le geste commence à trouver sa place toute seule.'],
	30: ['Trente jours. Entre trois semaines et deux mois, c’est là que l’habitude s’ancre : tu es en plein dans le cap le plus dur, et tu le passes.', 'Un mois entier. Les études le disent : c’est maintenant que le geste devient automatique.'],
	60: ['Soixante jours : le Sillage vole presque tout seul sur cette route.', 'Deux mois. Ce n’est plus un effort, c’est une partie du vaisseau.'],
	100: ['Cent jours. On raconte ton histoire dans les ports de Kronos.', 'Cent jours d’affilée : les mécaniciens du Havre en parlent encore.'],
	200: ['Deux cents jours. La route est devenue la tienne.'],
	365: ['Une année entière. Ton nom est désormais sur les cartes.']
};

function streakMoment(e: ProgressEvent, data: AppData): StoryMoment {
	const [, , habitId, days] = e.source.split(':');
	const h = data.habits.find((x) => x.id === habitId);
	const n = Number(days);
	let text = pick(e.source, STREAK_TEXT[n] ?? STREAK_TEXT[7]);
	if (h?.cue) text += ` « ${h.cue} » : le déclencheur fait son travail.`;
	return { key: e.source, kind: 'streak', kicker: `Palier de série · ${n} jours`, title: `${h?.name ?? 'Routine'} : ${n} jours d’affilée`, text, kanji: '連', xp: eventXp(e) };
}

function fromEvent(e: ProgressEvent, data: AppData): StoryMoment | null {
	if (e.source.startsWith('reg:streak:')) return streakMoment(e, data);
	if (e.source.startsWith('reg:week:'))
		return {
			key: e.source, kind: 'week', kicker: 'Semaine sans faille', title: 'Sept secteurs, zéro faux pas', kanji: '完', xp: eventXp(e),
			text: pick(e.source, ['Une orbite d’une propreté rare : toutes les obligations tenues, du premier au dernier secteur.', 'Toute la semaine, le Sillage a tenu son cap. C’est là que tout a commencé.'])
		};
	if (e.source.startsWith('reg:hweek:')) {
		const m = e.label.match(/\((\d+) semaines/);
		const n = m ? Number(m[1]) : 1;
		if (!REGULARITY.habitWeekMilestones.includes(n)) return null;
		const name = e.label.replace(/^Semaine pleine : /, '').replace(/ \(.*$/, '');
		return {
			key: e.source, kind: 'habit-weeks', kicker: `${n} semaines d’affilée`, title: `${name}, semaine après semaine`, kanji: '週', xp: eventXp(e),
			text: 'Le rythme fait désormais partie de la mécanique du vaisseau. Un cristal rejoint la soute.'
		};
	}
	if (e.source.startsWith('chapter:')) {
		const c = data.campaigns.find((x) => x.chapters.some((ch) => ch.id === e.source.slice(8)));
		if (!c) return null;
		const i = c.chapters.findIndex((ch) => ch.id === e.source.slice(8));
		const next = c.chapters.slice(i + 1).find((ch) => !ch.done);
		return {
			key: e.source, kind: 'chapter', kicker: `Campagne · ${c.name}`, title: `Cap franchi : ${c.chapters[i].name}`, kanji: '章', xp: eventXp(e),
			text: `Un fragment de carte se redessine. ${next ? `Prochain cap : ${next.name}.` : 'Il ne reste plus qu’à toucher la destination.'}`
		};
	}
	if (e.source.startsWith('quest:') && e.label.startsWith('Boss vaincu')) {
		return {
			key: e.source, kind: 'boss', kicker: 'Boss vaincu', title: e.label.replace(/^Boss vaincu : /, ''), kanji: '鬼', xp: eventXp(e),
			text: pick(e.source, ['Ce qui te faisait reculer gît dans le sas.', 'L’avarie majeure est réparée. Ce qui te faisait reculer gît dans le sas.'])
		};
	}
	if (e.source.startsWith('campaign:')) {
		const c = data.campaigns.find((x) => x.id === e.source.slice(9));
		if (!c) return null;
		return {
			key: e.source, kind: 'campaign', kicker: 'Destination atteinte', title: c.name, kanji: '着', xp: eventXp(e),
			text: `Tu voulais : « ${c.intent} » C’est fait. Prends le temps de regarder le chemin parcouru avant de choisir la prochaine destination.`
		};
	}
	if (e.source.startsWith('trophy:')) {
		const t = TROPHIES.find((x) => x.id === e.source.slice(7));
		if (!t) return null;
		return { key: e.source, kind: 'trophy', kicker: 'Trophée débloqué', title: t.name, kanji: t.kanji, xp: eventXp(e) || undefined, text: `${t.lore} Objectif atteint : ${t.condition.toLowerCase()}.` };
	}
	return null;
}

/** Moments pas encore racontés (événements des 4 derniers jours, niveau, classe du vaisseau). */
export function pendingMoments(data: AppData, todayDate: ISODate): StoryMoment[] {
	const seen = new Set(data.moments.seen);
	const out: StoryMoment[] = [];
	const level = levelFromXp(totalXp(data)).level;
	if (data.moments.level >= 0 && level > data.moments.level)
		out.push({
			key: `level:${level}`, kind: 'level', kicker: 'Montée en grade', title: `Pilote de niveau ${level}`, kanji: '昇',
			text: pick(`level:${level}`, ['Un point de compétence t’attend sur l’écran Pilote.', 'Le cockpit t’obéit un peu mieux. Un point de compétence t’attend sur l’écran Pilote.'])
		});
	const cls = shipClass(data);
	if (cls.index > 0 && !seen.has(`ship:${cls.name}`))
		out.push({ key: `ship:${cls.name}`, kind: 'ship', kicker: 'Le Sillage change de classe', title: `Classe ${cls.name}`, kanji: '艦', text: 'L’épave des débuts n’est plus qu’un souvenir. Chaque réparation raconte une semaine tenue.' });
	const from = addDays(todayDate, -3);
	for (const e of data.events) {
		if (e.date < from || seen.has(e.source)) continue;
		const m = fromEvent(e, data);
		if (m) out.push(m);
	}
	return out.filter((m) => !seen.has(m.key));
}

/** À la première ouverture (ou après import) : tout ce qui existe est marqué comme vu, pas d'avalanche. */
export function initMoments(data: AppData, todayDate: ISODate) {
	if (data.moments.level >= 0) return;
	data.moments.level = levelFromXp(totalXp(data)).level;
	data.moments.seen = [...new Set([...data.moments.seen, ...pendingMoments(data, todayDate).map((m) => m.key)])];
}

export function markSeen(data: AppData, m: StoryMoment) {
	if (!data.moments.seen.includes(m.key)) data.moments.seen.push(m.key);
	if (m.kind === 'level') data.moments.level = Math.max(data.moments.level, Number(m.key.slice(6)));
}
