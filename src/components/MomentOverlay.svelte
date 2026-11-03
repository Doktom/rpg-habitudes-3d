<script lang="ts">
	// Moment raconté : plein écran, un à la fois (brief §16).
	import type { StoryMoment } from '../lib/engine/story';

	let { moment, onclose }: { moment: StoryMoment; onclose: () => void } = $props();
	const COLOR: Record<StoryMoment['kind'], string> = {
		streak: 'var(--red)',
		week: 'var(--gold)',
		'habit-weeks': 'var(--cyan)',
		trophy: 'var(--gold)',
		level: 'var(--amber)',
		ship: 'var(--cyan)',
		chapter: 'var(--violet)',
		boss: 'var(--red)',
		campaign: 'var(--gold)'
	};
	let btn = $state<HTMLButtonElement>();
	$effect(() => {
		btn?.focus();
	});
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="moment-title" style:--c={COLOR[moment.kind]}>
	<div class="rays" aria-hidden="true"></div>
	<div class="frame">
		<span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
		<span class="kanji kana" aria-hidden="true">{moment.kanji}</span>
		<p class="kicker mono">{moment.kicker}</p>
		<h2 id="moment-title">{moment.title}</h2>
		<p class="text">{moment.text}</p>
		{#if moment.xp}<p class="xp mono">+{moment.xp} XP</p>{/if}
		<button bind:this={btn} onclick={onclose}>Continuer le voyage</button>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: grid;
		place-items: center;
		padding: 24px var(--gutter);
		background: radial-gradient(circle at 50% 45%, rgba(29, 26, 68, 0.9), rgba(5, 6, 15, 0.97) 70%);
		animation: fade 0.4s ease-out;
		overflow: hidden;
	}
	.rays {
		position: absolute;
		left: 50%;
		top: 42%;
		width: 180vmax;
		height: 180vmax;
		translate: -50% -50%;
		background: repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--c) 22%, transparent) 0deg 6deg, transparent 6deg 18deg);
		mask-image: radial-gradient(circle, #000 0%, transparent 45%);
		animation: spin 40s linear infinite;
	}
	.frame {
		position: relative;
		width: min(440px, 100%);
		padding: 28px 22px 22px;
		text-align: center;
		background: rgba(11, 12, 29, 0.82);
		border: 1px solid color-mix(in srgb, var(--c) 60%, transparent);
		box-shadow: 0 0 60px color-mix(in srgb, var(--c) 25%, transparent);
		animation: rise 0.6s cubic-bezier(0.2, 1.2, 0.3, 1);
	}
	.corner {
		position: absolute;
		width: 16px;
		height: 16px;
		border: 2px solid var(--c);
	}
	.tl {
		top: -2px;
		left: -2px;
		border-right: 0;
		border-bottom: 0;
	}
	.tr {
		top: -2px;
		right: -2px;
		border-left: 0;
		border-bottom: 0;
	}
	.bl {
		bottom: -2px;
		left: -2px;
		border-right: 0;
		border-top: 0;
	}
	.br {
		bottom: -2px;
		right: -2px;
		border-left: 0;
		border-top: 0;
	}
	.kanji {
		display: block;
		font-size: 96px;
		line-height: 1;
		color: transparent;
		-webkit-text-stroke: 2px var(--c);
		text-shadow: 0 0 30px color-mix(in srgb, var(--c) 60%, transparent);
		animation: stamp 0.7s 0.15s cubic-bezier(0.3, 1.6, 0.5, 1) both;
	}
	.kicker {
		margin: 12px 0 4px;
		font-size: 11px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--c);
	}
	h2 {
		margin: 0;
		font-family: var(--f-display);
		font-size: 26px;
		line-height: 1.15;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.text {
		margin: 12px 0 0;
		font-size: 15px;
		color: var(--ink-2);
	}
	.xp {
		margin: 14px 0 0;
		font-size: 28px;
		color: var(--gold);
		text-shadow: 0 0 14px rgba(255, 210, 63, 0.6);
	}
	button {
		margin-top: 20px;
		width: 100%;
		min-height: 46px;
		font-family: var(--f-display);
		font-weight: 700;
		font-size: 14px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--bg);
		background: var(--c);
		border: 0;
		clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(30px) scale(0.94);
		}
	}
	@keyframes stamp {
		from {
			opacity: 0;
			transform: scale(2.2);
		}
	}
	@keyframes spin {
		to {
			rotate: 360deg;
		}
	}
</style>
