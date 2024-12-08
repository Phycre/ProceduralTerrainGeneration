import TreeOptions from "../treeGen/options.js";
import { Tree } from "../treeGen/tree.js";
import { DataTexture, PlaneGeometry } from "./three.core.js";
import { WebGLRenderer } from "./three.module.js";

/**
 * @param {Uint8Array} terrainMap
 * @param {Uint8Array} forestMap
 * @param {PlaneGeometry} terrainGeometry 
 * @param {WebGLRenderer} renderer 
*/
export function generateForest(terrainGeometry, terrainMap, forestMap, renderer, scene) {
    for(let x = 0; x < 256; x += 4){
        for(let y = 0; y < 256; y += 4){
            if(terrainMap[x * 256 + y] == 255 & forestMap[x * 256 + y + 1] == 255){
                let t = new Tree(new TreeOptions);
                t.generate();
                t.translateX(x - 256/2);
                t.translateZ(y - 256/2);
                t.scale.set(2, 2, 2);
                scene.add(t);
            }
        }
    }   
    
}