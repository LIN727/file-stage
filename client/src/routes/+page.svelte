<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import axios from 'axios';
	import { io } from 'socket.io-client';

	import type { Asset, ServerAsset } from './types';

	import { assets } from '../stores/assets';
	import { uploadTask } from '../stores/upload-task';
	import { toHumanReadableSize } from '$lib/utils';
	import { backOut } from 'svelte/easing';
	import { fly, blur } from 'svelte/transition';

	axios.defaults.baseURL = '/api';

	let toastMessage: string;

	let totalUpload = 0;
	let totalUploadSize = 0;
	let totalUploadProgress = 0;

	let dir = 1;

	const socket = io(`/channel-${Date.now()}`);

	socket.on('connect', () => console.log('✅ Connected to WS Server'));
	socket.on('disconnect', () => console.log('❌ Disconnected from WS Server'));

	socket.on('new-file', () => getFiles());
	socket.on('delete-file', (id) => removeAsset(id));

	onMount(() => getFiles());
	onDestroy(() => socket?.disconnect());

	function handleKeyDown(evt: KeyboardEvent) {
		if (evt.metaKey && evt.key === 'k') {
			evt.preventDefault();
			const search = document.getElementById('search') as HTMLInputElement;
			search.focus();
		}
	}

	function addAsset(asset: Asset) {
		assets.add(asset);
		dir = 1;
	}

	function removeAsset(id: string) {
		assets.remove(id);
		dir = -1;
	}

	function uploadFiles(evt: Event) {
		const target = evt.target as HTMLInputElement;
		const files = target.files;
		if (!files || !files.length) return;

		for (let file of files) {
			const uploadTaskExist = $uploadTask.find((task) => task.name === file.name);
			if (uploadTaskExist) {
				toggleToast('File already in upload queue');
				return;
			}

			const formData = new FormData();
			formData.append('asset', file);

			const controller = new AbortController();

			const newTask = {
				name: file.name,
				size: file.size,
				upload: 0,
				cancel: controller.abort.bind(controller)
			};
			uploadTask.add(newTask);

			totalUploadSize += file.size;

			axios
				.post('/asset', formData, {
					headers: {
						'Content-Type': 'multipart/form-data'
					},
					signal: controller.signal,
					onUploadProgress: (progressEvent) => {
						$uploadTask = $uploadTask.map((task) => {
							if (task.name === file.name) {
								task.upload = progressEvent.loaded;
							}
							return task;
						});
						totalUpload = $uploadTask.reduce((acc, task) => acc + task.upload, 0);
						totalUploadProgress = (totalUpload / totalUploadSize) * 100;
					}
				})
				.then(async (res) => {
					addAsset(res.data as Asset);
					const toast = document.querySelector('.toast');
					if (toast) {
						toggleToast('File uploaded successfully');
					}
					$uploadTask = $uploadTask.filter((task) => {
						if (task.name === file.name) {
							totalUploadSize -= task.size;
						}
						return task.name !== file.name;
					});
				})
				.catch((err) => {
					if (err.name === 'CanceledError') {
						toggleToast('File upload cancelled');
					} else {
						toggleToast('File upload failed');
					}
				})
				.finally(() => {
					target.value = '';
					totalUploadProgress = 0;
				});
		}
	}

	function getFiles() {
		axios.get('/assets').then((res) => {
			const data = res.data as ServerAsset[];
			if (data && data.length) {
				const result = data.map((asset) => {
					const uploadDate = new Date(asset.uploadDate).toLocaleDateString().replace(/\//g, '.');
					const size = toHumanReadableSize(asset.length);
					const name = asset.filename.split(/\.([^.]*)$/)[0];
					const ext = asset.filename.split(/\.([^.]*)$/)[1].toUpperCase();
					return { id: asset._id, filename: asset.filename, name, uploadDate, size, ext } as Asset;
				});
				assets.set(result);
				dir = 1;
			}
		});
	}

	function downloadFile(asset: Asset) {
		axios
			.get(`/assets/${asset.id}`, {
				responseType: 'blob'
			})
			.then((res) => {
				const url = window.URL.createObjectURL(new Blob([res.data]));
				const link = document.createElement('a');
				link.href = url;
				link.setAttribute('download', asset.filename);
				document.body.appendChild(link);
				document.body.removeChild(link);
				link.click();
			})
			.catch((err) => {
				throw new Error(err);
			});
	}

	let deleteId: string | null = null;

	function showDeleteDialog(id: string) {
		deleteId = id;
		const modal = document.getElementById('delete_confirm_modal') as HTMLDialogElement;
		modal.showModal();
	}

	function deleteFile(id: string | null) {
		if (!id) return;
		axios
			.delete(`/assets/${id}`)
			.then(() => {
				const toast = document.querySelector('.toast');
				if (toast) {
					toggleToast('File deleted successfully');
				}
				removeAsset(id);
			})
			.finally(() => {
				deleteId = null;
			});
	}

	function toggleToast(message: string) {
		const toast = document.querySelector('.toast');
		if (toast && toast.classList.contains('hidden')) {
			toastMessage = message;
			toast.classList.remove('hidden');
			setTimeout(() => {
				toast.classList.add('hidden');
			}, 3000);
		}
	}

	let isComposing = false;

	function searchFile(evt?: Event, query?: string) {
		if (isComposing) return;
		const target = evt?.target as HTMLInputElement | undefined;
		query = query || target?.value.toLowerCase();
		if (!query) {
			getFiles();
			return;
		}
		assets.search(query);
	}

	function handleCompositionStart() {
		isComposing = true;
	}

	function handleCompositionEnd(query: string) {
		isComposing = false;
		searchFile(undefined, query);
	}

	function showUploadTaskDialog() {
		const modal = document.getElementById('upload_progress_modal') as HTMLDialogElement;
		modal.showModal();
	}

	function handleDragStart() {
		const button = document.querySelector('#upload-btn') as HTMLDivElement;
		if (button) {
			button.classList.add('opacity-0', 'scale-90');
		}
	}

	function handleDragEnd() {
		const button = document.querySelector('#upload-btn') as HTMLDivElement;
		if (button) {
			button.classList.remove('opacity-0', 'scale-90');
		}
	}
</script>

<svelte:window
	on:keydown={handleKeyDown}
	on:touchmove={handleDragStart}
	on:touchend={handleDragEnd}
/>

<div class="flex flex-col min-h-screen">
	<div class="p-6 flex flex-col justify-between md:items-center md:flex-row md:py-10 md:px-12">
		<div class="flex justify-between">
			<div>
				<h1 class="text-3xl md:text-4xl text-primary font-bold">File Stage</h1>
				<p class="text-md md:text-lg text-slate-500">Share uploaded files</p>
			</div>
			{#key $assets.length}
				<span
					class="font-mono text-4xl text-primary drop-shadow md:hidden"
					in:fly={{ duration: 300, y: 20 * dir, easing: backOut }}
				>
					{$assets.length}
				</span>
			{/key}
		</div>
		<div class="flex gap-5 flex-col md:flex-row mt-5 md:m-0">
			<label class="input input-bordered flex items-center gap-2">
				<input
					id="search"
					type="text"
					class="flex-auto"
					placeholder="Search"
					on:input={searchFile}
					on:compositionstart={handleCompositionStart}
					on:compositionend={(evt) => handleCompositionEnd(evt.data)}
				/>
				<kbd class="kbd kbd-sm hidden md:flex">⌘</kbd>
				<kbd class="kbd kbd-sm hidden md:flex">K</kbd>
			</label>
			<input
				type="file"
				class="file-input file-input-bordered w-full hidden md:block md:max-w-xs"
				on:change={uploadFiles}
				multiple
			/>
			<div class="md:hidden fixed bottom-10 left-1/2 -translate-x-1/2 w-full px-6 z-10">
				<button class="btn btn-primary w-full" id="upload-btn">
					Upload File
					<input type="file" class="opacity-0 absolute inset-0" on:change={uploadFiles} multiple />
				</button>
			</div>
		</div>
	</div>
	{#if $assets.length > 0 || $uploadTask.length > 0}
		<div
			class="p-6 bg-base-200 md:p-12 flex-auto pb-32 md:pb-0"
			transition:fly={{ y: 20, duration: 300 }}
		>
			<div class="flex justify-between items-center">
				{#key $assets.length}
					<span
						class="font-mono text-5xl mb-5 text-primary drop-shadow hidden md:block"
						in:fly={{ duration: 300, y: 20 * dir, easing: backOut }}
					>
						{$assets.length}
					</span>
				{/key}
				{#if $uploadTask.length > 0}
					<button
						class="text-primary btn btn-ghost flex mb-3 md:mb-0 w-full md:w-auto"
						on:click={showUploadTaskDialog}
					>
						<span class="flex-none">
							{`${$uploadTask.length} ${$uploadTask.length > 1 ? 'files' : 'file'} uploading...`}
						</span>
						<progress
							class="progress progress-primary md:w-56 ml-2 w-auto flex-auto"
							value={totalUploadProgress}
							max="100"
						>
						</progress>
					</button>
				{/if}
			</div>
			{#if $assets.length > 0}
				<ul class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
					{#each $assets as asset (asset.id)}
						<li transition:blur>
							<div class="card card-compact bg-base-100 shadow-xl">
								<div class="card-body">
									<h2 class="card-title flex items-baseline md:items-center" title={asset.filename}>
										<span class="line-clamp-2 md:line-clamp-1 break-all text-base md:text-lg"
											>{asset.name}</span
										>
										<span class="badge badge-secondary text-xs md:text-sm">{asset.ext}</span>
									</h2>
									<p class="text-primary text-xs md:text-base">Upload Date: {asset.uploadDate}</p>
									<p class="text-primary text-xs md:text-base">Size: {asset.size}</p>
									<div class="card-actions justify-end">
										<button class="btn btn-ghost text-xs md:text-sm" on:click={() => showDeleteDialog(asset.id)}>
											Delete
										</button>
										<button
											class="btn btn-primary text-xs md:text-sm"
											id="download"
											type="button"
											data-id={asset.id}
											data-filename={asset.filename}
											on:click={() => downloadFile(asset)}
										>
											Download
										</button>
									</div>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

<dialog id="delete_confirm_modal" class="modal">
	<div class="modal-box">
		<h3 class="font-bold text-lg">Deletion</h3>
		<p class="py-4">File will removed from database and behavior is irreversible.</p>
		<div class="modal-action">
			<form method="dialog" class="flex gap-3">
				<button class="btn">Cancel</button>
				<button class="btn btn-neutral" on:click={() => deleteFile(deleteId)}>Confirm</button>
			</form>
		</div>
	</div>
</dialog>

<dialog id="upload_progress_modal" class="modal">
	<div class="modal-box">
		<div class="flex justify-between items-center">
			<h3 class="font-bold text-lg">Uploading</h3>
		</div>
		{#each $uploadTask as task (task.name)}
			<div class="flex justify-between items-center mt-5 gap-x-10">
				<span class="text-primary flex-auto overflow-hidden">
					<span class="flex justify-between">
						<span class="line-clamp-1" title={task.name}>{task.name}</span>
						<span class="bg-base-200 text-base-content rounded text-xs p-1 flex-none">
							{toHumanReadableSize(task.size)}
						</span>
					</span>
					<progress class="progress progress-primary" value={task.upload} max={task.size}>
					</progress>
				</span>
				<button
					class="btn btn-ghost flex-none"
					on:click={() => {
						task.cancel();
						$uploadTask = $uploadTask.filter((t) => t.name !== task.name);
					}}
				>
					Cancel
				</button>
			</div>
		{/each}
		{#if $uploadTask.length === 0}
			<div class="mt-4">
				<span class="text-base-content">Not uploading any file</span>
				<div class="modal-action">
					<form method="dialog">
						<button class="btn btn-primary"> Close </button>
					</form>
				</div>
			</div>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>

<div class="toast toast-center toast-middle md:toast-end md:toast-bottom hidden">
	<div class="alert">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			class="stroke-info shrink-0 w-6 h-6"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
			></path>
		</svg>
		<span>{toastMessage}</span>
	</div>
</div>

<style>
	::-webkit-progress-value {
		transition: width 100ms ease-out;
	}
</style>
