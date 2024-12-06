import * as THREE from './scripts/three.module.js';
import { generateTerrainGeometry } from './scripts/terrainGenerator.js';

const container = document.getElementById('canvas-container');
const canvas = document.getElementById('canvas');
const seedInput = document.getElementById('seedInput');
const terrainWidthInput = document.getElementById('terrainWidth');
const terrainDepthInput = document.getElementById('terrainDepth');
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

const segmentCount = 100;
const scale = 10;
const heightMultiplier = 10;

let seed = Math.random();
let width = 100;
let depth = 100;
let terrain;
let base;
let terrainSides;

const terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0x88c070,
    side: THREE.DoubleSide,
});

const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
});

let cameraAngle = 0;
let cameraDistance = 150;
let cameraHeight = 100;

function updateCamera() {
    const x = Math.sin(cameraAngle) * cameraDistance;
    const z = Math.cos(cameraAngle) * cameraDistance;
    camera.position.set(x, cameraHeight, z);
    camera.lookAt(0, 0, 0);
}

function createTerrainSides(terrainGeometry, minHeight, baseHeight, material, segments) {
    const position = terrainGeometry.attributes.position;
    const verticesPerRow = segments + 1;

    const sidePositions = [];
    const sideIndices = [];
    const sideUVs = [];

    function createSideQuads(edgeIndices) {
        for (let i = 0; i < edgeIndices.length - 1; i++) {
            const v1 = edgeIndices[i];
            const v2 = edgeIndices[i + 1];

            const x1 = position.getX(v1);
            const y1 = position.getY(v1);
            const z1 = position.getZ(v1);

            const x2 = position.getX(v2);
            const y2 = position.getY(v2);
            const z2 = position.getZ(v2);

            const x3 = x1, y3 = baseHeight, z3 = z1;
            const x4 = x2, y4 = baseHeight, z4 = z2;

            const startIndex = sidePositions.length / 3;

            sidePositions.push(x1, y1, z1);
            sidePositions.push(x2, y2, z2);
            sidePositions.push(x3, y3, z3);
            sidePositions.push(x4, y4, z4);

            sideIndices.push(
                startIndex, startIndex + 1, startIndex + 2,
                startIndex + 1, startIndex + 3, startIndex + 2
            );

            sideUVs.push(0, 1);
            sideUVs.push(1, 1);
            sideUVs.push(0, 0);
            sideUVs.push(1, 0);
        }
    }

    const topEdgeIndices = [];
    for (let col = 0; col < verticesPerRow; col++) {
        topEdgeIndices.push(col);
    }
    createSideQuads(topEdgeIndices);

    const bottomEdgeIndices = [];
    const bottomRowStart = segments * verticesPerRow;
    for (let col = 0; col < verticesPerRow; col++) {
        bottomEdgeIndices.push(bottomRowStart + col);
    }
    createSideQuads(bottomEdgeIndices);

    const leftEdgeIndices = [];
    for (let row = 0; row < segments + 1; row++) {
        leftEdgeIndices.push(row * verticesPerRow);
    }
    createSideQuads(leftEdgeIndices);

    const rightEdgeIndices = [];
    for (let row = 0; row < segments + 1; row++) {
        rightEdgeIndices.push(row * verticesPerRow + segments);
    }
    createSideQuads(rightEdgeIndices);

    const sideGeometry = new THREE.BufferGeometry();
    sideGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sidePositions, 3));
    sideGeometry.setIndex(sideIndices);
    sideGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(sideUVs, 2));
    sideGeometry.computeVertexNormals();

    const sideMesh = new THREE.Mesh(sideGeometry, material);
    return sideMesh;
}

function createTerrain(seed) {
    if (terrain) {
        scene.remove(terrain);
        terrain.geometry.dispose();
        terrain.material.dispose();
        terrain = null;
    }
    if (base) {
        scene.remove(base);
        base.geometry.dispose();
        base.material.dispose();
        base = null;
    }
    if (terrainSides) {
        scene.remove(terrainSides);
        terrainSides.geometry.dispose();
        terrainSides.material.dispose();
        terrainSides = null;
    }

    // Generate terrain geometry
    const terrainGeometry = generateTerrainGeometry(
        width,
        depth,
        segmentCount,
        scale,
        heightMultiplier,
        seed
    );

    terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    scene.add(terrain);

    // Calculate the lowest point of the terrain
    const minHeight = getTerrainLowestPoint(terrainGeometry);

    // Create base geometry
    const baseHeight = minHeight - 1;
    const baseGeometry = new THREE.BoxGeometry(width, 1, depth);
    base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = baseHeight;
    scene.add(base);

    terrainSides = createTerrainSides(terrainGeometry, minHeight, baseHeight, terrainMaterial, segmentCount);
    scene.add(terrainSides);
}

function getTerrainLowestPoint(geometry) {
    const position = geometry.attributes.position;
    let minY = Infinity;

    for (let i = 0; i < position.count; i++) {
        const y = position.getY(i);
        if (y < minY) minY = y;
    }

    return minY;
}

createTerrain(seed);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 50, 50).normalize();
scene.add(light);

updateCamera();

window.addEventListener('keydown', (event) => {
    const stepAngle = 0.05;
    const stepHeight = 5;

    switch (event.key) {
        case 'a':
            cameraAngle -= stepAngle;
            updateCamera();
            break;
        case 'd':
            cameraAngle += stepAngle;
            updateCamera();
            break;
        case 'w':
            cameraHeight += stepHeight;
            updateCamera();
            break;
        case 's':
            cameraHeight -= stepHeight;
            updateCamera();
            break;
    }
});

generateButton.addEventListener('click', () => {
    const inputSeed = seedInput.value.trim();
    seed = inputSeed ? parseFloat(inputSeed) : Math.random();
    width = parseInt(terrainWidthInput.value);
    depth = parseInt(terrainDepthInput.value);
    createTerrain(seed);
});

function animate() {
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();
