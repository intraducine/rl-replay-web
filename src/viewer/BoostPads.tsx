import { Billboard, useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { BoostPad } from "../replay/standardArenaBoostPads";
import { standardArenaBoostPads } from "../replay/standardArenaBoostPads";
import type { ReplayTimeline } from "../replay/types";
import { useViewerStore } from "../state/viewerStore";
import {
  boostPadPlaybackStateAt,
  boostPadScenePosition,
  inferBoostPadPickups,
  type BoostPadPickup
} from "./boostPadPlayback";
import { publicAsset } from "./publicAsset";
import { ROCKET_LEAGUE_BLOOM_LAYER } from "./renderLayers";

const BOOST_PAD_ASSET_ROOT = publicAsset("/rl-assets/champions-field-full/Pickup_Boost/StaticMesh3");
const SMALL_PAD_ASSET = `${BOOST_PAD_ASSET_ROOT}/BoostPad_Small_02_SM.gltf`;
const LARGE_PAD_ASSET = `${BOOST_PAD_ASSET_ROOT}/BoostPad_Large.gltf`;
const LARGE_PAD_GLOW_ASSET = `${BOOST_PAD_ASSET_ROOT}/BoostPad_Large_Glow.gltf`;
const BOOST_PAD_TEXTURE_ROOT = publicAsset("/rl-assets/champions-field-full/Pickup_Boost_Textures/Texture2D");
// Browser-safe PNG transcodes of the extracted DXT textures. Pixel content is unchanged.
const SMALL_PAD_TEXTURE = `${BOOST_PAD_TEXTURE_ROOT}/BoostPad_Small_D.png`;
const LARGE_PAD_TEXTURE = `${BOOST_PAD_TEXTURE_ROOT}/BoostPad_Large_D.png`;
const FX_TEXTURE_ROOT = publicAsset("/rl-assets/champions-field-full/FX_Textures/Texture2D");
const SPHERE_NORMAL_TEXTURE = `${FX_TEXTURE_ROOT}/Sphere_Uncompressed_N.png`;
const RADIAL_GLOW_TEXTURE = `${FX_TEXTURE_ROOT}/Radial_Generic_01_Pack.png`;
const CURVE_FIRE_TEXTURE = `${FX_TEXTURE_ROOT}/Curve_Fire_01_Pack.png`;
const SHOCKWAVE_TEXTURE = `${FX_TEXTURE_ROOT}/Curve_Shockwaves_Pack.png`;
const SMOKE_NOISE_TEXTURE = `${FX_TEXTURE_ROOT}/Noise_Smoke_03_Pack.png`;
const SPARKLE_TEXTURE = publicAsset("/rl-assets/champions-field-full/Detail_Sparkle/Texture2D/Sparkle_N.png");
const GRADIENT_CIRCLE_TEXTURE = publicAsset("/rl-assets/champions-field-full/General_FX/Texture2D/GradientCircle01.png");
const LIGHT_BEAM_TEXTURE = publicAsset("/rl-assets/champions-field-full/General_FX/Texture2D/LightBeam01_D.png");
const PAD_MODEL_SCALE = 100;

type BoostPadGeometries = {
  smallBase: THREE.BufferGeometry;
  smallEnergy: THREE.BufferGeometry;
  largeBase: THREE.BufferGeometry;
  largeScroll: THREE.BufferGeometry;
  largeGlow: THREE.BufferGeometry;
  billboard: THREE.PlaneGeometry;
};

type BoostPadMaterials = {
  smallBase: THREE.ShaderMaterial;
  smallEnergy: THREE.ShaderMaterial;
  largeBase: THREE.ShaderMaterial;
  largeScroll: THREE.ShaderMaterial;
  largeGlow: THREE.ShaderMaterial;
  orb: THREE.ShaderMaterial;
  orbHalo: THREE.ShaderMaterial;
  groundAura: THREE.ShaderMaterial;
  lightBeam: THREE.ShaderMaterial;
};

export function BoostPads({ timeline }: { timeline: ReplayTimeline }) {
  const geometries = useBoostPadGeometries();
  const materials = useBoostPadMaterials();
  const pickupsByPad = useMemo(() => inferBoostPadPickups(timeline), [timeline]);
  const currentTime = useViewerStore((state) => state.currentTime);

  return (
    <group name="rocket-league-boost-pads">
      {standardArenaBoostPads.map((pad) => (
        <BoostPadActor
          key={pad.id}
          pad={pad}
          currentTime={currentTime}
          pickups={pickupsByPad.get(pad.id)}
          geometries={geometries}
          materials={materials}
        />
      ))}
    </group>
  );
}

const DEBUG_SMALL_PAD: BoostPad = { id: -2, type: "small", position: [0, 0, 0] };
const DEBUG_LARGE_PAD: BoostPad = { id: -1, type: "large", position: [0, 0, 8] };

/** Source-asset pad pair used by the debug page for close-up visual verification. */
export function BoostPadDebugPreview() {
  const geometries = useBoostPadGeometries();
  const materials = useBoostPadMaterials();

  return (
    <group name="rocket-league-boost-pad-qa">
      <BoostPadActor
        pad={DEBUG_SMALL_PAD}
        currentTime={0}
        pickups={undefined}
        geometries={geometries}
        materials={materials}
        scenePosition={[-90, 0, 0]}
      />
      <BoostPadActor
        pad={DEBUG_LARGE_PAD}
        currentTime={0}
        pickups={undefined}
        geometries={geometries}
        materials={materials}
        scenePosition={[90, 0, 0]}
      />
    </group>
  );
}

function BoostPadActor({
  pad,
  currentTime,
  pickups,
  geometries,
  materials,
  scenePosition
}: {
  pad: BoostPad;
  currentTime: number;
  pickups: BoostPadPickup[] | undefined;
  geometries: BoostPadGeometries;
  materials: BoostPadMaterials;
  scenePosition?: [number, number, number];
}) {
  const energyGroup = useRef<THREE.Group>(null);
  const floatingEnergy = useRef<THREE.Group>(null);
  const rotatingGlow = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const displayedEnergy = useRef(1);
  const playbackState = boostPadPlaybackStateAt(pad, pickups, currentTime);
  const targetEnergy = useRef(playbackState.energy);
  targetEnergy.current = playbackState.energy;

  useLayoutEffect(() => {
    energyGroup.current?.traverse((object) => object.layers.enable(ROCKET_LEAGUE_BLOOM_LAYER));
  }, []);

  useFrame(({ clock }, delta) => {
    const group = energyGroup.current;
    if (!group) return;

    displayedEnergy.current = THREE.MathUtils.damp(displayedEnergy.current, targetEnergy.current, 24, delta);
    const energy = displayedEnergy.current;
    group.visible = energy > 0.002;
    group.scale.setScalar(Math.max(energy, 0.001));

    if (floatingEnergy.current) {
      floatingEnergy.current.position.y = 0.61 + Math.sin(clock.elapsedTime * 2.7 + pad.id * 0.73) * 0.025;
    }
    if (rotatingGlow.current) rotatingGlow.current.rotation.y = clock.elapsedTime * 0.82 + pad.id * 0.41;
    if (light.current) light.current.intensity = 34 * energy;
  });

  const position = scenePosition ?? boostPadScenePosition(pad);
  return (
    <group name={`boost-pad-${pad.type}-${pad.id}`} position={position} scale={PAD_MODEL_SCALE}>
      {pad.type === "small" ? (
        <>
          <mesh geometry={geometries.smallBase} material={materials.smallBase} renderOrder={1} />
          <group ref={energyGroup}>
            <mesh geometry={geometries.smallEnergy} material={materials.smallEnergy} renderOrder={4} />
          </group>
        </>
      ) : (
        <>
          <mesh geometry={geometries.largeBase} material={materials.largeBase} renderOrder={1} />
          <group ref={energyGroup}>
            <mesh geometry={geometries.billboard} material={materials.groundAura} rotation-x={-Math.PI / 2} scale={[1.72, 1.72, 1]} position-y={0.018} renderOrder={2} />
            <mesh geometry={geometries.largeScroll} material={materials.largeScroll} renderOrder={3} />
            <group ref={rotatingGlow}>
              <mesh geometry={geometries.largeGlow} material={materials.largeGlow} renderOrder={4} />
            </group>
            <Billboard follow position={[0, 0.36, 0]}>
              <mesh geometry={geometries.billboard} material={materials.lightBeam} scale={[0.66, 0.84, 1]} renderOrder={4} />
            </Billboard>
            <group ref={floatingEnergy} position={[0, 0.61, 0]}>
              <Billboard follow>
                <mesh geometry={geometries.billboard} material={materials.orbHalo} scale={[0.94, 0.94, 1]} renderOrder={5} />
                <mesh geometry={geometries.billboard} material={materials.orb} scale={[0.66, 0.66, 1]} renderOrder={6} />
              </Billboard>
            </group>
            <pointLight ref={light} color="#ff9f24" intensity={34} distance={3.2} decay={2} position={[0, 0.52, 0]} />
          </group>
        </>
      )}
    </group>
  );
}

function useBoostPadGeometries(): BoostPadGeometries {
  const smallPad = useGLTF(SMALL_PAD_ASSET);
  const largePad = useGLTF(LARGE_PAD_ASSET);
  const largePadGlow = useGLTF(LARGE_PAD_GLOW_ASSET);

  return useMemo(() => {
    const small = geometriesByHeight(smallPad.scene);
    const glow = geometriesByHeight(largePadGlow.scene);
    return {
      // Primitive 0 is the detailed 940-vertex body; primitive 1 is the flat
      // 118-vertex additive pickup surface. Height sorting places them last/first.
      smallBase: requiredGeometry(small[small.length - 1], SMALL_PAD_ASSET),
      smallEnergy: requiredGeometry(small[0], SMALL_PAD_ASSET),
      largeBase: requiredGeometry(geometriesByHeight(largePad.scene)[0], LARGE_PAD_ASSET),
      largeScroll: requiredGeometry(glow[0], LARGE_PAD_GLOW_ASSET),
      largeGlow: requiredGeometry(glow[glow.length - 1], LARGE_PAD_GLOW_ASSET),
      billboard: new THREE.PlaneGeometry(1, 1)
    };
  }, [largePad.scene, largePadGlow.scene, smallPad.scene]);
}

function useBoostPadMaterials(): BoostPadMaterials {
  const [smallDiffuse, largeDiffuse, curveFire, shockwave, smokeNoise, sparkle, sphereNormal, radialGlow, gradientCircle, lightBeam] = useTexture([
    SMALL_PAD_TEXTURE,
    LARGE_PAD_TEXTURE,
    CURVE_FIRE_TEXTURE,
    SHOCKWAVE_TEXTURE,
    SMOKE_NOISE_TEXTURE,
    SPARKLE_TEXTURE,
    SPHERE_NORMAL_TEXTURE,
    RADIAL_GLOW_TEXTURE,
    GRADIENT_CIRCLE_TEXTURE,
    LIGHT_BEAM_TEXTURE
  ]);

  useLayoutEffect(() => {
    [smallDiffuse, largeDiffuse, curveFire, shockwave, smokeNoise, sparkle, sphereNormal, radialGlow, gradientCircle, lightBeam].forEach(configurePadTexture);
    smokeNoise.wrapS = smokeNoise.wrapT = THREE.RepeatWrapping;
    sparkle.wrapS = sparkle.wrapT = THREE.RepeatWrapping;
  }, [curveFire, gradientCircle, largeDiffuse, lightBeam, radialGlow, shockwave, smallDiffuse, smokeNoise, sparkle, sphereNormal]);

  const materials = useMemo<BoostPadMaterials>(
    () => ({
      smallBase: createPadSurfaceMaterial("boost-pad-small-plate", smallDiffuse, 0.82),
      smallEnergy: createSmallPadEnergyMaterial(curveFire, gradientCircle),
      largeBase: createPadSurfaceMaterial("boost-pad-large-plate", largeDiffuse, 0.72),
      largeScroll: createLargePadScrollMaterial(curveFire),
      largeGlow: createLargePadGlowMaterial(shockwave, smokeNoise),
      orb: createBoostOrbMaterial(sphereNormal, sparkle, smokeNoise),
      orbHalo: createTextureGlowMaterial("BoostOrb_Glow_Mat", radialGlow, new THREE.Color(1, 0.43, 0.035), 1.25),
      groundAura: createTextureGlowMaterial("BoostPad_Warm_PS", gradientCircle, new THREE.Color(1, 0.25, 0.008), 0.72),
      lightBeam: createTextureGlowMaterial("LightConeSprite_Mat", lightBeam, new THREE.Color(1, 0.38, 0.025), 0.5)
    }),
    [curveFire, gradientCircle, largeDiffuse, lightBeam, radialGlow, shockwave, smallDiffuse, smokeNoise, sparkle, sphereNormal]
  );

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    Object.values(materials).forEach((material) => {
      const timeUniform = material.uniforms.uTime;
      if (timeUniform) timeUniform.value = time;
    });
  });

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
    },
    [materials]
  );
  return materials;
}

function createPadSurfaceMaterial(name: string, diffuse: THREE.Texture, opacity: number) {
  return new THREE.ShaderMaterial({
    name,
    transparent: true,
    depthWrite: false,
    toneMapped: true,
    uniforms: {
      uDiffuse: { value: diffuse },
      uOpacity: { value: opacity }
    },
    vertexShader: PAD_VERTEX_SHADER,
    fragmentShader: PAD_SURFACE_FRAGMENT_SHADER
  });
}

function createSmallPadEnergyMaterial(curveFire: THREE.Texture, gradientCircle: THREE.Texture) {
  return new THREE.ShaderMaterial({
    name: "BoostPad_02_Mat",
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: true,
    uniforms: {
      uCurveFire: { value: curveFire },
      uGradientCircle: { value: gradientCircle },
      uTime: { value: 0 }
    },
    vertexShader: PAD_VERTEX_SHADER,
    fragmentShader: SMALL_PAD_ENERGY_FRAGMENT_SHADER
  });
}

function createLargePadScrollMaterial(curveFire: THREE.Texture) {
  return new THREE.ShaderMaterial({
    name: "BoostPad_Scroll_INST",
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: true,
    uniforms: {
      uCurveFire: { value: curveFire },
      uTime: { value: 0 }
    },
    vertexShader: PAD_VERTEX_SHADER,
    fragmentShader: LARGE_PAD_SCROLL_FRAGMENT_SHADER
  });
}

function createLargePadGlowMaterial(shockwave: THREE.Texture, smokeNoise: THREE.Texture) {
  return new THREE.ShaderMaterial({
    name: "BoostPad_Glowing_INST",
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    toneMapped: true,
    uniforms: {
      uShockwave: { value: shockwave },
      uSmokeNoise: { value: smokeNoise },
      uTime: { value: 0 }
    },
    vertexShader: PAD_VERTEX_SHADER,
    fragmentShader: LARGE_PAD_GLOW_FRAGMENT_SHADER
  });
}

function createBoostOrbMaterial(sphereNormal: THREE.Texture, sparkle: THREE.Texture, smokeNoise: THREE.Texture) {
  return new THREE.ShaderMaterial({
    name: "BoostOrb_2D_Mat",
    transparent: true,
    depthWrite: false,
    toneMapped: true,
    uniforms: {
      uSphereNormal: { value: sphereNormal },
      uSparkle: { value: sparkle },
      uSmokeNoise: { value: smokeNoise },
      uTime: { value: 0 }
    },
    vertexShader: PAD_VERTEX_SHADER,
    fragmentShader: BOOST_ORB_FRAGMENT_SHADER
  });
}

function createTextureGlowMaterial(name: string, map: THREE.Texture, color: THREE.Color, opacity: number) {
  return new THREE.ShaderMaterial({
    name,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: true,
    uniforms: {
      uMap: { value: map },
      uColor: { value: color },
      uOpacity: { value: opacity },
      uTime: { value: 0 }
    },
    vertexShader: PAD_VERTEX_SHADER,
    fragmentShader: TEXTURE_GLOW_FRAGMENT_SHADER
  });
}

function configurePadTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.NoColorSpace;
  texture.flipY = false;
  texture.anisotropy = 16;
  texture.needsUpdate = true;
}

function geometriesByHeight(scene: THREE.Object3D): THREE.BufferGeometry[] {
  const geometries: THREE.BufferGeometry[] = [];
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.computeBoundingBox();
    geometries.push(object.geometry);
  });
  return geometries.sort((left, right) => geometryMaximumHeight(left) - geometryMaximumHeight(right));
}

function geometryMaximumHeight(geometry: THREE.BufferGeometry): number {
  geometry.computeBoundingBox();
  return geometry.boundingBox?.max.y ?? 0;
}

function requiredGeometry(geometry: THREE.BufferGeometry | undefined, asset: string): THREE.BufferGeometry {
  if (!geometry) throw new Error(`Boost pad mesh is missing geometry: ${asset}`);
  return geometry;
}

const PAD_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PAD_SURFACE_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uDiffuse;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vec3 packed = texture2D(uDiffuse, vUv).rgb;
    float etchedMask = clamp(max(packed.g, packed.b) * 1.2, 0.0, 1.0);
    float facing = 0.65 + 0.35 * abs(vNormal.z);
    vec3 bronze = vec3(0.19, 0.075, 0.008);
    vec3 hotGold = vec3(1.35, 0.48, 0.025);
    vec3 color = mix(bronze, hotGold, etchedMask) * facing;
    gl_FragColor = vec4(color, uOpacity * (0.58 + etchedMask * 0.42));
  }
`;

const SMALL_PAD_ENERGY_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uCurveFire;
  uniform sampler2D uGradientCircle;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vec3 curve = texture2D(uCurveFire, vec2(0.5, clamp(vUv.y, 0.0, 1.0))).rgb;
    float circularMask = texture2D(uGradientCircle, vUv).r;
    float sourceMask = clamp(curve.r * 0.7 + curve.b * 0.45 + circularMask * 0.18, 0.0, 1.0);
    float pulse = 0.94 + 0.06 * sin(uTime * 5.2 + vUv.y * 9.0);
    float rim = pow(1.0 - abs(vNormal.z), 1.6);
    vec3 colorA = vec3(0.88, 0.42, 0.05) * 1.5;
    vec3 colorB = vec3(1.0, 0.779145, 0.199686);
    vec3 colorC = vec3(1.0, 0.876508, 0.552503);
    vec3 color = mix(colorA, colorB, smoothstep(0.08, 0.62, vUv.y));
    color = mix(color, colorC, rim * 0.55) * pulse;
    // Three's additive blend already multiplies RGB by source alpha. Applying sourceMask
    // to both channels squares the extracted material mask and makes the pickup disappear.
    float opacity = clamp(sourceMask * (0.78 + rim * 0.22), 0.0, 1.0);
    gl_FragColor = vec4(color, opacity);
  }
`;

const LARGE_PAD_SCROLL_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uCurveFire;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec3 curve = texture2D(uCurveFire, vec2(0.5, clamp(vUv.y, 0.0, 1.0))).rgb;
    float wave = clamp(curve.r * 0.78 + curve.b * 0.45, 0.0, 1.0);
    vec3 colorA = vec3(1.0, 0.841994, 0.747191);
    vec3 colorB = vec3(2.0, 1.5, 0.5);
    vec3 color = mix(colorA, colorB, wave);
    gl_FragColor = vec4(color * wave, wave * 0.62);
  }
`;

const LARGE_PAD_GLOW_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uShockwave;
  uniform sampler2D uSmokeNoise;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    float noise = texture2D(uSmokeNoise, vUv * 2.1 + vec2(uTime * 0.055, -uTime * 0.1)).b;
    float wave = texture2D(uShockwave, vUv + vec2(noise * 0.03, uTime * 0.16)).g;
    float fresnel = pow(1.0 - abs(vNormal.z), 1.35);
    vec3 sourceColor = vec3(1.0, 0.84191, 0.797753);
    vec3 color = sourceColor * vec3(1.45, 0.58, 0.12) * (0.65 + wave * 0.9);
    float alpha = clamp(0.12 + wave * 0.36 + fresnel * 0.28, 0.0, 0.72);
    gl_FragColor = vec4(color, alpha);
  }
`;

const BOOST_ORB_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uSphereNormal;
  uniform sampler2D uSparkle;
  uniform sampler2D uSmokeNoise;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 centered = vUv * 2.0 - 1.0;
    float radiusSquared = dot(centered, centered);
    if (radiusSquared > 1.0) discard;

    vec3 normalTexture = texture2D(uSphereNormal, vUv).rgb * 2.0 - 1.0;
    vec3 sphereNormal = normalize(vec3(normalTexture.xy, sqrt(max(0.001, 1.0 - radiusSquared))));
    vec3 lightDirection = normalize(vec3(-0.32, 0.64, 0.7));
    float diffuse = max(dot(sphereNormal, lightDirection), 0.0);
    float fresnel = pow(1.0 - sphereNormal.z, 2.2);
    float noise = texture2D(uSmokeNoise, vUv * 2.4 + vec2(uTime * 0.07, -uTime * 0.11)).r;
    float sparkle = texture2D(uSparkle, vUv * 3.2 + vec2(-uTime * 0.13, uTime * 0.09)).g;
    sparkle = pow(max(sparkle, 0.0), 6.0);

    vec3 shadowGold = vec3(0.58, 0.12, 0.004);
    vec3 sourceGold = vec3(1.5, 0.64, 0.055);
    vec3 hotGold = vec3(2.5, 1.0, 0.125);
    vec3 color = mix(shadowGold, sourceGold, diffuse);
    color = mix(color, hotGold, smoothstep(0.55, 1.0, diffuse + noise * 0.16));
    color += sparkle * vec3(2.2, 1.2, 0.28);
    float alpha = (1.0 - smoothstep(0.82, 1.0, radiusSquared)) * (0.92 + noise * 0.08);
    gl_FragColor = vec4(color + fresnel * vec3(0.42, 0.12, 0.01), alpha);
  }
`;

const TEXTURE_GLOW_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec4 sampled = texture2D(uMap, vUv);
    // Unreal stores these masks in RGB; the transcode's opaque alpha is not material opacity.
    float energy = max(sampled.r, max(sampled.g, sampled.b));
    float breathe = 0.94 + 0.06 * sin(uTime * 4.2);
    gl_FragColor = vec4(uColor * energy * 2.0 * breathe, energy * uOpacity);
  }
`;

useGLTF.preload(SMALL_PAD_ASSET);
useGLTF.preload(LARGE_PAD_ASSET);
useGLTF.preload(LARGE_PAD_GLOW_ASSET);
