<script lang="ts">
	// Carte d'une habitude : nom, série, rythme, déclencheur, semaine en pastilles, choix du palier.
	import type { Tier } from '../lib/types';
	import type { HabitRow } from '../lib/view';
	import { TIER_LABEL } from '../lib/universe';

	interface Props {
		row: HabitRow;
		minimum: boolean;
		locked: boolean;
		onvalidate: (tier: Tier, session?: string) => number | null;
	}
	let { row, minimum, locked, onvalidate }: Props = $props();

	const h = $derived(row.habit);
	const done = $derived(!!row.log);
	const tiers = $derived<Tier[]>(minimum && !done ? ['min'] : ['min', 'normal', 'excellent']);
	let session = $state<string | undefined>(undefined);
	const chosenSession = $derived(row.log?.session ?? session ?? h.sessions?.[0]);
	let floats = $state<{ id: number; xp: number; tier: Tier }[]>([]);
	let flash = $state(0);
	let fid = 0;

	function choose(t: Tier) {
		if (locked) return;
		const xp = onvalidate(t, h.form === 'program' ? chosenSession : undefined);
		if (xp === null) return;
		const id = ++fid;
		floats = [...floats, { id, xp, tier: t }];
		flash = id;
		setTimeout(() => (floats = floats.filter((f) => f.id !== id)), 1400);
	}
	const PIP_LABEL = { done: 'fait', missed: 'raté', todo: 'à faire', future: 'à venir', free: 'libre', shield: 'protégé par un bouclier' };
	const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
</script>

<article class="card" class:done class:bonus={h.kind === 'bonus'} data-flash={flash}>
	{#key flash}
		{#if flash}<span class="sweep" aria-hidden="true"></span>{/if}
	{/key}
	<header>
		<div class="title">
			<h3>{h.name}</h3>
			{#if h.kind === 'bonus'}<span class="chip bonus">Bonus</span>{/if}
		</div>
		{#if row.weekly}
			<span class="meta mono" title="Rythme de la semaine">{row.weekly.done}/{row.weekly.times}<small> cette sem.</small></span>
		{:else}
			<span class="meta mono" class:hot={row.streak >= 3} title="Série en cours">
				<svg viewBox="0 0 10 12" aria-hidden="true"><path d="M5 0C6 3 9 4 9 7.5A4 4 0 0 1 1 7.5C1 5.5 2.5 4.5 3 3c.7 1.2 1.2 1.6 2 1.8C5.2 3 5 1.5 5 0Z" /></svg>
				{row.streak}{#if row.next}<small> → {row.next}</small>{/if}
			</span>
		{/if}
	</header>

	{#if h.cue}<p class="cue">↳ {h.cue}</p>{/if}

	<ol class="pips" aria-label="Semaine">
		{#each row.pips as p, i (i)}
			<li class={p} title="{DAYS[i]} : {PIP_LABEL[p]}"><span>{DAYS[i]}</span></li>
		{/each}
	</ol>

	{#if h.form === 'program' && h.sessions?.length}
		<div class="sessions" role="radiogroup" aria-label="Séance">
			{#each h.sessions as s (s)}
				<button role="radio" aria-checked={chosenSession === s} class:on={chosenSession === s} disabled={done || locked} onclick={() => (session = s)}>{s}</button>
			{/each}
		</div>
	{/if}

	<div class="tiers" class:single={tiers.length === 1}>
		{#each tiers as t (t)}
			<button
				class="tier {t}"
				class:on={row.log?.tier === t}
				class:suggest={!done && row.suggested === t}
				disabled={locked}
				onclick={() => choose(t)}
				aria-pressed={row.log?.tier === t}
			>
				<span class="tl">{TIER_LABEL[t]}</span>
				<span class="td">{h.tiers[t]}</span>
			</button>
		{/each}
		{#each floats as f (f.id)}
			<span class="float mono" aria-hidden="true" style:left="{((Math.max(0, tiers.indexOf(f.tier)) + 0.5) * 100) / tiers.length}%">+{f.xp} XP</span>
		{/each}
	</div>
	{#if done}
		<p class="got mono">✓ VALIDÉ · +{row.gainXp} XP{#if row.log?.session} · {row.log.session}{/if}</p>
	{/if}
</article>

<style>
	.card {
		position: relative;
		padding: 12px 12px 12px 14px;
		background: var(--panel-2);
		border: 1px solid var(--line);
		border-left: 3px solid var(--red);
		overflow: hidden;
		transition: border-color 0.3s, background 0.3s;
	}
	.card.bonus {
		border-left-color: var(--violet);
	}
	.card.done {
		border-left-color: var(--amber);
		background: linear-gradient(90deg, rgba(255, 181, 71, 0.1), transparent 60%), var(--panel-2);
	}
	.sweep {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: linear-gradient(100deg, transparent 20%, rgba(255, 210, 63, 0.35) 50%, transparent 80%);
		animation: sweep 0.7s ease-out forwards;
	}
	@keyframes sweep {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(100%);
		}
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 8px;
	}
	.title {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
	}
	h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
		line-height: 1.25;
	}
	.chip {
		font-family: var(--f-display);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		padding: 1px 6px;
		border: 1px solid var(--violet);
		color: var(--violet);
	}
	.meta {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 15px;
		white-space: nowrap;
		color: var(--ink-2);
	}
	.meta small {
		color: var(--muted);
		font-size: 11px;
	}
	.meta svg {
		width: 11px;
		height: 13px;
		fill: var(--muted);
	}
	.meta.hot svg {
		fill: var(--red);
		filter: drop-shadow(0 0 4px rgba(255, 75, 62, 0.8));
	}
	.cue {
		margin: 2px 0 0;
		font-size: 12px;
		color: var(--cyan);
	}
	.pips {
		display: flex;
		gap: 4px;
		list-style: none;
		margin: 10px 0;
		padding: 0;
	}
	.pips li {
		width: 22px;
		height: 18px;
		display: grid;
		place-items: center;
		font-family: var(--f-mono);
		font-size: 10px;
		color: var(--muted);
		border: 1px solid var(--line);
	}
	.pips li.done {
		background: var(--amber);
		border-color: var(--amber);
		color: var(--bg);
	}
	.pips li.missed {
		border-color: #6b2d4a;
		color: #b05a7c;
		background: repeating-linear-gradient(-45deg, rgba(107, 45, 74, 0.5) 0 2px, transparent 2px 5px);
	}
	.pips li.todo {
		border-color: var(--red);
		color: var(--red);
	}
	.pips li.future {
		opacity: 0.45;
	}
	.pips li.free {
		border-style: dashed;
		opacity: 0.6;
	}
	.pips li.shield {
		border-color: var(--cyan);
		color: var(--cyan);
	}
	.sessions {
		display: flex;
		gap: 6px;
		margin-bottom: 8px;
	}
	.sessions button {
		padding: 4px 10px;
		font-family: var(--f-display);
		font-size: 12px;
		background: transparent;
		border: 1px solid var(--line-2);
	}
	.sessions button.on {
		border-color: var(--cyan);
		color: var(--cyan);
	}
	.tiers {
		position: relative;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}
	.tiers.single {
		grid-template-columns: 1fr;
	}
	.tier {
		--t: var(--cyan);
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		min-height: 54px;
		padding: 6px 8px 7px;
		text-align: left;
		background: rgba(11, 12, 29, 0.6);
		border: 1px solid var(--line-2);
		clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
		transition: background 0.2s, border-color 0.2s, transform 0.1s;
	}
	.tier.normal {
		--t: var(--amber);
	}
	.tier.excellent {
		--t: var(--pink);
	}
	.tier:active:not(:disabled) {
		transform: scale(0.97);
	}
	.tier:disabled {
		cursor: default;
		opacity: 0.5;
	}
	.tier.suggest {
		border-color: var(--t);
	}
	.tier.on {
		background: var(--t);
		border-color: var(--t);
		color: var(--bg);
	}
	.tl {
		font-family: var(--f-display);
		font-weight: 700;
		font-size: 12px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--t);
	}
	.tier.on .tl {
		color: var(--bg);
	}
	.td {
		font-size: 11.5px;
		line-height: 1.25;
		color: var(--ink-2);
	}
	.tier.on .td {
		color: rgba(11, 12, 29, 0.85);
	}
	.float {
		position: absolute;
		top: 0;
		translate: -50% 0;
		font-size: 16px;
		color: var(--gold);
		text-shadow: 0 0 8px rgba(255, 210, 63, 0.8), 0 1px 0 #000;
		pointer-events: none;
		white-space: nowrap;
		animation: rise 1.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
	}
	@keyframes rise {
		0% {
			opacity: 0;
			transform: translateY(10px) scale(0.8);
		}
		20% {
			opacity: 1;
			transform: translateY(-6px) scale(1.15);
		}
		100% {
			opacity: 0;
			transform: translateY(-34px) scale(1);
		}
	}
	.got {
		margin: 8px 0 0;
		font-size: 12px;
		color: var(--amber);
		letter-spacing: 0.06em;
	}
</style>
