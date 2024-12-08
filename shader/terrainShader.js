export const terrainVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const terrainFragmentShader = `
uniform sampler2D sandTex;
uniform sampler2D grassTex;
uniform sampler2D rockTex;
uniform sampler2D splatMap;

varying vec2 vUv;

void main() {
    vec4 splat = texture2D(splatMap, vUv);
    float total = splat.r + splat.g + splat.b;
    if (total < 0.001) {
        total = 1.0;
    }

    vec4 sandColor = texture2D(sandTex, vUv);
    vec4 grassColor = texture2D(grassTex, vUv);
    vec4 rockColor = texture2D(rockTex, vUv);

    vec4 finalColor = (sandColor * splat.r +
                       grassColor * splat.g +
                       rockColor * splat.b) / total;

    gl_FragColor = finalColor;
}
`;
