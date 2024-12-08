import { ImprovedNoise } from './ImprovedNoise.js';
import * as THREE from './three.module.js';

export function generateTerrainGeometry(width, depth, segments, scale, heightMultiplier, seed) {
    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const perlin = new ImprovedNoise();
    const position = geometry.attributes.position;

    // FBM function for more realistic terrain
    // https://iquilezles.org/articles/fbm/
    function fbmNoise(x, z, seed, octaves, persistence, lacunarity) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            total += perlin.noise(x * frequency, z * frequency, seed) * amplitude;
            maxValue += amplitude;

            amplitude *= persistence;
            frequency *= lacunarity;
        }

        return total / maxValue; 
    }

    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i) / scale; 
        const z = position.getZ(i) / scale;

        const baseHeight = fbmNoise(x, z, seed, 4, 0.5, 2.0); // Octaves, Persistence, Lacunarity

        const ridgeHeight = 1.0 - Math.abs(baseHeight); 
        // Blend FBM and ridge
        const combinedHeight = THREE.MathUtils.lerp(baseHeight, ridgeHeight, 0.3); 

        const finalHeight = combinedHeight * heightMultiplier;

        position.setY(i, finalHeight);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();

    return geometry;
}
