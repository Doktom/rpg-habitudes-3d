<script lang="ts">
	// Icônes des matériaux : Alliage (écrou), Cellule (pile), Cristal (losange).
	import type { Material } from '../lib/types';
	let { m, size = 14 }: { m: Material; size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" class="mat {m}">
	{#if m === 'metal'}
		<path d="M8 1.5 13.6 4.75v6.5L8 14.5 2.4 11.25v-6.5Z" fill="var(--metal)" />
		<circle cx="8" cy="8" r="2.3" fill="var(--bg)" />
	{:else if m === 'energy'}
		<rect x="4.5" y="3" width="7" height="11" rx="1" fill="var(--energy)" />
		<rect x="6.5" y="1.4" width="3" height="1.8" fill="var(--energy)" />
		<path d="M8.6 5 6.4 8.6h1.9L7.4 12l2.3-3.8H7.8Z" fill="var(--bg)" />
	{:else}
		<path d="M8 1 13 6.5 8 15 3 6.5Z" fill="var(--crystal)" />
		<path d="M3 6.5h10L8 15Z" fill="#c74fa3" />
	{/if}
</svg>

<style>
	svg {
		display: inline-block;
		vertical-align: -2px;
		flex: none;
	}
</style>
