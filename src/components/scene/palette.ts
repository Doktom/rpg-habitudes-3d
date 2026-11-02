import type { SectorState } from '../../lib/engine/orbit';

/** Couleurs des états de secteur, communes à la 3D et aux panneaux 2D. */
export const STATE_COLOR: Record<SectorState, string> = {
	lit: '#ffb547',
	rest: '#4fe3d8',
	today: '#ff4b3e',
	partial: '#c2773a',
	missed: '#6b2d4a',
	future: '#4a5090'
};

export const SECTOR_ARC = (Math.PI * 2) / 7;

/** Angle du centre d'un secteur : lundi en haut, puis dans le sens horaire vu du dessus. */
export const sectorAngle = (i: number) => Math.PI / 2 - i * SECTOR_ARC;
