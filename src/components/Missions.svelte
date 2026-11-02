<script lang="ts">
	// Missions du jour par moment, chacun replié automatiquement quand tout est fait.
	import type { Tier } from '../lib/types';
	import type { MomentGroup } from '../lib/view';
	import HabitCard from './HabitCard.svelte';

	interface Props {
		groups: MomentGroup[];
		minimum: boolean;
		locked: boolean;
		onvalidate: (habitId: string, tier: Tier, session?: string) => number | null;
	}
	let { groups, minimum, locked, onvalidate }: Props = $props();

	// Choix manuel d'ouverture ; sinon, replié quand tout est fait.
	let manual = $state<Record<string, boolean>>({});
	const isOpen = (g: MomentGroup) => manual[g.moment] ?? g.done < g.rows.length;
</script>

<section class="missions" aria-label="Missions du jour">
	<div class="panel-head head">
		<span class="tag">Missions</span>
		<span class="jp kana">任務</span>
	</div>
	{#if groups.length === 0}
		<p class="empty">Aucune routine prévue dans ce secteur.</p>
	{/if}
	{#each groups as g (g.moment)}
		{@const open = isOpen(g)}
		<div class="group" class:complete={g.done === g.rows.length}>
			<button class="gh" onclick={() => (manual[g.moment] = !open)} aria-expanded={open}>
				<span class="mk kana">{g.kana}</span>
				<span class="gt">
					<span class="gn">{g.name}</span>
					<span class="gs">{g.title}</span>
				</span>
				<span class="gp mono">{g.done}/{g.rows.length}</span>
				<span class="chev" class:open>›</span>
			</button>
			<div class="bar"><i style:width="{(g.done / g.rows.length) * 100}%"></i></div>
			{#if open}
				<div class="cards">
					{#each g.rows as row (row.habit.id)}
						<HabitCard {row} {minimum} {locked} onvalidate={(t, s) => onvalidate(row.habit.id, t, s)} />
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</section>

<style>
	.missions {
		display: grid;
		gap: 12px;
	}
	.head {
		margin: 4px 0 -2px;
	}
	.empty {
		color: var(--muted);
		margin: 0;
	}
	.group {
		background: var(--panel);
		border: 1px solid var(--line);
		clip-path: polygon(0 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% 100%, 0 100%);
	}
	.gh {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px 10px;
		background: transparent;
		border: 0;
		text-align: left;
	}
	.mk {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		font-size: 18px;
		color: var(--bg);
		background: var(--amber);
		clip-path: polygon(0 0, 100% 0, 100% 75%, 75% 100%, 0 100%);
	}
	.complete .mk {
		background: var(--cyan);
	}
	.gt {
		flex: 1;
		display: grid;
	}
	.gn {
		font-family: var(--f-display);
		font-weight: 700;
		font-size: 16px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.gs {
		font-size: 12px;
		color: var(--muted);
	}
	.gp {
		font-size: 16px;
	}
	.chev {
		font-size: 20px;
		color: var(--muted);
		transition: rotate 0.2s;
	}
	.chev.open {
		rotate: 90deg;
	}
	.bar {
		height: 2px;
		margin: 0 14px;
		background: var(--line);
	}
	.bar i {
		display: block;
		height: 100%;
		background: var(--amber);
		box-shadow: 0 0 6px var(--amber);
		transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.complete .bar i {
		background: var(--cyan);
		box-shadow: 0 0 6px var(--cyan);
	}
	.cards {
		display: grid;
		gap: 8px;
		padding: 12px;
	}
</style>
