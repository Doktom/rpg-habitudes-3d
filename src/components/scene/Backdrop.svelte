<script lang="ts">
	// Arrière-plan : nébuleuse, ceinture de débris (l'Alliage qu'on récupère), petite lune de Kronos.
	import { T } from '@threlte/core';
	import * as THREE from 'three';

	let { time }: { time: number } = $props();

	const nebulaMat = new THREE.ShaderMaterial({
		side: THREE.BackSide,
		depthWrite: false,
		uniforms: { uTime: { value: 0 } },
		vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
		fragmentShader: /* glsl */ `
			uniform float uTime; varying vec3 vDir;
			float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
			float noise(vec3 p) {
				vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
				return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
				           mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
			}
			float fbm(vec3 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
			void main() {
				vec3 d = vDir;
				float n = fbm(d * 2.4 + vec3(uTime * 0.01, 0.0, 0.0));
				float m = fbm(d * 4.0 - vec3(0.0, uTime * 0.008, 0.0));
				vec3 base = vec3(0.035, 0.04, 0.10);
				vec3 violet = vec3(0.30, 0.12, 0.45);
				vec3 rose = vec3(0.65, 0.16, 0.38);
				vec3 teal = vec3(0.05, 0.35, 0.40);
				vec3 col = base;
				col = mix(col, violet, smoothstep(0.45, 0.85, n) * 0.55);
				col = mix(col, rose, smoothstep(0.62, 0.95, n * m * 1.6) * 0.45);
				col = mix(col, teal, smoothstep(0.55, 0.9, m) * 0.25 * (1.0 - d.y));
				gl_FragColor = vec4(col, 1.0);
			}`
	});
	$effect(() => {
		nebulaMat.uniforms.uTime.value = time;
	});

	// Ceinture de débris : fragments de coque qui dérivent au-delà de l'orbite
	const COUNT = 110;
	const debris = new THREE.InstancedMesh(
		new THREE.IcosahedronGeometry(0.07, 0),
		new THREE.MeshStandardMaterial({ color: '#8e93b8', flatShading: true, roughness: 0.8, metalness: 0.4 }),
		COUNT
	);
	{
		const m = new THREE.Matrix4();
		const q = new THREE.Quaternion();
		for (let i = 0; i < COUNT; i++) {
			const a = Math.random() * Math.PI * 2;
			const r = 4.7 + Math.random() * 1.1;
			const s = 0.4 + Math.random() * 1.4;
			q.setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
			m.compose(new THREE.Vector3(Math.cos(a) * r, (Math.random() - 0.5) * 0.35, Math.sin(a) * r), q, new THREE.Vector3(s, s * 0.7, s));
			debris.setMatrixAt(i, m);
		}
	}
</script>

<T.Mesh material={nebulaMat}>
	<T.SphereGeometry args={[60, 32, 16]} />
</T.Mesh>

<T.Group rotation.x={-0.16} rotation.z={0.06}>
	<T.Group rotation.y={time * 0.02}>
		<T is={debris} />
	</T.Group>
</T.Group>

<!-- Lune de Kronos -->
<T.Group rotation.x={0.35} rotation.y={time * 0.05 + 1.2}>
	<T.Mesh position={[7.4, 0, 0]} rotation.y={time * 0.3}>
		<T.IcosahedronGeometry args={[0.32, 1]} />
		<T.MeshStandardMaterial color="#b8b3d9" flatShading roughness={0.9} emissive="#3a2f6e" emissiveIntensity={0.4} />
	</T.Mesh>
</T.Group>
