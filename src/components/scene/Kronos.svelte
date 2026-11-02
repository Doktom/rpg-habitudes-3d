<script lang="ts">
	// Scène 3D : Kronos, la planète-horloge, l'orbite des 7 secteurs et le Sillage.
	import { T, useTask, useThrelte } from '@threlte/core';
	import { untrack } from 'svelte';
	import { interactivity } from '@threlte/extras';
	import * as THREE from 'three';
	import type { SectorState } from '../../lib/engine/orbit';
	import { STATE_COLOR, sectorAngle, SECTOR_ARC } from './palette';
	import Ship from './Ship.svelte';

	interface Props {
		states: SectorState[];
		selected: number;
		pulse: { sector: number; at: number; strong: boolean } | null;
		onselect: (i: number) => void;
		calm: boolean;
	}
	let { states, selected, pulse, onselect, calm }: Props = $props();

	interactivity();
	const { size, camera } = useThrelte();

	const ORBIT_R = 3.55;
	const TILT = -0.12;

	// ——— Caméra : cadre l'orbite entière, en portrait comme en paysage ———
	$effect(() => {
		const { width, height } = $size;
		const cam = camera.current as THREE.PerspectiveCamera;
		if (!width || !height || !cam.isPerspectiveCamera) return;
		const aspect = width / height;
		const vfov = THREE.MathUtils.degToRad(cam.fov);
		const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
		const dW = (ORBIT_R + 0.45) / Math.tan(hfov / 2);
		const dH = 3.3 / Math.tan(vfov / 2);
		const d = Math.max(dW, dH);
		const el = 0.72;
		cam.position.set(0, Math.sin(el) * d, Math.cos(el) * d);
		cam.lookAt(0, 0.35, 0);
	});

	// ——— Planète : soleil rétro rayé, dégradé et halo ———
	const planetMat = new THREE.ShaderMaterial({
		uniforms: { uTime: { value: 0 } },
		vertexShader: /* glsl */ `
			varying vec3 vPos; varying vec3 vNormal; varying vec3 vView;
			void main() {
				vPos = position;
				vNormal = normalize(normalMatrix * normal);
				vec4 mv = modelViewMatrix * vec4(position, 1.0);
				vView = normalize(-mv.xyz);
				gl_Position = projectionMatrix * mv;
			}`,
		fragmentShader: /* glsl */ `
			uniform float uTime;
			varying vec3 vPos; varying vec3 vNormal; varying vec3 vView;
			void main() {
				float y = vPos.y / 1.5;
				vec3 top = vec3(1.0, 0.86, 0.36);
				vec3 mid = vec3(1.0, 0.42, 0.24);
				vec3 low = vec3(0.93, 0.16, 0.47);
				vec3 col = y > 0.0 ? mix(mid, top, y) : mix(mid, low, -y);
				// Bandes horizontales de plus en plus larges vers le bas (affiche rétro)
				float band = fract(y * 7.0 + uTime * 0.04);
				float gap = smoothstep(0.15, -0.9, y) * 0.55;
				float cut = step(band, gap);
				col = mix(col, vec3(0.16, 0.05, 0.22), cut * 0.92);
				// Lumière douce et bord lumineux
				float light = 0.55 + 0.45 * max(dot(vNormal, normalize(vec3(0.4, 0.7, 0.6))), 0.0);
				float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.5);
				col = col * light + vec3(1.0, 0.55, 0.75) * rim * 0.9;
				gl_FragColor = vec4(col, 1.0);
			}`
	});

	const haloMat = new THREE.ShaderMaterial({
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		side: THREE.BackSide,
		vertexShader: /* glsl */ `
			varying vec3 vNormal; varying vec3 vView;
			void main() {
				vNormal = normalize(normalMatrix * normal);
				vec4 mv = modelViewMatrix * vec4(position, 1.0);
				vView = normalize(-mv.xyz);
				gl_Position = projectionMatrix * mv;
			}`,
		fragmentShader: /* glsl */ `
			varying vec3 vNormal; varying vec3 vView;
			void main() {
				float i = pow(max(dot(vNormal, vView), 0.0), 3.0);
				gl_FragColor = vec4(vec3(1.0, 0.38, 0.45) * i, i * 0.9);
			}`
	});

	// ——— Cadran de l'horloge : 60 graduations, 7 grandes ———
	const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, 0.012, 0.1), new THREE.MeshBasicMaterial({ color: '#f4ecd8', transparent: true, opacity: 0.55 }), 60);
	{
		const m = new THREE.Matrix4();
		for (let i = 0; i < 60; i++) {
			const a = (i / 60) * Math.PI * 2;
			const r = 2.18;
			m.makeRotationY(-a);
			m.setPosition(Math.cos(a) * r, 0, Math.sin(a) * r);
			ticks.setMatrixAt(i, m);
		}
	}

	// ——— Étoiles ———
	const starGeo = new THREE.BufferGeometry();
	{
		const n = 700;
		const pos = new Float32Array(n * 3);
		for (let i = 0; i < n; i++) {
			const u = Math.random() * 2 - 1;
			const t = Math.random() * Math.PI * 2;
			const r = 22 + Math.random() * 18;
			const s = Math.sqrt(1 - u * u);
			pos.set([r * s * Math.cos(t), r * u, r * s * Math.sin(t)], i * 3);
		}
		starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	}
	const starMat = new THREE.PointsMaterial({ color: '#cfd6ff', size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.8 });

	// ——— Secteurs de l'orbite ———
	const arcGeo = new THREE.TorusGeometry(ORBIT_R, 0.03, 6, 48, SECTOR_ARC - 0.07);
	const glowGeo = new THREE.TorusGeometry(ORBIT_R, 0.09, 6, 48, SECTOR_ARC - 0.07);
	const markerGeo = new THREE.OctahedronGeometry(0.13, 0);

	let time = $state(0);
	let pulseT = $state(99);
	let shipAngle = $state(untrack(() => sectorAngle(selected)));
	let hover = $state(-1);
	const speed = $derived(calm ? 0.15 : 1);

	useTask((delta) => {
		time += delta * speed;
		planetMat.uniforms.uTime.value = time;
		pulseT = pulse ? (performance.now() - pulse.at) / 1000 : 99;
		// Le vaisseau glisse vers le secteur choisi, toujours vers l'avant de l'orbite (sens horaire)
		const target = sectorAngle(selected);
		let diff = target - shipAngle;
		while (diff > Math.PI) diff -= Math.PI * 2;
		while (diff < -Math.PI) diff += Math.PI * 2;
		shipAngle += diff * Math.min(1, delta * (calm ? 8 : 3));
	});

	const markerScale = (i: number) => {
		const base = i === selected ? 1.7 : hover === i ? 1.35 : 1;
		const p = pulse && pulse.sector === i && pulseT < 1.2 ? 1 + Math.sin(Math.min(1, pulseT) * Math.PI) * 0.9 : 1;
		const breath = states[i] === 'today' ? 1 + Math.sin(time * 3) * 0.12 : 1;
		return base * p * breath;
	};
	const glowOpacity = (s: SectorState, i: number) => {
		const flash = pulse && pulse.sector === i && pulseT < 1.5 ? (1.5 - pulseT) * 0.5 : 0;
		const base = s === 'lit' ? 0.32 : s === 'rest' ? 0.22 : s === 'today' ? 0.18 + Math.sin(time * 3) * 0.08 : s === 'partial' ? 0.12 : 0;
		return Math.min(0.9, base + flash);
	};
	const setCursor = (c: string) => (document.body.style.cursor = c);
</script>

<T.PerspectiveCamera makeDefault fov={38} near={0.1} far={120} />
<T.AmbientLight intensity={0.6} />
<T.DirectionalLight position={[3, 6, 4]} intensity={1.6} />

<T.Points geometry={starGeo} material={starMat} rotation.y={time * 0.01} />

<!-- Kronos -->
<T.Group scale={0.78}>
	<T.Mesh material={planetMat} rotation.y={time * 0.15}>
		<T.SphereGeometry args={[1.5, 64, 48]} />
	</T.Mesh>
	<T.Mesh material={haloMat} scale={1.28}>
		<T.SphereGeometry args={[1.5, 48, 32]} />
	</T.Mesh>
	<!-- Cadran -->
	<T.Group rotation.x={TILT * 0.6} rotation.z={0.18}>
		<T.Group rotation.y={-time * 0.06}>
			<T is={ticks} />
		</T.Group>
		<T.Mesh rotation.x={-Math.PI / 2}>
			<T.RingGeometry args={[2.0, 2.035, 128]} />
			<T.MeshBasicMaterial color="#ffb547" transparent opacity={0.5} side={THREE.DoubleSide} />
		</T.Mesh>
		<!-- Aiguille : tourne avec la semaine -->
		<T.Mesh rotation.y={-sectorAngle(selected) + Math.PI / 2} position.y={0.001}>
			<T.BoxGeometry args={[0.02, 0.02, 0.01]} />
			<T.MeshBasicMaterial color="#ff4b3e" />
		</T.Mesh>
	</T.Group>
</T.Group>

<!-- Orbite des 7 secteurs -->
<T.Group rotation.x={TILT}>
	<T.Mesh rotation.x={-Math.PI / 2}>
		<T.RingGeometry args={[ORBIT_R - 0.01, ORBIT_R + 0.01, 160]} />
		<T.MeshBasicMaterial color="#3a3f6e" transparent opacity={0.35} side={THREE.DoubleSide} />
	</T.Mesh>

	{#each states as s, i (i)}
		{@const a = sectorAngle(i)}
		<!-- Arc du secteur : commence à mi-chemin avant son centre -->
		<T.Group rotation.x={Math.PI / 2} rotation.z={-(a + SECTOR_ARC / 2 - 0.035)}>
			<T.Mesh geometry={arcGeo}>
				<T.MeshBasicMaterial color={STATE_COLOR[s]} transparent opacity={s === 'future' ? 0.35 : s === 'missed' ? 0.55 : 1} />
			</T.Mesh>
			<T.Mesh geometry={glowGeo}>
				<T.MeshBasicMaterial color={STATE_COLOR[s]} transparent opacity={glowOpacity(s, i)} blending={THREE.AdditiveBlending} depthWrite={false} />
			</T.Mesh>
		</T.Group>
		<!-- Balise du secteur (sélectionnable) -->
		<T.Mesh
			geometry={markerGeo}
			position={[Math.cos(a) * ORBIT_R, 0.28, -Math.sin(a) * ORBIT_R]}
			rotation.y={time * 0.8 + i}
			scale={markerScale(i)}
			onclick={(e: { stopPropagation: () => void }) => {
				e.stopPropagation();
				onselect(i);
			}}
			onpointerenter={() => {
				hover = i;
				setCursor('pointer');
			}}
			onpointerleave={() => {
				hover = -1;
				setCursor('');
			}}
		>
			<T.MeshStandardMaterial
				color={STATE_COLOR[s]}
				emissive={STATE_COLOR[s]}
				emissiveIntensity={s === 'future' ? 0.15 : 0.9}
				flatShading
				roughness={0.4}
			/>
		</T.Mesh>
		<!-- Zone de clic élargie, invisible -->
		<T.Mesh
			position={[Math.cos(a) * ORBIT_R, 0.2, -Math.sin(a) * ORBIT_R]}
			onclick={(e: { stopPropagation: () => void }) => {
				e.stopPropagation();
				onselect(i);
			}}
		>
			<T.SphereGeometry args={[0.45, 8, 6]} />
			<T.MeshBasicMaterial transparent opacity={0} depthWrite={false} />
		</T.Mesh>
	{/each}

	<!-- Onde de validation -->
	{#if pulse && pulseT < 1.4}
		{@const a = sectorAngle(pulse.sector)}
		<T.Mesh position={[Math.cos(a) * ORBIT_R, 0.02, -Math.sin(a) * ORBIT_R]} rotation.x={-Math.PI / 2} scale={0.3 + pulseT * (pulse.strong ? 3.2 : 2)}>
			<T.RingGeometry args={[0.8, 0.9, 48]} />
			<T.MeshBasicMaterial color={pulse.strong ? '#ffd23f' : '#ffb547'} transparent opacity={Math.max(0, 1 - pulseT / 1.4)} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
		</T.Mesh>
	{/if}

	<Ship angle={shipAngle} radius={ORBIT_R} {time} boost={pulseT < 1.2} />
</T.Group>
