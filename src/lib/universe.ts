// Textes de l'univers (brief technique §22). Les idéogrammes sont un habillage graphique.
import type { Material, ModuleId, Moment, SkillId, Tier } from './types';

export const SHIP_NAME = 'Le Sillage';
export const PLANET_NAME = 'Kronos';

export const INTRO =
	"Tu t'éveilles à bord du Sillage, un vaisseau en orbite basse autour de Kronos, la planète-horloge. Ses cartes de navigation sont corrompues. Chaque révolution complète, sept jours, te fait repasser sept secteurs et recalibre un fragment de la carte. Boucle les orbites, ramasse de quoi réparer le vaisseau, et trace enfin ta route vers les systèmes qui t'attendent.";

export interface Sector {
	name: string;
	phrase: string;
	kanji: string;
	romaji: string;
}

/** Les 7 secteurs, du lundi (0) au dimanche (6). */
export const SECTORS: Sector[] = [
	{ name: 'Aube', phrase: 'Premier passage devant l’étoile : on rallume les systèmes.', kanji: '暁', romaji: 'AKATSUKI' },
	{ name: 'Forge', phrase: 'Les ateliers tournent à plein régime.', kanji: '鍛', romaji: 'KITAE' },
	{ name: 'Zénith', phrase: 'Point le plus proche de Kronos, mi-orbite.', kanji: '天', romaji: 'TENCHŌ' },
	{ name: 'Jonction', phrase: 'Croisement des routes commerciales.', kanji: '交', romaji: 'KŌSA' },
	{ name: 'Éclat', phrase: 'Dernière ligne droite avant le calme.', kanji: '閃', romaji: 'SENKŌ' },
	{ name: 'Dérive', phrase: 'Zone silencieuse, on laisse flotter.', kanji: '漂', romaji: 'HYŌRYŪ' },
	{ name: 'Havre', phrase: 'Station d’amarrage : revue de bord, orbite bouclée.', kanji: '港', romaji: 'MINATO' }
];

export const MATERIALS: Record<Material, { name: string; plural: string; lore: string; kana: string }> = {
	metal: { name: 'Alliage', plural: 'Alliages', lore: 'Débris de coque récupérés partout, le nerf de toute réparation.', kana: '合金' },
	energy: { name: 'Cellule', plural: 'Cellules', lore: 'Cellules d’énergie, issues des efforts soutenus.', kana: '電池' },
	crystal: { name: 'Cristal', plural: 'Cristaux', lore: 'Cristaux de navigation, rares : boss, chapitres et exploits.', kana: '結晶' }
};

export const GAUGE_TEXT = {
	discipline: { name: 'Discipline', lore: 'Cohésion de bord', kana: '規律' },
	motivation: { name: 'Motivation', lore: 'Énergie du réacteur', kana: '動力' },
	inspiration: { name: 'Inspiration', lore: 'Portée de l’antenne', kana: '感応' }
};

export const MOMENTS: Record<Moment, { name: string; title: string; kana: string }> = {
	morning: { name: 'Matin', title: 'Mise en route des systèmes', kana: '朝' },
	day: { name: 'Journée', title: 'Navigation de croisière', kana: '昼' },
	evening: { name: 'Soir', title: 'Retour au calme', kana: '夜' }
};

export const TIER_LABEL: Record<Tier, string> = { min: 'Min', normal: 'Normal', excellent: 'Excellent' };

export const MODULES: Record<ModuleId, { name: string; role: string; lore: string; factor: number }> = {
	reactor: { name: 'Réacteur à fusion', role: 'XP', lore: 'Le cœur du Sillage : plus il tourne fort, plus chaque effort pèse.', factor: 1 },
	hull: { name: 'Coque renforcée', role: 'Motivation', lore: 'Les mauvais jours cognent moins fort sur un blindage solide.', factor: 1 },
	thrusters: { name: 'Propulseurs ioniques', role: 'Orbite', lore: 'Une orbite stable rapporte plus quand on pousse dans le bon sens.', factor: 1 },
	antenna: { name: 'Antenne longue portée', role: 'Inspiration', lore: 'Elle capte les signaux lointains : idées, élans, envies.', factor: 0.8 }
};

export const SKILLS: Record<SkillId, { name: string; lore: string }> = {
	recovery: { name: 'Second souffle', lore: 'Le pilote revient plus vite à son niveau de base.' },
	logistics: { name: 'Logistique', lore: 'Les colis et corvées de bord rapportent davantage.' },
	endurance: { name: 'Endurance', lore: 'Même un petit effort compte vraiment.' },
	engineering: { name: 'Ingénierie', lore: 'Moins de déchets à l’atelier, plus de pièces pour le chantier.' }
};

export const SHIP_CLASSES: { name: string; from: number }[] = [
	{ name: 'Épave', from: 0 },
	{ name: 'Navette', from: 3 },
	{ name: 'Corvette', from: 7 },
	{ name: 'Frégate', from: 12 },
	{ name: 'Croiseur', from: 17 },
	{ name: 'Vaisseau-amiral', from: 20 }
];

export const MODULE_KANJI: Record<ModuleId, string> = { reactor: '炉', hull: '殻', thrusters: '推', antenna: '信' };
export const SKILL_KANJI: Record<SkillId, string> = { recovery: '息', logistics: '運', endurance: '耐', engineering: '工' };

/** Effet d'un module à un niveau donné (texte). */
export function moduleEffect(id: ModuleId, level: number): string {
	if (level === 0) return 'Hors service';
	switch (id) {
		case 'reactor':
			return `+${6 * level} % d'XP`;
		case 'hull':
			return `−${10 * level} % de Motivation perdue par raté · ${2 + Math.floor(level / 2)} places de bouclier`;
		case 'thrusters':
			return `+${25 * level} % de butin d'orbite`;
		case 'antenna':
			return `+${20 * level} % d'Inspiration gagnée`;
	}
}

export function skillEffect(id: SkillId, level: number): string {
	switch (id) {
		case 'recovery':
			return `Motivation : retour vers 50 de ${15 + 3 * level} % par jour`;
		case 'logistics':
			return `+${15 * level} % d'XP et de butin sur les tâches`;
		case 'endurance':
			return `Palier minimum ×${(0.5 + 0.06 * level).toFixed(2).replace('.', ',')}`;
		case 'engineering':
			return `−${5 * level} % sur le coût des améliorations`;
	}
}

/** Grade du pilote selon son niveau : habillage seulement, sans effet de jeu. */
export const RANKS: { from: number; name: string; kanji: string }[] = [
	{ from: 1, name: 'Cadet', kanji: '候補生' },
	{ from: 3, name: 'Enseigne', kanji: '少尉' },
	{ from: 5, name: 'Lieutenant', kanji: '中尉' },
	{ from: 8, name: 'Capitaine', kanji: '大尉' },
	{ from: 12, name: 'Commandant', kanji: '少佐' },
	{ from: 17, name: 'Commodore', kanji: '准将' },
	{ from: 22, name: 'Amiral', kanji: '提督' }
];
export const rankOf = (level: number) => [...RANKS].reverse().find((r) => level >= r.from)!;
