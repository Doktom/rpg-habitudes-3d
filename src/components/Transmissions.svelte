<script lang="ts">
	// Transmissions : proposition de bouclier, alerte réacteur faible.
	import { formatLong } from '../lib/dates';
	import type { TodayView } from '../lib/view';

	interface Props {
		v: TodayView;
		onshield: (date: string) => void;
		ondecline: (date: string) => void;
		onminimum: () => void;
	}
	let { v, onshield, ondecline, onminimum }: Props = $props();
	const names = (list: { habit: { name: string }; streak: number }[]) =>
		list.map((t) => `${t.habit.name} (${t.streak} j)`).join(', ');
</script>

{#if v.proposal || (v.lowMotivation && !v.minimum && !v.rest)}
	<section class="tx" aria-label="Transmissions">
		<div class="panel-head">
			<span class="tag">Transmission</span>
			<span class="jp kana">通信</span>
		</div>
		{#if v.proposal}
			<div class="msg">
				<p>
					Série en danger : <b>{names(v.proposal.threatened)}</b>, raté {formatLong(v.proposal.date)}.
					Un bouclier peut la protéger, c’est toi qui choisis.
				</p>
				<div class="acts">
					{#if v.shields.count > 0}
						<button class="primary" onclick={() => onshield(v.proposal!.date)}>Utiliser un bouclier</button>
					{:else}
						<button class="primary" disabled title="Le chantier arrive bientôt">En fabriquer un</button>
					{/if}
					<button onclick={() => ondecline(v.proposal!.date)}>Laisser filer</button>
				</div>
			</div>
		{/if}
		{#if v.lowMotivation && !v.minimum && !v.rest}
			<div class="msg">
				<p>Réacteur faible : aujourd’hui, le minimum suffit. Il compte comme réussi.</p>
				<div class="acts"><button class="primary" onclick={onminimum}>Passer en mode minimum</button></div>
			</div>
		{/if}
	</section>
{/if}

<style>
	.tx {
		padding: 12px 14px;
		border: 1px solid var(--cyan);
		background: linear-gradient(90deg, rgba(79, 227, 216, 0.1), transparent), var(--panel);
	}
	.tx .tag {
		background: var(--cyan);
	}
	.msg + .msg {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px dashed var(--line-2);
	}
	p {
		margin: 0 0 10px;
		font-size: 14px;
	}
	.acts {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	button {
		min-height: 38px;
		padding: 0 14px;
		font-family: var(--f-display);
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		background: transparent;
		border: 1px solid var(--line-2);
	}
	button.primary {
		background: var(--cyan);
		border-color: var(--cyan);
		color: var(--bg);
		font-weight: 700;
	}
	button:disabled {
		opacity: 0.5;
	}
</style>
