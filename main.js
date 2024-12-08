import * as THREE from './scripts/three.module.js';
import { generateTerrainGeometry } from './scripts/terrainGenerator.js';
import { terrainVertexShader, terrainFragmentShader } from './shader/terrainShader.js';
import { ImprovedNoise } from './scripts/ImprovedNoise.js';

// load textures
const textureLoader = new THREE.TextureLoader();
const sandTexture = textureLoader.load('textures/sand.jpg');
const grassTexture = textureLoader.load('textures/grass.jpg');
const rockTexture = textureLoader.load('textures/rock.jpg');

[sandTexture, grassTexture, rockTexture].forEach(tex => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.repeat.set(10, 10);
});

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

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearColor(0xffffff, 1);

const segmentCount = 100;
const scale = 10;
const heightMultiplier = 10;

let seed = Math.random();
let width = 200;
let depth = 200;
let terrain;
let base;
let terrainSides;

let cameraAngle = 0;
let cameraDistance = 150;
let cameraHeight = 100;

function updateCamera() {
    const x = Math.sin(cameraAngle) * cameraDistance;
    const z = Math.cos(cameraAngle) * cameraDistance;
    camera.position.set(x, cameraHeight, z);
    camera.lookAt(0, 0, 0);
}

function generateSplatMap(width, depth, seed) {
    const size = 256; 
    const data = new Uint8Array(size * size * 4);

    const perlin = new ImprovedNoise();
    const noiseScale = 0.015;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const nx = x * noiseScale;
            const ny = y * noiseScale;
            const val = perlin.noise(nx, ny, seed);
            const noiseVal = (val + 1) / 2.0; 

            // sand (255, 0, 0), grass (0, 255, 0), rock (0, 0, 255)
            let r=0,g=0,b=0,a=255;
            if (noiseVal < 0.33) {
                r = 255;
            } else if (noiseVal < 0.66) {
                g = 255;
            } else {
                b = 255;
            }

            const index = (y * size + x) * 4;
            data[index] = r;
            data[index+1] = g;
            data[index+2] = b;
            data[index+3] = a;
        }
    }

    const splatTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    splatTexture.needsUpdate = true;
    splatTexture.wrapS = THREE.RepeatWrapping;
    splatTexture.wrapT = THREE.RepeatWrapping;
    splatTexture.repeat.set(width / 50, depth / 50);

    return splatTexture;
}

let splatMap = generateSplatMap(width, depth, seed);

const terrainMaterial = new THREE.ShaderMaterial({
    vertexShader: terrainVertexShader,
    fragmentShader: terrainFragmentShader,
    uniforms: {
        sandTex: { value: sandTexture },
        grassTex: { value: grassTexture },
        rockTex: { value: rockTexture },
        splatMap: { value: splatMap }
    },
    side: THREE.DoubleSide
});

const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
});

// use green material for terrain sides
const greenMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide
});

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

function getTerrainLowestPoint(geometry) {
    const position = geometry.attributes.position;
    let minY = Infinity;

    for (let i = 0; i < position.count; i++) {
        const y = position.getY(i);
        if (y < minY) minY = y;
    }
    return minY;
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

    const minHeight = getTerrainLowestPoint(terrainGeometry);
    const baseHeight = minHeight - 1;

    const baseGeometry = new THREE.BoxGeometry(width, 1, depth);
    base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = baseHeight;
    scene.add(base);

    // create terrain sides
    terrainSides = createTerrainSides(terrainGeometry, minHeight, baseHeight, greenMaterial, segmentCount);
    scene.add(terrainSides);
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
    width = terrainWidthInput.value ? parseInt(terrainWidthInput.value) : 200;
    depth = terrainDepthInput.value ? parseInt(terrainDepthInput.value) : 200;

    splatMap = generateSplatMap(width, depth, seed);
    terrainMaterial.uniforms.splatMap.value = splatMap;
    createTerrain(seed);
});

function animate() {
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();
