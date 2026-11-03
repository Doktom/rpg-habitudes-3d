// Les 7 modèles de campagnes (brief technique §22). Quête = 100 XP sauf mention ; boss marqués.
import { addDays } from './dates';
import { uid } from './seed';
import type { AppData, Campaign, ISODate } from './types';

interface QuestT {
	name: string;
	xp?: number;
	boss?: boolean;
}
export interface CampaignTemplate {
	id: string;
	name: string;
	stat: string;
	weeks: number;
	intent: string;
	kanji: string;
	chapters: { name: string; quests: QuestT[] }[];
}

const q = (name: string, xp?: number, boss = false): QuestT => ({ name, ...(xp ? { xp } : {}), ...(boss ? { boss } : {}) });

export const TEMPLATES: CampaignTemplate[] = [
	{
		id: 'livres', name: 'Douze livres dans l’année', stat: 'Savoir', weeks: 52, kanji: '書',
		intent: 'Retrouver le plaisir de lire, un livre par mois, sans pression.',
		chapters: [
			{ name: 'Préparer la pile', quests: [q('Noter 12 livres envies dans le Carnet'), q('Choisir le premier livre'), q('Installer un coin lecture')] },
			{ name: 'Premier trimestre', quests: [q('Livre 1'), q('Livre 2'), q('Livre 3', 150)] },
			{ name: 'Deuxième trimestre', quests: [q('Livre 4'), q('Livre 5'), q('Livre 6', 150)] },
			{ name: 'Troisième trimestre', quests: [q('Livre 7'), q('Livre 8'), q('Livre 9', 150)] },
			{ name: 'Dernière ligne droite', quests: [q('Livre 10'), q('Livre 11'), q('Livre 12 : le dernier', 400, true)] }
		]
	},
	{
		id: 'maison', name: 'Une maison qui respire', stat: 'Intendance', weeks: 12, kanji: '家',
		intent: 'Trier et organiser la maison pièce par pièce, pour qu’elle reste facile à tenir.',
		chapters: [
			{ name: 'Cuisine', quests: [q('Trier placards et frigo'), q('Nettoyer à fond'), q('Ranger pour gagner du temps')] },
			{ name: 'Salon', quests: [q('Désencombrer les surfaces'), q('Trier papiers et objets'), q('Nettoyer à fond')] },
			{ name: 'Chambre', quests: [q('Trier les vêtements'), q('Ranger le dressing'), q('Nettoyer à fond')] },
			{ name: 'Salle de bain', quests: [q('Trier les produits'), q('Nettoyer à fond')] },
			{ name: 'Le grand défi', quests: [q('La pièce que j’évite', 400, true)] }
		]
	},
	{
		id: 'deco', name: 'Déco : un intérieur qui me ressemble', stat: 'Créativité', weeks: 16, kanji: '飾',
		intent: 'Aménager et décorer à mon goût, pièce par pièce, avec un budget clair.',
		chapters: [
			{ name: 'Inspiration', quests: [q('20 images'), q('3 couleurs et matières'), q('La première pièce')] },
			{ name: 'Plan et budget', quests: [q('Mesurer'), q('Lister les achats dans « Déco à acheter »'), q('Fixer le budget')] },
			{ name: 'Mise en place', quests: [q('Peinture ou murs'), q('Mobilier principal'), q('Textiles et lumière'), q('Objets et plantes')] },
			{ name: 'Finitions', quests: [q('Pièce terminée : photo avant / après', 300, true)] }
		]
	},
	{
		id: 'forme', name: 'Remise en forme en 12 semaines', stat: 'Force', weeks: 12, kanji: '力',
		intent: 'Construire une base solide : régularité d’abord, intensité ensuite.',
		chapters: [
			{ name: 'Fondations', quests: [q('Point de départ'), q('4 semaines à 3 séances'), q('Horaires fixes')] },
			{ name: 'Progression', quests: [q('Augmenter charges ou durée'), q('4 semaines à 3 séances'), q('1 séance cardio')] },
			{ name: 'Consolidation', quests: [q('4 semaines à 3 séances'), q('Préparer le test de fin')] },
			{ name: 'Bilan', quests: [q('Refaire le test et comparer', 400, true)] }
		]
	},
	{
		id: 'danse', name: 'Passer un cap en danse', stat: 'Rythme', weeks: 12, kanji: '舞',
		intent: 'Gagner en aisance et en musicalité, et oser inviter en soirée.',
		chapters: [
			{ name: 'Bases solides', quests: [q('Revoir les pas de base'), q('Filmer une passe'), q('Posture')] },
			{ name: 'Musicalité', quests: [q('Temps sur 10 morceaux'), q('Morceau inconnu sans se perdre'), q('2 jeux de pieds')] },
			{ name: 'Soirées', quests: [q('2 soirées'), q('Inviter 5 personnes'), q('Danser toute une soirée sans pause', 300, true)] }
		]
	},
	{
		id: 'trading', name: 'Trading : le process avant le profit', stat: 'Stratégie', weeks: 26, kanji: '策',
		intent: 'Construire un système rigoureux, mesuré sur le respect du plan, jamais sur les gains.',
		chapters: [
			{ name: 'Définir ma stratégie', quests: [q('Marchés et horaires'), q('Règles d’entrée et de sortie'), q('Risque par trade'), q('Valider le plan par écrit', 200, true)] },
			{ name: 'Backtester', quests: [q('Collecter les données'), q('100 situations'), q('Analyser'), q('Backtest complet et conclusions', 300, true)] },
			{ name: 'Trader en démo', quests: [q('20 trades démo selon le plan'), q('Journal de chaque trade'), q('Revue mensuelle du process')] },
			{ name: 'Passer en réel avec un plan', quests: [q('Petite taille, 20 trades'), q('Respect du plan > 90 %'), q('Un mois en réel sans enfreindre une règle', 500, true)] }
		]
	},
	{
		id: 'matins', name: 'Des matins qui démarrent bien', stat: 'Sérénité', weeks: 6, kanji: '朝',
		intent: 'Une routine du matin courte et solide, qui tient même les jours pressés.',
		chapters: [
			{ name: 'Choisir', quests: [q('Heure de lever réaliste'), q('3 gestes de moins de 10 min'), q('Préparer la veille')] },
			{ name: 'Tenir', quests: [q('1 semaine complète'), q('2 semaines complètes'), q('30 matins tenus', 400, true)] }
		]
	}
];

/** Crée une campagne à partir d'un modèle : arrivée visée = aujourd'hui + durée indicative. */
export function campaignFromTemplate(data: AppData, t: CampaignTemplate, todayDate: ISODate): Campaign {
	const domain = data.domains.find((d) => d.stat === t.stat && !d.parentId) ?? data.domains.find((d) => d.stat === t.stat);
	return {
		id: uid(),
		name: t.name,
		intent: t.intent,
		domainId: domain?.id ?? '',
		status: 'active',
		target: addDays(todayDate, t.weeks * 7),
		chapters: t.chapters.map((c) => ({
			id: uid(),
			name: c.name,
			quests: c.quests.map((x) => ({ id: uid(), name: x.name, xp: x.xp ?? 100, ...(x.boss ? { boss: true } : {}) }))
		}))
	};
}
