// État de l'app et actions. Le moteur travaille sur un AppData brut (mutation en place) ;
// `rev` change après chaque action pour que l'interface se recalcule.
import { addDays, setClock, today, weekIndex } from './dates';
import { openDay, setHabitTier, toggleMinimumMode, toggleRestDay, useShield, declineShield, type Gain } from './engine/actions';
import { load, save, KEYS } from './storage';
import type { AppData, ISODate, Tier } from './types';

export interface GainToast {
	id: number;
	xp: number;
	loot: Gain['loot'];
	title: string;
	extras: string[];
	sector: number;
}

let toastId = 0;

class AppState {
	rev = $state(0);
	data: AppData;
	today = $state(today());
	selected = $state(today());
	source: string;
	/** Horloge simulée (?date=AAAA-MM-JJ) : stockage de test séparé, les vraies données ne sont pas touchées. */
	testMode = false;
	private key = KEYS.data;
	toasts = $state<GainToast[]>([]);
	/** Dernière validation, pour l'animation de la scène 3D. */
	pulse = $state<{ sector: number; at: number; strong: boolean } | null>(null);

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
		const kv = store ?? { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
		this.kv = kv;
		const loaded = load(kv, this.today, this.key);
		this.data = loaded.data;
		this.source = loaded.source;
		openDay(this.data, this.today);
		this.persist();
	}

	private kv: Pick<Storage, 'getItem' | 'setItem'>;

	private persist() {
		try {
			save(this.kv, this.data, this.key);
		} catch {
			/* quota plein ou stockage bloqué : on continue en mémoire */
		}
		this.rev++;
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
		this.persist();
		if (!gain) return null;
		const habit = this.data.habits.find((h) => h.id === habitId)!;
		const extras = gain.events.slice(1).map((e) => e.label);
		this.toasts = [...this.toasts, { id: ++toastId, xp: gain.xp, loot: gain.loot, title: habit.name, extras, sector: weekIndex(date) }];
		this.pulse = { sector: weekIndex(date), at: performance.now(), strong: extras.length > 0 };
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
}

export const app = new AppState();
