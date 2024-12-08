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

    vec4 terrainColor = splatColor.r * sandColor +
                        splatColor.g * grassColor +
                        splatColor.b * rockColor;

    float heightFactor = (vPosition.y + 5.0) / 30.0; // Normalize height
    terrainColor.rgb *= heightFactor;

    gl_FragColor = terrainColor;
}

`;
