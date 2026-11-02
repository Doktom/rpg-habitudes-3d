// Modèle de données du Sillage (brief technique §3). Identique à la V3 : AppData version 1.

export type ISODate = string; // 'YYYY-MM-DD'
export type Time = string; // 'HH:MM'
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Tier = 'min' | 'normal' | 'excellent';
export type Moment = 'morning' | 'day' | 'evening';
export type HabitKind = 'obligatory' | 'bonus';
export type HabitForm = 'simple' | 'routine' | 'program';
export type DanceStyle = 'salsa' | 'bachata' | 'kizomba';
export type Material = 'metal' | 'energy' | 'crystal';
export type Loot = Partial<Record<Material, number>>;
export type ModuleId = 'reactor' | 'hull' | 'thrusters' | 'antenna';
export type SkillId = 'recovery' | 'logistics' | 'endurance' | 'engineering';
export type Gauge = 'motivation' | 'inspiration';

export type Frequency =
	| { type: 'daily' }
	| { type: 'weekly'; times: number }
	| { type: 'days'; days: number[] }; // 0 = dimanche … 6 = samedi

export interface Domain {
	id: string;
	name: string;
	stat: string;
	color: string;
	parentId?: string;
}
export interface DomainShare {
	domainId: string;
	weight: number;
}

export interface Exercise {
	id: string;
	name: string;
	detail?: string;
}
export interface RoutineVersion {
	from: ISODate;
	exercises: Exercise[];
}

export interface Habit {
	id: string;
	name: string;
	form: HabitForm;
	kind: HabitKind;
	frequency: Frequency;
	tiers: Record<Tier, string>;
	moment: Moment;
	slot?: Time;
	cue?: string;
	difficulty: Difficulty;
	domains: DomainShare[];
	campaignId?: string;
	routine?: RoutineVersion[];
	sessions?: string[];
	createdAt: ISODate;
	archived?: boolean;
}
export interface HabitLog {
	id: string;
	habitId: string;
	date: ISODate;
	tier: Tier;
	doneExercises?: string[];
	session?: string;
	note?: string;
}

export interface DanceClass {
	id: string;
	style: DanceStyle;
	weekday: number;
	time: Time;
	durationMin: number;
	place?: string;
	kind: HabitKind;
	cancelled: ISODate[];
}
export interface DanceParty {
	id: string;
	date: ISODate;
	time: Time;
	place?: string;
	styles: DanceStyle[];
	note?: string;
}
export interface Vacation {
	id: string;
	label: string;
	start: ISODate;
	end: ISODate;
}
export interface DanceLog {
	id: string;
	refId: string;
	date: ISODate;
	tier: Tier;
}

export interface Quest {
	id: string;
	name: string;
	xp: number;
	boss?: boolean;
	due?: ISODate;
	done?: ISODate;
}
export interface Chapter {
	id: string;
	name: string;
	quests: Quest[];
	done?: ISODate;
}
export interface Campaign {
	id: string;
	name: string;
	intent: string;
	domainId: string;
	status: 'active' | 'paused' | 'done';
	target?: ISODate;
	chapters: Chapter[];
	done?: ISODate;
}

export type TaskList = 'today' | 'week' | 'month' | 'someday';
export interface Subtask {
	id: string;
	title: string;
	done?: boolean;
}
export interface Task {
	id: string;
	title: string;
	list: TaskList;
	note?: string;
	effort?: Difficulty;
	due?: ISODate;
	subtasks?: Subtask[];
	date?: ISODate;
	start?: Time;
	end?: Time;
	questId?: string;
	domainId?: string;
	done?: ISODate;
}

export interface Review {
	id: string;
	type: 'weekly' | 'monthly';
	periodStart: ISODate;
	createdAt: string;
	worked: string;
	stuck: string;
	adjust: string;
	plan?: string;
	priorities: string[];
	snapshot: { xp: number; discipline: number; motivation: number; inspiration: number; successRate: number };
}

export interface ProgressEvent {
	id: string;
	at: string; // ISO, pour l'ordre dans une même journée
	date: ISODate;
	source: string;
	label: string;
	xp?: { domainId: string; amount: number }[];
	gauge?: { motivation?: number; inspiration?: number };
	loot?: Loot;
	campaignId?: string;
}

export interface NoteItem {
	id: string;
	text: string;
	done?: boolean;
	createdAt: string;
}
export interface NoteList {
	id: string;
	name: string;
	kind: 'list' | 'note';
	icon: string;
	color: string;
	items: NoteItem[];
	body?: string;
	pinned?: boolean;
	createdAt: string;
	updatedAt?: string;
}

export type ReminderKind = 'morning' | 'day' | 'evening' | 'dayCheck' | 'review' | 'month';
export interface Reminder {
	kind: ReminderKind;
	time: Time;
	on: boolean;
}
export interface Settings {
	reminders: Reminder[];
	tz: string;
}
export interface Onboarding {
	startedAt: ISODate;
	introDone?: boolean;
	missions: Record<string, ISODate>;
	hidden?: boolean;
	hints: string[];
}

export interface AppData {
	version: 1;
	domains: Domain[];
	habits: Habit[];
	habitLogs: HabitLog[];
	danceClasses: DanceClass[];
	danceParties: DanceParty[];
	vacations: Vacation[];
	danceLogs: DanceLog[];
	campaigns: Campaign[];
	tasks: Task[];
	reviews: Review[];
	events: ProgressEvent[];
	restDays: ISODate[];
	minimumModeDays: ISODate[];
	shieldedDays: ISODate[];
	shieldDeclined: ISODate[];
	dismissedTips: string[];
	lastProcessedDay?: ISODate;
	ship: { modules: Partial<Record<ModuleId, number>> };
	skills: Partial<Record<SkillId, number>>;
	trophies: Record<string, ISODate>;
	testClock?: ISODate;
	notebook: NoteList[];
	contentVersion?: number;
	settings: Settings;
	onboarding: Onboarding;
	moments: { seen: string[]; level: number };
}
