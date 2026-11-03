<script lang="ts">
	// Écran Campagnes : destinations au long cours. Route 3D, chapitres, quêtes (et boss), tâches liées,
	// création depuis un modèle ou en libre.
	import { Canvas } from '@threlte/core';
	import { app } from '../../lib/app.svelte';
	import { campaignProgress, taskReward } from '../../lib/engine/campaigns';
	import { formatLong } from '../../lib/dates';
	import { TEMPLATES } from '../../lib/templates';
	import type { Campaign, Chapter, Difficulty } from '../../lib/types';
	import Route from '../scene/Route.svelte';

	const calm = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	const dpr = typeof devicePixelRatio !== 'undefined' ? Math.min(devicePixelRatio, 1.75) : 1;

	const list = $derived.by(() => {
		void app.rev;
		const order = { active: 0, paused: 1, done: 2 };
		return app.data.campaigns.map((c) => ({ ...c })).sort((a, b) => order[a.status] - order[b.status]);
	});
	// Copie à chaque révision : le moteur modifie les objets en place, l'interface doit voir le changement.
	const camp = $derived.by(() => {
		void app.rev;
		const c = list.find((x) => x.id === app.campaignId) ?? list[0];
		return c ? structuredClone(c) : null;
	});
	const prog = $derived.by(() => {
		void app.rev;
		return camp ? campaignProgress(camp) : null;
	});
	const domain = $derived(camp ? app.data.domains.find((d) => d.id === camp.domainId) : undefined);
	const kanji = (c: Campaign) => TEMPLATES.find((t) => t.name === c.name)?.kanji ?? '航';

	// Position du vaisseau sur la route : au chapitre en cours, un peu avancé selon ses quêtes faites
	const nodeT = (i: number, n: number) => (i + 0.5) / (n + 0.6);
	const nodes = $derived(
		camp ? camp.chapters.map((ch) => ({ state: (ch.done ? 'done' : ch === prog?.current ? 'current' : 'future') as 'done' | 'current' | 'future' })) : []
	);
	const routeProgress = $derived.by(() => {
		if (!camp || !prog) return 0;
		if (!prog.current) return 0.97;
		const i = camp.chapters.indexOf(prog.current);
		const q = prog.current.quests;
		const part = q.length ? q.filter((x) => x.done).length / q.length : 0;
		return nodeT(i, camp.chapters.length) - 0.045 + part * 0.04;
	});

	// Chapitres dépliés (le chapitre en cours l'est par défaut)
	let open = $state<Record<string, boolean>>({});
	const isOpen = (ch: Chapter) => open[ch.id] ?? ch === prog?.current;
	let openQuest = $state<string | null>(null);

	// Formulaires
	let questName = $state('');
	let questXp = $state(100);
	let questBoss = $state(false);
	let chapterName = $state('');
	let taskTitle = $state('');
	let taskEffort = $state<Difficulty>('medium');
	let sheet = $state(false);
	let freeName = $state('');
	let freeIntent = $state('');
	let freeDomain = $state('projets');

	const tasksOf = (questId: string) => {
		void app.rev;
		return app.data.tasks.filter((t) => t.questId === questId);
	};
	const EFFORT: Record<Difficulty, string> = { easy: 'Facile', medium: 'Moyenne', hard: 'Difficile' };
	const STATUS = { active: 'En route', paused: 'En pause', done: 'Atteinte' };
</script>

{#if camp && prog}
	<section class="route" aria-label="Route de la campagne">
		<div class="canvas">
			<Canvas {dpr} toneMapping={0}>
				<Route {nodes} progress={routeProgress} color={domain?.color ?? '#8b7bff'} finished={camp.status === 'done'} modules={app.data.ship.modules} pulse={app.questPulse} {calm} />
			</Canvas>
		</div>
		<div class="scan" aria-hidden="true"></div>
		{#key camp.id}
			<div class="head">
				<span class="kanji kana" style:--c={domain?.color} aria-hidden="true">{kanji(camp)}</span>
				<div class="ht">
					<span class="mono over">DESTINATION · {(domain?.stat ?? 'Libre').toUpperCase()} · {STATUS[camp.status].toUpperCase()}</span>
					<h1>{camp.name}</h1>
					<p>{camp.intent}</p>
				</div>
			</div>
		{/key}
		<div class="meter">
			<span class="mono pct">{prog.pct}<small>%</small></span>
			<div>
				<div class="pbar"><i style:width="{prog.pct}%"></i></div>
				<span class="mono small">{prog.done}/{prog.total} quêtes{#if camp.target} · arrivée visée {formatLong(camp.target)}{/if}</span>
			</div>
		</div>
	</section>
{/if}

<div class="body">
	<nav class="tabs" aria-label="Campagnes">
		{#each list as c (c.id)}
			<button class:on={c.id === camp?.id} class={c.status} onclick={() => (app.campaignId = c.id)}>
				<span class="kana">{kanji(c)}</span>{c.name}
			</button>
		{/each}
		<button class="new" onclick={() => (sheet = true)}>＋ Nouvelle</button>
	</nav>

	{#if !camp}
		<section class="panel empty">
			<p>Aucune destination sur la carte. Choisis-en une : un modèle pour démarrer vite, ou une campagne libre.</p>
			<button class="cta" onclick={() => (sheet = true)}>Tracer une route</button>
		</section>
	{:else}
		<div class="acts">
			{#if camp.status !== 'done'}
				<button onclick={() => app.pause(camp.id)}>{camp.status === 'paused' ? 'Reprendre la route' : 'Mettre en pause'}</button>
			{/if}
			<button class:gold={camp.status !== 'done' && prog?.pct === 100} onclick={() => app.finishCampaign(camp.id)}>
				{camp.status === 'done' ? 'Rouvrir la campagne' : 'Destination atteinte'}
			</button>
		</div>
		{#if camp.status === 'paused'}<p class="note">En pause : l’Inspiration ne baisse pas pour elle.</p>{/if}

		<ol class="chapters">
			{#each camp.chapters as ch, i (ch.id)}
				{@const state = ch.done ? 'done' : ch === prog?.current ? 'current' : 'future'}
				{@const qd = ch.quests.filter((q) => q.done).length}
				<li class="chapter {state}">
					<button class="ch" onclick={() => (open[ch.id] = !isOpen(ch))} aria-expanded={isOpen(ch)}>
						<span class="num mono">{String(i + 1).padStart(2, '0')}</span>
						<span class="cn">
							<b>{ch.name}</b>
							<span class="mono small">{state === 'done' ? `Cap franchi · ${formatLong(ch.done!)}` : state === 'current' ? 'Cap en cours' : 'À venir'} · {qd}/{ch.quests.length}</span>
						</span>
						<span class="chev" class:open={isOpen(ch)}>›</span>
					</button>
					{#if isOpen(ch)}
						<ul class="quests">
							{#each ch.quests as q (q.id)}
								{@const tasks = tasksOf(q.id)}
								<li class="quest" class:done={q.done} class:boss={q.boss}>
									<div class="qrow">
										<button class="check" onclick={() => app.quest(q.id)} aria-pressed={!!q.done} aria-label="{q.done ? 'Décocher' : 'Cocher'} {q.name}" disabled={camp.status === 'done'}>
											<svg viewBox="0 0 40 40" aria-hidden="true"><polygon points="11,2 29,2 38,20 29,38 11,38 2,20" /></svg>
											<span class="ci">{#if q.done}✓{:else if q.boss}<span class="kana">鬼</span>{/if}</span>
										</button>
										<button class="qn" onclick={() => (openQuest = openQuest === q.id ? null : q.id)}>
											{#if q.boss}<span class="bt mono">BOSS</span>{/if}
											<span>{q.name}</span>
											{#if tasks.length}<span class="mono tc">{tasks.filter((t) => t.done).length}/{tasks.length} colis</span>{/if}
										</button>
										<span class="mono xp">+{q.xp}</span>
									</div>
									{#if openQuest === q.id}
										<div class="tasks">
											{#each tasks as t (t.id)}
												<label class="task" class:done={t.done}>
													<input type="checkbox" checked={!!t.done} onchange={() => app.task(t.id)} />
													<span>{t.title}</span>
													<span class="mono small">+{taskReward(app.data, t, app.today).xp} XP</span>
												</label>
											{/each}
											<form
												class="add"
												onsubmit={(e) => {
													e.preventDefault();
													app.addTask(taskTitle, q.id, taskEffort);
													taskTitle = '';
												}}
											>
												<input bind:value={taskTitle} placeholder="Une tâche pour avancer…" aria-label="Nouvelle tâche liée" />
												<select bind:value={taskEffort} aria-label="Effort">
													{#each Object.entries(EFFORT) as [k, l] (k)}<option value={k}>{l}</option>{/each}
												</select>
												<button disabled={!taskTitle.trim()}>＋</button>
											</form>
										</div>
									{/if}
								</li>
							{/each}
							{#if ch.quests.length === 0}<li class="small pad">Pas encore de quête dans ce chapitre.</li>{/if}
						</ul>
						{#if camp.status !== 'done'}
							<form
								class="add quest-add"
								onsubmit={(e) => {
									e.preventDefault();
									app.addQuest(ch.id, questName, questXp, questBoss);
									questName = '';
									questBoss = false;
									questXp = 100;
								}}
							>
								<input bind:value={questName} placeholder="Nouvelle quête…" aria-label="Nouvelle quête" />
								<input type="number" min="10" step="10" bind:value={questXp} aria-label="XP de la quête" class="num-in" />
								<label class="bossck"><input type="checkbox" bind:checked={questBoss} />Boss</label>
								<button disabled={!questName.trim()}>＋</button>
							</form>
						{/if}
					{/if}
				</li>
			{/each}
		</ol>

		{#if camp.status !== 'done'}
			<form
				class="add chapter-add"
				onsubmit={(e) => {
					e.preventDefault();
					app.addChapter(camp.id, chapterName);
					chapterName = '';
				}}
			>
				<input bind:value={chapterName} placeholder="Ajouter un chapitre…" aria-label="Nouveau chapitre" />
				<button disabled={!chapterName.trim()}>＋ Chapitre</button>
			</form>
		{/if}
	{/if}
</div>

{#if sheet}
	<div class="sheet-bg" role="presentation" onclick={(e) => e.target === e.currentTarget && (sheet = false)}>
		<div class="sheet panel" role="dialog" aria-modal="true" aria-label="Nouvelle campagne">
			<div class="panel-head"><span class="tag">Nouvelle route</span><span class="jp kana">航路</span><button class="close" onclick={() => (sheet = false)} aria-label="Fermer">✕</button></div>
			<p class="small">Une destination au long cours : des chapitres, des quêtes, quelques boss. Choisis un modèle ou trace la tienne.</p>
			<ul class="tpl">
				{#each TEMPLATES as t (t.id)}
					<li>
						<button
							onclick={() => {
								app.newCampaign(t);
								sheet = false;
							}}
						>
							<span class="tk kana">{t.kanji}</span>
							<span class="tt">
								<b>{t.name}</b>
								<span class="small">{t.intent}</span>
								<span class="mono meta">{t.stat.toUpperCase()} · {t.weeks} SEM. · {t.chapters.length} CHAPITRES · {t.chapters.flatMap((c) => c.quests).filter((q) => q.boss).length} BOSS</span>
							</span>
						</button>
					</li>
				{/each}
			</ul>
			<form
				class="free"
				onsubmit={(e) => {
					e.preventDefault();
					app.newCampaign({ name: freeName.trim(), intent: freeIntent.trim(), domainId: freeDomain });
					sheet = false;
					freeName = freeIntent = '';
				}}
			>
				<span class="mono over">CAMPAGNE LIBRE</span>
				<input bind:value={freeName} placeholder="Nom de la destination" aria-label="Nom" />
				<input bind:value={freeIntent} placeholder="Intention : pourquoi j’y vais" aria-label="Intention" />
				<select bind:value={freeDomain} aria-label="Stat">
					{#each app.data.domains.filter((d) => !d.parentId) as d (d.id)}<option value={d.id}>{d.stat} · {d.name}</option>{/each}
				</select>
				<button class="cta" disabled={!freeName.trim()}>Tracer la route</button>
			</form>
		</div>
	</div>
{/if}

<style>
	.route {
		position: relative;
		height: clamp(330px, 50dvh, 540px);
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
	.head {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		padding: 12px var(--gutter) 28px;
		background: linear-gradient(180deg, rgba(11, 12, 29, 0.85) 40%, transparent);
		display: flex;
		gap: 10px;
		pointer-events: none;
		animation: slide 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.kanji {
		font-size: 50px;
		line-height: 1;
		color: transparent;
		-webkit-text-stroke: 1.5px var(--c, var(--violet));
		text-shadow: 0 0 18px color-mix(in srgb, var(--c, var(--violet)) 40%, transparent);
	}
	.ht {
		min-width: 0;
	}
	.over {
		font-size: 10px;
		letter-spacing: 0.18em;
		color: var(--cyan);
	}
	h1 {
		margin: 0;
		font-family: var(--f-display);
		font-size: 24px;
		line-height: 1.05;
		text-transform: uppercase;
	}
	.ht p {
		margin: 4px 0 0;
		max-width: 36ch;
		font-size: 12.5px;
		color: var(--ink-2);
	}
	.meter {
		position: absolute;
		left: var(--gutter);
		right: var(--gutter);
		bottom: 12px;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 12px;
		background: rgba(11, 12, 29, 0.75);
		border: 1px solid var(--line);
	}
	.pct {
		font-size: 28px;
		line-height: 1;
		color: var(--amber);
	}
	.pct small {
		font-size: 13px;
	}
	.meter > div {
		flex: 1;
	}
	.pbar {
		height: 6px;
		background: var(--bg-2);
		border: 1px solid var(--line);
		margin-bottom: 4px;
	}
	.pbar i {
		display: block;
		height: 100%;
		background: repeating-linear-gradient(90deg, var(--amber) 0 5px, transparent 5px 7px);
		transition: width 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.small {
		font-size: 12px;
		color: var(--muted);
	}
	.body {
		display: grid;
		gap: 12px;
		padding: 14px var(--gutter) 120px;
		max-width: 760px;
		margin: 0 auto;
	}
	.tabs {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		scrollbar-width: none;
		margin: 0 calc(-1 * var(--gutter));
		padding: 0 var(--gutter) 2px;
	}
	.tabs button {
		flex: none;
		display: flex;
		align-items: center;
		gap: 6px;
		max-width: 230px;
		min-height: 36px;
		padding: 0 12px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 13px;
		background: var(--panel);
		border: 1px solid var(--line);
	}
	.tabs button.on {
		border-color: var(--amber);
		color: var(--amber);
		background: rgba(255, 181, 71, 0.1);
	}
	.tabs button.paused {
		opacity: 0.7;
	}
	.tabs button.done .kana {
		color: var(--gold);
	}
	.tabs .new {
		color: var(--cyan);
		border-style: dashed;
		border-color: var(--cyan);
	}
	.acts {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.acts button,
	.add button,
	.cta {
		min-height: 38px;
		padding: 0 14px;
		font-family: var(--f-display);
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		background: transparent;
		border: 1px solid var(--line-2);
	}
	.acts button.gold,
	.cta {
		color: var(--bg);
		background: var(--gold);
		border-color: var(--gold);
		font-weight: 700;
	}
	.note {
		margin: 0;
		font-size: 13px;
		color: var(--cyan);
	}
	.empty p {
		margin: 0 0 12px;
	}
	.chapters {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}
	.chapter {
		background: var(--panel);
		border: 1px solid var(--line);
		border-left: 3px solid var(--line-2);
	}
	.chapter.current {
		border-left-color: var(--red);
	}
	.chapter.done {
		border-left-color: var(--amber);
	}
	.ch {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		background: transparent;
		border: 0;
		text-align: left;
	}
	.num {
		font-size: 22px;
		color: var(--muted);
	}
	.current .num {
		color: var(--red);
	}
	.done .num {
		color: var(--amber);
	}
	.cn {
		flex: 1;
		display: grid;
	}
	.cn b {
		font-size: 15px;
	}
	.chev {
		font-size: 20px;
		color: var(--muted);
		transition: rotate 0.2s;
	}
	.chev.open {
		rotate: 90deg;
	}
	.quests {
		list-style: none;
		margin: 0;
		padding: 0 12px 4px;
		display: grid;
		gap: 6px;
	}
	.pad {
		padding: 4px 0 8px;
	}
	.quest {
		background: var(--panel-2);
		border: 1px solid var(--line);
	}
	.quest.boss {
		border-color: rgba(255, 75, 62, 0.5);
		background: linear-gradient(90deg, rgba(255, 75, 62, 0.12), transparent 70%), var(--panel-2);
	}
	.quest.done {
		opacity: 0.75;
	}
	.qrow {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 10px 6px 6px;
	}
	.check {
		width: 38px;
		height: 38px;
		flex: none;
		display: grid;
		place-items: center;
		position: relative;
		font-size: 18px;
		font-weight: 700;
		background: transparent;
		border: 0;
		padding: 0;
		color: var(--red);
		transition: transform 0.1s;
	}
	.check svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.check polygon {
		fill: rgba(11, 12, 29, 0.6);
		stroke: var(--line-2);
		stroke-width: 2;
		transition: fill 0.2s, stroke 0.2s;
	}
	.boss .check polygon {
		stroke: var(--red);
	}
	.ci {
		position: relative;
	}
	.check:active:not(:disabled) {
		transform: scale(0.9);
	}
	.done .check {
		color: var(--bg);
	}
	.done .check polygon {
		fill: var(--amber);
		stroke: var(--amber);
	}
	.boss.done .check polygon {
		fill: var(--red);
		stroke: var(--red);
	}
	.qn {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 8px;
		padding: 4px 0;
		text-align: left;
		background: transparent;
		border: 0;
		font-size: 14px;
	}
	.done .qn span:not(.bt):not(.tc) {
		text-decoration: line-through;
		text-decoration-color: var(--amber);
	}
	.bt {
		font-size: 10px;
		letter-spacing: 0.14em;
		color: var(--bg);
		background: var(--red);
		padding: 0 5px;
	}
	.tc {
		font-size: 11px;
		color: var(--cyan);
	}
	.xp {
		font-size: 14px;
		color: var(--gold);
	}
	.tasks {
		padding: 4px 10px 10px 54px;
		display: grid;
		gap: 6px;
	}
	.task {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13.5px;
	}
	.task.done span:first-of-type {
		text-decoration: line-through;
		color: var(--muted);
	}
	.task input {
		accent-color: var(--amber);
		width: 18px;
		height: 18px;
	}
	.add {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.add input:not([type='checkbox']),
	.add select,
	.free input,
	.free select {
		flex: 1 1 140px;
		min-width: 0;
		min-height: 36px;
		padding: 0 10px;
		font: inherit;
		font-size: 14px;
		color: var(--ink);
		background: var(--bg-2);
		border: 1px solid var(--line);
	}
	.add select {
		flex: 0 1 110px;
	}
	.num-in {
		flex: 0 0 76px !important;
	}
	.bossck {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		color: var(--red);
	}
	.quest-add {
		padding: 6px 12px 12px;
	}
	.chapter-add input {
		flex: 1;
	}
	.add button:disabled,
	.cta:disabled {
		opacity: 0.4;
	}
	.sheet-bg {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: grid;
		align-items: end;
		justify-items: center;
		background: rgba(5, 6, 15, 0.75);
		backdrop-filter: blur(4px);
		animation: fade 0.25s;
	}
	.sheet {
		width: min(640px, 100%);
		max-height: 88dvh;
		overflow: auto;
		animation: up 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.close {
		margin-left: auto;
		background: transparent;
		border: 0;
		font-size: 18px;
		color: var(--muted);
	}
	.tpl {
		list-style: none;
		margin: 12px 0;
		padding: 0;
		display: grid;
		gap: 6px;
	}
	.tpl button {
		width: 100%;
		display: flex;
		gap: 12px;
		padding: 10px;
		text-align: left;
		background: var(--panel-2);
		border: 1px solid var(--line);
	}
	.tpl button:hover {
		border-color: var(--amber);
	}
	.tk {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		flex: none;
		font-size: 22px;
		color: var(--amber);
		border: 1px solid var(--amber);
	}
	.tt {
		display: grid;
		gap: 2px;
	}
	.meta {
		font-size: 10px;
		letter-spacing: 0.1em;
		color: var(--cyan);
	}
	.free {
		display: grid;
		gap: 8px;
		padding-top: 12px;
		border-top: 1px dashed var(--line-2);
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	@keyframes up {
		from {
			transform: translateY(40px);
			opacity: 0;
		}
	}
	@keyframes slide {
		from {
			opacity: 0;
			transform: translateX(-14px);
		}
	}
	@media (min-width: 960px) {
		.route {
			height: 52dvh;
		}
		.sheet-bg {
			align-items: center;
		}
	}
</style>
