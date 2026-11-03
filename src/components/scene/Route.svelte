<script lang="ts">
	// Route d'une campagne : les chapitres sont des balises le long d'une trajectoire, la destination
	// une planète au bout ; le Sillage se tient au cap en cours et avance quand on coche.
	import { T, useTask, useThrelte } from '@threlte/core';
	import { untrack } from 'svelte';
	import * as THREE from 'three';
	import type { ModuleId } from '../../lib/types';
	import Backdrop from './Backdrop.svelte';
	import ShipModel from './ShipModel.svelte';

	interface Props {
		nodes: { state: 'done' | 'current' | 'future' }[];
		/** avancement global 0..1 (chapitre en cours + part de ses quêtes) */
		progress: number;
		color: string;
		finished: boolean;
		modules: Partial<Record<ModuleId, number>>;
		pulse: { at: number; strong: boolean } | null;
		calm: boolean;
	}
	let { nodes, progress, color, finished, modules, pulse, calm }: Props = $props();

	const { size, camera } = useThrelte();
	const curve = new THREE.CatmullRomCurve3(
		[[0, 0, 5], [1.6, 0, 2.4], [-1.2, 0, -0.6], [1.4, 0, -3.6], [-0.6, 0, -6.6], [0, 0, -9]].map(([x, y, z]) => new THREE.Vector3(x, y, z))
	);
	const at = (t: number) => curve.getPointAt(Math.min(1, Math.max(0, t)));

	// Trajectoire en pointillés : allumée jusqu'au vaisseau
	const DOTS = 140;
	const dotGeo = new THREE.BufferGeometry();
	dotGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(curve.getSpacedPoints(DOTS - 1).flatMap((p) => [p.x, p.y, p.z])), 3));
	const colors = new Float32Array(DOTS * 3);
	dotGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
	const dotMat = new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.95, sizeAttenuation: true });

	let time = $state(0);
	let shipT = $state(untrack(() => progress));
	let pulseT = $state(99);

	$effect(() => {
		const { width, height } = $size;
		const cam = camera.current as THREE.PerspectiveCamera;
		if (!width || !height) return;
		const aspect = width / height;
		const k = aspect < 1 ? 1.35 / Math.max(aspect, 0.6) : 1;
		cam.position.set(0, 7.5 * k, 9 * k);
		cam.lookAt(0, 0, aspect < 1 ? -5 : -2.6);
	});

	useTask((delta) => {
		time += delta * (calm ? 0.2 : 1);
		shipT += (progress - shipT) * Math.min(1, delta * (calm ? 10 : 1.6));
		pulseT = pulse ? (performance.now() - pulse.at) / 1000 : 99;
		const lit = new THREE.Color('#ffb547');
		const dim = new THREE.Color('#3a3f6e');
		for (let i = 0; i < DOTS; i++) {
			const t = i / (DOTS - 1);
			const c = t <= shipT ? lit : dim;
			const flick = t <= shipT ? 0.75 + 0.25 * Math.sin(time * 4 - t * 40) : 1;
			colors.set([c.r * flick, c.g * flick, c.b * flick], i * 3);
		}
		dotGeo.attributes.color.needsUpdate = true;
	});

	const nodeT = (i: number) => (i + 0.5) / (nodes.length + 0.6);
	const shipPos = $derived(at(Math.min(shipT, 0.985)));
	const ahead = $derived(at(Math.min(shipT + 0.02, 1)));
	const heading = $derived(Math.atan2(ahead.x - shipPos.x, ahead.z - shipPos.z));
	const dest = at(1);
	const STATE = { done: '#ffb547', current: '#ff4b3e', future: '#4a5090' };
</script>

<T.PerspectiveCamera makeDefault fov={40} near={0.1} far={140} />
<T.AmbientLight intensity={0.55} />
<T.DirectionalLight position={[3, 6, 4]} intensity={1.6} />

<Backdrop {time} />
<T.Points geometry={dotGeo} material={dotMat} />

<!-- Balises des chapitres -->
{#each nodes as n, i (i)}
	{@const p = at(nodeT(i))}
	<T.Group position={[p.x, 0, p.z]}>
		<T.Mesh rotation.y={time * 0.7 + i} scale={n.state === 'current' ? 1.25 + Math.sin(time * 3) * 0.1 : 1} position.y={0.35}>
			<T.OctahedronGeometry args={[0.24, 0]} />
			<T.MeshStandardMaterial color={STATE[n.state]} emissive={STATE[n.state]} emissiveIntensity={n.state === 'future' ? 0.15 : 0.9} flatShading wireframe={n.state === 'future'} />
		</T.Mesh>
		<T.Mesh rotation.x={-Math.PI / 2} position.y={0.01}>
			<T.RingGeometry args={[0.36, 0.42, 6]} />
			<T.MeshBasicMaterial color={STATE[n.state]} transparent opacity={n.state === 'future' ? 0.3 : 0.8} side={THREE.DoubleSide} />
		</T.Mesh>
		{#if n.state === 'current' && pulse && pulseT < 1.4}
			<T.Mesh rotation.x={-Math.PI / 2} position.y={0.02} scale={0.5 + pulseT * (pulse.strong ? 3 : 1.8)}>
				<T.RingGeometry args={[0.8, 0.9, 40]} />
				<T.MeshBasicMaterial color="#ffd23f" transparent opacity={Math.max(0, 1 - pulseT / 1.4)} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
			</T.Mesh>
		{/if}
	</T.Group>
{/each}

<!-- Destination -->
<T.Group position={[dest.x, 0.9, dest.z]}>
	<T.Mesh rotation.y={time * 0.2}>
		<T.IcosahedronGeometry args={[1.25, 2]} />
		<T.MeshStandardMaterial {color} emissive={color} emissiveIntensity={finished ? 0.8 : 0.25} flatShading roughness={0.6} />
	</T.Mesh>
	<T.Mesh rotation.x={-1.2} rotation.z={time * 0.1}>
		<T.RingGeometry args={[1.6, 1.68, 64]} />
		<T.MeshBasicMaterial {color} transparent opacity={0.6} side={THREE.DoubleSide} />
	</T.Mesh>
	<T.Mesh scale={1.35}>
		<T.SphereGeometry args={[1.25, 24, 16]} />
		<T.MeshBasicMaterial {color} transparent opacity={finished ? 0.25 : 0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
	</T.Mesh>
</T.Group>

<!-- Le Sillage -->
<T.Group position={[shipPos.x, 0.45 + Math.sin(time * 2) * 0.05, shipPos.z]} rotation.y={heading}>
	<T.Group scale={0.42}>
		<ShipModel {modules} {time} boost={pulseT < 1.2} />
	</T.Group>
</T.Group>
