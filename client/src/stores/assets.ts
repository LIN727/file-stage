import { writable } from 'svelte/store';
import type { Asset } from '../routes/types';

function createAssets() {
	const { subscribe, set, update } = writable<Asset[]>([]);

	return {
		subscribe,
		set,
		add: (asset: Asset) => update((assets) => [...assets, asset]),
		remove: (id: string) => update((assets) => assets.filter((a) => a.id !== id)),
		search: (query: string) =>
			update((assets) =>
				assets.filter((asset) => asset.filename.toLowerCase().includes(query || ''))
			)
	};
}

export const assets = createAssets();
