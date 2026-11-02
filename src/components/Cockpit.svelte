<script lang="ts">
	// Poste de pilotage : progression du jour, statut, mode minimum, repos, boucliers, gains du jour, jauges.
	import type { Material } from '../lib/types';
	import type { TodayView } from '../lib/view';
	import { GAUGE_TEXT } from '../lib/universe';
	import MatIcon from './MatIcon.svelte';

	interface Props {
		v: TodayView;
		future: boolean;
		ontoggleMinimum: () => void;
		ontoggleRest: () => void;
	}
	let { v, future, ontoggleMinimum, ontoggleRest }: Props = $props();

	const segs = (n: number) => Array.from({ length: Math.max(n, 1) }, (_, i) => i);
	const gauges = $derived([
		{ key: 'discipline', value: v.gauges.discipline, color: 'var(--cyan)' },
		{ key: 'motivation', value: v.gauges.motivation, color: 'var(--amber)' },
		{ key: 'inspiration', value: v.gauges.inspiration, color: 'var(--pink)' }
	] as const);
</script>

<section class="panel cockpit" aria-label="Poste de pilotage">
	<div class="panel-head">
		<span class="tag">Cockpit</span>
		<span class="jp kana">操縦席</span>
	</div>

	<p class="status {v.status.tone}">{v.status.text}</p>

	<div class="progress">
		<div class="row">
			<span class="lbl">Obligations</span>
			<div class="segs">
				{#each segs(v.obligations.expected) as i (i)}
					<i class:on={i < v.obligations.done} class:none={v.obligations.expected === 0}></i>
				{/each}
			</div>
			<span class="mono num">{v.obligations.done}/{v.obligations.expected}</span>
		</div>
		<div class="row">
			<span class="lbl">Bonus</span>
			<div class="segs bonus">
				{#each segs(v.bonuses.expected) as i (i)}
					<i class:on={i < v.bonuses.done} class:none={v.bonuses.expected === 0}></i>
				{/each}
			</div>
			<span class="mono num">{v.bonuses.done}/{v.bonuses.expected}</span>
		</div>
	</div>

	<div class="day">
		<div class="gain">
			<span class="lbl">Gagné ce jour</span>
			<span class="mono xp">+{v.xpDay}<small> XP</small></span>
			{#each Object.entries(v.lootDay) as [m, n] (m)}
				<span class="mono loot"><MatIcon m={m as Material} />{n}</span>
			{/each}
		</div>
		<div class="shields" title="Boucliers de série : {v.shields.count} en réserve sur {v.shields.max}">
			<span class="lbl">Boucliers</span>
			<span class="sh">
				{#each Array.from({ length: v.shields.max }) as _, i (i)}
					<svg viewBox="0 0 12 14" class:full={i < v.shields.count} aria-hidden="true"><path d="M6 1 11 3v4c0 3-2.2 5-5 6-2.8-1-5-3-5-6V3Z" /></svg>
				{/each}
			</span>
		</div>
	</div>

	<div class="toggles">
		<button class="tg" class:on={v.minimum} onclick={ontoggleMinimum} aria-pressed={v.minimum} disabled={future || v.rest}>
			<span class="led"></span>Mode minimum
		</button>
		<button class="tg" class:on={v.rest} onclick={ontoggleRest} aria-pressed={v.rest}>
			<span class="led"></span>Jour de repos
		</button>
	</div>

	<div class="gauges">
		{#each gauges as g (g.key)}
			<div class="gauge" style:--g={g.color} title={GAUGE_TEXT[g.key].lore}>
				<div class="gh">
					<span class="gn">{GAUGE_TEXT[g.key].name}</span>
					<span class="mono gv">{g.value}</span>
				</div>
				<div class="gb"><i style:width="{g.value}%"></i></div>
				<span class="gl"><span class="kana">{GAUGE_TEXT[g.key].kana}</span> · {GAUGE_TEXT[g.key].lore}</span>
			</div>
		{/each}
	</div>
</section>

<style>
	.status {
		margin: 0 0 12px;
		font-family: var(--f-display);
		font-size: 16px;
		font-weight: 700;
		line-height: 1.25;
		padding-left: 10px;
		border-left: 3px solid var(--red);
	}
	.status.lit {
		border-color: var(--amber);
		color: var(--amber);
	}
	.status.perfect {
		border-color: var(--gold);
		color: var(--gold);
		text-shadow: 0 0 12px rgba(255, 210, 63, 0.45);
	}
	.status.rest {
		border-color: var(--cyan);
		color: var(--cyan);
	}
	.status.past {
		border-color: var(--line-2);
		color: var(--ink-2);
	}
	.lbl {
		font-family: var(--f-display);
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.progress {
		display: grid;
		gap: 6px;
	}
	.row {
		display: grid;
		grid-template-columns: 92px 1fr 42px;
		align-items: center;
		gap: 8px;
	}
	.segs {
		display: flex;
		gap: 3px;
		height: 12px;
	}
	.segs i {
		flex: 1;
		background: var(--bg-2);
		border: 1px solid var(--line);
		transform: skewX(-20deg);
		transition: background 0.4s, box-shadow 0.4s;
	}
	.segs i.on {
		background: var(--amber);
		border-color: var(--amber);
		box-shadow: 0 0 8px rgba(255, 181, 71, 0.6);
	}
	.segs.bonus i.on {
		background: var(--cyan);
		border-color: var(--cyan);
		box-shadow: 0 0 8px rgba(79, 227, 216, 0.5);
	}
	.segs i.none {
		background: transparent;
		border-style: dashed;
	}
	.num {
		text-align: right;
		font-size: 14px;
	}
	.day {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		margin: 14px 0 12px;
		padding: 10px 0;
		border-top: 1px dashed var(--line);
		border-bottom: 1px dashed var(--line);
	}
	.gain {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 10px;
	}
	.gain .lbl {
		width: 100%;
	}
	.xp {
		font-size: 22px;
		color: var(--gold);
		line-height: 1;
	}
	.xp small {
		font-size: 12px;
		color: var(--muted);
	}
	.loot {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		font-size: 14px;
	}
	.shields {
		text-align: right;
		display: grid;
		gap: 4px;
	}
	.sh {
		display: flex;
		gap: 4px;
		justify-content: flex-end;
	}
	.sh svg {
		width: 16px;
		height: 18px;
		fill: none;
		stroke: var(--line-2);
		stroke-width: 1.2;
	}
	.sh svg.full {
		fill: var(--cyan);
		stroke: var(--cyan);
		filter: drop-shadow(0 0 4px rgba(79, 227, 216, 0.6));
	}
	.toggles {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		margin-bottom: 14px;
	}
	.tg {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 40px;
		padding: 0 10px;
		background: var(--panel-2);
		border: 1px solid var(--line);
		font-family: var(--f-display);
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-align: left;
	}
	.tg:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.led {
		width: 8px;
		height: 8px;
		flex: none;
		background: var(--line-2);
	}
	.tg.on {
		border-color: var(--cyan);
		color: var(--cyan);
	}
	.tg.on .led {
		background: var(--cyan);
		box-shadow: 0 0 8px var(--cyan);
	}
	.gauges {
		display: grid;
		gap: 10px;
	}
	.gh {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.gn {
		font-family: var(--f-display);
		font-size: 12px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.gv {
		color: var(--g);
		font-size: 15px;
	}
	.gb {
		height: 8px;
		background: var(--bg-2);
		border: 1px solid var(--line);
		position: relative;
		margin: 3px 0 2px;
	}
	.gb i {
		position: absolute;
		inset: 0 auto 0 0;
		background: repeating-linear-gradient(90deg, var(--g) 0 4px, transparent 4px 6px);
		box-shadow: 0 0 10px color-mix(in srgb, var(--g) 50%, transparent);
		transition: width 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.gl {
		font-size: 11px;
		color: var(--muted);
	}
</style>
