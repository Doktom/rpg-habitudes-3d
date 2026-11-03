<script lang="ts">
	// Navigation : barre basse sur téléphone, onglets dans la barre du haut sur PC.
	import type { Route } from '../lib/app.svelte';

	let { route, go, alert }: { route: Route; go: (r: Route) => void; alert: { ship: boolean; pilot: boolean } } = $props();
	const ITEMS: { id: Route; label: string; kanji: string }[] = [
		{ id: 'today', label: 'Aujourd’hui', kanji: '今日' },
		{ id: 'ship', label: 'Vaisseau', kanji: '艦' },
		{ id: 'campaigns', label: 'Campagnes', kanji: '航路' },
		{ id: 'pilot', label: 'Pilote', kanji: '操縦士' }
	];
</script>

<nav class="nav" aria-label="Navigation principale">
	{#each ITEMS as it (it.id)}
		<button class:on={route === it.id} onclick={() => go(it.id)} aria-current={route === it.id ? 'page' : undefined}>
			<span class="k kana">{it.kanji}</span>
			<span class="l">{it.label}</span>
			{#if (it.id === 'ship' && alert.ship) || (it.id === 'pilot' && alert.pilot)}<i class="dot" aria-label="Quelque chose t’attend"></i>{/if}
		</button>
	{/each}
</nav>

<style>
	.nav {
		position: fixed;
		z-index: 30;
		left: 0;
		right: 0;
		bottom: 0;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		padding: 6px 8px calc(env(safe-area-inset-bottom) + 6px);
		background: linear-gradient(0deg, rgba(11, 12, 29, 0.98), rgba(11, 12, 29, 0.88));
		border-top: 1px solid var(--line);
		backdrop-filter: blur(8px);
	}
	button {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 1px;
		padding: 6px 0;
		background: transparent;
		border: 0;
		color: var(--muted);
	}
	.k {
		font-size: 15px;
		line-height: 1.1;
	}
	.l {
		font-family: var(--f-display);
		font-size: 11px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	button.on {
		color: var(--amber);
	}
	button.on::before {
		content: '';
		position: absolute;
		top: -7px;
		left: 25%;
		right: 25%;
		height: 2px;
		background: var(--amber);
		box-shadow: 0 0 8px var(--amber);
	}
	.dot {
		position: absolute;
		top: 4px;
		left: calc(50% + 14px);
		width: 8px;
		height: 8px;
		background: var(--gold);
		box-shadow: 0 0 8px var(--gold);
		animation: blink 1.2s ease-in-out infinite;
	}
	@keyframes blink {
		50% {
			opacity: 0.3;
		}
	}
	@media (min-width: 960px) {
		.nav {
			position: fixed;
			top: 8px;
			bottom: auto;
			left: 50%;
			right: auto;
			translate: -50% 0;
			display: flex;
			gap: 4px;
			padding: 0;
			background: transparent;
			border: 0;
			backdrop-filter: none;
		}
		button {
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 6px 14px;
			border: 1px solid transparent;
		}
		button.on {
			border-color: var(--amber);
			background: rgba(255, 181, 71, 0.1);
		}
		button.on::before {
			display: none;
		}
		.dot {
			top: 2px;
			left: auto;
			right: 2px;
		}
	}
</style>
