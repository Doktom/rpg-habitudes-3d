// Stockage local de la version 3D. Clés propres `rpg-habitudes-3d:*` ; les données V3 sont
// importées en lecture seule au premier lancement. On n'écrit jamais dans les clés d'une autre version.
import { createData, withDefaults } from './seed';
import type { AppData, ISODate } from './types';

export const PREFIX = 'rpg-habitudes-3d:';
export const KEYS = { data: PREFIX + 'data', test: PREFIX + 'test', mode: PREFIX + 'mode' };
/** Versions précédentes, de la plus récente à la plus ancienne (lecture seule). */
export const LEGACY_KEYS = ['rpg-habitudes-v3:data'];

export interface Loaded {
	data: AppData;
	source: 'local' | 'import-v3' | 'new';
}

type KV = Pick<Storage, 'getItem' | 'setItem'>;

function parse(raw: string | null): Partial<AppData> | null {
	if (!raw) return null;
	try {
		const v = JSON.parse(raw);
		return v && typeof v === 'object' && Array.isArray(v.habits) ? v : null;
	} catch {
		return null;
	}
}

export function load(store: KV, todayDate: ISODate, key = KEYS.data): Loaded {
	const own = parse(store.getItem(key));
	if (own) return { data: withDefaults(own, todayDate), source: 'local' };
	if (key === KEYS.data) {
		for (const legacy of LEGACY_KEYS) {
			const old = parse(store.getItem(legacy));
			if (old) {
				// Copie profonde : la donnée importée ne partage rien avec la source.
				const data = withDefaults(JSON.parse(JSON.stringify(old)), todayDate);
				delete data.testClock;
				return { data, source: 'import-v3' };
			}
		}
	}
	return { data: createData(todayDate), source: 'new' };
}

export function save(store: KV, data: AppData, key = KEYS.data) {
	if (!key.startsWith(PREFIX)) throw new Error('Clé hors version 3D : ' + key);
	store.setItem(key, JSON.stringify(data));
}
