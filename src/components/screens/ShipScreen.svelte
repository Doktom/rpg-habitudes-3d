<script lang="ts">
	// Écran Vaisseau : hangar 3D, classe, soute, chantier (modules), boucliers, orbite, trophées.
	import { Canvas } from '@threlte/core';
	import { app } from '../../lib/app.svelte';
	import type { Material } from '../../lib/types';
	import { MATERIALS, SHIP_NAME } from '../../lib/universe';
	import { shipView } from '../../lib/view';
	import MatIcon from '../MatIcon.svelte';
	import Hangar from '../scene/Hangar.svelte';

	const v = $derived.by(() => {
		void app.rev;
		return shipView(app.data, app.today);
	});
	const calm = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	const dpr = typeof devicePixelRatio !== 'undefined' ? Math.min(devicePixelRatio, 1.75) : 1;
	const classPct = $derived(v.cls.next ? Math.round((v.cls.sum / v.cls.next.from) * 100) : 100);
	const mats = (l: Partial<Record<Material, number>>) => Object.entries(l) as [Material, number][];
	let showAll = $state(false);
</script>

<section class="hangar" aria-label="Hangar">
	<div class="canvas">
		<Canvas {dpr} toneMapping={0}>
			<Hangar modules={app.data.ship.modules} refitAt={app.refit?.at ?? null} {calm} />
		</Canvas>
	</div>
	<div class="scan" aria-hidden="true"></div>
	<div class="id">
		<span class="kanji kana" aria-hidden="true">艦</span>
		<div>
			<span class="mono over">VAISSEAU · {SHIP_NAME.toUpperCase()}</span>
			<h1>Classe {v.cls.name}</h1>
			<div class="cbar"><i style:width="{classPct}%"></i></div>
			<span class="mono sub">
				{#if v.cls.next}{v.cls.sum}/{v.cls.next.from} niveaux de modules → {v.cls.next.name}{:else}Classe maximale atteinte{/if}
			</span>
		</div>
	</div>
	<p class="hint mono">⟲ glisse pour faire tourner</p>
</section>

<div class="body">
	<section class="panel" aria-label="Soute">
		<div class="panel-head"><span class="tag">Soute</span><span class="jp kana">貨物室</span></div>
		<ul class="hold">
			{#each mats(v.mats) as [m, n] (m)}
				<li>
					<MatIcon {m} size={26} />
					<div>
						<b class="mono">{n}</b> <span class="mn">{MATERIALS[m].plural}</span>
						<p>{MATERIALS[m].lore}</p>
					</div>
				</li>
			{/each}
		</ul>
	</section>

	<section class="yard" aria-label="Chantier">
		<div class="panel-head"><span class="tag">Chantier</span><span class="jp kana">造船所</span><h2>Modules</h2></div>
		{#each v.modules as mod (mod.id)}
			<article class="mod panel" class:max={mod.max}>
				<div class="mh">
					<span class="mk kana">{mod.kanji}</span>
					<div class="mt">
						<h3>{mod.name}</h3>
						<span class="role mono">{mod.role.toUpperCase()}</span>
					</div>
					<ol class="lv" aria-label="Niveau {mod.level} sur 5">
						{#each [1, 2, 3, 4, 5] as i (i)}<li class:on={i <= mod.level}></li>{/each}
					</ol>
				</div>
				<p class="lore">{mod.lore}</p>
				<div class="eff">
					<span class="now">{mod.now}</span>
					{#if mod.next}<span class="arrow">→</span><span class="next">{mod.next}</span>{/if}
				</div>
				{#if !mod.max}
					<div class="buy">
						<span class="cost">
							{#each mats(mod.cost) as [m, n] (m)}
								<span class="mono c" class:short={mod.missing[m]}><MatIcon {m} />{n}</span>
							{/each}
						</span>
						<button class="up" disabled={!mod.can} onclick={() => app.upgrade(mod.id)}>
							{mod.level === 0 ? 'Réparer' : 'Améliorer'}
						</button>
					</div>
					{#if !mod.can}
						<p class="miss">
							Il manque
							{#each mats(mod.missing) as [m, n], i (m)}{i ? ', ' : ' '}{n} {n > 1 ? MATERIALS[m].plural : MATERIALS[m].name}{/each}.
						</p>
					{/if}
				{:else}
					<p class="maxed mono">◆ NIVEAU MAXIMAL</p>
				{/if}
			</article>
		{/each}
	</section>

	<section class="panel" aria-label="Boucliers">
		<div class="panel-head"><span class="tag">Boucliers</span><span class="jp kana">防壁</span></div>
		<div class="shields">
			{#each Array.from({ length: v.shields.max }) as _, i (i)}
				<svg viewBox="0 0 12 14" class:full={i < v.shields.count} aria-hidden="true"><path d="M6 1 11 3v4c0 3-2.2 5-5 6-2.8-1-5-3-5-6V3Z" /></svg>
			{/each}
			<span class="mono">{v.shields.count}/{v.shields.max}</span>
		</div>
		<p class="small">Un bouclier protège une série le jour d’un raté. Toujours au choix : jamais utilisé à ta place.</p>
		<div class="seg">
			{#each Array.from({ length: 7 }) as _, i (i)}<i class:on={i < v.shields.towardNext}></i>{/each}
		</div>
		<p class="small">{v.shields.towardNext}/7 journées complètes vers le prochain bouclier.</p>
		<div class="buy">
			<span class="mono c"><MatIcon m="energy" />6</span>
			<button class="up" disabled={!v.canCraft} onclick={() => app.craftShield()}>Fabriquer</button>
		</div>
	</section>

	<section class="panel" aria-label="Orbite de la semaine">
		<div class="panel-head"><span class="tag">Orbite</span><span class="jp kana">軌道</span></div>
		<p class="small">
			{v.orbit.lit} secteur{v.orbit.lit > 1 ? 's' : ''} allumé{v.orbit.lit > 1 ? 's' : ''}{#if v.orbit.partial}, {v.orbit.partial} à moitié{/if}.
			Butin à l’amarrage au Havre :
		</p>
		<div class="cost big">
			{#each mats(v.orbit.loot) as [m, n] (m)}<span class="mono c"><MatIcon {m} size={18} />{n}</span>{/each}
			{#if !Object.keys(v.orbit.loot).length}<span class="mono c">—</span>{/if}
		</div>
	</section>

	<section class="panel trophies" aria-label="Trophées">
		<div class="panel-head">
			<span class="tag">Trophées</span><span class="jp kana">勲章</span>
			<span class="mono count">{v.trophyCount}/22</span>
		</div>
		<div class="tbar"><i style:width="{(v.trophyCount / 22) * 100}%"></i></div>
		<ul class="tgrid">
			{#each showAll ? v.trophies : v.trophies.slice(0, 8) as t (t.id)}
				<li class:got={t.got}>
					<span class="seal kana">{t.kanji}</span>
					<div>
						<b>{t.name}</b>
						<p>{t.got ? t.lore : t.condition}</p>
						{#if !t.got}
							<div class="pbar"><i style:width="{(t.prog[0] / t.prog[1]) * 100}%"></i></div>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
		<button class="more" onclick={() => (showAll = !showAll)}>{showAll ? 'Replier' : `Voir les 22 trophées`}</button>
	</section>
</div>

<style>
	.hangar {
		position: relative;
		height: clamp(320px, 48dvh, 520px);
		overflow: hidden;
		background: #0b0c1d;
	}
	.canvas {
		position: absolute;
		inset: 0;
	}
	.scan {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.18) 0 1px, transparent 1px 3px);
	}
	.id {
		position: absolute;
		top: 12px;
		left: var(--gutter);
		right: var(--gutter);
		display: flex;
		gap: 10px;
		pointer-events: none;
	}
	.kanji {
		font-size: 50px;
		line-height: 1;
		color: transparent;
		-webkit-text-stroke: 1.5px var(--cyan);
	}
	.over {
		font-size: 10px;
		letter-spacing: 0.2em;
		color: var(--cyan);
	}
	h1 {
		margin: 0;
		font-family: var(--f-display);
		font-size: 28px;
		line-height: 1.05;
		text-transform: uppercase;
	}
	.cbar,
	.tbar {
		width: min(220px, 60vw);
		height: 5px;
		margin: 6px 0 3px;
		background: var(--bg-2);
		border: 1px solid var(--line);
	}
	.tbar {
		width: 100%;
		margin: 0 0 12px;
	}
	.cbar i,
	.tbar i {
		display: block;
		height: 100%;
		background: repeating-linear-gradient(90deg, var(--cyan) 0 5px, transparent 5px 7px);
	}
	.sub {
		font-size: 11px;
		color: var(--ink-2);
	}
	.hint {
		position: absolute;
		bottom: 8px;
		right: var(--gutter);
		margin: 0;
		font-size: 10px;
		color: var(--muted);
		letter-spacing: 0.1em;
	}
	.body {
		display: grid;
		gap: 14px;
		padding: 14px var(--gutter) 120px;
		max-width: 760px;
		margin: 0 auto;
	}
	.hold {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 10px;
	}
	.hold li {
		display: flex;
		gap: 12px;
		align-items: flex-start;
	}
	.hold b {
		font-size: 20px;
		font-weight: 400;
	}
	.mn {
		font-family: var(--f-display);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: 13px;
	}
	.hold p,
	.small,
	.lore {
		margin: 2px 0 0;
		font-size: 12.5px;
		color: var(--muted);
	}
	.yard {
		display: grid;
		gap: 10px;
	}
	.mh {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.mk {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		flex: none;
		font-size: 22px;
		color: var(--bg);
		background: var(--amber);
		clip-path: polygon(0 0, 100% 0, 100% 75%, 75% 100%, 0 100%);
	}
	.mod.max .mk {
		background: var(--gold);
		box-shadow: 0 0 16px var(--gold);
	}
	.mt {
		flex: 1;
		min-width: 0;
	}
	h3 {
		margin: 0;
		font-size: 16px;
	}
	.role {
		font-size: 10px;
		letter-spacing: 0.18em;
		color: var(--cyan);
	}
	.lv {
		display: flex;
		gap: 3px;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.lv li {
		width: 9px;
		height: 16px;
		border: 1px solid var(--line-2);
		transform: skewX(-15deg);
	}
	.lv li.on {
		background: var(--amber);
		border-color: var(--amber);
		box-shadow: 0 0 6px rgba(255, 181, 71, 0.6);
	}
	.eff {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: baseline;
		margin: 8px 0;
		font-size: 13px;
	}
	.now {
		color: var(--ink);
	}
	.arrow {
		color: var(--red);
	}
	.next {
		color: var(--amber);
	}
	.buy {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-top: 8px;
	}
	.cost {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.cost.big .c {
		font-size: 18px;
	}
	.c {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 14px;
	}
	.c.short {
		color: var(--red);
	}
	.up {
		min-height: 40px;
		padding: 0 18px;
		font-family: var(--f-display);
		font-weight: 700;
		font-size: 13px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--bg);
		background: var(--amber);
		border: 0;
		clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
		transition: transform 0.1s, filter 0.2s;
	}
	.up:not(:disabled):hover {
		filter: brightness(1.15);
	}
	.up:not(:disabled):active {
		transform: scale(0.96);
	}
	.up:disabled {
		background: var(--line);
		color: var(--muted);
		cursor: default;
	}
	.miss {
		margin: 6px 0 0;
		font-size: 12px;
		color: var(--muted);
	}
	.maxed {
		margin: 6px 0 0;
		color: var(--gold);
		font-size: 12px;
		letter-spacing: 0.12em;
	}
	.shields {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.shields svg {
		width: 26px;
		height: 30px;
		fill: none;
		stroke: var(--line-2);
		stroke-width: 1;
	}
	.shields svg.full {
		fill: var(--cyan);
		stroke: var(--cyan);
		filter: drop-shadow(0 0 6px rgba(79, 227, 216, 0.7));
	}
	.seg {
		display: flex;
		gap: 3px;
		height: 8px;
		margin-top: 10px;
	}
	.seg i {
		flex: 1;
		border: 1px solid var(--line);
		transform: skewX(-20deg);
	}
	.seg i.on {
		background: var(--cyan);
		border-color: var(--cyan);
	}
	.count {
		margin-left: auto;
		color: var(--gold);
	}
	.tgrid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
		gap: 8px;
	}
	.tgrid li {
		display: flex;
		gap: 10px;
		padding: 10px;
		border: 1px solid var(--line);
		background: var(--panel-2);
		opacity: 0.75;
	}
	.tgrid li.got {
		opacity: 1;
		border-color: rgba(255, 210, 63, 0.5);
		background: linear-gradient(90deg, rgba(255, 210, 63, 0.1), transparent), var(--panel-2);
	}
	.seal {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		flex: none;
		font-size: 19px;
		border-radius: 50%;
		border: 2px dashed var(--line-2);
		color: var(--line-2);
	}
	.got .seal {
		border: 2px solid var(--red);
		color: var(--red);
		background: rgba(255, 75, 62, 0.08);
		rotate: -8deg;
	}
	.tgrid b {
		font-size: 14px;
	}
	.tgrid p {
		margin: 2px 0 0;
		font-size: 12px;
		color: var(--muted);
	}
	.pbar {
		height: 3px;
		margin-top: 6px;
		background: var(--line);
	}
	.pbar i {
		display: block;
		height: 100%;
		background: var(--amber);
	}
	.more {
		margin-top: 10px;
		width: 100%;
		min-height: 38px;
		background: transparent;
		border: 1px dashed var(--line-2);
		font-family: var(--f-display);
		font-size: 12px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--ink-2);
	}
	@media (min-width: 960px) {
		.hangar {
			height: 56dvh;
		}
		.body {
			grid-template-columns: 1fr 1fr;
			max-width: 1200px;
		}
		.yard,
		.trophies {
			grid-column: 1 / -1;
		}
		.yard {
			grid-template-columns: 1fr 1fr;
		}
		.yard .panel-head {
			grid-column: 1 / -1;
		}
	}
</style>
