import { ImprovedNoise } from './ImprovedNoise.js';
import * as THREE from './three.module.js';

export function generateTerrainGeometry(width, depth, segments, scale, heightMultiplier, seed) {
    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const perlin = new ImprovedNoise();
    const position = geometry.attributes.position;

    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i) / scale;
        const z = position.getZ(i) / scale;
        const height = perlin.noise(x, z, seed) * heightMultiplier;
        position.setY(i, height);
    }

    // 更新顶点数据和法线
    position.needsUpdate = true;
    geometry.computeVertexNormals();

    return geometry;
}
