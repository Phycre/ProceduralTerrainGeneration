import * as THREE from './scripts/three.module.js';

//get dom element and set Three.js canvas to element
const container = document.getElementById('canvas-container');
const canvas = document.getElementById('canvas');
const seedInput = document.getElementById('seedInput');
const generateButton = document.getElementById('generateButton');

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

let seed = Math.random();
let terrain;

const terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0x88c070,
    wireframe: false,
});

function createTerrain(seed) {
    if (terrain) {
        scene.remove(terrain);
    }

    const terrainGeometry = generateTerrainGeometry(
        terrainWidth,
        terrainDepth,
        segmentCount,
        scale,
        heightMultiplier,
        seed
    );

    terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    scene.add(terrain);
}

createTerrain(seed);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 50, 50).normalize();
scene.add(light);

camera.position.set(0, 20, 50);

generateButton.addEventListener('click', () => {
    const inputSeed = seedInput.value.trim();
    seed = inputSeed ? parseFloat(inputSeed) : Math.random();
    createTerrain(seed);
});

function animate() {

	cube.rotation.x += 0.01;
	cube.rotation.y += 0.01;

	renderer.render( scene, camera );

}

animate();