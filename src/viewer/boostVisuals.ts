import * as THREE from "three";

export const BOOST_VISUAL_COLORS = {
  core: "#fff4b0",
  gold: "#ffb238",
  ember: "#ff6b18",
  bronze: "#29170b"
} as const;

export function createBoostPlumeMaterial(layer: "outer" | "core", length: number) {
  const core = layer === "core";
  return new THREE.ShaderMaterial({
    name: core ? "generic-boost-core" : "generic-boost-glow",
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uCore: { value: core ? 1 : 0 },
      uLength: { value: length }
    },
    vertexShader: BOOST_PLUME_VERTEX_SHADER,
    fragmentShader: BOOST_PLUME_FRAGMENT_SHADER
  });
}

export function createBoostBeamMaterial() {
  return new THREE.ShaderMaterial({
    name: "generic-boost-pad-ray",
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.7 }
    },
    vertexShader: BOOST_BEAM_VERTEX_SHADER,
    fragmentShader: BOOST_BEAM_FRAGMENT_SHADER
  });
}

export function createBoostDiscMaterial() {
  return new THREE.ShaderMaterial({
    name: "generic-boost-pad-glow",
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 }
    },
    vertexShader: BOOST_DISC_VERTEX_SHADER,
    fragmentShader: BOOST_DISC_FRAGMENT_SHADER
  });
}

export function createBoostOrbMaterial() {
  return new THREE.ShaderMaterial({
    name: "generic-boost-orb",
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 }
    },
    vertexShader: BOOST_ORB_VERTEX_SHADER,
    fragmentShader: BOOST_ORB_FRAGMENT_SHADER
  });
}

const BOOST_PLUME_VERTEX_SHADER = /* glsl */ `
  uniform float uLength;
  varying float vTrail;
  varying vec3 vNormal;

  void main() {
    vTrail = clamp(-position.x / uLength, 0.0, 1.0);
    vec4 localPosition = vec4(position, 1.0);
    vec3 localNormal = normal;
    #ifdef USE_INSTANCING
      localPosition = instanceMatrix * localPosition;
      localNormal = mat3(instanceMatrix) * localNormal;
    #endif
    vNormal = normalize(normalMatrix * localNormal);
    gl_Position = projectionMatrix * modelViewMatrix * localPosition;
  }
`;

const BOOST_PLUME_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uCore;
  varying float vTrail;
  varying vec3 vNormal;

  void main() {
    float upwardFade = pow(1.0 - vTrail, 1.35);
    float flicker = 0.88 + 0.12 * sin(uTime * 27.0 - vTrail * 15.0);
    float softEdge = mix(0.52, 1.0, pow(1.0 - abs(vNormal.z), 0.45));
    float alpha = uOpacity * upwardFade * flicker * softEdge;
    vec3 ember = vec3(1.0, 0.26, 0.025);
    vec3 gold = vec3(1.0, 0.68, 0.16);
    vec3 hot = vec3(1.0, 0.95, 0.62);
    vec3 color = mix(gold, ember, smoothstep(0.18, 1.0, vTrail));
    color = mix(color, hot, uCore * (1.0 - smoothstep(0.0, 0.64, vTrail)));
    gl_FragColor = vec4(color, alpha * mix(0.42, 0.9, uCore));
  }
`;

const BOOST_BEAM_VERTEX_SHADER = /* glsl */ `
  varying float vHeight;
  varying vec3 vNormal;

  void main() {
    // ConeGeometry maps v=0 at the pad and v=1 at its tip.
    vHeight = clamp(uv.y, 0.0, 1.0);
    vec4 localPosition = vec4(position, 1.0);
    vec3 localNormal = normal;
    #ifdef USE_INSTANCING
      localPosition = instanceMatrix * localPosition;
      localNormal = mat3(instanceMatrix) * localNormal;
    #endif
    vNormal = normalize(normalMatrix * localNormal);
    gl_Position = projectionMatrix * modelViewMatrix * localPosition;
  }
`;

const BOOST_BEAM_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying float vHeight;
  varying vec3 vNormal;

  void main() {
    // The ray is strongest at the pickup and becomes fully transparent upward.
    float upwardFade = pow(1.0 - vHeight, 2.25);
    float shimmer = 0.9 + 0.1 * sin(uTime * 5.5 + vHeight * 13.0);
    float softEdge = 0.46 + 0.54 * pow(1.0 - abs(vNormal.z), 0.55);
    vec3 color = mix(vec3(1.0, 0.34, 0.03), vec3(1.0, 0.86, 0.35), upwardFade);
    gl_FragColor = vec4(color, uOpacity * upwardFade * shimmer * softEdge);
  }
`;

const BOOST_DISC_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 localPosition = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      localPosition = instanceMatrix * localPosition;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * localPosition;
  }
`;

const BOOST_DISC_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 centered = vUv * 2.0 - 1.0;
    float radius = length(centered);
    float halo = 1.0 - smoothstep(0.18, 1.0, radius);
    float ring = 1.0 - smoothstep(0.035, 0.13, abs(radius - 0.56));
    float pulse = 0.9 + 0.1 * sin(uTime * 4.2);
    vec3 color = mix(vec3(1.0, 0.25, 0.015), vec3(1.0, 0.78, 0.24), ring);
    gl_FragColor = vec4(color, (halo * 0.44 + ring * 0.46) * pulse);
  }
`;

const BOOST_ORB_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec4 localPosition = vec4(position, 1.0);
    vec3 localNormal = normal;
    #ifdef USE_INSTANCING
      localPosition = instanceMatrix * localPosition;
      localNormal = mat3(instanceMatrix) * localNormal;
    #endif
    vec4 viewPosition = modelViewMatrix * localPosition;
    vViewPosition = viewPosition.xyz;
    vNormal = normalize(normalMatrix * localNormal);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const BOOST_ORB_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 viewDirection = normalize(-vViewPosition);
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), viewDirection)), 2.0);
    float pulse = 0.88 + 0.12 * sin(uTime * 4.6);
    vec3 color = mix(vec3(1.0, 0.42, 0.025), vec3(1.0, 0.94, 0.52), fresnel);
    gl_FragColor = vec4(color, (0.26 + fresnel * 0.74) * pulse);
  }
`;
