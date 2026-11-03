<script lang="ts">
	// Écran Aujourd'hui : orbite 3D en tête, poste de pilotage et missions du jour.
	import { app } from '../../lib/app.svelte';
	import { todayView } from '../../lib/view';
	import Cockpit from '../Cockpit.svelte';
	import Missions from '../Missions.svelte';
	import Orbit from '../Orbit.svelte';
	import Transmissions from '../Transmissions.svelte';

	const v = $derived.by(() => {
		void app.rev;
		return todayView(app.data, app.selected, app.today);
	});
	const future = $derived(app.selected > app.today);
</script>

<div class="layout">
	<div class="stage">
		<Orbit orbit={v.orbit} selected={app.selected} today={app.today} pulse={app.pulse} modules={app.data.ship.modules} onselect={(d) => app.select(d)} />
	</div>
	<div class="side">
		{#if app.source === 'import-v3'}
			<p class="note">Données de la V3 importées (lecture seule) : tes habitudes et ta progression t’ont suivi.</p>
		{/if}
		<Cockpit {v} {future} ontoggleMinimum={() => app.toggleMinimum()} ontoggleRest={() => app.toggleRest()} />
		<Transmissions {v} onshield={(d) => app.shield(d)} ondecline={(d) => app.declineShield(d)} onminimum={() => app.toggleMinimum()} />
		{#if future}
			<p class="note">Ce secteur est encore devant toi : on valide le jour venu.</p>
		{/if}
		<Missions groups={v.groups} minimum={v.minimum} locked={future || v.rest} onvalidate={(id, t, s) => app.setTier(id, t, s)?.xp ?? null} />
		<footer class="foot mono">LE SILLAGE · 3D · PROTOTYPE 0.2 — ORBITE {app.today}</footer>
	</div>
</div>

<style>
	.side {
		display: grid;
		gap: 14px;
		padding: 14px var(--gutter) 120px;
		max-width: 680px;
		margin: 0 auto;
	}
	.note {
		margin: 0;
		padding: 8px 12px;
		font-size: 13px;
		color: var(--cyan);
		border: 1px dashed var(--cyan);
	}
	.foot {
		font-size: 10px;
		letter-spacing: 0.18em;
		color: var(--muted);
		text-align: center;
		margin-top: 10px;
	}
	@media (min-width: 960px) {
		.layout {
			display: grid;
			grid-template-columns: minmax(0, 1.25fr) minmax(420px, 1fr);
			align-items: start;
		}
		.stage {
			position: sticky;
			top: 49px;
			height: calc(100dvh - 49px);
		}
		.side {
			padding-top: 18px;
			max-width: none;
			margin: 0;
		}
	}
</style>
