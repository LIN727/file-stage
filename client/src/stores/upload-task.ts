import { writable } from 'svelte/store';
import type { UploadTask } from '../routes/types';

function createUploadTask() {
	const { subscribe, set, update } = writable<UploadTask[]>([]);

	return {
		subscribe,
		set,
		add: (task: UploadTask) => update((tasks: UploadTask[]) => [...tasks, task])
	};
}

export const uploadTask = createUploadTask();
