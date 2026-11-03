<script lang="ts">
	// Hangar : le Sillage en gros plan sur une plateforme holographique ; il tourne lentement,
	// et une amélioration le fait briller.
	import { T, useTask, useThrelte } from '@threlte/core';
	import * as THREE from 'three';
	import type { ModuleId } from '../../lib/types';
	import Backdrop from './Backdrop.svelte';
	import ShipModel from './ShipModel.svelte';

	interface Props {
		modules: Partial<Record<ModuleId, number>>;
		refitAt: number | null;
		calm: boolean;
	}
	let { modules, refitAt, calm }: Props = $props();

	const { size, camera, canvas } = useThrelte();
	let time = $state(0);
	let glow = $state(0);
	let spin = $state(0);
	let drag = { on: false, x: 0, v: 0 };

	$effect(() => {
		const { width, height } = $size;
		const cam = camera.current as THREE.PerspectiveCamera;
		if (!width || !height) return;
		const aspect = width / height;
		const d = aspect < 1 ? 5.4 / Math.max(aspect, 0.55) : 4.6;
		cam.position.set(0, d * 0.42, d);
		cam.lookAt(0, 0.1, 0);
	});

	useTask((delta) => {
		time += delta * (calm ? 0.2 : 1);
		glow = refitAt ? Math.max(0, 1 - (performance.now() - refitAt) / 1600) : 0;
		if (!drag.on) {
			drag.v *= 0.95;
			spin += delta * (calm ? 0.05 : 0.35) + drag.v + glow * delta * 6;
		}
	});

	const ringMat = new THREE.MeshBasicMaterial({ color: '#4fe3d8', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
	const grid = new THREE.GridHelper(8, 24, '#8b7bff', '#3a3f6e');
	(grid.material as THREE.Material).transparent = true;
	(grid.material as THREE.Material).opacity = 0.35;

	function down(e: PointerEvent) {
		drag = { on: true, x: e.clientX, v: 0 };
	}
	function move(e: PointerEvent) {
		if (!drag.on) return;
		const dx = (e.clientX - drag.x) * 0.01;
		spin += dx;
		drag = { on: true, x: e.clientX, v: dx * 0.5 };
	}
	function up() {
		drag.on = false;
	}
	$effect(() => {
		const el = canvas;
		el.style.touchAction = 'pan-y';
		el.addEventListener('pointerdown', down as EventListener);
		addEventListener('pointermove', move);
		addEventListener('pointerup', up);
		return () => {
			el.removeEventListener('pointerdown', down as EventListener);
			removeEventListener('pointermove', move);
			removeEventListener('pointerup', up);
		};
	});
</script>

<T.PerspectiveCamera makeDefault fov={36} near={0.1} far={140} />
<T.AmbientLight intensity={0.5} />
<T.DirectionalLight position={[3, 5, 3]} intensity={1.8} />
<T.DirectionalLight position={[-4, 2, -3]} intensity={0.8} color="#ff5fa2" />

<Backdrop {time} />

<T is={grid} position.y={-0.62} />
<T.Mesh position.y={-0.6} rotation.x={-Math.PI / 2} material={ringMat}>
	<T.RingGeometry args={[1.25, 1.3, 64]} />
</T.Mesh>
<T.Mesh position.y={-0.6} rotation.x={-Math.PI / 2} rotation.z={-time * 0.4}>
	<T.RingGeometry args={[1.5, 1.52, 64, 1, 0, Math.PI * 1.4]} />
	<T.MeshBasicMaterial color="#ffb547" transparent opacity={0.6} side={THREE.DoubleSide} />
</T.Mesh>
<!-- Faisceau de scan qui monte et descend -->
<T.Mesh position.y={-0.55 + ((Math.sin(time * 0.9) + 1) / 2) * 1.2} rotation.x={-Math.PI / 2}>
	<T.RingGeometry args={[0.2, 1.25, 48]} />
	<T.MeshBasicMaterial color="#4fe3d8" transparent opacity={0.07 + glow * 0.3} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
</T.Mesh>

<T.Group rotation.y={spin} position.y={Math.sin(time * 1.6) * 0.06}>
	<T.Group scale={1.05 + glow * 0.08} rotation.z={Math.sin(time * 0.9) * 0.05}>
		<ShipModel {modules} {time} {glow} boost={glow > 0.2} />
	</T.Group>
</T.Group>
