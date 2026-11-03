// État de l'app et actions. Le moteur travaille sur un AppData brut (mutation en place) ;
// `rev` change après chaque action pour que l'interface se recalcule.
import { addDays, setClock, today, weekIndex } from './dates';
import {
	buyShield, declineShield, learnSkill, openDay, setHabitTier, toggleMinimumMode, toggleRestDay, upgradeModule, useShield, type Gain
} from './engine/actions';
import { initMoments, markSeen, pendingMoments, type StoryMoment } from './engine/story';
import { checkTrophies } from './engine/trophies';
import {
	addChapter, addCampaign, addQuest, addTask, findQuest, toggleCampaignDone, togglePause, toggleQuest, toggleTask
} from './engine/campaigns';
import { campaignFromTemplate, type CampaignTemplate } from './templates';
import { load, save, KEYS } from './storage';
import type { AppData, Difficulty, ISODate, Loot, ModuleId, ProgressEvent, SkillId, Tier } from './types';
import { MODULES, SKILLS } from './universe';

export interface GainToast {
	id: number;
	xp: number;
	loot: Loot;
	title: string;
	kicker?: string;
	extras: string[];
	sector: number;
}

export type Route = 'today' | 'ship' | 'campaigns' | 'pilot';
const ROUTES: Record<string, Route> = { '#/': 'today', '#/vaisseau': 'ship', '#/campagnes': 'campaigns', '#/pilote': 'pilot' };

let toastId = 0;

class AppState {
	rev = $state(0);
	data: AppData;
	today = $state(today());
	selected = $state(today());
	route = $state<Route>('today');
	source: string;
	/** Horloge simulée (?date=AAAA-MM-JJ) : stockage de test séparé, les vraies données ne sont pas touchées. */
	testMode = false;
	private key = KEYS.data;
	toasts = $state<GainToast[]>([]);
	/** Moment raconté affiché en plein écran (un à la fois). */
	moment = $state<StoryMoment | null>(null);
	/** Dernière validation, pour l'animation de la scène 3D. */
	pulse = $state<{ sector: number; at: number; strong: boolean } | null>(null);
	/** Campagne affichée sur l'écran Campagnes. */
	campaignId = $state<string | null>(null);
	/** Dernier progrès de campagne, pour l'animation de la route 3D. */
	questPulse = $state<{ at: number; strong: boolean } | null>(null);
	/** Dernière amélioration, pour l'animation du hangar. */
	refit = $state<{ module: ModuleId; at: number } | null>(null);

	constructor() {
		const params = new URLSearchParams(location.search);
		const clock = params.get('date');
		if (clock && /^\d{4}-\d{2}-\d{2}$/.test(clock)) {
			setClock(clock);
			this.today = this.selected = clock;
			this.testMode = true;
			this.key = KEYS.test;
		}
		let store: Storage | null = null;
		try {
			store = localStorage;
		} catch {
			/* stockage indisponible : données en mémoire */
		}
		const mem = new Map<string, string>();
		this.kv = store ?? { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
		const loaded = load(this.kv, this.today, this.key);
		this.data = loaded.data;
		this.source = loaded.source;
		openDay(this.data, this.today);
		checkTrophies(this.data, this.today);
		initMoments(this.data, this.today);
		this.readRoute();
		addEventListener('hashchange', () => this.readRoute());
		this.persist();
	}

	private kv: Pick<Storage, 'getItem' | 'setItem'>;

	private readRoute() {
		this.route = ROUTES[location.hash] ?? 'today';
		scrollTo({ top: 0 });
	}
	go(route: Route) {
		location.hash = Object.keys(ROUTES).find((k) => ROUTES[k] === route) ?? '#/';
	}

	/** Sauvegarde, trophées (jamais perdus) et prochain moment à raconter. */
	private persist(): ProgressEvent[] {
		const trophies = checkTrophies(this.data, this.today);
		for (const t of trophies) this.toast({ xp: (t.xp ?? []).reduce((s, x) => s + x.amount, 0), loot: t.loot ?? {}, title: t.label.replace(/^Trophée : /, ''), kicker: 'Trophée · 賞', extras: [], sector: -1 });
		try {
			save(this.kv, this.data, this.key);
		} catch {
			/* quota plein ou stockage bloqué : on continue en mémoire */
		}
		this.rev++;
		// Laisse d'abord l'animation de gain se jouer
		setTimeout(() => this.nextMoment(), 900);
		return trophies;
	}

	private nextMoment() {
		if (this.moment || this.testMode) return;
		this.moment = pendingMoments(this.data, this.today)[0] ?? null;
	}

	closeMoment() {
		if (!this.moment) return;
		markSeen(this.data, this.moment);
		this.moment = null;
		try {
			save(this.kv, this.data, this.key);
		} catch {
			/* idem */
		}
		setTimeout(() => this.nextMoment(), 350);
	}

	private toast(t: Omit<GainToast, 'id'>) {
		this.toasts = [...this.toasts, { id: ++toastId, ...t }];
	}

	/** Si la date a changé pendant que l'app était ouverte : clôture et nouvelle journée. */
	refreshDay() {
		const t = today();
		if (this.testMode || t === this.today) return;
		const wasToday = this.selected === this.today;
		this.today = t;
		if (wasToday) this.selected = t;
		openDay(this.data, t);
		this.persist();
	}

	select(date: ISODate) {
		this.selected = date;
	}
	shift(n: number) {
		this.selected = addDays(this.selected, n);
	}

	setTier(habitId: string, tier: Tier, session?: string): Gain | null {
		const date = this.selected;
		if (date > this.today) return null;
		const gain = setHabitTier(this.data, habitId, date, tier, this.today, session ? { session } : {});
		if (gain) {
			const habit = this.data.habits.find((h) => h.id === habitId)!;
			const extras = gain.events.slice(1).map((e) => e.label);
			this.toast({ xp: gain.xp, loot: gain.loot, title: habit.name, extras, sector: weekIndex(date) });
			this.pulse = { sector: weekIndex(date), at: performance.now(), strong: extras.length > 0 };
		}
		this.persist();
		return gain;
	}

	dropToast(id: number) {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}

	toggleRest() {
		toggleRestDay(this.data, this.selected, this.today);
		this.persist();
	}
	toggleMinimum() {
		toggleMinimumMode(this.data, this.selected);
		this.persist();
	}
	shield(date: ISODate) {
		useShield(this.data, date, this.today);
		this.persist();
	}
	declineShield(date: ISODate) {
		declineShield(this.data, date);
		this.persist();
	}
	craftShield() {
		if (!buyShield(this.data, this.today)) return;
		this.toast({ xp: 0, loot: { energy: -6 }, title: 'Bouclier fabriqué', kicker: 'Chantier · 盾', extras: [], sector: -1 });
		this.persist();
	}
	upgrade(id: ModuleId) {
		if (!upgradeModule(this.data, id, this.today)) return;
		const lvl = this.data.ship.modules[id];
		this.refit = { module: id, at: performance.now() };
		this.toast({ xp: 0, loot: {}, title: `${MODULES[id].name} · niveau ${lvl}`, kicker: 'Chantier · 改修', extras: [], sector: -1 });
		this.persist();
	}
	// ——— Campagnes ———

	private gainToast(events: ProgressEvent[], title: string, kicker: string) {
		if (!events.length) return;
		const loot: Loot = {};
		let xp = 0;
		for (const e of events) {
			for (const x of e.xp ?? []) xp += x.amount;
			for (const [m, n] of Object.entries(e.loot ?? {})) loot[m as keyof Loot] = (loot[m as keyof Loot] ?? 0) + (n as number);
		}
		this.toast({ xp, loot, title, kicker, extras: events.slice(1).map((e) => e.label), sector: -1 });
	}
	quest(questId: string) {
		const f = findQuest(this.data, questId);
		if (!f) return;
		const events = toggleQuest(this.data, questId, this.today);
		this.gainToast(events, f.quest.name, f.quest.boss ? 'Boss vaincu · 鬼' : 'Quête · 任務');
		if (events.length) this.questPulse = { at: performance.now(), strong: events.length > 1 || !!f.quest.boss };
		this.persist();
	}
	task(taskId: string) {
		const t = this.data.tasks.find((x) => x.id === taskId);
		const ev = toggleTask(this.data, taskId, this.today);
		if (ev && t) this.gainToast([ev], t.title, 'Colis livré · 荷');
		this.persist();
	}
	finishCampaign(id: string) {
		const c = this.data.campaigns.find((x) => x.id === id);
		const events = toggleCampaignDone(this.data, id, this.today);
		if (c) this.gainToast(events, c.name, 'Destination atteinte · 着');
		if (events.length) this.questPulse = { at: performance.now(), strong: true };
		this.persist();
	}
	pause(id: string) {
		togglePause(this.data, id);
		this.persist();
	}
	newCampaign(t: CampaignTemplate | { name: string; intent: string; domainId: string; target?: ISODate }) {
		const c = 'chapters' in t ? campaignFromTemplate(this.data, t, this.today) : null;
		const created = c ? (this.data.campaigns.push(c), c) : addCampaign(this.data, t as { name: string; intent: string; domainId: string; target?: ISODate });
		this.campaignId = created.id;
		this.persist();
	}
	addQuest(chapterId: string, name: string, xp: number, boss: boolean) {
		if (addQuest(this.data, chapterId, name, xp, boss)) this.persist();
	}
	addChapter(campaignId: string, name: string) {
		if (addChapter(this.data, campaignId, name)) this.persist();
	}
	addTask(title: string, questId: string, effort: Difficulty) {
		if (addTask(this.data, { title, questId, effort, list: 'week' })) this.persist();
	}

	learn(id: SkillId) {
		if (!learnSkill(this.data, id)) return;
		this.toast({ xp: 0, loot: {}, title: `${SKILLS[id].name} · niveau ${this.data.skills[id]}`, kicker: 'Compétence · 技能', extras: [], sector: -1 });
		this.persist();
	}
}

export const app = new AppState();
