// Contenus de départ (brief technique §22) et complément des données anciennes.
import { CONTENT_VERSION } from './config';
import { addDays } from './dates';
import type { AppData, Campaign, Domain, Habit, ISODate, NoteList, Settings } from './types';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const DOMAINS: Domain[] = [
	{ id: 'danse', name: 'Danse', stat: 'Rythme', color: '#ff4f8b' },
	{ id: 'salsa', name: 'Salsa', stat: 'Salsa', color: '#ff6b5a', parentId: 'danse' },
	{ id: 'bachata', name: 'Bachata', stat: 'Bachata', color: '#ff8fb8', parentId: 'danse' },
	{ id: 'kizomba', name: 'Kizomba', stat: 'Kizomba', color: '#c86bff', parentId: 'danse' },
	{ id: 'sport', name: 'Sport', stat: 'Force', color: '#ff7a2f' },
	{ id: 'mobilite', name: 'Mobilité / kiné', stat: 'Souplesse', color: '#3fe0c5' },
	{ id: 'trading', name: 'Trading', stat: 'Stratégie', color: '#ffd23f' },
	{ id: 'projets', name: 'Projets perso', stat: 'Créativité', color: '#a98bff' },
	{ id: 'bienetre', name: 'Bien-être', stat: 'Sérénité', color: '#7fd4ff' },
	{ id: 'lecture', name: 'Lecture & culture', stat: 'Savoir', color: '#4f8bff' },
	{ id: 'maison', name: 'Maison', stat: 'Intendance', color: '#9be36b' }
];

const kineTiers = { min: 'Étirements seuls', normal: 'Étirements + renfos', excellent: 'Tout + 1 série en plus' };

export function starterHabits(createdAt: ISODate): Habit[] {
	const base = { createdAt, form: 'simple' as const };
	return [
		{
			...base, id: 'reveil', name: 'Réveil musculaire', form: 'routine', kind: 'obligatory', frequency: { type: 'daily' },
			moment: 'morning', difficulty: 'easy', tiers: { min: '1 min', normal: '3-5 min', excellent: '5 min + gainage' },
			domains: [{ domainId: 'mobilite', weight: 70 }, { domainId: 'sport', weight: 30 }], cue: 'Au saut du lit',
			routine: [{ from: createdAt, exercises: [] }]
		},
		{
			...base, id: 'kine-matin', name: 'Kiné matin', form: 'routine', kind: 'obligatory', frequency: { type: 'daily' },
			moment: 'morning', difficulty: 'medium', tiers: kineTiers, domains: [{ domainId: 'mobilite', weight: 100 }],
			cue: 'Après le réveil musculaire', routine: [{ from: createdAt, exercises: [] }]
		},
		{
			...base, id: 'kine-soir', name: 'Kiné soir', form: 'routine', kind: 'obligatory', frequency: { type: 'daily' },
			moment: 'evening', difficulty: 'medium', tiers: kineTiers, domains: [{ domainId: 'mobilite', weight: 100 }],
			cue: 'Avant de me coucher', routine: [{ from: createdAt, exercises: [] }]
		},
		{
			...base, id: 'mini-seance', name: 'Mini-séance sport', kind: 'bonus', frequency: { type: 'daily' }, moment: 'day',
			difficulty: 'easy', tiers: { min: '5 min', normal: '15 min', excellent: '25 min' },
			domains: [{ domainId: 'sport', weight: 100 }], cue: 'En rentrant du travail'
		},
		{
			...base, id: 'salle', name: 'Salle', form: 'program', kind: 'obligatory', frequency: { type: 'weekly', times: 3 },
			moment: 'day', difficulty: 'hard', tiers: { min: 'Séance courte', normal: 'Séance complète', excellent: 'Séance + record' },
			domains: [{ domainId: 'sport', weight: 100 }], sessions: ['Séance A', 'Séance B', 'Séance C']
		},
		{
			...base, id: 'trading-analyse', name: 'Analyse / journal de trading', kind: 'obligatory',
			frequency: { type: 'days', days: [1, 2, 3, 4, 5] }, moment: 'day', difficulty: 'medium',
			tiers: { min: 'Lecture du marché 5 min', normal: 'Analyse + journal', excellent: 'Analyse + journal + étude' },
			domains: [{ domainId: 'trading', weight: 100 }], campaignId: 'camp-trading', cue: 'À la clôture du marché'
		},
		{
			...base, id: 'lecture', name: 'Lecture', kind: 'bonus', frequency: { type: 'daily' }, moment: 'evening',
			difficulty: 'easy', tiers: { min: '5 min', normal: '10 min', excellent: '30 min' },
			domains: [{ domainId: 'lecture', weight: 100 }], cue: 'Au lit, avant d’éteindre'
		},
		{
			...base, id: 'menage', name: 'Ménage express', kind: 'bonus', frequency: { type: 'daily' }, moment: 'day',
			difficulty: 'easy', tiers: { min: '5 min de rangement', normal: '15 min de ménage', excellent: 'Une pièce à fond' },
			domains: [{ domainId: 'maison', weight: 100 }], cue: 'Après le dîner'
		},
		{
			...base, id: 'air', name: 'Prendre l’air', kind: 'bonus', frequency: { type: 'daily' }, moment: 'day',
			difficulty: 'easy', tiers: { min: '5 min dehors', normal: '20 min de marche', excellent: '1 h dehors' },
			domains: [{ domainId: 'bienetre', weight: 100 }], cue: 'Pendant la pause du midi'
		}
	];
}

const q = (id: string, name: string, xp = 100, boss = false) => ({ id, name, xp, ...(boss ? { boss } : {}) });

export function starterCampaigns(): Campaign[] {
	return [
		{
			id: 'camp-trading', name: 'Système de trading', domainId: 'trading', status: 'active',
			intent: 'Construire un système de trading rigoureux, fondé sur un process plutôt que sur les résultats.',
			chapters: [
				{ id: 'tr-1', name: 'Définir ma stratégie', quests: [q('tr-1a', 'Marchés et horaires'), q('tr-1b', 'Règles d’entrée et de sortie'), q('tr-1c', 'Risque par trade'), q('tr-1d', 'Valider le plan par écrit', 200, true)] },
				{ id: 'tr-2', name: 'Backtester', quests: [q('tr-2a', 'Collecter les données'), q('tr-2b', '100 situations'), q('tr-2c', 'Analyser'), q('tr-2d', 'Backtest complet et conclusions', 300, true)] },
				{ id: 'tr-3', name: 'Trader en démo', quests: [q('tr-3a', '20 trades démo selon le plan'), q('tr-3b', 'Journal de chaque trade'), q('tr-3c', 'Revue mensuelle du process')] },
				{ id: 'tr-4', name: 'Passer en réel avec un plan', quests: [q('tr-4a', 'Petite taille, 20 trades'), q('tr-4b', 'Respect du plan > 90 %'), q('tr-4c', 'Un mois en réel sans enfreindre une règle', 500, true)] }
			]
		},
		{
			id: 'camp-maison', name: 'Aménagement et déco de la maison', domainId: 'projets', status: 'active',
			intent: 'Aménager la maison pièce par pièce, à mon rythme.',
			chapters: [{ id: 'ma-1', name: 'Première pièce (à définir)', quests: [] }]
		}
	];
}

export function starterNotebook(now: string): NoteList[] {
	const list = (id: string, name: string, icon: string, color: string): NoteList => ({ id, name, kind: 'list', icon, color, items: [], createdAt: now });
	return [
		list('courses', 'Courses', 'cart', '#3fe0c5'),
		list('deco', 'Déco à acheter', 'lamp', '#a98bff'),
		list('essayer', 'À essayer', 'spark', '#ffd23f'),
		list('visiter', 'À visiter', 'map', '#7fd4ff'),
		list('livres', 'Livres à lire', 'book', '#4f8bff'),
		{ id: 'penser', name: 'À penser', kind: 'note', icon: 'bulb', color: '#ff4f8b', items: [], body: '', createdAt: now }
	];
}

export function defaultSettings(): Settings {
	let tz = 'Europe/Paris';
	try {
		tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz;
	} catch {
		/* fuseau par défaut */
	}
	return {
		tz,
		reminders: [
			{ kind: 'morning', time: '08:00', on: true },
			{ kind: 'day', time: '13:00', on: false },
			{ kind: 'evening', time: '20:30', on: true },
			{ kind: 'dayCheck', time: '21:30', on: true },
			{ kind: 'review', time: '18:00', on: true },
			{ kind: 'month', time: '19:00', on: true }
		]
	};
}

/** Données neuves, avec les contenus de départ. */
export function createData(date: ISODate): AppData {
	return {
		version: 1,
		domains: DOMAINS.map((d) => ({ ...d })),
		habits: starterHabits(date),
		habitLogs: [],
		danceClasses: [],
		danceParties: [],
		vacations: [],
		danceLogs: [],
		campaigns: starterCampaigns(),
		tasks: [],
		reviews: [],
		events: [],
		restDays: [],
		minimumModeDays: [],
		shieldedDays: [],
		shieldDeclined: [],
		dismissedTips: [],
		lastProcessedDay: addDays(date, -1), // le voyage commence aujourd'hui : rien à clôturer avant
		ship: { modules: {} },
		skills: {},
		trophies: {},
		notebook: starterNotebook(date + 'T00:00:00.000Z'),
		contentVersion: CONTENT_VERSION,
		settings: defaultSettings(),
		onboarding: { startedAt: date, missions: {}, hints: [] },
		moments: { seen: [], level: -1 }
	};
}

/** Complète une donnée plus ancienne (champs manquants). Ne retire jamais rien. */
export function withDefaults(raw: Partial<AppData>, date: ISODate): AppData {
	const empty = createData(date);
	const d = { ...empty, ...raw } as AppData;
	for (const key of ['domains', 'habits', 'habitLogs', 'danceClasses', 'danceParties', 'vacations', 'danceLogs', 'campaigns', 'tasks', 'reviews', 'events', 'restDays', 'minimumModeDays', 'shieldedDays', 'shieldDeclined', 'dismissedTips', 'notebook'] as const) {
		if (!Array.isArray(d[key])) (d as unknown as Record<string, unknown>)[key] = raw[key] === undefined ? empty[key] : [];
	}
	d.ship = { modules: { ...(raw.ship?.modules ?? {}) } };
	d.skills = { ...(raw.skills ?? {}) };
	d.trophies = { ...(raw.trophies ?? {}) };
	d.settings = raw.settings?.reminders ? raw.settings : empty.settings;
	d.onboarding = { ...empty.onboarding, ...(raw.onboarding ?? {}) };
	d.moments = raw.moments ?? { seen: [], level: -1 };
	d.contentVersion = raw.contentVersion ?? CONTENT_VERSION;
	d.version = 1;
	return d;
}
