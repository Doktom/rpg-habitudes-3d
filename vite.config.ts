import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Chemins relatifs : l'app est servie sous /rpg-habitudes-3d/ sur GitHub Pages.
export default defineConfig({
	base: './',
	plugins: [svelte()],
	build: { chunkSizeWarningLimit: 1200 },
	test: { include: ['src/**/*.test.ts'] }
});
