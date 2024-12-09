import * as THREE from '../scripts/three.module.js'
import {Branch} from './branch.js'
import TreeOptions from './options.js'
import RNG from './rng.js';
import { getBarkTexture, getLeafTexture } from './textures.js';

export class Tree extends THREE.Group{
    /**@type {TreeOptions} */ 
    options;


    constructor(options = new TreeOptions()){
        super();
        this.name = 'Tree';
        this.branchesMesh = new THREE.Mesh();
        this.leavesMesh = new THREE.Mesh();
        this.ornamentsMesh = new THREE.Mesh();
        this.add(this.branchesMesh);
        this.add(this.leavesMesh);
        this.add(this.ornamentsMesh);
        this.options = options;

        this.rng = new RNG(options.seed);

        /**@type {Branch[]} */
        this.branchQueue = [];
    }

    loadFromJson(json){
        this.options.copy(json);
        this.generate();
    }

    generate(){
        this.branches = {
            verts: [],
            normals: [],
            indices: [],
            uvs: []
        };

        this.leaves = {
          verts: [],
          normals: [],
          indices: [],
          uvs: [],
        };

        this.ornaments = {
          verts: [],
          normals: [],
          indices:  [],
        }

        this.branchQueue.push(
          new Branch(
            new THREE.Vector3(),
            new THREE.Euler(),
            this.options.branch.length[0],
            this.options.branch.radius[0],
            0,
            this.options.branch.sections[0],
            this.options.branch.segments[0],
          ),
        );

        while(this.branchQueue.length > 0){
            const branch = this.branchQueue.shift();
            this.generateBranch(branch);
        }

        this.createBranchesGeometry();

        this.createLeavesGeometry();

        this.createOrnamentsGeometry();
    }

    /**@param {Branch} branch*/
    generateBranch(branch){
        const indexOffset = this.branches.verts.length/3;

        let sectionOrientation = branch.orientation.clone();
        let sectionOrigin = branch.origin.clone();
        let sectionLength = branch.length / branch.sectionCount / (this.options.branch.levels - 1);

        let sections = [];

        for (let i = 0; i <= branch.sectionCount; i++) {
            let sectionRadius = branch.radius;
      
            // If final section of final level, set radius to effecively zero
            if (
              i === branch.sectionCount &&
              branch.level === this.options.branch.levels
            ) {
              sectionRadius = 0.001;
            } else {//if (this.options.type === TreeType.Deciduous) {
              sectionRadius *=
                1 - this.options.branch.taper[branch.level] * (i / branch.sectionCount);
            }
      
            // Create the segments that make up this section.
            let first;
            for (let j = 0; j < branch.segmentCount; j++) {
              let angle = (2.0 * Math.PI * j) / branch.segmentCount;
      
              // Create the segment vertex
              const vertex = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
                .multiplyScalar(sectionRadius)
                .applyEuler(sectionOrientation)
                .add(sectionOrigin);
      
              const normal = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
                .applyEuler(sectionOrientation)
                .normalize();
      
              const uv = new THREE.Vector2(
                j / branch.segmentCount,
                (i % 2 === 0) ? 0 : 1,
              );
      
              this.branches.verts.push(...Object.values(vertex));
              this.branches.normals.push(...Object.values(normal));
              this.branches.uvs.push(...Object.values(uv));
      
              if (j === 0) {
                first = { vertex, normal, uv };
              }
            }
      
            // Duplicate the first vertex so there is continuity in the UV mapping
            this.branches.verts.push(...Object.values(first.vertex));
            this.branches.normals.push(...Object.values(first.normal));
            this.branches.uvs.push(1, first.uv.y);
      
            // Use this information later on when generating child branches
            sections.push({
              origin: sectionOrigin.clone(),
              orientation: sectionOrientation.clone(),
              radius: sectionRadius,
            });
      
            sectionOrigin.add(
              new THREE.Vector3(0, sectionLength, 0).applyEuler(sectionOrientation),
            );
      
            // Perturb the orientation of the next section randomly. The higher the
            // gnarliness, the larger potential perturbation
            const gnarliness =
              Math.max(1, 1 / Math.sqrt(sectionRadius)) *
              this.options.branch.gnarliness[branch.level];
      
            sectionOrientation.x += this.myRandom(gnarliness, -gnarliness);
            sectionOrientation.z += this.myRandom(gnarliness, -gnarliness);
      
            // Apply growth force to the branch
            const qSection = new THREE.Quaternion().setFromEuler(sectionOrientation);
      
            const qTwist = new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 1, 0),
              this.options.branch.twist[branch.level],
            );
      
            const qForce = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              new THREE.Vector3().copy(this.options.branch.force.direction),
            );
      
            qSection.multiply(qTwist);
            qSection.rotateTowards(
              qForce,
              this.options.branch.force.strength / sectionRadius,
            );
      
            sectionOrientation.setFromQuaternion(qSection);
        }

        this.generateBranchIndices(indexOffset, branch);

        const lastSection = sections[sections.length - 1];

      if (branch.level < this.options.branch.levels) {
        this.branchQueue.push(
          new Branch(
            lastSection.origin,
            lastSection.orientation,
            this.options.branch.length[branch.level + 1],
            lastSection.radius,
            branch.level + 1,
            // Section count and segment count must be same as parent branch
            // since the child branch is growing from the end of the parent branch
            branch.sectionCount,
            branch.segmentCount,
          )
        );
      } else {
        this.generateLeaf(lastSection.origin, lastSection.orientation);
      } 

      if (branch.level === this.options.branch.levels) {
        this.generateLeaves(sections);
      } else if (branch.level < this.options.branch.levels) {
        this.generateChildBranches(
          this.options.branch.children[branch.level],
          branch.level + 1,
          sections);
      }
    }

    generateChildBranches(count, level, sections) {
      const radialOffset = this.myRandom(1, 0);
  
      for (let i = 0; i < count; i++) {
        // Determine how far along the length of the parent branch the child
        // branch should originate from (0 to 1)
        let childBranchStart = this.myRandom(1.0, this.options.branch.start[level]);
  
        // Find which sections are on either side of the child branch origin point
        // so we can determine the origin, orientation and radius of the branch
        const sectionIndex = Math.floor(childBranchStart * (sections.length - 1));
        let sectionA, sectionB;
        sectionA = sections[sectionIndex];
        if (sectionIndex === sections.length - 1) {
          sectionB = sectionA;
        } else {
          sectionB = sections[sectionIndex + 1];
        }
  
        // Find normalized distance from section A to section B (0 to 1)
        const alpha =
          (childBranchStart - sectionIndex / (sections.length - 1)) /
          (1 / (sections.length - 1));
  
        // Linearly interpolate origin from section A to section B
        const childBranchOrigin = new THREE.Vector3().lerpVectors(
          sectionA.origin,
          sectionB.origin,
          alpha,
        );
  
        // Linearly interpolate radius
        const childBranchRadius =
          this.options.branch.radius[level] *
          ((1 - alpha) * sectionA.radius + alpha * sectionB.radius);
  
        // Linearlly interpolate the orientation
        const qA = new THREE.Quaternion().setFromEuler(sectionA.orientation);
        const qB = new THREE.Quaternion().setFromEuler(sectionB.orientation);
        const parentOrientation = new THREE.Euler().setFromQuaternion(
          qB.slerp(qA, alpha),
        );
  
        // Calculate the angle offset from the parent branch and the radial angle
        const radialAngle = 2.0 * Math.PI * (radialOffset + i / count);
        const q1 = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          this.options.branch.angle[level] / (180 / Math.PI),
        );
        const q2 = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          radialAngle,
        );
        const q3 = new THREE.Quaternion().setFromEuler(parentOrientation);
  
        const childBranchOrientation = new THREE.Euler().setFromQuaternion(
          q3.multiply(q2.multiply(q1)),
        );
  
        let childBranchLength =
          this.options.branch.length[level] *
          (this.options.type === 'evergreen'
            ? 1.0 - childBranchStart
            : 1.0);
  
        this.branchQueue.push(
          new Branch(
            childBranchOrigin,
            childBranchOrientation,
            childBranchLength,
            childBranchRadius,
            level,
            this.options.branch.sections[level],
            this.options.branch.segments[level],
          ),
        );
      }
    }

    generateLeaves(sections) {
      const radialOffset = this.myRandom(1, 0);
  
      for (let i = 0; i < this.options.leaves.count; i++) {
        // Determine how far along the length of the parent
        // branch the leaf should originate from (0 to 1)
        let leafStart = this.myRandom(1.0, this.options.leaves.start);
  
        // Find which sections are on either side of the child branch origin point
        // so we can determine the origin, orientation and radius of the branch
        const sectionIndex = Math.floor(leafStart * (sections.length - 1));
        let sectionA, sectionB;
        sectionA = sections[sectionIndex];
        if (sectionIndex === sections.length - 1) {
          sectionB = sectionA;
        } else {
          sectionB = sections[sectionIndex + 1];
        }
  
        // Find normalized distance from section A to section B (0 to 1)
        const alpha =
          (leafStart - sectionIndex / (sections.length - 1)) /
          (1 / (sections.length - 1));
  
        // Linearly interpolate origin from section A to section B
        const leafOrigin = new THREE.Vector3().lerpVectors(
          sectionA.origin,
          sectionB.origin,
          alpha,
        );
  
        // Linearlly interpolate the orientation
        const qA = new THREE.Quaternion().setFromEuler(sectionA.orientation);
        const qB = new THREE.Quaternion().setFromEuler(sectionB.orientation);
        const parentOrientation = new THREE.Euler().setFromQuaternion(
          qB.slerp(qA, alpha),
        );
  
        // Calculate the angle offset from the parent branch and the radial angle
        const radialAngle = 2.0 * Math.PI * (radialOffset + i / this.options.leaves.count);
        const q1 = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          this.options.leaves.angle / (180 / Math.PI),
        );
        const q2 = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          radialAngle,
        );
        const q3 = new THREE.Quaternion().setFromEuler(parentOrientation);
  
        const leafOrientation = new THREE.Euler().setFromQuaternion(
          q3.multiply(q2.multiply(q1)),
        );
  
        this.generateLeaf(leafOrigin, leafOrientation);
      }
    }

    generateLeaf(origin, orientation) {
      let i = this.leaves.verts.length / 3;
  
      // Width and length of the leaf quad
      let leafSize =
        this.options.leaves.size *
        (1 +
          this.myRandom(
            this.options.leaves.sizeVariance,
            -this.options.leaves.sizeVariance,
          ));
  
      const W = leafSize;
      const L = leafSize;
  
      const createLeaf = (rotation) => {
        // Create quad vertices
        const v = [
          new THREE.Vector3(-W / 2, L, 0),
          new THREE.Vector3(-W / 2, 0, 0),
          new THREE.Vector3(W / 2, 0, 0),
          new THREE.Vector3(W / 2, L, 0),
        ].map((v) =>
          v
            .applyEuler(new THREE.Euler(0, rotation, 0))
            .applyEuler(orientation)
            .add(origin),
        );
  
        this.leaves.verts.push(
          v[0].x,
          v[0].y,
          v[0].z,
          v[1].x,
          v[1].y,
          v[1].z,
          v[2].x,
          v[2].y,
          v[2].z,
          v[3].x,
          v[3].y,
          v[3].z,
        );
  
        const n = new THREE.Vector3(0, 0, 1).applyEuler(orientation);
        this.leaves.normals.push(
          n.x,
          n.y,
          n.z,
          n.x,
          n.y,
          n.z,
          n.x,
          n.y,
          n.z,
          n.x,
          n.y,
          n.z,
        );
        this.leaves.uvs.push(0, 1, 0, 0, 1, 0, 1, 1);
        this.leaves.indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
        i += 4;
      };
  
      createLeaf(0);
      if(this.myRandom(1, 0) < this.options.ornamentChance){
        this.createOrnament(origin);
      }
      
    }

    /**@param {THREE.Vector3} origin*/
    createOrnament(origin){
      let radius = .5;
      origin.addVectors(origin, new THREE.Vector3(0, -.5, 0));
      let top = new THREE.Vector3(0, -radius, 0);
      top.addVectors(origin, top);
      let bottom = new THREE.Vector3(0, radius, 0);
      bottom.addVectors(origin, bottom);
      let lf = new THREE.Vector3(-radius, 0, radius);
      lf.addVectors(origin, lf);
      let rf = new THREE.Vector3(radius, 0, radius);
      rf.addVectors(origin, rf);
      let lr = new THREE.Vector3(-radius, 0, -radius);
      lr.addVectors(origin, lr);
      let rr = new THREE.Vector3(radius, 0, -radius);
      rr.addVectors(origin, rr);

      let io = this.ornaments.verts.length/3;
      this.ornaments.verts.push(...top, ...bottom, ...lf, ...rf, ...lr, ...rr);
      this.ornaments.indices.push(io, io + 2, io + 3, io, io + 3, io + 5, io, io + 5, io + 4, io, io + 4, io + 2);
      this.ornaments.indices.push(io + 1, io + 3, io + 2, io + 1, io + 5, io + 3, io + 1, io + 4, io + 5, io + 1, io + 2, io + 4);

      }

    createOrnamentsGeometry(){
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(this.ornaments.verts), 3),
      );
      g.setIndex(
        new THREE.BufferAttribute(new Uint16Array(this.ornaments.indices), 1),
      );
      g.computeVertexNormals();
      g.computeBoundingSphere();

      let mat = new THREE.MeshPhongMaterial({color : new THREE.Color(0xed1909)})

      this.ornamentsMesh.geometry.dispose();
      this.ornamentsMesh.geometry = g;
      this.ornamentsMesh.material.dispose();
      this.ornamentsMesh.material = mat;
      this.ornamentsMesh.castShadow = true;
      this.ornamentsMesh.receiveShadow = false;
    }

    generateBranchIndices(indexOffset, branch) {
      // Build geometry each section of the branch (cylinder without end caps)
      let v1, v2, v3, v4;
      const N = branch.segmentCount + 1;
      for (let i = 0; i < branch.sectionCount; i++) {
        // Build the quad for each segment of the section
        for (let j = 0; j < branch.segmentCount; j++) {
          v1 = indexOffset + i * N + j;
          // The last segment wraps around back to the starting segment, so omit j + 1 term
          v2 = indexOffset + i * N + (j + 1);
          v3 = v1 + N;
          v4 = v2 + N;
          this.branches.indices.push(v1, v3, v2, v2, v3, v4);
        }
      }
    }

    createBranchesGeometry() {
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(this.branches.verts), 3),
      );
      g.setAttribute(
        'normal',
        new THREE.BufferAttribute(new Float32Array(this.branches.normals), 3),
      );
      g.setAttribute(
        'uv',
        new THREE.BufferAttribute(new Float32Array(this.branches.uvs), 2),
      );
      g.setIndex(
        new THREE.BufferAttribute(new Uint16Array(this.branches.indices), 1),
      );
      g.computeBoundingSphere();
  
      const mat = new THREE.MeshPhongMaterial({
        name: 'branches',
        flatShading: this.options.bark.flatShading,
        color: new THREE.Color(this.options.bark.tint),
      });
  
      if (this.options.bark.textured) {
        mat.aoMap = getBarkTexture(this.options.bark.type, 'ao', this.options.bark.textureScale);
        mat.map = getBarkTexture(this.options.bark.type, 'color', this.options.bark.textureScale);
        mat.normalMap = getBarkTexture(this.options.bark.type, 'normal', this.options.bark.textureScale);
        mat.roughnessMap = getBarkTexture(this.options.bark.type, 'roughness', this.options.bark.textureScale);
      }
  
      this.branchesMesh.geometry.dispose();
      this.branchesMesh.geometry = g;
      this.branchesMesh.material.dispose();
      this.branchesMesh.material = mat;
      this.branchesMesh.castShadow = true;
      this.branchesMesh.receiveShadow = true;
    }

    myRandom(ceiling, floor) {
      return (ceiling - floor) * this.rng.random() + floor;
    }

    createLeavesGeometry() {
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(this.leaves.verts), 3),
      );
      g.setAttribute(
        'uv',
        new THREE.BufferAttribute(new Float32Array(this.leaves.uvs), 2),
      );
      g.setIndex(
        new THREE.BufferAttribute(new Uint16Array(this.leaves.indices), 1),
      );
      g.computeVertexNormals();
      g.computeBoundingSphere();
  
      const mat = new THREE.MeshPhongMaterial({
        name: 'leaves',
        map: getLeafTexture(this.options.leaves.type),
        color: new THREE.Color(this.options.leaves.tint),
        side: THREE.DoubleSide,
        alphaTest: this.options.leaves.alphaTest,
        dithering: true
      });

      this.leavesMesh.geometry.dispose();
      this.leavesMesh.geometry = g;
      this.leavesMesh.material.dispose();
  
      this.leavesMesh.material = mat;
  
      this.leavesMesh.castShadow = true;
      this.leavesMesh.receiveShadow = true;
    }

    

    

}
