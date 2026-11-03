import { describe, expect, it } from 'vitest';
import { createData } from '../seed';
import { campaignFromTemplate, TEMPLATES } from '../templates';
import type { AppData } from '../types';
import { addQuest, addTask, campaignProgress, toggleCampaignDone, togglePause, toggleQuest, toggleTask } from './campaigns';
import { openDay } from './actions';
import { addEvent, gaugeValue, materials, totalXp, xpByDomain } from './progress';
import { checkTrophies } from './trophies';
import { initMoments, pendingMoments } from './story';

const MON = '2026-11-02';

function withTemplate(id: string): AppData {
	const d = createData(MON);
	d.campaigns = [campaignFromTemplate(d, TEMPLATES.find((t) => t.id === id)!, MON)];
	return d;
}

describe('campagnes', () => {
	it('7 modèles ; arrivée visée = aujourd’hui + durée ; stat du modèle', () => {
		expect(TEMPLATES).toHaveLength(7);
		const d = withTemplate('matins');
		const c = d.campaigns[0];
		expect(c.target).toBe('2026-12-14');
		expect(c.domainId).toBe('bienetre');
		expect(c.chapters.map((ch) => ch.quests.length)).toEqual([3, 3]);
		expect(c.chapters[1].quests[2]).toMatchObject({ name: '30 matins tenus', xp: 400, boss: true });
	});

	it('quête : XP au domaine de la campagne, butin, +6 Motivation ; décocher annule', () => {
		const d = withTemplate('matins');
		const q = d.campaigns[0].chapters[0].quests[0];
		toggleQuest(d, q.id, MON);
		expect(xpByDomain(d).bienetre).toBe(100);
		expect(materials(d)).toEqual({ metal: 2, energy: 2, crystal: 0 });
		expect(gaugeValue(d, 'motivation')).toBe(56);
		expect(d.events[0].label).toBe('Quête : Heure de lever réaliste');
		toggleQuest(d, q.id, MON);
		expect(d.events).toHaveLength(0);
		expect(q.done).toBeUndefined();
	});

	it('chapitre terminé quand toutes ses quêtes le sont (+300 XP, 3 Cristaux, +15 Inspiration) ; décocher le défait', () => {
		const d = withTemplate('matins');
		const ch = d.campaigns[0].chapters[0];
		for (const q of ch.quests) toggleQuest(d, q.id, MON);
		expect(ch.done).toBe(MON);
		expect(totalXp(d)).toBe(600);
		expect(materials(d).crystal).toBe(3);
		expect(gaugeValue(d, 'inspiration')).toBe(65);
		expect(campaignProgress(d.campaigns[0]).current?.name).toBe('Tenir');
		toggleQuest(d, ch.quests[1].id, MON);
		expect(ch.done).toBeUndefined();
		expect(d.events.some((e) => e.source.startsWith('chapter:'))).toBe(false);
	});

	it('boss : butin de boss, libellé « Boss vaincu », trophée et moment', () => {
		const d = withTemplate('matins');
		initMoments(d, MON);
		const boss = d.campaigns[0].chapters[1].quests[2];
		toggleQuest(d, boss.id, MON);
		expect(materials(d)).toEqual({ metal: 0, energy: 2, crystal: 2 });
		expect(d.events[0].label).toBe('Boss vaincu : 30 matins tenus');
		checkTrophies(d, MON);
		expect(d.trophies.boss).toBe(MON);
		expect(pendingMoments(d, MON).map((m) => m.kind)).toContain('boss');
	});

	it('campagne terminée : +1 000 XP, 10 Cristaux, +30 Inspiration ; réversible', () => {
		const d = withTemplate('matins');
		toggleCampaignDone(d, d.campaigns[0].id, MON);
		expect(d.campaigns[0].status).toBe('done');
		expect(totalXp(d)).toBe(1000);
		expect(materials(d).crystal).toBe(10);
		expect(gaugeValue(d, 'inspiration')).toBe(80);
		toggleCampaignDone(d, d.campaigns[0].id, MON);
		expect(d.campaigns[0].status).toBe('active');
		expect(d.events).toHaveLength(0);
	});

	it('pause : plus de baisse d’Inspiration', () => {
		const d = withTemplate('matins');
		togglePause(d, d.campaigns[0].id);
		d.lastProcessedDay = '2026-11-01';
		openDay(d, '2026-11-05');
		expect(gaugeValue(d, 'inspiration')).toBe(50);
		togglePause(d, d.campaigns[0].id);
		openDay(d, '2026-11-07');
		expect(gaugeValue(d, 'inspiration')).toBe(46);
	});

	it('modèle joué jusqu’au bout', () => {
		const d = withTemplate('danse');
		const c = d.campaigns[0];
		for (const ch of c.chapters) for (const q of ch.quests) toggleQuest(d, q.id, MON);
		expect(c.chapters.every((ch) => ch.done)).toBe(true);
		expect(campaignProgress(c)).toMatchObject({ done: 9, total: 9, pct: 100, current: null });
		toggleCampaignDone(d, c.id, MON);
		// 8 × 100 + 300 (boss) + 3 × 300 (chapitres) + 1 000
		expect(totalXp(d)).toBe(3000);
	});

	it('une nouvelle quête rouvre un chapitre terminé', () => {
		const d = withTemplate('matins');
		const ch = d.campaigns[0].chapters[0];
		for (const q of ch.quests) toggleQuest(d, q.id, MON);
		addQuest(d, ch.id, 'Encore une', 150);
		expect(ch.done).toBeUndefined();
		expect(ch.quests.at(-1)).toMatchObject({ name: 'Encore une', xp: 150 });
	});
});

describe('tâches', () => {
	it('XP selon l’effort, Logistique, campagne liée', () => {
		const d = withTemplate('matins');
		const t = addTask(d, { title: 'Mettre un réveil', effort: 'medium' })!;
		toggleTask(d, t.id, MON);
		expect(totalXp(d)).toBe(20);
		expect(materials(d)).toEqual({ metal: 2, energy: 1, crystal: 0 });
		toggleTask(d, t.id, MON);
		expect(d.events).toHaveLength(0);
		d.skills.logistics = 2;
		const q = d.campaigns[0].chapters[0].quests[0];
		const linked = addTask(d, { title: 'Avancer', effort: 'hard', questId: q.id })!;
		toggleTask(d, linked.id, MON);
		expect(xpByDomain(d).bienetre).toBe(52); // 40 × 1,3
		expect(d.events[0].campaignId).toBe(d.campaigns[0].id);
		addEvent(d, { source: 'x', date: MON, label: 'x' });
		checkTrophies(d, MON);
		expect(d.trophies['first-task']).toBe(MON);
	});
});
