export const terrainVertexShader = `
varying vec3 vPosition;
varying vec2 vUv;

void main() {
    vPosition = position; 
    vUv = uv; 

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

`;

export const terrainFragmentShader = `
uniform sampler2D sandTex;
uniform sampler2D grassTex;
uniform sampler2D rockTex;
uniform sampler2D splatMap;

varying vec3 vPosition;
varying vec2 vUv;

void main() {
    vec4 splatColor = texture2D(splatMap, vUv);

    vec4 sandColor = texture2D(sandTex, vUv);
    vec4 grassColor = texture2D(grassTex, vUv);
    vec4 rockColor = texture2D(rockTex, vUv);

    vec4 terrainColor = splatColor.r * rockColor+
                        splatColor.g * grassColor +
                        splatColor.b * rockColor;

    // Check if the current y-position is below the threshold
    if (vPosition.y < 7.0) {
        //ice
        gl_FragColor = vec4(0.85, 0.85, 1.0, 1); 
        return;
    } else {
        float heightFactor = (vPosition.y + 5.0) / 10.0; 
        //add snow
        terrainColor.rgb = mix(terrainColor.rgb, vec3(1.0), heightFactor * 0.3); 
    }

    gl_FragColor = terrainColor;
}

`;
