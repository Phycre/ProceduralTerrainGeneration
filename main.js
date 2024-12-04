import * as THREE from './scripts/three.module.js';
import { generateTerrainGeometry } from './scripts/terrainGenerator.js';

//get dom element and set Three.js canvas to element
const container = document.getElementById('canvas-container');
const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(container.clientWidth, container.clientHeight);

const terrainWidth = 100;
const terrainDepth = 100;
const segmentCount = 100;
const scale = 10;
const heightMultiplier = 10;

const terrainGeometry = generateTerrainGeometry(
    terrainWidth,
    terrainDepth,
    segmentCount,
    scale,
    heightMultiplier
);

const terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0x88c070,
    wireframe: false,
});
const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
scene.add(terrain);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 50, 50).normalize();
scene.add(light);

camera.position.set(0, 20, 50);

function animate() {
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();
