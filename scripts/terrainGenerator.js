import { ImprovedNoise } from './ImprovedNoise.js';
import * as THREE from './three.module.js';


export function generateTerrainGeometry(width, depth, segments, scale, heightMultiplier, seed) {
    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const perlin = new ImprovedNoise();
    const position = geometry.attributes.position;

    // FBM function for more realistic terrain
    //https://iquilezles.org/articles/fbm/

    function fbmNoise(x, z, seed, octaves, persistence, lacunarity) {
        let total = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            const nx = x * frequency;
            const nz = z * frequency;
            total += perlin.noise(nx, 0, nz + seed) * amplitude;

            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }

        return total / maxValue; // Normalize
    }

    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i) / scale;
        const z = position.getZ(i) / scale;

        const baseHeight = fbmNoise(x, z, seed, 8, 0.5, 2.0); // Octaves, Persistence, Lacunarity

        const ridgeHeight = 1.0 - Math.abs(baseHeight);
        const valleyHeight = Math.sin(x * 0.5) * Math.cos(z * 0.5) * perlin.noise(x * 0.1, 0, z * 0.1 + seed) * 8;
        const combinedHeight = THREE.MathUtils.lerp(baseHeight, ridgeHeight, 0.3) + 0.1 * valleyHeight;

        const finalHeight = combinedHeight * 50;

        position.setY(i, finalHeight);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();

    return geometry;
}

