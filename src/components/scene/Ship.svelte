<script lang="ts">
	// Le Sillage : petit vaisseau en polygones francs, et son sillage lumineux sur l'orbite.
	import { T } from '@threlte/core';
	import { untrack } from 'svelte';
	import * as THREE from 'three';

	interface Props {
		angle: number;
		radius: number;
		time: number;
		boost: boolean;
	}
	let { angle, radius, time, boost }: Props = $props();

	const TRAIL = 1.15;
	const trailGeo = new THREE.TorusGeometry(untrack(() => radius), 0.05, 6, 64, TRAIL);
	const trailMat = new THREE.ShaderMaterial({
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		uniforms: { uBoost: { value: 0 } },
		vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
		fragmentShader: /* glsl */ `
			uniform float uBoost; varying vec2 vUv;
			void main() {
				float a = pow(vUv.x, 2.2);
				vec3 col = mix(vec3(0.31, 0.89, 0.85), vec3(1.0, 0.85, 0.5), pow(vUv.x, 6.0));
				gl_FragColor = vec4(col * (1.0 + uBoost), a * (0.75 + uBoost * 0.25));
			}`
	});
	$effect(() => {
		trailMat.uniforms.uBoost.value = boost ? 1 : 0;
	});

	const hullMat = new THREE.MeshStandardMaterial({ color: '#f4ecd8', flatShading: true, roughness: 0.5, metalness: 0.2 });
	const redMat = new THREE.MeshStandardMaterial({ color: '#ff4b3e', flatShading: true, roughness: 0.6 });
	const darkMat = new THREE.MeshStandardMaterial({ color: '#232850', flatShading: true });
	const glassMat = new THREE.MeshStandardMaterial({ color: '#4fe3d8', emissive: '#4fe3d8', emissiveIntensity: 0.6, flatShading: true });

	const bob = $derived(Math.sin(time * 2.2) * 0.04);
	const flame = $derived((boost ? 1.8 : 1) * (0.85 + Math.sin(time * 30) * 0.15));
</script>

<!-- Sillage : derrière le vaisseau (angles plus grands) -->
<T.Group rotation.x={Math.PI / 2} rotation.z={-angle - TRAIL}>
	<T.Mesh geometry={trailGeo} material={trailMat} />
</T.Group>

<T.Group position={[Math.cos(angle) * radius, 0.05 + bob, -Math.sin(angle) * radius]} rotation.y={angle}>
	<T.Group scale={0.32} rotation.z={Math.sin(time * 1.3) * 0.12}>
		<!-- Fuselage -->
		<T.Mesh material={hullMat} rotation.x={Math.PI / 2}>
			<T.ConeGeometry args={[0.32, 1.5, 6]} />
		</T.Mesh>
		<T.Mesh material={darkMat} position.z={-0.78} rotation.x={Math.PI / 2}>
			<T.CylinderGeometry args={[0.22, 0.28, 0.25, 6]} />
		</T.Mesh>
		<!-- Verrière -->
		<T.Mesh material={glassMat} position={[0, 0.17, 0.15]} scale={[0.7, 0.5, 1.2]}>
			<T.OctahedronGeometry args={[0.18, 0]} />
		</T.Mesh>
		<!-- Ailes -->
		<T.Mesh material={redMat} position={[0.5, -0.04, -0.35]} rotation.y={-0.5}>
			<T.BoxGeometry args={[0.75, 0.05, 0.38]} />
		</T.Mesh>
		<T.Mesh material={redMat} position={[-0.5, -0.04, -0.35]} rotation.y={0.5}>
			<T.BoxGeometry args={[0.75, 0.05, 0.38]} />
		</T.Mesh>
		<T.Mesh material={hullMat} position={[0, 0.3, -0.55]} rotation.x={-0.4}>
			<T.BoxGeometry args={[0.05, 0.4, 0.35]} />
		</T.Mesh>
		<!-- Réacteur -->
		<T.Mesh position.z={-1.0} rotation.x={-Math.PI / 2} scale={[1, flame, 1]}>
			<T.ConeGeometry args={[0.18, 0.7, 8]} />
			<T.MeshBasicMaterial color="#ffd23f" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
		</T.Mesh>
		<T.Mesh position.z={-0.95}>
			<T.SphereGeometry args={[0.2, 10, 8]} />
			<T.MeshBasicMaterial color="#ffffff" />
		</T.Mesh>
		<T.PointLight color="#ffb547" intensity={boost ? 6 : 2.5} distance={3} position.z={-1.2} />
	</T.Group>
</T.Group>
