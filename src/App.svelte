<script lang="ts">
	// Coquille de l'app : barre du haut, écran courant, navigation, gains, moments racontés.
	import { onMount } from 'svelte';
	import { app } from './lib/app.svelte';
	import { materials, totalXp } from './lib/engine/progress';
	import { canUpgrade, skillPoints } from './lib/engine/ship';
	import { levelFromXp } from './lib/engine/xp';
	import type { ModuleId } from './lib/types';
	import Boot from './components/Boot.svelte';
	import Hud from './components/Hud.svelte';
	import MomentOverlay from './components/MomentOverlay.svelte';
	import Nav from './components/Nav.svelte';
	import Toasts from './components/Toasts.svelte';
	import CampaignsScreen from './components/screens/CampaignsScreen.svelte';
	import PilotScreen from './components/screens/PilotScreen.svelte';
	import ShipScreen from './components/screens/ShipScreen.svelte';
	import TodayScreen from './components/screens/TodayScreen.svelte';

	const hud = $derived.by(() => {
		void app.rev;
		return {
			level: levelFromXp(totalXp(app.data)),
			mats: materials(app.data),
			alert: {
				ship: (['reactor', 'hull', 'thrusters', 'antenna'] as ModuleId[]).some((id) => canUpgrade(app.data, id)),
				pilot: skillPoints(app.data) > 0
			}
		};
	});

	const calm = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	let booting = $state(!calm && !sessionStorageGet('boot'));
	function sessionStorageGet(k: string) {
		try {
			return sessionStorage.getItem('rpg-habitudes-3d:' + k);
		} catch {
			return null;
		}
	}
	function bootDone() {
		booting = false;
		try {
			sessionStorage.setItem('rpg-habitudes-3d:boot', '1');
		} catch {
			/* sans stockage de session : on rejouera le démarrage */
		}
	}

	onMount(() => {
		const check = () => app.refreshDay();
		document.addEventListener('visibilitychange', check);
		const timer = setInterval(check, 60_000);
		return () => {
			document.removeEventListener('visibilitychange', check);
			clearInterval(timer);
		};
	});
</script>

<Hud level={hud.level} mats={hud.mats} testMode={app.testMode} />
<Nav route={app.route} go={(r) => app.go(r)} alert={hud.alert} />

<main>
	{#key app.route}
		<div class="screen">
			{#if app.route === 'ship'}
				<ShipScreen />
			{:else if app.route === 'campaigns'}
				<CampaignsScreen />
			{:else if app.route === 'pilot'}
				<PilotScreen />
			{:else}
				<TodayScreen />
			{/if}
		</div>
	{/key}
</main>

<Toasts toasts={app.toasts} ondone={(id) => app.dropToast(id)} />

{#if app.moment && !booting}
	<MomentOverlay moment={app.moment} onclose={() => app.closeMoment()} />
{/if}
{#if booting}
	<Boot ondone={bootDone} />
{/if}

<div class="vignette" aria-hidden="true"></div>

<style>
	.screen {
		animation: enter 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	@keyframes enter {
		from {
			opacity: 0;
			transform: translateY(10px);
			filter: blur(3px);
		}
	}
	.vignette {
		position: fixed;
		inset: 0;
		z-index: 25;
		pointer-events: none;
		background: radial-gradient(ellipse at 50% 40%, transparent 55%, rgba(0, 0, 0, 0.45) 100%);
	}
</style>
