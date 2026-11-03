<script lang="ts">
	// Séquence de démarrage du système de bord, une fois par session ; un toucher la passe.
	import { onMount } from 'svelte';

	let { ondone }: { ondone: () => void } = $props();
	const LINES = [
		['Réacteur à fusion', 'EN LIGNE'],
		['Cartes de navigation', 'CORROMPUES'],
		['Orbite de Kronos', 'VERROUILLÉE'],
		['Pilote', 'À BORD']
	];
	let shown = $state(0);
	let leaving = $state(false);

	function finish() {
		if (leaving) return;
		leaving = true;
		setTimeout(ondone, 380);
	}
	onMount(() => {
		const timers = LINES.map((_, i) => setTimeout(() => (shown = i + 1), 220 + i * 230));
		timers.push(setTimeout(finish, 220 + LINES.length * 230 + 450));
		return () => timers.forEach(clearTimeout);
	});
</script>

<button class="boot" class:leaving onclick={finish} aria-label="Passer le démarrage">
	<div class="inner">
		<span class="sun" aria-hidden="true"></span>
		<p class="title kana">航跡 <span class="mono">SILLAGE·OS</span></p>
		<ul class="mono">
			{#each LINES.slice(0, shown) as [a, b] (a)}
				<li><span>{a}</span><i></i><b class:warn={b === 'CORROMPUES'}>{b}</b></li>
			{/each}
		</ul>
		<p class="skip mono">toucher pour passer</p>
	</div>
</button>

<style>
	.boot {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: grid;
		place-items: center;
		width: 100%;
		padding: 0 var(--gutter);
		background: #05060f;
		border: 0;
		text-align: left;
		transition: opacity 0.38s, filter 0.38s;
	}
	.boot::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0 1px, transparent 1px 3px);
	}
	.boot.leaving {
		opacity: 0;
		filter: brightness(3) blur(4px);
	}
	.inner {
		width: min(360px, 100%);
	}
	.sun {
		display: block;
		width: 86px;
		height: 86px;
		margin-bottom: 18px;
		border-radius: 50%;
		background:
			repeating-linear-gradient(180deg, transparent 0 52%, #05060f 52% 56%, transparent 56% 64%, #05060f 64% 70%, transparent 70% 78%, #05060f 78% 86%, transparent 86%),
			linear-gradient(180deg, var(--gold), var(--red) 60%, var(--pink));
		box-shadow: 0 0 40px rgba(255, 95, 162, 0.5);
		animation: up 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.title {
		margin: 0 0 14px;
		font-size: 26px;
		color: var(--ink);
	}
	.title .mono {
		font-size: 14px;
		letter-spacing: 0.3em;
		color: var(--amber);
		margin-left: 6px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 6px;
		font-size: 13px;
		color: var(--ink-2);
	}
	li {
		display: flex;
		align-items: baseline;
		gap: 8px;
		animation: type 0.25s steps(6);
	}
	li i {
		flex: 1;
		border-bottom: 1px dotted var(--line-2);
	}
	b {
		font-weight: 400;
		color: var(--cyan);
	}
	b.warn {
		color: var(--red);
		animation: flick 0.4s steps(2) 3;
	}
	.skip {
		margin: 26px 0 0;
		font-size: 10px;
		letter-spacing: 0.2em;
		color: var(--muted);
	}
	@keyframes up {
		from {
			transform: translateY(30px);
			opacity: 0;
		}
	}
	@keyframes type {
		from {
			clip-path: inset(0 100% 0 0);
		}
		to {
			clip-path: inset(0 0 0 0);
		}
	}
	@keyframes flick {
		50% {
			opacity: 0.2;
		}
	}
</style>
