// Campagnes, chapitres, quêtes et tâches liées (brief technique §13 et §14).
// Cocher rapporte, décocher annule exactement ; terminer une campagne est une action explicite et réversible.
import { GAUGES, LOOT_REWARDS, XP_REWARDS } from '../config';
import { uid } from '../seed';
import type { AppData, Campaign, Chapter, Difficulty, ISODate, ProgressEvent, Quest, Task, TaskList } from '../types';
import { taskMultiplier } from './effects';
import { addEvent, discipline, removeEvent } from './progress';
import { actionLoot, actionXp, bonusXp, scaleLoot } from './xp';

export function findQuest(data: AppData, questId: string): { campaign: Campaign; chapter: Chapter; quest: Quest } | null {
	for (const campaign of data.campaigns)
		for (const chapter of campaign.chapters) {
			const quest = chapter.quests.find((q) => q.id === questId);
			if (quest) return { campaign, chapter, quest };
		}
	return null;
}

export function campaignProgress(c: Campaign) {
	const quests = c.chapters.flatMap((ch) => ch.quests);
	const done = quests.filter((q) => q.done).length;
	const current = c.chapters.find((ch) => !ch.done && (ch.quests.length === 0 || ch.quests.some((q) => !q.done))) ?? null;
	return { done, total: quests.length, pct: quests.length ? Math.round((100 * done) / quests.length) : 0, current };
}

/** Coche ou décoche une quête. Toutes les quêtes du chapitre faites : chapitre terminé. Renvoie les événements créés. */
export function toggleQuest(data: AppData, questId: string, todayDate: ISODate): ProgressEvent[] {
	const found = findQuest(data, questId);
	if (!found) return [];
	const { campaign, chapter, quest } = found;
	if (quest.done) {
		quest.done = undefined;
		removeEvent(data, `quest:${quest.id}`);
		if (chapter.done) {
			chapter.done = undefined;
			removeEvent(data, `chapter:${chapter.id}`);
		}
		return [];
	}
	quest.done = todayDate;
	const d = discipline(data, todayDate);
	const out = [
		addEvent(data, {
			source: `quest:${quest.id}`,
			date: todayDate,
			label: quest.boss ? `Boss vaincu : ${quest.name}` : `Quête : ${quest.name}`,
			xp: [{ domainId: campaign.domainId, amount: bonusXp(quest.xp, d) }],
			loot: { ...(quest.boss ? LOOT_REWARDS.boss : LOOT_REWARDS.quest) },
			gauge: { motivation: GAUGES.motivation.questDone },
			campaignId: campaign.id
		})
	];
	if (chapter.quests.every((q) => q.done)) {
		chapter.done = todayDate;
		out.push(
			addEvent(data, {
				source: `chapter:${chapter.id}`,
				date: todayDate,
				label: `Chapitre terminé : ${chapter.name}`,
				xp: [{ domainId: campaign.domainId, amount: bonusXp(XP_REWARDS.chapter, d) }],
				loot: { ...LOOT_REWARDS.chapter },
				gauge: { inspiration: GAUGES.inspiration.chapterDone },
				campaignId: campaign.id
			})
		);
	}
	return out;
}

/** Terminer la campagne (action explicite) ; rappeler l'action la rouvre. */
export function toggleCampaignDone(data: AppData, campaignId: string, todayDate: ISODate): ProgressEvent[] {
	const c = data.campaigns.find((x) => x.id === campaignId);
	if (!c) return [];
	if (c.status === 'done') {
		c.status = 'active';
		c.done = undefined;
		removeEvent(data, `campaign:${c.id}`);
		return [];
	}
	c.status = 'done';
	c.done = todayDate;
	return [
		addEvent(data, {
			source: `campaign:${c.id}`,
			date: todayDate,
			label: `Destination atteinte : ${c.name}`,
			xp: [{ domainId: c.domainId, amount: bonusXp(XP_REWARDS.campaign, discipline(data, todayDate)) }],
			loot: { ...LOOT_REWARDS.campaign },
			gauge: { inspiration: GAUGES.inspiration.campaignDone },
			campaignId: c.id
		})
	];
}

/** Pause : l'Inspiration cesse de baisser pour elle. */
export function togglePause(data: AppData, campaignId: string) {
	const c = data.campaigns.find((x) => x.id === campaignId);
	if (!c || c.status === 'done') return;
	c.status = c.status === 'paused' ? 'active' : 'paused';
}

export function addCampaign(data: AppData, c: Omit<Campaign, 'id' | 'status' | 'chapters'> & { chapters?: Chapter[] }): Campaign {
	const campaign: Campaign = { id: uid(), status: 'active', chapters: [], ...c };
	if (!campaign.chapters.length) campaign.chapters.push({ id: uid(), name: 'Premier chapitre', quests: [] });
	data.campaigns.push(campaign);
	return campaign;
}

export function addChapter(data: AppData, campaignId: string, name: string): Chapter | null {
	const c = data.campaigns.find((x) => x.id === campaignId);
	if (!c || !name.trim()) return null;
	const ch: Chapter = { id: uid(), name: name.trim(), quests: [] };
	c.chapters.push(ch);
	return ch;
}

export function addQuest(data: AppData, chapterId: string, name: string, xp = 100, boss = false): Quest | null {
	const ch = data.campaigns.flatMap((c) => c.chapters).find((x) => x.id === chapterId);
	if (!ch || !name.trim()) return null;
	const quest: Quest = { id: uid(), name: name.trim(), xp: Math.max(10, Math.round(xp)), ...(boss ? { boss: true } : {}) };
	ch.quests.push(quest);
	// Un chapitre terminé qui reçoit une nouvelle quête redevient en cours
	if (ch.done) {
		ch.done = undefined;
		removeEvent(data, `chapter:${ch.id}`);
	}
	return quest;
}

// ——— Tâches (colis) ———

export function addTask(data: AppData, t: { title: string; list?: TaskList; effort?: Difficulty; questId?: string; domainId?: string }): Task | null {
	if (!t.title.trim()) return null;
	const task: Task = { id: uid(), title: t.title.trim(), list: t.list ?? 'week', effort: t.effort ?? 'easy', ...(t.questId ? { questId: t.questId } : {}), ...(t.domainId ? { domainId: t.domainId } : {}) };
	data.tasks.push(task);
	return task;
}

/** XP d'une tâche : action « normale » de l'effort × Logistique ; liée à une quête, l'XP va au domaine de la campagne. */
export function taskReward(data: AppData, task: Task, todayDate: ISODate) {
	const effort = task.effort ?? 'easy';
	const k = taskMultiplier(data);
	const link = task.questId ? findQuest(data, task.questId) : null;
	return {
		xp: Math.round(actionXp(data, effort, 'normal', discipline(data, todayDate)) * k),
		loot: scaleLoot(actionLoot(data, effort, 'normal'), k),
		domainId: link ? link.campaign.domainId : (task.domainId ?? ''),
		campaignId: link?.campaign.id
	};
}

export function toggleTask(data: AppData, taskId: string, todayDate: ISODate): ProgressEvent | null {
	const task = data.tasks.find((t) => t.id === taskId);
	if (!task) return null;
	if (task.done) {
		task.done = undefined;
		removeEvent(data, `task:${task.id}`);
		return null;
	}
	task.done = todayDate;
	const r = taskReward(data, task, todayDate);
	return addEvent(data, {
		source: `task:${task.id}`,
		date: todayDate,
		label: `Tâche terminée : ${task.title}`,
		xp: [{ domainId: r.domainId, amount: r.xp }],
		loot: r.loot,
		...(r.campaignId ? { campaignId: r.campaignId } : {})
	});
}
