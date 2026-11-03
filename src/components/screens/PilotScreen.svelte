<script lang="ts">
	// Écran Pilote : grade et niveau, compétences, stats (radar et détail), jauges, séries, journal de bord.
	import { app } from '../../lib/app.svelte';
	import { formatLong } from '../../lib/dates';
	import { eventXp } from '../../lib/engine/progress';
	import type { Material } from '../../lib/types';
	import { GAUGE_TEXT } from '../../lib/universe';
	import { pilotView } from '../../lib/view';
	import MatIcon from '../MatIcon.svelte';

	const v = $derived.by(() => {
		void app.rev;
		return pilotView(app.data, app.today);
	});

	// Radar des disciplines (stats de premier niveau)
	const R = 78;
	const radar = $derived.by(() => {
		const list = v.stats;
		const max = Math.max(5, ...list.map((s) => s.level.level + s.level.ratio));
		const pt = (i: number, r: number) => {
			const a = -Math.PI / 2 + (i / list.length) * Math.PI * 2;
			return [Math.cos(a) * r, Math.sin(a) * r];
		};
		return {
			axes: list.map((s, i) => ({ s, end: pt(i, R), label: pt(i, R + 16) })),
			shape: list.map((s, i) => pt(i, (R * (s.level.level - 1 + s.level.ratio + 0.15)) / max).join(',')).join(' '),
			rings: [0.33, 0.66, 1].map((k) => list.map((_, i) => pt(i, R * k).join(',')).join(' '))
		};
	});
	const ring = $derived(2 * Math.PI * 54);
	const gauges = $derived([
		{ key: 'discipline', value: v.gauges.discipline, color: 'var(--cyan)' },
		{ key: 'motivation', value: v.gauges.motivation, color: 'var(--amber)' },
		{ key: 'inspiration', value: v.gauges.inspiration, color: 'var(--pink)' }
	] as const);
</script>

<div class="body">
	<section class="id panel" aria-label="Pilote">
		<div class="emblem">
			<svg viewBox="0 0 120 120" aria-hidden="true">
				<circle cx="60" cy="60" r="54" class="track" />
				<circle cx="60" cy="60" r="54" class="fill" stroke-dasharray={ring} stroke-dashoffset={ring * (1 - v.level.ratio)} />
				{#each Array.from({ length: 24 }) as _, i (i)}
					<line x1="60" y1="2" x2="60" y2={i % 6 === 0 ? 10 : 6} transform="rotate({i * 15} 60 60)" class="tick" />
				{/each}
			</svg>
			<div class="lvl">
				<span class="mono">LV</span>
				<b>{v.level.level}</b>
			</div>
		</div>
		<div class="who">
			<span class="mono over">PILOTE DU SILLAGE</span>
			<h1>{v.rank.name}</h1>
			<span class="kana rk">{v.rank.kanji}</span>
			<p class="mono xp">{v.level.into} / {v.level.need} XP · total {v.xp}</p>
			{#if v.nextRank}<p class="small">Prochain grade : {v.nextRank.name} au niveau {v.nextRank.from}</p>{/if}
		</div>
	</section>

	<section class="panel" aria-label="Compétences">
		<div class="panel-head">
			<span class="tag">Compétences</span><span class="jp kana">技能</span>
			<span class="pts mono" class:has={v.points > 0}>{v.points} point{v.points > 1 ? 's' : ''}</span>
		</div>
		{#if v.points > 0}<p class="small glow">Un point par niveau de pilote. À toi de choisir où il sert.</p>{/if}
		<div class="skills">
			{#each v.skills as s (s.id)}
				<article class="skill">
					<span class="sk kana">{s.kanji}</span>
					<div class="st">
						<div class="sh">
							<h3>{s.name}</h3>
							<ol class="lv">{#each [1, 2, 3, 4, 5] as i (i)}<li class:on={i <= s.level}></li>{/each}</ol>
						</div>
						<p class="small">{s.lore}</p>
						<p class="eff">{s.now}{#if s.next}<span class="arrow">&nbsp;→&nbsp;</span><span class="next">{s.next}</span>{/if}</p>
					</div>
					<button class="learn" disabled={!s.can} onclick={() => app.learn(s.id)} aria-label="Apprendre {s.name}">+</button>
				</article>
			{/each}
		</div>
	</section>

	<section class="panel" aria-label="Disciplines">
		<div class="panel-head"><span class="tag">Disciplines</span><span class="jp kana">能力</span></div>
		<svg class="radar" viewBox="-120 -112 240 224" role="img" aria-label="Niveaux des disciplines">
			{#each radar.rings as r, i (i)}<polygon points={r} class="ring" />{/each}
			{#each radar.axes as a (a.s.id)}
				<line x1="0" y1="0" x2={a.end[0]} y2={a.end[1]} class="axis" />
				<text x={a.label[0]} y={a.label[1]} class="lab" text-anchor="middle" dominant-baseline="middle">{a.s.stat}</text>
			{/each}
			<polygon points={radar.shape} class="shape" />
		</svg>
		<ul class="stats">
			{#each v.stats as s (s.id)}
				<li style:--c={s.color}>
					<div class="row">
						<span class="dot"></span>
						<b>{s.stat}</b>
						<span class="small">{s.name}</span>
						<span class="mono lvn">LV {s.level.level}</span>
					</div>
					<div class="bar"><i style:width="{s.level.ratio * 100}%"></i></div>
					{#if s.subs.length}
						<div class="subs">
							{#each s.subs as sub (sub.id)}<span class="mono">{sub.stat} · LV {sub.level.level}</span>{/each}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</section>

	<section class="panel" aria-label="Jauges">
		<div class="panel-head"><span class="tag">Jauges</span><span class="jp kana">計器</span></div>
		<div class="gauges">
			{#each gauges as g (g.key)}
				<div class="gauge" style:--g={g.color}>
					<svg viewBox="0 0 80 46" aria-hidden="true">
						<path d="M8 42a32 32 0 0 1 64 0" class="gt" />
						<path d="M8 42a32 32 0 0 1 64 0" class="gf" pathLength="100" stroke-dasharray="100" stroke-dashoffset={100 - g.value} />
					</svg>
					<b class="mono">{g.value}</b>
					<span class="gn">{GAUGE_TEXT[g.key].name}</span>
					<span class="small">{GAUGE_TEXT[g.key].lore}</span>
				</div>
			{/each}
		</div>
	</section>

	<section class="panel" aria-label="Séries en cours">
		<div class="panel-head"><span class="tag">Séries</span><span class="jp kana">連続</span></div>
		{#if v.streaks.length === 0}<p class="small">Aucune série en cours : la prochaine commence au prochain geste, même au minimum.</p>{/if}
		<ul class="streaks">
			{#each v.streaks as s (s.habit.id)}
				<li>
					<span class="name">{s.habit.name}</span>
					<span class="mono">{s.streak} j{#if s.next} → {s.next}{/if}</span>
					{#if s.next}<div class="bar"><i style:width="{(s.streak / s.next) * 100}%"></i></div>{/if}
				</li>
			{/each}
		</ul>
	</section>

	<section class="panel log" aria-label="Journal de bord">
		<div class="panel-head"><span class="tag">Journal de bord</span><span class="jp kana">航海日誌</span></div>
		{#if v.log.length === 0}<p class="small">Le journal est vierge. Il se remplit à chaque geste.</p>{/if}
		<ol>
			{#each v.log as e (e.id)}
				<li>
					<span class="mono d">{formatLong(e.date).split(' ').slice(0, 2).join(' ')}</span>
					<span class="l">{e.label}</span>
					<span class="g">
						{#if eventXp(e)}<span class="mono x">+{eventXp(e)}</span>{/if}
						{#each Object.entries(e.loot ?? {}) as [m, n] (m)}<span class="mono" class:neg={n < 0}><MatIcon m={m as Material} size={11} />{n > 0 ? '+' : ''}{n}</span>{/each}
					</span>
				</li>
			{/each}
		</ol>
	</section>
</div>

<style>
	.body {
		display: grid;
		gap: 14px;
		padding: 14px var(--gutter) 120px;
		max-width: 760px;
		margin: 0 auto;
	}
	.id {
		display: flex;
		align-items: center;
		gap: 16px;
		background:
			radial-gradient(80% 120% at 0% 50%, rgba(255, 181, 71, 0.16), transparent 60%),
			var(--panel);
	}
	.emblem {
		position: relative;
		width: 112px;
		height: 112px;
		flex: none;
	}
	.emblem svg {
		width: 100%;
		height: 100%;
		rotate: -90deg;
	}
	.track {
		fill: rgba(11, 12, 29, 0.8);
		stroke: var(--line);
		stroke-width: 6;
	}
	.fill {
		fill: none;
		stroke: var(--amber);
		stroke-width: 6;
		filter: drop-shadow(0 0 6px rgba(255, 181, 71, 0.7));
		transition: stroke-dashoffset 1s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.tick {
		stroke: var(--muted);
		stroke-width: 1.5;
	}
	.lvl {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		text-align: center;
		line-height: 1;
	}
	.lvl span {
		font-size: 11px;
		color: var(--amber);
		letter-spacing: 0.2em;
	}
	.lvl b {
		font-family: var(--f-display);
		font-size: 42px;
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
		line-height: 1;
		text-transform: uppercase;
	}
	.rk {
		font-size: 13px;
		color: var(--red);
		letter-spacing: 0.3em;
	}
	.xp {
		margin: 6px 0 0;
		font-size: 12px;
		color: var(--ink-2);
	}
	.small {
		margin: 2px 0 0;
		font-size: 12.5px;
		color: var(--muted);
	}
	.glow {
		color: var(--gold);
		margin-bottom: 8px;
	}
	.pts {
		margin-left: auto;
		color: var(--muted);
	}
	.pts.has {
		color: var(--bg);
		background: var(--gold);
		padding: 1px 8px;
		animation: pulse 1.4s ease-in-out infinite;
	}
	@keyframes pulse {
		50% {
			box-shadow: 0 0 14px var(--gold);
		}
	}
	.skills {
		display: grid;
		gap: 8px;
	}
	.skill {
		display: flex;
		gap: 10px;
		align-items: center;
		padding: 10px;
		background: var(--panel-2);
		border: 1px solid var(--line);
	}
	.sk {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		flex: none;
		font-size: 20px;
		color: var(--cyan);
		border: 1px solid var(--cyan);
	}
	.st {
		flex: 1;
		min-width: 0;
	}
	.sh {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		align-items: center;
	}
	h3 {
		margin: 0;
		font-size: 15px;
	}
	.lv {
		display: flex;
		gap: 3px;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.lv li {
		width: 7px;
		height: 12px;
		border: 1px solid var(--line-2);
		transform: skewX(-15deg);
	}
	.lv li.on {
		background: var(--cyan);
		border-color: var(--cyan);
	}
	.eff {
		margin: 4px 0 0;
		font-size: 12.5px;
	}
	.arrow {
		color: var(--red);
	}
	.next {
		color: var(--amber);
	}
	.learn {
		width: 40px;
		height: 40px;
		flex: none;
		font-size: 22px;
		font-weight: 700;
		color: var(--bg);
		background: var(--gold);
		border: 0;
		clip-path: polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%);
	}
	.learn:disabled {
		background: var(--line);
		color: var(--muted);
		cursor: default;
	}
	.radar {
		display: block;
		width: min(100%, 340px);
		margin: 0 auto 8px;
		overflow: visible;
	}
	.ring {
		fill: none;
		stroke: var(--line);
	}
	.axis {
		stroke: var(--line);
	}
	.lab {
		font-family: var(--f-display);
		font-size: 9px;
		fill: var(--ink-2);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.shape {
		fill: rgba(255, 181, 71, 0.22);
		stroke: var(--amber);
		stroke-width: 1.5;
		filter: drop-shadow(0 0 6px rgba(255, 181, 71, 0.5));
	}
	.stats {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 10px;
	}
	.row {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}
	.dot {
		width: 8px;
		height: 8px;
		background: var(--c);
		align-self: center;
	}
	.lvn {
		margin-left: auto;
		color: var(--c);
	}
	.bar {
		height: 5px;
		margin-top: 4px;
		background: var(--bg-2);
		border: 1px solid var(--line);
	}
	.bar i {
		display: block;
		height: 100%;
		background: var(--c, var(--amber));
	}
	.subs {
		display: flex;
		gap: 10px;
		margin-top: 4px;
		font-size: 11px;
		color: var(--muted);
	}
	.gauges {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		text-align: center;
	}
	.gauge {
		display: grid;
		justify-items: center;
	}
	.gauge svg {
		width: 100%;
		max-width: 110px;
	}
	.gt {
		fill: none;
		stroke: var(--line);
		stroke-width: 6;
	}
	.gf {
		fill: none;
		stroke: var(--g);
		stroke-width: 6;
		filter: drop-shadow(0 0 4px var(--g));
		transition: stroke-dashoffset 1s;
	}
	.gauge b {
		margin-top: -22px;
		font-size: 20px;
		font-weight: 400;
		color: var(--g);
	}
	.gn {
		font-family: var(--f-display);
		font-size: 11px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.gauge .small {
		font-size: 10.5px;
	}
	.streaks {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}
	.streaks li {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 2px 8px;
	}
	.streaks .bar {
		grid-column: 1 / -1;
		--c: var(--red);
	}
	.log ol {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 420px;
		overflow: auto;
	}
	.log li {
		display: grid;
		grid-template-columns: 74px 1fr auto;
		gap: 8px;
		padding: 6px 0;
		border-bottom: 1px dashed var(--line);
		font-size: 13px;
	}
	.d {
		font-size: 11px;
		color: var(--muted);
	}
	.g {
		display: flex;
		gap: 6px;
		align-items: center;
		font-size: 12px;
	}
	.x {
		color: var(--gold);
	}
	.neg {
		color: var(--muted);
	}
	@media (min-width: 960px) {
		.body {
			grid-template-columns: 1fr 1fr;
			max-width: 1200px;
			padding-top: 20px;
		}
		.id {
			grid-column: 1 / -1;
		}
	}
</style>
