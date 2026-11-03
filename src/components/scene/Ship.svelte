<script lang="ts">
	// Le Sillage sur son orbite, et son sillage lumineux derrière lui.
	import { T } from '@threlte/core';
	import { untrack } from 'svelte';
	import * as THREE from 'three';
	import type { ModuleId } from '../../lib/types';
	import ShipModel from './ShipModel.svelte';

	interface Props {
		angle: number;
		radius: number;
		time: number;
		boost: boolean;
		modules: Partial<Record<ModuleId, number>>;
	}
	let { angle, radius, time, boost, modules }: Props = $props();

	const TRAIL = 1.15;
	const trailGeo = new THREE.TorusGeometry(untrack(() => radius), 0.05, 6, 64, TRAIL);
	const trailMat = new THREE.ShaderMaterial({
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		uniforms: { uBoost: { value: 0 }, uTime: { value: 0 } },
		vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
		fragmentShader: /* glsl */ `
			uniform float uBoost; uniform float uTime; varying vec2 vUv;
			void main() {
				float a = pow(vUv.x, 2.2);
				// Particules qui défilent dans le sillage
				float dots = step(0.82, fract(vUv.x * 40.0 - uTime * 2.0)) * 0.6;
				vec3 col = mix(vec3(0.31, 0.89, 0.85), vec3(1.0, 0.85, 0.5), pow(vUv.x, 6.0));
				gl_FragColor = vec4(col * (1.0 + uBoost + dots), a * (0.7 + uBoost * 0.3));
			}`
	});
	$effect(() => {
		trailMat.uniforms.uBoost.value = boost ? 1 : 0;
		trailMat.uniforms.uTime.value = time;
	});

	const bob = $derived(Math.sin(time * 2.2) * 0.04);
</script>

<T.Group rotation.x={Math.PI / 2} rotation.z={-angle - TRAIL}>
	<T.Mesh geometry={trailGeo} material={trailMat} />
</T.Group>

<T.Group position={[Math.cos(angle) * radius, 0.05 + bob, -Math.sin(angle) * radius]} rotation.y={angle}>
	<T.Group scale={0.32} rotation.z={Math.sin(time * 1.3) * 0.12}>
		<ShipModel {modules} {time} {boost} />
	</T.Group>
</T.Group>
