<script lang="ts">
	// Indicateurs permanents : niveau et XP du pilote, matériaux, état de la synchro.
	import type { LevelInfo } from '../lib/engine/xp';
	import type { Material } from '../lib/types';
	import { MATERIALS } from '../lib/universe';
	import MatIcon from './MatIcon.svelte';

	let { level, mats, testMode }: { level: LevelInfo; mats: Record<Material, number>; testMode: boolean } = $props();
</script>

<header class="hud">
	<div class="brand">
		<span class="logo kana">航跡</span>
		<span class="name">Le Sillage</span>
	</div>
	<div class="lvl" title="Niveau du pilote">
		<span class="lv mono">LV<b>{level.level}</b></span>
		<div class="bar" aria-label="XP du niveau">
			<i style:width="{Math.round(level.ratio * 100)}%"></i>
		</div>
		<span class="xp mono">{level.into}<small>/{level.need}</small></span>
	</div>
	<ul class="mats" aria-label="Soute">
		{#each Object.entries(mats) as [m, n] (m)}
			<li title={MATERIALS[m as Material].plural}><MatIcon m={m as Material} /><span class="mono">{n}</span></li>
		{/each}
	</ul>
	<span class="sync" title={testMode ? 'Mode test : rien n’est synchronisé' : 'Données sur cet appareil (synchro à venir)'}>
		<i class:test={testMode}></i>{testMode ? 'TEST' : 'LOCAL'}
	</span>
</header>

<style>
	.hud {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: calc(env(safe-area-inset-top) + 8px) var(--gutter) 8px;
		background: linear-gradient(180deg, rgba(11, 12, 29, 0.96), rgba(11, 12, 29, 0.82));
		border-bottom: 1px solid var(--line);
		backdrop-filter: blur(8px);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.logo {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		font-size: 12px;
		line-height: 1;
		color: var(--bg);
		background: linear-gradient(180deg, var(--gold), var(--red) 70%, var(--pink));
		clip-path: polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%);
		writing-mode: vertical-rl;
		letter-spacing: -0.1em;
	}
	.name {
		font-family: var(--f-display);
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 13px;
	}
	.lvl {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}
	.lv {
		color: var(--amber);
		font-size: 12px;
	}
	.lv b {
		font-size: 17px;
		margin-left: 2px;
		color: var(--ink);
	}
	.bar {
		flex: 1;
		height: 6px;
		background: var(--bg-2);
		border: 1px solid var(--line);
		position: relative;
		overflow: hidden;
	}
	.bar i {
		position: absolute;
		inset: 0 auto 0 0;
		background: repeating-linear-gradient(90deg, var(--amber) 0 5px, transparent 5px 7px);
		transition: width 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.xp {
		font-size: 12px;
		color: var(--ink-2);
	}
	.xp small {
		color: var(--muted);
	}
	.mats {
		display: flex;
		gap: 10px;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.mats li {
		display: flex;
		align-items: center;
		gap: 3px;
		font-size: 13px;
	}
	.sync {
		display: flex;
		align-items: center;
		gap: 5px;
		font-family: var(--f-mono);
		font-size: 10px;
		color: var(--muted);
		letter-spacing: 0.1em;
	}
	.sync i {
		width: 6px;
		height: 6px;
		background: var(--cyan);
		box-shadow: 0 0 6px var(--cyan);
	}
	.sync i.test {
		background: var(--pink);
		box-shadow: 0 0 6px var(--pink);
	}
	@media (min-width: 960px) {
		.lvl {
			flex: 0 0 240px;
		}
		.mats {
			margin-left: auto;
		}
	}
	@media (max-width: 520px) {
		.name,
		.sync,
		.xp {
			display: none;
		}
		.hud {
			gap: 10px;
		}
		.mats {
			gap: 7px;
		}
	}
</style>
