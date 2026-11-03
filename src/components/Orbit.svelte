<script lang="ts">
	// Bloc d'orbite : la scène 3D et, par-dessus, le secteur du jour, la date et les 7 secteurs en 2D.
	import { Canvas } from '@threlte/core';
	import type { Orbit } from '../lib/engine/orbit';
	import { addDays, formatLong } from '../lib/dates';
	import type { ISODate, ModuleId } from '../lib/types';
	import { SECTORS } from '../lib/universe';
	import Kronos from './scene/Kronos.svelte';
	import { STATE_COLOR } from './scene/palette';

	interface Props {
		orbit: Orbit;
		selected: ISODate;
		today: ISODate;
		pulse: { sector: number; at: number; strong: boolean } | null;
		modules: Partial<Record<ModuleId, number>>;
		onselect: (date: ISODate) => void;
	}
	let { orbit, selected, today, pulse, modules, onselect }: Props = $props();

	const idx = $derived(orbit.days.findIndex((d) => d.date === selected));
	const sector = $derived(SECTORS[idx]);
	const calm = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	const dpr = typeof devicePixelRatio !== 'undefined' ? Math.min(devicePixelRatio, 1.75) : 1;
	const STATE_LABEL = { lit: 'allumé', rest: 'repos', today: 'en cours', partial: 'à moitié', missed: 'dans l’ombre', future: 'à venir' };
</script>

<section class="orbit" aria-label="Orbite de la semaine">
	<div class="canvas">
		<Canvas {dpr} toneMapping={0}>
			<Kronos states={orbit.days.map((d) => d.state)} selected={idx} {pulse} {calm} {modules} onselect={(i) => onselect(orbit.days[i].date)} />
		</Canvas>
	</div>
	<div class="scan" aria-hidden="true"></div>

	{#key selected}
		<div class="sector">
			<span class="kanji kana" aria-hidden="true">{sector.kanji}</span>
			<div class="txt">
				<span class="romaji mono">SECTEUR {String(idx + 1).padStart(2, '0')} · {sector.romaji}</span>
				<h1>{sector.name}</h1>
				<p>{sector.phrase}</p>
			</div>
		</div>
	{/key}

	<nav class="date" aria-label="Changer de jour">
		<button onclick={() => onselect(addDays(selected, -1))} aria-label="Jour précédent">‹</button>
		<span class="d">{formatLong(selected)}</span>
		<button onclick={() => onselect(addDays(selected, 1))} aria-label="Jour suivant">›</button>
		{#if selected !== today}
			<button class="back" onclick={() => onselect(today)}>Aujourd’hui</button>
		{/if}
	</nav>

	<ol class="strip" aria-label="Les 7 secteurs de la semaine">
		{#each orbit.days as d, i (d.date)}
			<li>
				<button
					class:sel={d.date === selected}
					class:now={d.date === today}
					style:--c={STATE_COLOR[d.state]}
					onclick={() => onselect(d.date)}
					aria-label="{SECTORS[i].name} : {STATE_LABEL[d.state]}"
					aria-pressed={d.date === selected}
				>
					<span class="k kana">{SECTORS[i].kanji}</span>
					<span class="n">{SECTORS[i].name.slice(0, 3)}</span>
					<i class="st {d.state}"></i>
				</button>
			</li>
		{/each}
	</ol>
</section>

<style>
	.orbit {
		position: relative;
		height: clamp(360px, 58dvh, 560px);
		overflow: hidden;
		isolation: isolate;
		background:
			radial-gradient(60% 45% at 50% 48%, rgba(255, 95, 162, 0.16), transparent 70%),
			linear-gradient(180deg, #0b0c1d 0%, #15123a 70%, #0b0c1d 100%);
	}
	.canvas {
		position: absolute;
		inset: 0;
		z-index: 0;
	}
	.scan {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 2;
		background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.18) 0 1px, transparent 1px 3px);
		mix-blend-mode: multiply;
	}
	.sector {
		position: absolute;
		top: 12px;
		left: var(--gutter);
		right: var(--gutter);
		display: flex;
		gap: 10px;
		align-items: flex-start;
		pointer-events: none;
		z-index: 3;
		animation: slide 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.kanji {
		font-size: 52px;
		line-height: 1;
		color: transparent;
		-webkit-text-stroke: 1.5px var(--amber);
		text-shadow: 0 0 18px rgba(255, 181, 71, 0.35);
	}
	.txt {
		min-width: 0;
	}
	.romaji {
		font-size: 10px;
		letter-spacing: 0.2em;
		color: var(--cyan);
	}
	h1 {
		margin: 0;
		font-family: var(--f-display);
		font-size: 30px;
		line-height: 1;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.txt p {
		margin: 4px 0 0;
		max-width: 26ch;
		font-size: 13px;
		color: var(--ink-2);
	}
	.date {
		position: absolute;
		z-index: 3;
		left: var(--gutter);
		bottom: 78px;
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.date button {
		background: rgba(17, 19, 42, 0.7);
		border: 1px solid var(--line-2);
		min-width: 36px;
		height: 32px;
		font-size: 18px;
		line-height: 1;
	}
	.date .back {
		font-family: var(--f-display);
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 0 10px;
		color: var(--bg);
		background: var(--cyan);
		border-color: var(--cyan);
	}
	.d {
		font-family: var(--f-display);
		font-size: 12.5px;
		white-space: nowrap;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 0 6px;
	}
	.strip {
		position: absolute;
		z-index: 3;
		left: var(--gutter);
		right: var(--gutter);
		bottom: 12px;
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.strip button {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		padding: 5px 0 6px;
		background: rgba(17, 19, 42, 0.78);
		border: 1px solid var(--line);
		border-top: 2px solid var(--c);
		position: relative;
		transition: transform 0.2s, background 0.2s;
	}
	.strip button.sel {
		background: rgba(255, 181, 71, 0.16);
		border-color: var(--amber);
		border-top-color: var(--c);
		transform: translateY(-3px);
	}
	.strip .k {
		font-size: 17px;
		line-height: 1.1;
		color: var(--c);
	}
	.strip .n {
		font-family: var(--f-display);
		font-size: 10px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-2);
	}
	.strip .now::after {
		content: '';
		position: absolute;
		top: -7px;
		left: 50%;
		translate: -50% 0;
		border: 4px solid transparent;
		border-top-color: var(--red);
	}
	.st {
		width: 60%;
		height: 3px;
		background: var(--c);
		opacity: 0.9;
	}
	.st.future {
		opacity: 0.3;
	}
	.st.today {
		animation: blink 1.2s steps(2) infinite;
	}
	@keyframes blink {
		50% {
			opacity: 0.2;
		}
	}
	@keyframes slide {
		from {
			opacity: 0;
			transform: translateX(-14px);
		}
	}
	@media (min-width: 960px) {
		.orbit {
			height: 100%;
		}
		.kanji {
			font-size: 72px;
		}
		h1 {
			font-size: 40px;
		}
	}
</style>
