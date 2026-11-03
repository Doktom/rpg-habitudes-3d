<script lang="ts">
	// Le Sillage, nez vers +z. Son apparence suit les modules : épave au départ, puis blindage,
	// réacteur plus vif, propulseurs latéraux et antenne au fil des améliorations.
	import { T } from '@threlte/core';
	import * as THREE from 'three';
	import type { ModuleId } from '../../lib/types';

	interface Props {
		modules: Partial<Record<ModuleId, number>>;
		time: number;
		boost?: boolean;
		/** 0 à 1 : éclat d'une amélioration qui vient d'être montée */
		glow?: number;
	}
	let { modules, time, boost = false, glow = 0 }: Props = $props();

	const lv = (id: ModuleId) => modules[id] ?? 0;
	const reactor = $derived(lv('reactor'));
	const hull = $derived(lv('hull'));
	const thrusters = $derived(lv('thrusters'));
	const antenna = $derived(lv('antenna'));
	const wreck = $derived(reactor + hull + thrusters + antenna === 0);

	const hullMat = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.5, metalness: 0.25 });
	const plateMat = new THREE.MeshStandardMaterial({ color: '#ff4b3e', flatShading: true, roughness: 0.55, metalness: 0.3 });
	const darkMat = new THREE.MeshStandardMaterial({ color: '#232850', flatShading: true, roughness: 0.7 });
	const glassMat = new THREE.MeshStandardMaterial({ color: '#4fe3d8', emissive: '#4fe3d8', flatShading: true });
	const goldMat = new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffb547', emissiveIntensity: 0.4, flatShading: true, metalness: 0.6, roughness: 0.3 });

	$effect(() => {
		hullMat.color.set(wreck ? '#8d8476' : '#f4ecd8');
		hullMat.emissive.set('#ffd23f');
		hullMat.emissiveIntensity = glow * 0.8;
		plateMat.color.set(wreck ? '#7a3a32' : '#ff4b3e');
		glassMat.emissiveIntensity = wreck ? 0.15 + (Math.sin(time * 9) > 0.6 ? 0.5 : 0) : 0.7;
	});

	const flame = $derived((boost ? 1.7 : 1) * (wreck ? 0.45 : 0.9 + reactor * 0.18) * (0.88 + Math.sin(time * 31) * 0.12));
	const flameColor = $derived(reactor >= 4 ? '#7ff6ff' : reactor >= 2 ? '#ffe27a' : '#ffb547');
	const spark = $derived(wreck && Math.sin(time * 7.3) * Math.sin(time * 3.1) > 0.55);
	const plates = $derived(Array.from({ length: hull }, (_, i) => i));
</script>

<T.Group>
	<!-- Fuselage -->
	<T.Mesh material={hullMat} rotation.x={Math.PI / 2}>
		<T.ConeGeometry args={[0.32, 1.5, 6]} />
	</T.Mesh>
	<T.Mesh material={darkMat} position.z={-0.78} rotation.x={Math.PI / 2}>
		<T.CylinderGeometry args={[0.22, 0.28, 0.25, 6]} />
	</T.Mesh>
	<!-- Verrière (clignote sur l'épave) -->
	<T.Mesh material={glassMat} position={[0, 0.17, 0.15]} scale={[0.7, 0.5, 1.2]}>
		<T.OctahedronGeometry args={[0.18, 0]} />
	</T.Mesh>
	<!-- Ailes : l'une pend tant que le vaisseau est une épave -->
	<T.Mesh material={plateMat} position={[0.5, -0.04, -0.35]} rotation.y={-0.5} rotation.z={wreck ? -0.35 : 0}>
		<T.BoxGeometry args={[0.75, 0.05, 0.38]} />
	</T.Mesh>
	<T.Mesh material={plateMat} position={[-0.5, -0.04, -0.35]} rotation.y={0.5}>
		<T.BoxGeometry args={[0.75, 0.05, 0.38]} />
	</T.Mesh>
	<T.Mesh material={hullMat} position={[0, 0.3, -0.55]} rotation.x={-0.4}>
		<T.BoxGeometry args={[0.05, 0.4, 0.35]} />
	</T.Mesh>

	<!-- Coque renforcée : une plaque de blindage par niveau -->
	{#each plates as i (i)}
		{@const side = i % 2 === 0 ? 1 : -1}
		{@const row = Math.floor(i / 2)}
		<T.Mesh material={goldMat} position={[side * (0.24 - row * 0.04), 0.02, 0.05 - row * 0.32]} rotation.z={side * 0.5}>
			<T.BoxGeometry args={[0.06, 0.16, 0.26]} />
		</T.Mesh>
	{/each}

	<!-- Propulseurs ioniques : nacelles sous les ailes -->
	{#if thrusters > 0}
		{@const s = 0.8 + thrusters * 0.1}
		{#each [-1, 1] as side (side)}
			<T.Group position={[side * 0.62, -0.1, -0.42]} scale={s}>
				<T.Mesh material={darkMat} rotation.x={Math.PI / 2}>
					<T.CylinderGeometry args={[0.07, 0.09, 0.42, 6]} />
				</T.Mesh>
				<T.Mesh position.z={-0.34} rotation.x={-Math.PI / 2} scale={[1, 0.6 + thrusters * 0.15 + (boost ? 0.5 : 0), 1]}>
					<T.ConeGeometry args={[0.07, 0.4, 6]} />
					<T.MeshBasicMaterial color="#4fe3d8" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
				</T.Mesh>
			</T.Group>
		{/each}
	{/if}

	<!-- Antenne longue portée : mât et parabole(s) -->
	{#if antenna > 0}
		<T.Group position={[0, 0.3, -0.2]}>
			<T.Mesh material={hullMat} position.y={0.18}>
				<T.CylinderGeometry args={[0.012, 0.012, 0.36, 4]} />
			</T.Mesh>
			<T.Group position.y={0.38} rotation.y={time * 0.8}>
				<T.Mesh material={goldMat} rotation.x={-1.1}>
					<T.ConeGeometry args={[0.08 + antenna * 0.02, 0.06, 10, 1, true]} />
				</T.Mesh>
				<T.Mesh position.y={0.05}>
					<T.SphereGeometry args={[0.025, 6, 4]} />
					<T.MeshBasicMaterial color="#ff5fa2" />
				</T.Mesh>
			</T.Group>
			{#if antenna >= 3}
				<T.Mesh material={goldMat} position={[0.12, 0.08, -0.08]} rotation={[-0.6, 0, -0.7]}>
					<T.ConeGeometry args={[0.07, 0.05, 8, 1, true]} />
				</T.Mesh>
			{/if}
		</T.Group>
	{/if}

	<!-- Réacteur : flamme plus longue et plus chaude à chaque niveau -->
	<T.Mesh position.z={-1.0} rotation.x={-Math.PI / 2} scale={[1 + reactor * 0.08, flame, 1 + reactor * 0.08]}>
		<T.ConeGeometry args={[0.18, 0.7, 8]} />
		<T.MeshBasicMaterial color={flameColor} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
	</T.Mesh>
	<T.Mesh position.z={-0.95} scale={1 + reactor * 0.1}>
		<T.SphereGeometry args={[0.2, 10, 8]} />
		<T.MeshBasicMaterial color={wreck ? '#ffcf8a' : '#ffffff'} />
	</T.Mesh>
	{#if reactor >= 2}
		<T.Mesh position.z={-0.86} rotation.z={time * 2}>
			<T.TorusGeometry args={[0.3, 0.02, 4, 12]} />
			<T.MeshBasicMaterial color={flameColor} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
		</T.Mesh>
	{/if}
	<T.PointLight color="#ffb547" intensity={(boost ? 6 : 2.5) + reactor * 0.6 + glow * 8} distance={3.5} position.z={-1.2} />

	<!-- Étincelles d'avarie sur l'épave -->
	{#if spark}
		<T.Mesh position={[0.42, 0.02, -0.3]}>
			<T.OctahedronGeometry args={[0.06, 0]} />
			<T.MeshBasicMaterial color="#ffe27a" />
		</T.Mesh>
	{/if}
</T.Group>
