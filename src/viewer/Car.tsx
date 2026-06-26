import { Html, useGLTF, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { forwardRef, Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Group } from "three";
import type { CarFrame, ReplayPlayer } from "../replay/types";
import {
  ALPHA_BOOST_CASCADE,
  ALPHA_BOOST_TEXTURE_PATHS,
  sampleAlphaBoostFloatCurve,
  sampleAlphaBoostSourceFloatCurve,
  sampleAlphaBoostVectorCurve
} from "./alphaBoostConfig";
import {
  createAlphaRewardBoostMeshMaterial,
  createLiquidGoldParticleMaterial,
  updateAlphaRewardBoostMeshMaterial,
  updateLiquidGoldParticleMaterial
} from "./alphaBoostMaterial";
import type { LiquidGoldDynamicParams, LiquidGoldParticleUpdate } from "./alphaBoostMaterial";
import { alphaBoostBloomEnabled, alphaBoostComponentEnabled } from "./alphaBoostDebugFlags";
import { carRenderPosition } from "./carPlacement";
import { publicAsset } from "./publicAsset";
import { ROCKET_LEAGUE_BLOOM_LAYER } from "./renderLayers";
import { teamCarPaint, teamClassName } from "./teamColors";

const OCTANE_ASSET = publicAsset("/rl-assets/octane/Body_OctaneWheels_SM.gltf");
const OCTANE_BODY_TEXTURE = publicAsset("/rl-assets/octane/Pepe_Body_D.png");
const OCTANE_CHASSIS_TEXTURE = publicAsset("/rl-assets/octane/Chasis_Pepe_D.png");
const OCTANE_SCALE = 100;
const ALPHA_BOOST_OBJECT_NAME = "alphaBoost";
const SUPERSONIC_TRAIL_OBJECT_NAME = "supersonicTrail";
const ALPHA_BOOST_MESH_ASSET = publicAsset(ALPHA_BOOST_CASCADE.boostMesh.assetPath);
const ALPHA_BOOST_TEXTURES = ALPHA_BOOST_TEXTURE_PATHS.map(publicAsset);
const ALPHA_BOOST_WATER_NORMAL_TEXTURE = publicAsset("/rl-assets/alpha-boost/Water_02_N.png");
const ALPHA_BOOST_LENS_FLARE_TEXTURE = publicAsset(ALPHA_BOOST_CASCADE.lensFlare.material.referencedTexturePath);
const ALPHA_LENS_FLARE_COLOR = new THREE.Color(
  ALPHA_BOOST_CASCADE.lensFlare.sourceColorRgba[0],
  ALPHA_BOOST_CASCADE.lensFlare.sourceColorRgba[1],
  ALPHA_BOOST_CASCADE.lensFlare.sourceColorRgba[2]
);
const ALPHA_LENS_FLARE_REFLECTION = ALPHA_BOOST_CASCADE.lensFlare.reflections[0];
const ALPHA_LENS_FLARE_REFLECTION_COLOR = new THREE.Color();
const ALPHA_BOOST_ATTACHMENT_POSITIONS = ALPHA_BOOST_CASCADE.boostMesh.sourceAttachmentOverrides.map(sourceAttachmentViewerPosition);
const ALPHA_LENS_FLARE_POSITION = sourceAveragePosition(ALPHA_BOOST_ATTACHMENT_POSITIONS);
const ALPHA_BOOST_MAIN_BODY_POSITION = ALPHA_LENS_FLARE_POSITION;
const ALPHA_RENDERED_FLAME_PARTICLES_PER_EXHAUST = ALPHA_BOOST_CASCADE.flame.peakActiveParticles;
const ALPHA_MAIN_SPAWN_BIRTH_OFFSETS = sourceCascadeSpawnOffsets(
  ALPHA_BOOST_CASCADE.main.spawnRate,
  sourceEmitterSimulationWindow(ALPHA_BOOST_CASCADE.main.lifetimeSeconds, ALPHA_BOOST_CASCADE.main.emitterDurationSeconds),
  ALPHA_BOOST_CASCADE.updateStepSeconds
);
const ALPHA_RENDERED_MAIN_PARTICLES = sourceCascadeSpawnAccumulatorActiveParticles(
  ALPHA_MAIN_SPAWN_BIRTH_OFFSETS,
  ALPHA_BOOST_CASCADE.main.lifetimeSeconds,
  ALPHA_BOOST_CASCADE.main.peakActiveParticles
);
const ALPHA_FLAME_DENSITY_OPACITY = 1;
const ALPHA_BOOST_MESH_FADE_IN_DURATION = sourceTimeRangeDuration(ALPHA_BOOST_CASCADE.boostMesh.fadeInTime);
const ALPHA_BOOST_MESH_FADE_OUT_DURATION = sourceTimeRangeDuration(ALPHA_BOOST_CASCADE.boostMesh.fadeOutTime);
const ALPHA_FLAME_VELOCITY_OVER_LIFE_INTEGRAL = sourceIntegratedFlameVelocityOverLifeSamples();
const BILLBOARD_ROOT_QUATERNION = new THREE.Quaternion();
const ALPHA_LENS_FLARE_ROOT_QUATERNION = new THREE.Quaternion();
const ALPHA_LENS_FLARE_WORLD_DIRECTION = new THREE.Vector3();
const ALPHA_LENS_FLARE_WORLD_POSITION = new THREE.Vector3();
const ALPHA_LENS_FLARE_CAMERA_DIRECTION = new THREE.Vector3();
const ALPHA_LENS_FLARE_OCCLUSION_RAYCASTER = new THREE.Raycaster();
const ALPHA_LENS_FLARE_OCCLUSION_TARGET = new THREE.Vector3();
const ALPHA_LENS_FLARE_OCCLUSION_OFFSET = new THREE.Vector3();
const ALPHA_LENS_FLARE_OCCLUSION_CAMERA_RIGHT = new THREE.Vector3();
const ALPHA_LENS_FLARE_OCCLUSION_CAMERA_UP = new THREE.Vector3();
const ALPHA_LENS_FLARE_OCCLUSION_SAMPLE_OFFSETS = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-0.7071067811865476, -0.7071067811865476],
  [0.7071067811865476, -0.7071067811865476],
  [-0.7071067811865476, 0.7071067811865476],
  [0.7071067811865476, 0.7071067811865476]
] as const;
const ALPHA_LENS_FLARE_OCCLUSION_HITS: THREE.Intersection<THREE.Object3D>[] = [];
const FLAME_SPAWN_LOCAL_POSITION = new THREE.Vector3();
const FLAME_WORLD_POSITION = new THREE.Vector3();
const FLAME_WORLD_OFFSET = new THREE.Vector3();
const UE_TO_VIEWER_BASIS = new THREE.Matrix4().set(
  1, 0, 0, 0,
  0, 0, 1, 0,
  0, 1, 0, 0,
  0, 0, 0, 1
);
const UE_TO_VIEWER_BASIS_INVERSE = UE_TO_VIEWER_BASIS.clone().invert();
const SOURCE_TRANSFORM_MATRIX = new THREE.Matrix4();
const SOURCE_ROTATION_MATRIX = new THREE.Matrix4();
const SOURCE_SCALE_MATRIX = new THREE.Matrix4();
const SOURCE_CONVERTED_MATRIX = new THREE.Matrix4();
const SOURCE_POSITION = new THREE.Vector3();
const SOURCE_SCALE = new THREE.Vector3();
const SOURCE_QUATERNION = new THREE.Quaternion();
const SOURCE_VECTOR = new THREE.Vector3();
const SOURCE_RANDOM_FLOAT_BUFFER = new ArrayBuffer(4);
const SOURCE_RANDOM_FLOAT_VIEW = new DataView(SOURCE_RANDOM_FLOAT_BUFFER);
const ALPHA_LENS_FLARE_VIEWER_DIRECTION = sourceAttachmentViewerVector(
  { rotation: ALPHA_BOOST_CASCADE.lensFlare.sourceComponentRotation },
  [1, 0, 0]
);
const ALPHA_FLAME_PARTICLE_SIZES = Array.from(
  { length: ALPHA_BOOST_ATTACHMENT_POSITIONS.length * ALPHA_RENDERED_FLAME_PARTICLES_PER_EXHAUST },
  (_, index) => sourceRuntimeFlameParticleSize(index)
);
const ALPHA_MAIN_BODY_VELOCITIES = Array.from({ length: ALPHA_RENDERED_MAIN_PARTICLES }, (_, index) => sourceMainBodyVelocity(index));
const ALPHA_MAIN_START_SIZES = Array.from({ length: ALPHA_RENDERED_MAIN_PARTICLES }, (_, index) => sourceMainStartSize(index));
const ALPHA_FLAME_DYNAMIC_PARAMS: LiquidGoldDynamicParams = { distortionAmount: 0, brightness: 1, noiseAmount: 1, softAmount: 1 };
const ALPHA_MAIN_DYNAMIC_PARAMS: LiquidGoldDynamicParams = { distortionAmount: 0, brightness: 1, noiseAmount: 1, softAmount: 1 };
const ALPHA_FLAME_PARTICLE_UPDATE: LiquidGoldParticleUpdate = {
  opacity: 0,
  colorScale: 1,
  phase: 0,
  dynamic: ALPHA_FLAME_DYNAMIC_PARAMS,
  time: 0
};
const ALPHA_MAIN_PARTICLE_UPDATE: LiquidGoldParticleUpdate = {
  opacity: 0,
  colorScale: 1,
  phase: 0,
  dynamic: ALPHA_MAIN_DYNAMIC_PARAMS,
  time: 0
};

type FlameParticleState = {
  phase: number;
  spawnWorldPosition: THREE.Vector3;
  spawnLocalVelocity: [number, number, number];
  sourceAcceleration: [number, number, number];
};

type SourceRandomDrawOrder = {
  drawsPerParticle: number;
  firstDraw: number;
};

export const Car = forwardRef<Group, { frame?: CarFrame; player: ReplayPlayer; selected?: boolean; showNameplate?: boolean }>(function Car(
  { frame, player, selected = false, showNameplate = true },
  ref
) {
  return (
    <group ref={ref} position={frame ? carRenderPosition(frame.position) : [0, 0, 0]} quaternion={frame?.rotation ?? [0, 0, 0, 1]} visible={Boolean(frame)}>
      <Suspense fallback={null}>
        <OctaneModel player={player} />
        <AlphaBoost />
      </Suspense>
      <group name={SUPERSONIC_TRAIL_OBJECT_NAME} visible={false}>
        <mesh position={[-120, 0, 0]} rotation-z={Math.PI / 2}>
          <coneGeometry args={[42, 120, 18]} />
          <meshStandardMaterial color="#fff0a6" transparent opacity={0.62} />
        </mesh>
      </group>
      {showNameplate ? (
        <Html position={[0, 150, 0]} center distanceFactor={14}>
          <div className={`nameplate ${teamClassName(player.team)} ${selected ? "selected" : ""}`}>{player.name}</div>
        </Html>
      ) : null}
    </group>
  );
});

function AlphaBoost() {
  const { scene, size } = useThree();
  const rootRef = useRef<Group | null>(null);
  const flameRefs = useRef<THREE.Mesh[]>([]);
  const flameParticleStates = useRef<FlameParticleState[]>([]);
  const lensFlareRef = useRef<THREE.Sprite | null>(null);
  const lensFlareReflectionRef = useRef<THREE.Sprite | null>(null);
  const mainRefs = useRef<THREE.Mesh[]>([]);
  const boostMeshRefs = useRef<THREE.Group[]>([]);
  const { scene: boostMeshScene } = useGLTF(ALPHA_BOOST_MESH_ASSET);
  const [coneMap, cloudMap, dustMap, particleMap, smokeNoiseMap, waterNormalMap, lensFlareMap] = useTexture([
    ...ALPHA_BOOST_TEXTURES,
    ALPHA_BOOST_WATER_NORMAL_TEXTURE,
    ALPHA_BOOST_LENS_FLARE_TEXTURE
  ]);

  const textures = useMemo(
    () => ({
      cone: configureAlphaTexture(coneMap, alphaTextureWrap("cone", 0), alphaTextureWrap("cone", 1), alphaTextureColorSpace("cone")),
      cloud: configureAlphaTexture(cloudMap, alphaTextureWrap("cloud", 0), alphaTextureWrap("cloud", 1), alphaTextureColorSpace("cloud")),
      dust: configureAlphaTexture(dustMap, alphaTextureWrap("dust", 0), alphaTextureWrap("dust", 1), alphaTextureColorSpace("dust")),
      particle: configureAlphaTexture(particleMap, THREE.RepeatWrapping, THREE.RepeatWrapping, alphaTextureColorSpace("particle")),
      smokeNoise: configureAlphaTexture(smokeNoiseMap, alphaTextureWrap("smokeNoise", 0), alphaTextureWrap("smokeNoise", 1), alphaTextureColorSpace("smokeNoise")),
      waterNormal: configureAlphaTexture(waterNormalMap, THREE.RepeatWrapping, THREE.RepeatWrapping, alphaTextureColorSpace("waterNormal")),
      lensFlare: configureAlphaTexture(lensFlareMap, THREE.RepeatWrapping, THREE.RepeatWrapping, THREE.SRGBColorSpace)
    }),
    [cloudMap, coneMap, dustMap, lensFlareMap, particleMap, smokeNoiseMap, waterNormalMap]
  );

  const liquidGoldMaterials = useMemo(() => {
    const sharedTextures = {
      cloudMap: textures.cloud,
      coneMap: textures.cone,
      dustMap: textures.dust,
      smokeNoiseMap: textures.smokeNoise
    };

    return {
      flame: Array.from({ length: ALPHA_BOOST_ATTACHMENT_POSITIONS.length * ALPHA_RENDERED_FLAME_PARTICLES_PER_EXHAUST }, () =>
        createLiquidGoldParticleMaterial(sharedTextures)
      ),
      main: Array.from({ length: ALPHA_RENDERED_MAIN_PARTICLES }, () => createLiquidGoldParticleMaterial(sharedTextures))
    };
  }, [textures]);

  const boostMeshMaterial = useMemo(
    () =>
      createAlphaRewardBoostMeshMaterial({
        particleMap: textures.particle,
        waterNormalMap: textures.waterNormal
      }),
    [textures]
  );

  const boostMeshes = useMemo(
    () =>
      ALPHA_BOOST_CASCADE.boostMesh.sourceAttachmentOverrides.map((attachment) => {
        const clone = boostMeshScene.clone(true);
        applySourceBoostMeshTransform(clone, attachment);
        clone.matrixAutoUpdate = false;
        clone.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.material = boostMeshMaterial;
            if (alphaBoostBloomEnabled("mesh")) object.layers.enable(ROCKET_LEAGUE_BLOOM_LAYER);
            object.renderOrder = 4;
          }
        });
        return clone;
      }),
    [boostMeshMaterial, boostMeshScene]
  );

  useFrame(({ camera, clock }, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const boostActive = root.userData.alphaBoostActive === true;
    if (!root.visible && !boostActive) return;
    if (boostActive) root.visible = true;

    const replayTime = typeof root.userData.alphaBoostTime === "number" ? root.userData.alphaBoostTime : clock.elapsedTime;
    const particleSystemTime = typeof root.userData.alphaBoostEmitterAge === "number" ? root.userData.alphaBoostEmitterAge : replayTime;
    const t = sourceParticleSystemTime(particleSystemTime);
    const previousBoostMeshFade = typeof root.userData.boostMeshFade === "number" ? root.userData.boostMeshFade : 0;
    const boostMeshFade = sourceBoostMeshFade(boostActive, delta, particleSystemTime, previousBoostMeshFade);
    const particleVisibility = boostActive ? 1 : boostMeshFade;
    root.userData.boostMeshFade = boostMeshFade;
    if (!boostActive && boostMeshFade <= 0) root.visible = false;

    const speed = typeof root.userData.speed === "number" ? root.userData.speed : 0;
    const localVelocity = Array.isArray(root.userData.localVelocity) ? root.userData.localVelocity : [0, 0, 0];
    const flameDistanceWindow =
      typeof root.userData.alphaBoostFlameDistanceWindow === "number" ? root.userData.alphaBoostFlameDistanceWindow : speed * ALPHA_BOOST_CASCADE.flame.lifetimeSeconds;
    const flameSpawnAges = Array.isArray(root.userData.alphaBoostFlameSpawnAges) ? root.userData.alphaBoostFlameSpawnAges : undefined;
    const flameSpawnRate = sourceSpawnPerUnitRateFromDistance(flameDistanceWindow, ALPHA_BOOST_CASCADE.flame.lifetimeSeconds, ALPHA_BOOST_CASCADE.flame.spawnPerUnit, ALPHA_BOOST_CASCADE.flame.runtimeParameters.spawnRate.averageScalar);
    const activeFlameParticlesPerExhaust = sourceActiveFlameParticlesPerExhaust(flameSpawnRate);
    const billboardQuaternion = root.getWorldQuaternion(BILLBOARD_ROOT_QUATERNION).invert().multiply(camera.quaternion);
    const meshComponentEnabled = alphaBoostComponentEnabled("mesh");
    const flameComponentEnabled = alphaBoostComponentEnabled("flame");
    const mainComponentEnabled = alphaBoostComponentEnabled("main");
    const lensFlareComponentEnabled = alphaBoostComponentEnabled("lensFlare");
    const lensFlareReflectionComponentEnabled = alphaBoostComponentEnabled("lensFlareReflection");
    updateAlphaRewardBoostMeshMaterial(boostMeshMaterial, t, boostMeshFade);

    for (let index = 0; index < boostMeshRefs.current.length; index++) {
      const mesh = boostMeshRefs.current[index];
      mesh.visible = meshComponentEnabled;
    }

    for (let index = 0; index < flameRefs.current.length; index++) {
      const particle = flameRefs.current[index];
      const emitterIndex = index % ALPHA_RENDERED_FLAME_PARTICLES_PER_EXHAUST;
      const exhaustIndex = Math.floor(index / ALPHA_RENDERED_FLAME_PARTICLES_PER_EXHAUST);
      particle.visible = flameComponentEnabled && emitterIndex < activeFlameParticlesPerExhaust && particleVisibility > 0;
      if (!particle.visible) continue;

      const particleClock = sourceSpawnPerUnitParticleAge(emitterIndex, flameSpawnAges, flameSpawnRate, ALPHA_BOOST_CASCADE.flame.lifetimeSeconds, ALPHA_BOOST_CASCADE.updateStepSeconds);
      const phase = particleClock / ALPHA_BOOST_CASCADE.flame.lifetimeSeconds;
      const origin = ALPHA_BOOST_ATTACHMENT_POSITIONS[exhaustIndex % ALPHA_BOOST_ATTACHMENT_POSITIONS.length];
      const age = particleClock;
      const sizeLife = sampleAlphaBoostVectorCurve(ALPHA_BOOST_CASCADE.flame.sizeMultiplierLife, phase);
      const particleSize = ALPHA_FLAME_PARTICLE_SIZES[index];
      const alphaLife = sampleAlphaBoostFloatCurve(ALPHA_BOOST_CASCADE.flame.alphaScaleOverLife, phase);
      sampleFlameDynamicParams(phase, ALPHA_FLAME_DYNAMIC_PARAMS);
      let particleState = flameParticleStates.current[index];
      if (!hasCompleteFlameParticleState(particleState) || phase < particleState.phase) {
        particleState = spawnFlameParticleState(root, origin, localVelocity, index);
        flameParticleStates.current[index] = particleState;
      }
      particleState.phase = phase;
      setSourceFlameWorldOffset(FLAME_WORLD_OFFSET, age, phase, particleState.spawnLocalVelocity, particleState.sourceAcceleration);
      FLAME_WORLD_POSITION.copy(particleState.spawnWorldPosition).add(FLAME_WORLD_OFFSET);
      particle.position.copy(root.worldToLocal(FLAME_WORLD_POSITION));
      particle.quaternion.copy(billboardQuaternion);
      particle.scale.set(
        particleSize[0] * sizeLife[0],
        particleSize[1] * sizeLife[1],
        1
      );
      if (particle.material instanceof THREE.ShaderMaterial) {
        ALPHA_FLAME_PARTICLE_UPDATE.opacity = Math.min(1, alphaLife * ALPHA_FLAME_DENSITY_OPACITY) * particleVisibility;
        ALPHA_FLAME_PARTICLE_UPDATE.colorScale = 1;
        ALPHA_FLAME_PARTICLE_UPDATE.phase = phase;
        ALPHA_FLAME_PARTICLE_UPDATE.time = t;
        updateLiquidGoldParticleMaterial(particle.material, ALPHA_FLAME_PARTICLE_UPDATE);
      }
    }

    if (lensFlareRef.current) {
      const sprite = lensFlareRef.current;
      sprite.position.set(ALPHA_LENS_FLARE_POSITION[0], ALPHA_LENS_FLARE_POSITION[1], ALPHA_LENS_FLARE_POSITION[2]);
      const coneVisibility = sourceLensFlareConeVisibility(root, sprite, camera);
      const visibleScreenPercentage = sourceLensFlareVisibleScreenPercentage(scene, camera, sprite, root);
      const screenPercentageOpacity = sourceLensFlareScreenPercentageOpacity(visibleScreenPercentage);
      sprite.scale.setScalar(sourceLensFlareWorldSize(camera, size.height, sprite, ALPHA_BOOST_CASCADE.lensFlare.sourceElement.size[0]));
      const sourceElementOpacity = sourceLensFlareElementHasMaterial() ? sourceLensFlareElementAlpha() * coneVisibility * screenPercentageOpacity * particleVisibility : 0;
      setBoostOpacity(sprite, lensFlareComponentEnabled ? sourceElementOpacity : 0);

      if (lensFlareReflectionRef.current) {
        const reflection = lensFlareReflectionRef.current;
        reflection.position.copy(sprite.position);
        const reflectionScale = sourceLensFlareReflectionScale();
        reflection.scale.set(
          sourceLensFlareWorldSize(camera, size.height, reflection, ALPHA_BOOST_CASCADE.lensFlare.sourceElement.size[0] * ALPHA_LENS_FLARE_REFLECTION.size[0] * reflectionScale[0]),
          sourceLensFlareWorldSize(camera, size.height, reflection, ALPHA_BOOST_CASCADE.lensFlare.sourceElement.size[1] * ALPHA_LENS_FLARE_REFLECTION.size[1] * reflectionScale[1]),
          1
        );
        setBoostColor(reflection, sourceLensFlareReflectionColor());
        const sourceDistance = camera.position.distanceTo(ALPHA_LENS_FLARE_WORLD_POSITION);
        setBoostOpacity(
          reflection,
          lensFlareReflectionComponentEnabled ? sourceLensFlareReflectionOpacity(coneVisibility, sourceDistance) * screenPercentageOpacity * particleVisibility : 0
        );
      }
    }

    for (let index = 0; index < mainRefs.current.length; index++) {
      const particle = mainRefs.current[index];
      const particleIndex = index % ALPHA_RENDERED_MAIN_PARTICLES;
      particle.visible = mainComponentEnabled && particleVisibility > 0;
      if (!particle.visible) continue;
      const origin = ALPHA_BOOST_MAIN_BODY_POSITION;
      const particleClock = sourceParticleAge(
        t,
        sourceCascadeSpawnBirthOffset(particleIndex, ALPHA_MAIN_SPAWN_BIRTH_OFFSETS),
        ALPHA_BOOST_CASCADE.main.lifetimeSeconds
      );
      const phase = particleClock / ALPHA_BOOST_CASCADE.main.lifetimeSeconds;
      const age = phase * ALPHA_BOOST_CASCADE.main.lifetimeSeconds;
      const velocity = ALPHA_MAIN_BODY_VELOCITIES[particleIndex];
      const startSize = ALPHA_MAIN_START_SIZES[particleIndex];
      const sizeLife = sampleAlphaBoostVectorCurve(ALPHA_BOOST_CASCADE.main.sizeMultiplierLife, phase);
      const particleSize = sourceMainParticleSize(startSize, sizeLife);
      const colorLife = sampleAlphaBoostVectorCurve(ALPHA_BOOST_CASCADE.main.colorScaleOverLife, phase);
      const alpha = sampleAlphaBoostFloatCurve(ALPHA_BOOST_CASCADE.main.alphaScaleOverLife, phase);
      sampleMainDynamicParams(phase, ALPHA_MAIN_DYNAMIC_PARAMS);

      particle.position.set(
        origin[0] + velocity[0] * age,
        origin[1] + velocity[1] * age,
        origin[2] + velocity[2] * age
      );
      particle.quaternion.copy(billboardQuaternion);
      particle.scale.set(particleSize[0], particleSize[1], 1);
      if (particle.material instanceof THREE.ShaderMaterial) {
        ALPHA_MAIN_PARTICLE_UPDATE.opacity = alpha * particleVisibility;
        ALPHA_MAIN_PARTICLE_UPDATE.colorScale = colorLife[0];
        ALPHA_MAIN_PARTICLE_UPDATE.phase = phase;
        ALPHA_MAIN_PARTICLE_UPDATE.time = t;
        updateLiquidGoldParticleMaterial(particle.material, ALPHA_MAIN_PARTICLE_UPDATE);
      }
    }
  });

  return (
    <group ref={rootRef} name={ALPHA_BOOST_OBJECT_NAME} visible={false}>
      {boostMeshes.map((mesh, index) => (
        <primitive
          key={`boost-mesh-${index}`}
          object={mesh}
          ref={(node: THREE.Group | null) => {
            if (node) boostMeshRefs.current[index] = node;
          }}
          matrixAutoUpdate={false}
        />
      ))}
      {Array.from({ length: ALPHA_BOOST_ATTACHMENT_POSITIONS.length * ALPHA_RENDERED_FLAME_PARTICLES_PER_EXHAUST }, (_, index) => (
        <mesh
          key={`flame-${index}`}
          ref={(node) => {
            if (node) {
              if (alphaBoostBloomEnabled("flame")) node.layers.enable(ROCKET_LEAGUE_BLOOM_LAYER);
              flameRefs.current[index] = node;
            }
          }}
          position={ALPHA_BOOST_ATTACHMENT_POSITIONS[Math.floor(index / ALPHA_RENDERED_FLAME_PARTICLES_PER_EXHAUST) % ALPHA_BOOST_ATTACHMENT_POSITIONS.length]}
        >
          <planeGeometry args={[1, 1]} />
          <primitive object={liquidGoldMaterials.flame[index]} attach="material" />
        </mesh>
      ))}
      <sprite
        ref={lensFlareRef}
        position={ALPHA_LENS_FLARE_POSITION}
        scale={[1, 1, 1]}
        renderOrder={10}
      >
        <AlphaSpriteMaterial texture={textures.lensFlare} color={ALPHA_LENS_FLARE_COLOR} opacity={sourceLensFlareElementAlpha()} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite
        ref={lensFlareReflectionRef}
        position={ALPHA_LENS_FLARE_POSITION}
        scale={[1, 1, 1]}
        renderOrder={11}
      >
        <AlphaSpriteMaterial
          texture={textures.lensFlare}
          color={sourceLensFlareReflectionColor()}
          opacity={sourceLensFlareReflectionOpacity(1)}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      {Array.from({ length: ALPHA_RENDERED_MAIN_PARTICLES }, (_, index) => (
        <mesh
          key={`main-${index}`}
          ref={(node) => {
            if (node) {
              if (alphaBoostBloomEnabled("main")) node.layers.enable(ROCKET_LEAGUE_BLOOM_LAYER);
              mainRefs.current[index] = node;
            }
          }}
          position={ALPHA_BOOST_MAIN_BODY_POSITION}
        >
          <planeGeometry args={[1, 1]} />
          <primitive object={liquidGoldMaterials.main[index]} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function sourceTimeRangeDuration(range: readonly [number, number]) {
  return Math.max(0.001, Math.abs(range[1] - range[0]));
}

function sourceBoostMeshFade(boostActive: boolean, delta: number, particleSystemTime: number, previousBoostMeshFade: number) {
  if (boostActive) {
    return THREE.MathUtils.clamp(particleSystemTime / ALPHA_BOOST_MESH_FADE_IN_DURATION, 0, 1);
  }

  return THREE.MathUtils.clamp(previousBoostMeshFade - delta / ALPHA_BOOST_MESH_FADE_OUT_DURATION, 0, 1);
}

function sourceParticleSystemTime(time: number) {
  const step = ALPHA_BOOST_CASCADE.updateStepSeconds;
  if (!(step > 0)) return time;
  return Math.floor(Math.max(0, time) / step) * step;
}

function sourceActiveFlameParticlesPerExhaust(spawnRate: number) {
  const activeParticles = Math.ceil(Math.max(0, spawnRate * ALPHA_BOOST_CASCADE.flame.lifetimeSeconds));
  return THREE.MathUtils.clamp(activeParticles, 0, ALPHA_RENDERED_FLAME_PARTICLES_PER_EXHAUST);
}

function sourceSpawnPerUnitRateFromDistance(distanceWindow: number, lifetimeSeconds: number, spawnPerUnit: number, spawnRateScalar: number) {
  const distanceRate = Math.max(0, distanceWindow) / Math.max(0.001, lifetimeSeconds);
  return distanceRate * spawnPerUnit * spawnRateScalar;
}

function sourceCascadeSpawnAccumulatorActiveParticles(
  offsets: readonly number[],
  lifetimeSeconds: number,
  peakActiveParticles: number
) {
  let activeParticles = 0;
  for (const offset of offsets) {
    if (offset < lifetimeSeconds) activeParticles += 1;
  }
  return THREE.MathUtils.clamp(activeParticles, 1, peakActiveParticles);
}

function sourceEmitterSimulationWindow(lifetimeSeconds: number, emitterDurationSeconds?: number) {
  const sourceEmitterDuration = typeof emitterDurationSeconds === "number" && emitterDurationSeconds > 0 ? emitterDurationSeconds : lifetimeSeconds;
  return Math.max(lifetimeSeconds, sourceEmitterDuration);
}

function sourceCascadeSpawnBirthOffset(particleIndex: number, offsets: readonly number[]) {
  return offsets[particleIndex % offsets.length] ?? 0;
}

function sourceCascadeSpawnBirthOffsetFromParameters(particleIndex: number, spawnRate: number, lifetimeSeconds: number, updateStepSeconds: number) {
  return sourceCascadeSpawnBirthOffset(particleIndex, sourceCascadeSpawnOffsets(spawnRate, lifetimeSeconds, updateStepSeconds));
}

function sourceSpawnPerUnitParticleAge(
  particleIndex: number,
  sourceAges: unknown,
  spawnRate: number,
  lifetimeSeconds: number,
  updateStepSeconds: number
) {
  if (Array.isArray(sourceAges) && typeof sourceAges[particleIndex] === "number") {
    return THREE.MathUtils.clamp(sourceAges[particleIndex], 0, lifetimeSeconds);
  }

  return sourceParticleAge(
    0,
    -sourceCascadeSpawnBirthOffsetFromParameters(particleIndex, spawnRate, lifetimeSeconds, updateStepSeconds),
    lifetimeSeconds
  );
}

function sourceCascadeSpawnOffsets(spawnRate: number, lifetimeSeconds: number, updateStepSeconds: number) {
  if (!(spawnRate > 0) || !(lifetimeSeconds > 0)) return [0];

  const sourceUpdateStep = updateStepSeconds > 0 ? updateStepSeconds : 1 / spawnRate;
  const updateCount = Math.max(1, Math.ceil(lifetimeSeconds / sourceUpdateStep));
  const spawnTimes: number[] = [];
  let spawnFraction = 0;

  for (let updateIndex = 1; updateIndex <= updateCount; updateIndex++) {
    spawnFraction += spawnRate * sourceUpdateStep;
    const spawnedParticles = Math.floor(spawnFraction);
    if (spawnedParticles <= 0) continue;

    const spawnTime = updateIndex * sourceUpdateStep;
    for (let spawnedIndex = 0; spawnedIndex < spawnedParticles; spawnedIndex++) {
      spawnTimes.push(spawnTime);
    }
    spawnFraction -= spawnedParticles;
  }

  if (spawnTimes.length === 0) return [0];

  const firstSpawnTime = spawnTimes[0];
  return spawnTimes.map((spawnTime) => Math.min(lifetimeSeconds, spawnTime - firstSpawnTime));
}

function sourceParticleAge(time: number, birthOffset: number, lifetimeSeconds: number) {
  return positiveModulo(time - birthOffset, lifetimeSeconds);
}

function positiveModulo(value: number, modulus: number) {
  if (!(modulus > 0)) return 0;
  return ((value % modulus) + modulus) % modulus;
}

function sourceVectorToViewer(vector: readonly [number, number, number]): [number, number, number] {
  return [vector[0], vector[2], vector[1]];
}

function sourceAttachmentViewerVector(transform: { rotation: readonly [number, number, number] } | undefined, vector: readonly [number, number, number]): [number, number, number] {
  if (!transform) return sourceVectorToViewer(vector);

  setUnrealRotatorMatrix(SOURCE_ROTATION_MATRIX, transform.rotation);
  SOURCE_VECTOR.fromArray(vector).applyMatrix4(SOURCE_ROTATION_MATRIX);
  return sourceVectorToViewer(SOURCE_VECTOR.toArray());
}

function sourceAttachmentViewerPosition(transform: (typeof ALPHA_BOOST_CASCADE.boostMesh.sourceAttachmentOverrides)[number]): [number, number, number] {
  return sourceVectorToViewer(transform.translation);
}

function sourceAveragePosition(positions: Array<readonly [number, number, number]>): [number, number, number] {
  if (positions.length === 0) return [0, 0, 0];

  const total = positions.reduce(
    (sum, position) => [sum[0] + position[0], sum[1] + position[1], sum[2] + position[2]] as [number, number, number],
    [0, 0, 0] as [number, number, number]
  );
  return [total[0] / positions.length, total[1] / positions.length, total[2] / positions.length];
}

function applySourceBoostMeshTransform(
  mesh: THREE.Object3D,
  transform: (typeof ALPHA_BOOST_CASCADE.boostMesh.sourceAttachmentOverrides)[number] | undefined
) {
  if (!transform) return;

  setUnrealRotatorMatrix(SOURCE_ROTATION_MATRIX, transform.rotation);
  SOURCE_SCALE_MATRIX.makeScale(transform.scale3D[0] * OCTANE_SCALE, transform.scale3D[1] * OCTANE_SCALE, transform.scale3D[2] * OCTANE_SCALE);
  SOURCE_TRANSFORM_MATRIX.multiplyMatrices(SOURCE_ROTATION_MATRIX, SOURCE_SCALE_MATRIX);
  SOURCE_TRANSFORM_MATRIX.setPosition(transform.translation[0], transform.translation[1], transform.translation[2]);
  SOURCE_CONVERTED_MATRIX.multiplyMatrices(UE_TO_VIEWER_BASIS, SOURCE_TRANSFORM_MATRIX).multiply(UE_TO_VIEWER_BASIS_INVERSE);
  SOURCE_CONVERTED_MATRIX.decompose(SOURCE_POSITION, SOURCE_QUATERNION, SOURCE_SCALE);

  mesh.position.copy(SOURCE_POSITION);
  mesh.quaternion.copy(SOURCE_QUATERNION);
  mesh.scale.copy(SOURCE_SCALE);
  mesh.updateMatrix();
}

function unrealRotatorUnitsToRadians(units: number) {
  return (units / 65536) * Math.PI * 2;
}

function setUnrealRotatorMatrix(matrix: THREE.Matrix4, rotation: readonly [number, number, number]) {
  const pitch = unrealRotatorUnitsToRadians(rotation[0]);
  const yaw = unrealRotatorUnitsToRadians(rotation[1]);
  const roll = unrealRotatorUnitsToRadians(rotation[2]);

  const sp = Math.sin(pitch);
  const cp = Math.cos(pitch);
  const sy = Math.sin(yaw);
  const cy = Math.cos(yaw);
  const sr = Math.sin(roll);
  const cr = Math.cos(roll);

  matrix
    .set(
      cp * cy,
      cp * sy,
      sp,
      0,
      sr * sp * cy - cr * sy,
      sr * sp * sy + cr * cy,
      -sr * cp,
      0,
      -(cr * sp * cy + sr * sy),
      cy * sr - cr * sp * sy,
      cr * cp,
      0,
      0,
      0,
      0,
      1
    )
    .transpose();

  return matrix;
}

function hasCompleteFlameParticleState(state: FlameParticleState | undefined): state is FlameParticleState {
  return state?.sourceAcceleration !== undefined;
}

function spawnFlameParticleState(root: Group, origin: readonly [number, number, number], localVelocity: number[], particleIndex: number): FlameParticleState {
  FLAME_SPAWN_LOCAL_POSITION.fromArray(origin);
  FLAME_WORLD_POSITION.copy(FLAME_SPAWN_LOCAL_POSITION);
  root.localToWorld(FLAME_WORLD_POSITION);
  return {
    phase: 0,
    spawnWorldPosition: FLAME_WORLD_POSITION.clone(),
    spawnLocalVelocity: [localVelocity[0] ?? 0, localVelocity[1] ?? 0, localVelocity[2] ?? 0],
    sourceAcceleration: sourceRuntimeFlameAcceleration(particleIndex)
  };
}

function alphaTextureColorSpace(textureName: "cloud" | "cone" | "dust" | "particle" | "smokeNoise" | "waterNormal") {
  const colorSpaceByTexture = {
    ...ALPHA_BOOST_CASCADE.material.resource.textureColorSpaces,
    ...ALPHA_BOOST_CASCADE.boostMesh.materialResource.textureColorSpaces
  };
  return colorSpaceByTexture[textureName] === "srgb" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
}

function alphaTextureWrap(textureName: "cloud" | "cone" | "dust" | "smokeNoise", axis: 0 | 1) {
  const addressMode = ALPHA_BOOST_CASCADE.material.resource.textureAddressModes[textureName][axis];
  return addressMode === "TA_Clamp" ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
}

function configureAlphaTexture(texture: THREE.Texture, wrapS: THREE.Wrapping, wrapT: THREE.Wrapping, colorSpace: THREE.ColorSpace) {
  texture.colorSpace = colorSpace;
  texture.wrapS = wrapS;
  texture.wrapT = wrapT;
  texture.repeat.set(1, 1);
  texture.needsUpdate = true;
  return texture;
}

function configureAlphaSubUvTexture(texture: THREE.Texture, tileIndex: number) {
  const [tilesX, tilesY] = ALPHA_BOOST_CASCADE.material.subUvTiles;
  const subTexture = texture.clone();
  subTexture.colorSpace = texture.colorSpace;
  subTexture.wrapS = THREE.ClampToEdgeWrapping;
  subTexture.wrapT = THREE.ClampToEdgeWrapping;
  subTexture.repeat.set(1 / tilesX, 1 / tilesY);
  applySubUvOffset(subTexture, tileIndex);
  subTexture.needsUpdate = true;
  return subTexture;
}

function applySubUvOffset(texture: THREE.Texture, tileIndex: number) {
  const frame = alphaSubUvFrame(tileIndex);
  texture.offset.set(frame.offset[0], frame.offset[1]);
}

function alphaSubUvFrame(tileIndex: number): { offset: [number, number]; scale: [number, number] } {
  const [tilesX, tilesY] = ALPHA_BOOST_CASCADE.material.subUvTiles;
  const safeIndex = ((tileIndex % (tilesX * tilesY)) + tilesX * tilesY) % (tilesX * tilesY);
  const x = safeIndex % tilesX;
  const y = Math.floor(safeIndex / tilesX);
  return {
    offset: [x / tilesX, 1 - (y + 1) / tilesY],
    scale: [1 / tilesX, 1 / tilesY]
  };
}

function AlphaSubUvSpriteMaterial({
  texture,
  tileIndex,
  color,
  opacity,
  blending
}: {
  texture: THREE.Texture;
  tileIndex: number;
  color?: THREE.Color;
  opacity: number;
  blending: THREE.Blending;
}) {
  const subTexture = useMemo(() => configureAlphaSubUvTexture(texture, tileIndex), [texture, tileIndex]);
  return (
    <spriteMaterial
      map={subTexture}
      alphaMap={subTexture}
      color={color}
      transparent
      opacity={opacity}
      depthWrite={false}
      blending={blending}
      toneMapped={false}
    />
  );
}

function AlphaSpriteMaterial({
  texture,
  color,
  opacity,
  blending
}: {
  texture: THREE.Texture;
  color?: THREE.Color;
  opacity: number;
  blending: THREE.Blending;
}) {
  return (
    <spriteMaterial
      map={texture}
      alphaMap={texture}
      color={color}
      transparent
      opacity={opacity}
      depthWrite={false}
      blending={blending}
      toneMapped={false}
    />
  );
}

function sampleFlameDynamicParams(phase: number, target: LiquidGoldDynamicParams) {
  const params = ALPHA_BOOST_CASCADE.flame.dynamicParams;
  target.distortionAmount = sampleAlphaBoostFloatCurve(params.distortionAmount, phase);
  target.brightness = sampleAlphaBoostFloatCurve(params.brightness, phase);
  target.noiseAmount = sampleAlphaBoostFloatCurve(params.noiseAmount, phase);
  target.softAmount = sampleAlphaBoostFloatCurve(params.softAmount, phase);
  return target;
}

function sampleMainDynamicParams(phase: number, target: LiquidGoldDynamicParams) {
  const params = ALPHA_BOOST_CASCADE.main.dynamicParams;
  target.distortionAmount = sampleAlphaBoostFloatCurve(params.distortionAmount, phase);
  target.brightness = sampleAlphaBoostFloatCurve(params.brightness, phase);
  target.noiseAmount = sampleAlphaBoostFloatCurve(params.noiseAmount, phase);
  target.softAmount = sampleAlphaBoostFloatCurve(params.softAmount, phase);
  return target;
}

function alphaParticleNoise(drawOrder: SourceRandomDrawOrder, particleIndex: number, componentIndex: number) {
  return sourceSrandFraction(sourceParticleRandomSeed(drawOrder, particleIndex, componentIndex)) * 2 - 1;
}

function sourceParticleRandomSeed(drawOrder: SourceRandomDrawOrder, particleIndex: number, componentIndex: number) {
  const drawIndex = Math.max(0, particleIndex * drawOrder.drawsPerParticle + drawOrder.firstDraw + componentIndex);
  let seed = ALPHA_BOOST_CASCADE.randomStream.webBaseSeed >>> 0;
  for (let draw = 0; draw <= drawIndex; draw++) {
    seed = sourceSrandNextSeed(seed);
  }
  return seed;
}

function sourceSrandNextSeed(seed: number) {
  return (Math.imul(seed, ALPHA_BOOST_CASCADE.randomStream.multiplier) + ALPHA_BOOST_CASCADE.randomStream.increment) >>> 0;
}

function sourceSrandFraction(seed: number) {
  SOURCE_RANDOM_FLOAT_VIEW.setUint32(
    0,
    (seed & ALPHA_BOOST_CASCADE.randomStream.mantissaMask) | ALPHA_BOOST_CASCADE.randomStream.floatOneBits,
    true
  );
  return SOURCE_RANDOM_FLOAT_VIEW.getFloat32(0, true) - 1;
}

function setSourceFlameWorldOffset(
  target: THREE.Vector3,
  age: number,
  phase: number,
  localVelocity: number[],
  sourceAcceleration: readonly [number, number, number]
) {
  if (!ALPHA_BOOST_CASCADE.flame.velocityOverLifeInWorldSpace) return target.set(0, 0, 0);

  const velocityOverLife = integrateFlameVelocityOverLife(phase);
  void localVelocity;
  return target.set(
    0.5 * sourceAcceleration[0] * velocityOverLife[0] * age * age,
    0.5 * sourceAcceleration[1] * velocityOverLife[1] * age * age,
    0.5 * sourceAcceleration[2] * velocityOverLife[2] * age * age
  );
}

function integrateFlameVelocityOverLife(phase: number): [number, number, number] {
  const clampedPhase = THREE.MathUtils.clamp(phase, 0, 1);
  if (clampedPhase <= 0) return ALPHA_FLAME_VELOCITY_OVER_LIFE_INTEGRAL[0];

  const scaled = clampedPhase * (ALPHA_FLAME_VELOCITY_OVER_LIFE_INTEGRAL.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(index + 1, ALPHA_FLAME_VELOCITY_OVER_LIFE_INTEGRAL.length - 1);
  const alpha = scaled - index;
  const current = ALPHA_FLAME_VELOCITY_OVER_LIFE_INTEGRAL[index];
  const next = ALPHA_FLAME_VELOCITY_OVER_LIFE_INTEGRAL[nextIndex];
  return [
    THREE.MathUtils.lerp(current[0], next[0], alpha),
    THREE.MathUtils.lerp(current[1], next[1], alpha),
    THREE.MathUtils.lerp(current[2], next[2], alpha)
  ];
}

function sourceIntegratedFlameVelocityOverLifeSamples(): Array<[number, number, number]> {
  const sampleCount = Math.max(2, ALPHA_BOOST_CASCADE.flame.velocityOverLife.samples.length);
  const samples: Array<[number, number, number]> = [];
  for (let index = 0; index < sampleCount; index++) {
    samples.push(sourceIntegratedFlameVelocityOverLifeAt(index / (sampleCount - 1)));
  }
  return samples;
}

function sourceIntegratedFlameVelocityOverLifeAt(phase: number): [number, number, number] {
  const clampedPhase = THREE.MathUtils.clamp(phase, 0, 1);
  if (clampedPhase <= 0) return sampleAlphaBoostVectorCurve(ALPHA_BOOST_CASCADE.flame.velocityOverLife, 0);

  const steps = Math.max(1, ALPHA_BOOST_CASCADE.flame.velocityOverLife.samples.length - 1);
  let x = 0;
  let y = 0;
  let z = 0;
  let previousPhase = 0;
  let previous = sampleAlphaBoostVectorCurve(ALPHA_BOOST_CASCADE.flame.velocityOverLife, 0);

  for (let step = 1; step <= steps; step++) {
    const nextPhase = (clampedPhase * step) / steps;
    const next = sampleAlphaBoostVectorCurve(ALPHA_BOOST_CASCADE.flame.velocityOverLife, nextPhase);
    const delta = nextPhase - previousPhase;
    x += (previous[0] + next[0]) * 0.5 * delta;
    y += (previous[1] + next[1]) * 0.5 * delta;
    z += (previous[2] + next[2]) * 0.5 * delta;
    previous = next;
    previousPhase = nextPhase;
  }

  return [x / clampedPhase, y / clampedPhase, z / clampedPhase];
}

function sourceMainVelocity(particleIndex: number): [number, number, number] {
  return sourceUniformVectorSample(
    ALPHA_BOOST_CASCADE.main.startVelocity,
    particleIndex,
    sourceEmitterDrawOrder(ALPHA_BOOST_CASCADE.randomStream.drawOrder.main, ALPHA_BOOST_CASCADE.randomStream.drawOrder.main.startVelocity)
  );
}

function sourceMainBodyVelocity(particleIndex: number): [number, number, number] {
  return sourceVectorToViewer(sourceMainVelocity(particleIndex));
}

function sourceMainStartSize(particleIndex: number): [number, number, number] {
  return sourceUniformVectorSample(
    ALPHA_BOOST_CASCADE.main.startSize,
    particleIndex,
    sourceEmitterDrawOrder(ALPHA_BOOST_CASCADE.randomStream.drawOrder.main, ALPHA_BOOST_CASCADE.randomStream.drawOrder.main.startSize)
  );
}

function sourceMainParticleSize(startSize: readonly [number, number, number], sizeLife: readonly [number, number, number]): [number, number, number] {
  return [startSize[0] * sizeLife[0], startSize[1] * sizeLife[1], startSize[2] * sizeLife[2]];
}

function sourceUniformVectorSample(
  distribution: { low: readonly [number, number, number]; high: readonly [number, number, number] },
  particleIndex: number,
  drawOrder: SourceRandomDrawOrder
): [number, number, number] {
  return [
    THREE.MathUtils.lerp(distribution.low[0], distribution.high[0], alphaParticleNoise(drawOrder, particleIndex, 0) * 0.5 + 0.5),
    THREE.MathUtils.lerp(distribution.low[1], distribution.high[1], alphaParticleNoise(drawOrder, particleIndex, 1) * 0.5 + 0.5),
    THREE.MathUtils.lerp(distribution.low[2], distribution.high[2], alphaParticleNoise(drawOrder, particleIndex, 2) * 0.5 + 0.5)
  ];
}

function sourceRuntimeFlameParticleSize(particleIndex: number): [number, number, number] {
  const size = ALPHA_BOOST_CASCADE.flame.runtimeParameters.particleSize;
  return sourceUniformVectorSample(
    { low: size.vectorLow, high: size.vector },
    particleIndex,
    sourceEmitterDrawOrder(ALPHA_BOOST_CASCADE.randomStream.drawOrder.flame, ALPHA_BOOST_CASCADE.randomStream.drawOrder.flame.particleSize)
  );
}

function sourceRuntimeFlameAcceleration(particleIndex: number): [number, number, number] {
  const range = ALPHA_BOOST_CASCADE.flame.accelerationRange;
  const sourceAcceleration = sourceUniformVectorSample(
    { low: range.min, high: range.max },
    particleIndex,
    sourceEmitterDrawOrder(ALPHA_BOOST_CASCADE.randomStream.drawOrder.flame, ALPHA_BOOST_CASCADE.randomStream.drawOrder.flame.acceleration)
  );
  return sourceVectorToViewer(sourceAcceleration);
}

function sourceEmitterDrawOrder(
  emitter: { drawsPerParticle: number },
  drawOrder: { firstDraw: number }
): SourceRandomDrawOrder {
  return {
    drawsPerParticle: emitter.drawsPerParticle,
    firstDraw: drawOrder.firstDraw
  };
}

function sourceLensFlareConeVisibility(root: Group, sprite: THREE.Sprite, camera: THREE.Camera) {
  if (!ALPHA_BOOST_CASCADE.lensFlare.useTrueConeCalculation) return 1;

  root.getWorldQuaternion(ALPHA_LENS_FLARE_ROOT_QUATERNION);
  ALPHA_LENS_FLARE_WORLD_DIRECTION.fromArray(ALPHA_LENS_FLARE_VIEWER_DIRECTION).applyQuaternion(ALPHA_LENS_FLARE_ROOT_QUATERNION).normalize();
  sprite.getWorldPosition(ALPHA_LENS_FLARE_WORLD_POSITION);
  ALPHA_LENS_FLARE_CAMERA_DIRECTION.copy(camera.position).sub(ALPHA_LENS_FLARE_WORLD_POSITION);
  const sourceDistance = ALPHA_LENS_FLARE_CAMERA_DIRECTION.length();
  if (sourceDistance > ALPHA_BOOST_CASCADE.lensFlare.radius) return 0;
  ALPHA_LENS_FLARE_CAMERA_DIRECTION.normalize();

  const angle = ALPHA_LENS_FLARE_WORLD_DIRECTION.angleTo(ALPHA_LENS_FLARE_CAMERA_DIRECTION) * ALPHA_BOOST_CASCADE.lensFlare.coneFudgeFactor;
  const innerHalfAngle = THREE.MathUtils.degToRad(ALPHA_BOOST_CASCADE.lensFlare.innerConeDegrees * 0.5);
  const outerHalfAngle = THREE.MathUtils.degToRad(ALPHA_BOOST_CASCADE.lensFlare.outerConeDegrees * 0.5);
  return 1 - THREE.MathUtils.smoothstep(angle, innerHalfAngle, outerHalfAngle);
}

function sourceLensFlareWorldSize(camera: THREE.Camera, viewportHeight: number, sprite: THREE.Sprite, sourcePixelSize: number) {
  sprite.getWorldPosition(ALPHA_LENS_FLARE_WORLD_POSITION);
  const safeViewportHeight = Math.max(1, viewportHeight);

  if (camera instanceof THREE.PerspectiveCamera) {
    const sourceDistance = Math.max(0.001, camera.position.distanceTo(ALPHA_LENS_FLARE_WORLD_POSITION));
    const visibleWorldHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) * sourceDistance;
    return Math.max(1, (sourcePixelSize / safeViewportHeight) * visibleWorldHeight);
  }

  if (camera instanceof THREE.OrthographicCamera) {
    return Math.max(1, (sourcePixelSize / safeViewportHeight) * (camera.top - camera.bottom));
  }

  return Math.max(1, sourcePixelSize);
}

function sourceLensFlareElementAlpha() {
  return ALPHA_BOOST_CASCADE.lensFlare.sourceElement.inheritedAlphaSamples[0];
}

function sourceLensFlareElementHasMaterial() {
  return ALPHA_BOOST_CASCADE.lensFlare.sourceElement.lfMaterials.length > 0;
}

function sourceLensFlareReflectionScale(): [number, number] {
  const scaling = ALPHA_LENS_FLARE_REFLECTION.scaling.samples[0];
  const axisScaling = ALPHA_LENS_FLARE_REFLECTION.axisScaling.samples[0];
  const distMapScale = ALPHA_LENS_FLARE_REFLECTION.distMapScale.samples[0];
  return [scaling * axisScaling[0] * distMapScale[0], scaling * axisScaling[1] * distMapScale[1]];
}

function sourceLensFlareReflectionAlpha() {
  return ALPHA_LENS_FLARE_REFLECTION.alpha.samples[0];
}

function sourceLensFlareReflectionColor() {
  const elementColor = ALPHA_LENS_FLARE_REFLECTION.color.samples[0];
  const distMapColor = ALPHA_LENS_FLARE_REFLECTION.distMapColor.constant;
  const sourceColor = ALPHA_LENS_FLARE_REFLECTION.modulateColorBySource
    ? ALPHA_BOOST_CASCADE.lensFlare.sourceColorRgba
    : ([1, 1, 1] as const);

  return ALPHA_LENS_FLARE_REFLECTION_COLOR.setRGB(
    sourceColor[0] * elementColor[0] * distMapColor[0],
    sourceColor[1] * elementColor[1] * distMapColor[1],
    sourceColor[2] * elementColor[2] * distMapColor[2]
  );
}

function sourceLensFlareScreenPercentageOpacity(visibleScreenPercentage: number) {
  return sampleAlphaBoostSourceFloatCurve(ALPHA_BOOST_CASCADE.lensFlare.screenPercentageMap, visibleScreenPercentage);
}

function sourceLensFlareVisibleScreenPercentage(scene: THREE.Scene, camera: THREE.Camera, sprite: THREE.Sprite, root: Group) {
  sprite.getWorldPosition(ALPHA_LENS_FLARE_WORLD_POSITION);
  const sourceDistance = camera.position.distanceTo(ALPHA_LENS_FLARE_WORLD_POSITION);
  if (sourceDistance <= 0.001) return 1;

  camera.matrixWorld.extractBasis(
    ALPHA_LENS_FLARE_OCCLUSION_CAMERA_RIGHT,
    ALPHA_LENS_FLARE_OCCLUSION_CAMERA_UP,
    ALPHA_LENS_FLARE_OCCLUSION_OFFSET
  );

  const sourceRadius = sourceLensFlareOcclusionRadius();
  let visibleSamples = 0;

  for (const [right, up] of ALPHA_LENS_FLARE_OCCLUSION_SAMPLE_OFFSETS) {
    ALPHA_LENS_FLARE_OCCLUSION_TARGET.copy(ALPHA_LENS_FLARE_WORLD_POSITION);
    ALPHA_LENS_FLARE_OCCLUSION_TARGET.addScaledVector(ALPHA_LENS_FLARE_OCCLUSION_CAMERA_RIGHT, right * sourceRadius);
    ALPHA_LENS_FLARE_OCCLUSION_TARGET.addScaledVector(ALPHA_LENS_FLARE_OCCLUSION_CAMERA_UP, up * sourceRadius);
    ALPHA_LENS_FLARE_OCCLUSION_OFFSET.copy(ALPHA_LENS_FLARE_OCCLUSION_TARGET).sub(camera.position);
    const targetDistance = ALPHA_LENS_FLARE_OCCLUSION_OFFSET.length();
    ALPHA_LENS_FLARE_OCCLUSION_RAYCASTER.set(camera.position, ALPHA_LENS_FLARE_OCCLUSION_OFFSET.normalize());
    ALPHA_LENS_FLARE_OCCLUSION_RAYCASTER.camera = camera;
    ALPHA_LENS_FLARE_OCCLUSION_RAYCASTER.near = 0.01;
    ALPHA_LENS_FLARE_OCCLUSION_RAYCASTER.far = Math.max(0.01, targetDistance - 1);
    ALPHA_LENS_FLARE_OCCLUSION_HITS.length = 0;
    ALPHA_LENS_FLARE_OCCLUSION_RAYCASTER.intersectObjects(scene.children, true, ALPHA_LENS_FLARE_OCCLUSION_HITS);
    if (!ALPHA_LENS_FLARE_OCCLUSION_HITS.some((hit) => isAlphaLensFlareOccluder(hit.object, root))) visibleSamples++;
  }

  return visibleSamples / ALPHA_LENS_FLARE_OCCLUSION_SAMPLE_OFFSETS.length;
}

function sourceLensFlareOcclusionRadius() {
  const halfExtent = ALPHA_BOOST_CASCADE.lensFlare.fixedRelativeBoundingBox.halfExtent;
  return Math.max(1, halfExtent[0], halfExtent[1], halfExtent[2]);
}

function isAlphaLensFlareOccluder(object: THREE.Object3D, root: Group) {
  if (!object.visible || isObjectDescendantOf(object, root)) return false;
  if (!(object instanceof THREE.Mesh)) return false;

  const materials = Array.isArray(object.material) ? object.material : [object.material];
  return materials.some((material) => material.depthWrite && (!material.transparent || material.opacity >= 0.99));
}

function isObjectDescendantOf(object: THREE.Object3D, ancestor: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

function sourceLensFlareReflectionOpacity(coneVisibility: number, sourceDistance = 0) {
  if (!ALPHA_LENS_FLARE_REFLECTION?.isEnabled) return 0;
  const alpha = sampleAlphaBoostSourceFloatCurve(ALPHA_LENS_FLARE_REFLECTION.distMapAlpha, sourceDistance);
  return sourceLensFlareReflectionAlpha() * alpha * coneVisibility;
}

function setBoostOpacity(object: THREE.Object3D, opacity: number) {
  if ((object instanceof THREE.Mesh || object instanceof THREE.Sprite) && object.material instanceof THREE.Material) {
    object.material.opacity = Math.max(0, Math.min(1, opacity));
  }
}

function setBoostColor(object: THREE.Object3D, color: THREE.Color) {
  if ((object instanceof THREE.Mesh || object instanceof THREE.Sprite) && "color" in object.material) {
    object.material.color.copy(color);
  }
}

function OctaneModel({ player }: { player: ReplayPlayer }) {
  const { scene } = useGLTF(OCTANE_ASSET);
  const [bodyMap, chassisMap] = useTexture([OCTANE_BODY_TEXTURE, OCTANE_CHASSIS_TEXTURE]);
  const octane = useMemo(() => {
    bodyMap.colorSpace = THREE.SRGBColorSpace;
    bodyMap.flipY = false;
    chassisMap.colorSpace = THREE.SRGBColorSpace;
    chassisMap.flipY = false;

    const clone = scene.clone(true);
    const teamPaint = teamCarPaint(player.team);

    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      if (Array.isArray(object.material)) {
        object.material = object.material.map((material) => buildOctaneMaterial(material, teamPaint, bodyMap, chassisMap));
      } else {
        object.material = buildOctaneMaterial(object.material, teamPaint, bodyMap, chassisMap);
      }

      object.castShadow = true;
      object.receiveShadow = true;
    });

    return clone;
  }, [bodyMap, chassisMap, player.team, scene]);

  return <primitive object={octane} scale={OCTANE_SCALE} />;
}

function buildOctaneMaterial(material: THREE.Material, teamPaint: string, bodyMap: THREE.Texture, chassisMap: THREE.Texture) {
  const sourceName = material.name.toLowerCase();
  const clone =
    material instanceof THREE.MeshStandardMaterial
      ? material.clone()
      : new THREE.MeshStandardMaterial({ name: material.name, roughness: 0.55, metalness: 0.08 });

  clone.vertexColors = false;
  clone.map = null;
  clone.normalMap = null;

  if (sourceName.includes("body_octane")) {
    clone.color.set(teamPaint);
    clone.emissive.set(teamPaint);
    clone.emissiveIntensity = 0.08;
    clone.map = bodyMap;
    clone.roughness = 0.34;
    clone.metalness = 0.22;
    clone.envMapIntensity = 1.45;
  } else if (sourceName.includes("chassis")) {
    clone.color.set("#f7fbff");
    clone.emissive.set("#121a20");
    clone.emissiveIntensity = 0.08;
    clone.map = chassisMap;
    clone.roughness = 0.44;
    clone.metalness = 0.28;
    clone.envMapIntensity = 1.25;
  } else {
    clone.color.set("#07090b");
    clone.emissive.set("#03090d");
    clone.emissiveIntensity = 0.06;
    clone.roughness = 0.66;
    clone.metalness = 0.14;
    clone.envMapIntensity = 0.9;
  }

  return clone;
}

useGLTF.preload(OCTANE_ASSET);
useGLTF.preload(ALPHA_BOOST_MESH_ASSET);
useTexture.preload([OCTANE_BODY_TEXTURE, OCTANE_CHASSIS_TEXTURE]);
useTexture.preload([...ALPHA_BOOST_TEXTURES, ALPHA_BOOST_WATER_NORMAL_TEXTURE, ALPHA_BOOST_LENS_FLARE_TEXTURE]);
