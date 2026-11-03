<script lang="ts">
	// Notifications de gain : le gain s'annonce au moment où il arrive. Les exploits (journée
	// complète, palier de série, semaine pleine) reçoivent un tampon.
	import type { GainToast } from '../lib/app.svelte';
	import type { Material } from '../lib/types';
	import MatIcon from './MatIcon.svelte';

	let { toasts, ondone }: { toasts: GainToast[]; ondone: (id: number) => void } = $props();

	function auto(node: HTMLElement, t: GainToast) {
		const timer = setTimeout(() => ondone(t.id), t.extras.length ? 3600 : 2400);
		return { destroy: () => clearTimeout(timer) };
	}
	const stamp = (t: GainToast) => (t.extras.some((e) => e.startsWith('Journée parfaite')) ? '極' : t.extras.some((e) => e.startsWith('Journée')) ? '完' : '進');
</script>

<div class="toasts" aria-live="polite">
	{#each toasts.slice(-3) as t (t.id)}
		<div class="toast" class:big={t.extras.length > 0} use:auto={t}>
			<div class="top">
				<span class="lbl mono">{t.kicker ?? '獲得 · GAIN'}</span>
				<span class="title">{t.title}</span>
			</div>
			<div class="row">
				{#if t.xp}<span class="xp mono">+{t.xp}<small>XP</small></span>{/if}
				{#each Object.entries(t.loot) as [m, n], i (m)}
					{#if n}
						<span class="loot mono" style:animation-delay="{0.15 + i * 0.1}s"><MatIcon m={m as Material} size={16} />{n > 0 ? '+' : ''}{n}</span>
					{/if}
				{/each}
			</div>
			{#if t.extras.length}
				<ul class="extras">
					{#each t.extras as e (e)}<li>{e}</li>{/each}
				</ul>
				<span class="stamp kana" aria-hidden="true">{stamp(t)}</span>
			{/if}
		</div>
	{/each}
</div>

<style>
	@media (min-width: 960px) {
		.toasts {
			bottom: 20px !important;
		}
	}
	.toasts {
		position: fixed;
		z-index: 50;
		left: 50%;
		bottom: calc(env(safe-area-inset-bottom) + 78px);
		translate: -50% 0;
		width: min(420px, calc(100vw - 32px));
		display: grid;
		gap: 8px;
		pointer-events: none;
	}
	.toast {
		position: relative;
		padding: 10px 14px 12px;
		background: rgba(11, 12, 29, 0.94);
		border: 1px solid var(--amber);
		box-shadow: 0 0 0 1px rgba(255, 181, 71, 0.2), 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 181, 71, 0.15);
		clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px));
		animation: pop 0.45s cubic-bezier(0.2, 1.4, 0.4, 1) both;
		overflow: hidden;
	}
	.toast::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 4px;
		background: repeating-linear-gradient(-45deg, var(--amber) 0 4px, transparent 4px 8px);
	}
	.toast.big {
		border-color: var(--gold);
	}
	.top {
		display: flex;
		gap: 10px;
		align-items: baseline;
	}
	.lbl {
		font-size: 10px;
		letter-spacing: 0.2em;
		color: var(--amber);
	}
	.title {
		font-weight: 700;
		font-size: 14px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.row {
		display: flex;
		align-items: baseline;
		gap: 12px;
		margin-top: 2px;
	}
	.xp {
		font-size: 30px;
		line-height: 1;
		color: var(--gold);
		text-shadow: 0 0 14px rgba(255, 210, 63, 0.6);
	}
	.xp small {
		font-size: 13px;
		margin-left: 3px;
		color: var(--amber);
	}
	.loot {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 16px;
		animation: drop 0.4s cubic-bezier(0.2, 1.4, 0.4, 1) both;
	}
	.extras {
		list-style: none;
		margin: 8px 0 0;
		padding: 6px 0 0;
		border-top: 1px dashed var(--line-2);
		display: grid;
		gap: 2px;
		padding-right: 56px;
	}
	.extras li {
		font-family: var(--f-display);
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--gold);
	}
	.extras li::before {
		content: '◆ ';
		color: var(--red);
	}
	.stamp {
		position: absolute;
		right: 14px;
		bottom: 10px;
		width: 48px;
		height: 48px;
		display: grid;
		place-items: center;
		font-size: 26px;
		color: var(--red);
		border: 3px solid var(--red);
		border-radius: 50%;
		rotate: -12deg;
		opacity: 0.9;
		animation: stamp 0.5s 0.35s cubic-bezier(0.3, 1.6, 0.5, 1) both;
	}
	@keyframes pop {
		from {
			opacity: 0;
			transform: translateY(20px) scale(0.9);
		}
	}
	@keyframes drop {
		from {
			opacity: 0;
			transform: translateY(-10px) scale(1.4);
		}
	}
	@keyframes stamp {
		from {
			opacity: 0;
			transform: scale(2.4);
		}
	}
</style>
