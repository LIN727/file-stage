import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	server: {
		host: true,
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:1028',
				changeOrigin: true
			},
			'/socket.io': {
				target: 'ws://127.0.0.1:1028',
				ws: true
			}
		}
	},
	plugins: [sveltekit()]
});
