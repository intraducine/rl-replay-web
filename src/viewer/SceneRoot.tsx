import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { forwardRef, useEffect, useMemo, useRef, type ElementRef, type ForwardedRef, type RefObject } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { Group, Mesh } from "three";
import { Vector3 } from "three";
import { normalizeTimelineCoordinates } from "../replay/ReplayNormalizer";
import { sampleCarDistanceWindow, sampleCarSpawnPerUnitAgesWindow, samplePlayerCameraState, sampleTimeline, timelineDuration } from "../replay/ReplayTimeline";
import type { ReplayPlayer, ReplayTimeline, SampledReplayState } from "../replay/types";
import { useViewerStore } from "../state/viewerStore";
import { Ball } from "./Ball";
import { BoostPads } from "./BoostPads";
import { Car } from "./Car";
import { DemoExplosions } from "./DemoExplosions";
import { RocketLeagueLighting } from "./RocketLeagueLighting";
import {
  cameraRigForMode,
  cameraSmoothingAlpha,
  directorTargetPlayerId,
  freeCameraKeyboardDisplacement,
  freeCameraMoveIntentForCode,
  type FreeCameraMoveIntent
} from "./SpectatorCamera";
import { StandardArena } from "./StandardArena";
import { ALPHA_BOOST_CASCADE } from "./alphaBoostConfig";
import { carBoostSegmentStartTime, isCarBoostingAt } from "./boostActivity";
import { setCarAlphaBoostActive, setCarSupersonicTrailVisible } from "./carAlphaBoost";
import { carRenderPosition } from "./carPlacement";
import { ROCKET_LEAGUE_BLOOM_LAYER } from "./renderLayers";

const PLAYBACK_UI_COMMIT_FPS = 30;
const PLAYBACK_UI_COMMIT_INTERVAL_SECONDS = 1 / PLAYBACK_UI_COMMIT_FPS;
const EXTERNAL_SEEK_EPSILON_SECONDS = 0.05;
const FIELD_SHADOW_CATCHER_Y = 2;
const PROJECTED_SHADOW_Y = FIELD_SHADOW_CATCHER_Y + 0.6;
const PROJECTED_SHADOW_BASE_OPACITY = 0.28;
const SHADOW_LIGHT_DIRECTION = new Vector3(2600, 6200, 3400).normalize();
const SHADOW_QUATERNION = new THREE.Quaternion();
const SHADOW_EULER = new THREE.Euler();
const FREE_CAMERA_INITIAL_POSITION: [number, number, number] = [0, 160, 0];
const FREE_CAMERA_TARGET: [number, number, number] = [0, 160, -1];
const FREE_CAMERA_MIN_DISTANCE = 1;
const FREE_CAMERA_MAX_DISTANCE = 12000;
type RocketLeagueRendererParameters = THREE.WebGLRendererParameters & {
  outputBufferType: THREE.TextureDataType;
};

const ROCKET_LEAGUE_RENDERER_PARAMETERS: RocketLeagueRendererParameters = {
  antialias: true,
  outputBufferType: THREE.HalfFloatType,
  powerPreference: "high-performance"
};

export function SceneRoot({ timeline }: { timeline: ReplayTimeline }) {
  const coordinateOptions = useViewerStore((state) => state.coordinateOptions);
  const selectedPlayerId = useViewerStore((state) => state.selectedPlayerId);
  const cameraMode = useViewerStore((state) => state.cameraMode);
  const orbitControlsRef = useRef<ElementRef<typeof OrbitControls> | null>(null);
  const normalized = useMemo(() => normalizeTimelineCoordinates(timeline, coordinateOptions), [timeline, coordinateOptions]);
  const initialSample = useMemo(() => sampleTimeline(normalized, useViewerStore.getState().currentTime), [normalized]);

  return (
    <Canvas
      shadows
      dpr={1}
      gl={ROCKET_LEAGUE_RENDERER_PARAMETERS}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.96;
      }}
      camera={{ position: FREE_CAMERA_INITIAL_POSITION, fov: 58, near: 0.1, far: 30000 }}
    >
      <RocketLeagueLighting />
      <StandardArena />
      <FieldShadowCatcher />
      <BoostPads />
      <ReplayObjects timeline={normalized} initialSample={initialSample} selectedPlayerId={selectedPlayerId} cameraMode={cameraMode} />
      <FreeCameraKeyboardControls enabled={cameraMode === "free"} controlsRef={orbitControlsRef} />
      <OrbitControls
        ref={orbitControlsRef}
        makeDefault
        enabled={cameraMode === "free"}
        target={FREE_CAMERA_TARGET}
        minDistance={FREE_CAMERA_MIN_DISTANCE}
        maxDistance={FREE_CAMERA_MAX_DISTANCE}
      />
      <RocketLeaguePostprocess />
    </Canvas>
  );
}

function FieldShadowCatcher() {
  return (
    <mesh position={[0, FIELD_SHADOW_CATCHER_Y, 0]} rotation-x={-Math.PI / 2} receiveShadow renderOrder={1}>
      <planeGeometry args={[9800, 12200]} />
      <shadowMaterial color="#020508" transparent opacity={0.88} depthWrite={false} />
    </mesh>
  );
}

function FreeCameraKeyboardControls({
  enabled,
  controlsRef
}: {
  enabled: boolean;
  controlsRef: RefObject<ElementRef<typeof OrbitControls> | null>;
}) {
  const { camera } = useThree();
  const activeIntents = useRef(new Set<FreeCameraMoveIntent>());

  useEffect(() => {
    activeIntents.current.clear();
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableEventTarget(event.target)) return;
      const intent = freeCameraMoveIntentForCode(event.code);
      if (!intent) return;
      activeIntents.current.add(intent);
      event.preventDefault();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const intent = freeCameraMoveIntentForCode(event.code);
      if (!intent) return;
      activeIntents.current.delete(intent);
      event.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      activeIntents.current.clear();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [enabled]);

  useFrame((_, delta) => {
    if (!enabled || activeIntents.current.size === 0) return;
    const displacement = freeCameraKeyboardDisplacement(camera, activeIntents.current, delta);
    if (displacement.lengthSq() === 0) return;

    camera.position.add(displacement);
    controlsRef.current?.target.add(displacement);
    controlsRef.current?.update();
  });

  return null;
}

function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

function RocketLeaguePostprocess() {
  const { camera, gl, scene, size } = useThree();
  const { bloomComposer, finalComposer } = useMemo(() => {
    const nextBloomComposer = new EffectComposer(gl);
    nextBloomComposer.renderToScreen = false;
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.62, 0.24, 0.52);
    bloomPass.threshold = 0.38;
    bloomPass.strength = 0.62;
    bloomPass.radius = 0.24;
    nextBloomComposer.addPass(new RenderPass(scene, camera));
    nextBloomComposer.addPass(bloomPass);

    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: nextBloomComposer.renderTarget2.texture }
        },
        vertexShader: BLOOM_COMBINE_VERTEX_SHADER,
        fragmentShader: BLOOM_COMBINE_FRAGMENT_SHADER
      }),
      "baseTexture"
    );
    finalPass.needsSwap = true;

    const nextFinalComposer = new EffectComposer(gl);
    nextFinalComposer.addPass(new RenderPass(scene, camera));
    nextFinalComposer.addPass(finalPass);
    nextFinalComposer.addPass(new OutputPass());

    return { bloomComposer: nextBloomComposer, finalComposer: nextFinalComposer };
  }, [camera, gl, scene, size.height, size.width]);

  useEffect(() => {
    bloomComposer.setSize(size.width, size.height);
    finalComposer.setSize(size.width, size.height);
    bloomComposer.setPixelRatio(gl.getPixelRatio());
    finalComposer.setPixelRatio(gl.getPixelRatio());
  }, [bloomComposer, finalComposer, gl, size.height, size.width]);

  useEffect(
    () => () => {
      bloomComposer.dispose();
      finalComposer.dispose();
    },
    [bloomComposer, finalComposer]
  );

  useFrame(() => {
    const previousLayerMask = camera.layers.mask;
    const previousBackground = scene.background;
    try {
      camera.layers.set(ROCKET_LEAGUE_BLOOM_LAYER);
      scene.background = null;
      bloomComposer.render();
    } finally {
      scene.background = previousBackground;
      camera.layers.mask = previousLayerMask;
    }
    finalComposer.render();
  }, 1);

  return null;
}

const BLOOM_COMBINE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BLOOM_COMBINE_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D baseTexture;
  uniform sampler2D bloomTexture;
  varying vec2 vUv;

  void main() {
    gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv);
  }
`;

function ReplayObjects({
  timeline,
  initialSample,
  selectedPlayerId,
  cameraMode
}: {
  timeline: ReplayTimeline;
  initialSample: SampledReplayState;
  selectedPlayerId?: string;
  cameraMode: string;
}) {
  const { camera } = useThree();
  const ballRef = useRef<Group | null>(null);
  const carRefs = useRef(new Map<string, Group>());
  const projectedShadowRefs = useRef(new Map<string, Mesh>());
  const playbackTime = useRef(initialSample.t);
  const lastPublishedPlaybackTime = useRef(initialSample.t);
  const lastPlaying = useRef(false);
  const duration = useMemo(() => timelineDuration(timeline), [timeline]);
  const players = useMemo(() => completePlayers(timeline.metadata.players, initialSample), [timeline.metadata.players, initialSample]);
  const tmpTarget = useMemo(() => new Vector3(), []);
  const tmpDesired = useMemo(() => new Vector3(), []);
  const smoothedTarget = useRef(new Vector3());

  useFrame((_, delta) => {
    const state = useViewerStore.getState();
    const externalSeek = Math.abs(state.currentTime - lastPublishedPlaybackTime.current) > EXTERNAL_SEEK_EPSILON_SECONDS;
    if (state.playing) {
      if (!lastPlaying.current || externalSeek) {
        playbackTime.current = state.currentTime;
      } else {
        playbackTime.current = Math.min(duration, playbackTime.current + delta * state.speed);
      }
    } else {
      playbackTime.current = state.currentTime;
    }
    lastPlaying.current = state.playing;

    if (!state.playing || externalSeek || playbackTime.current >= duration) {
      lastPublishedPlaybackTime.current = playbackTime.current;
    } else if (playbackTime.current - lastPublishedPlaybackTime.current >= PLAYBACK_UI_COMMIT_INTERVAL_SECONDS) {
      lastPublishedPlaybackTime.current = playbackTime.current;
      state.setCurrentTime(playbackTime.current);
    }

    if (state.playing && playbackTime.current >= duration) {
      state.setCurrentTime(duration);
      state.setPlaying(false);
    }

    const sample = sampleTimeline(timeline, playbackTime.current);
    updateBall(ballRef.current, sample);
    updateCars(carRefs.current, projectedShadowRefs.current, sample, timeline, playbackTime.current, state.boostRenderingEnabled);

    if (state.cameraMode === "free") return;

    const cameraPlayerId =
      state.cameraMode === "director" ? directorTargetPlayerId(sample, timeline.events) ?? state.selectedPlayerId : state.selectedPlayerId;
    const cameraRigMode = state.cameraMode === "director" ? "player" : state.cameraMode;
    const rig = cameraRigForMode(
      cameraRigMode,
      sample,
      cameraPlayerId,
      timeline.events,
      samplePlayerCameraState(timeline, cameraPlayerId, sample.t)
    );
    camera.up.fromArray(rig.up);
    tmpDesired.fromArray(rig.position);
    tmpTarget.fromArray(rig.target);

    if ("fov" in camera && typeof rig.fov === "number" && camera.fov !== rig.fov) {
      camera.fov = rig.fov;
      camera.updateProjectionMatrix();
    }

    camera.position.lerp(tmpDesired, cameraSmoothingAlpha(delta, 7.7));
    smoothedTarget.current.lerp(tmpTarget, cameraSmoothingAlpha(delta, 11.9));
    camera.lookAt(smoothedTarget.current);
  });

  return (
    <>
      <Ball ref={ballRef} frame={initialSample.ball} />
      {players.map((player) => (
        <group key={player.id}>
          <Car
            ref={(node) => {
              if (node) carRefs.current.set(player.id, node);
              else carRefs.current.delete(player.id);
            }}
            frame={initialSample.cars[player.id]}
            player={player}
            selected={selectedPlayerId === player.id}
            showNameplate={shouldShowNameplate(cameraMode, selectedPlayerId === player.id)}
          />
          <ProjectedCarShadow
            ref={(node) => {
              if (node) projectedShadowRefs.current.set(player.id, node);
              else projectedShadowRefs.current.delete(player.id);
            }}
          />
        </group>
      ))}
      <DemoExplosions timeline={timeline} playbackTimeRef={playbackTime} />
    </>
  );
}

function shouldShowNameplate(cameraMode: string, selected: boolean): boolean {
  return selected || cameraMode !== "player";
}

type ProjectedCarShadowProps = object;

function ProjectedCarShadowComponent(_: ProjectedCarShadowProps, ref: ForwardedRef<Mesh>) {
  const shadowTexture = useMemo(createProjectedCarShadowTexture, []);
  const shadowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: shadowTexture,
        color: "#020508",
        transparent: true,
        opacity: PROJECTED_SHADOW_BASE_OPACITY,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
        toneMapped: false
      }),
    [shadowTexture]
  );

  return (
    <mesh ref={ref} visible={false} rotation-x={-Math.PI / 2} material={shadowMaterial} renderOrder={3}>
      <planeGeometry args={[520, 340]} />
    </mesh>
  );
}

const ProjectedCarShadow = forwardRef<Mesh, ProjectedCarShadowProps>(ProjectedCarShadowComponent);

function createProjectedCarShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create projected car shadow texture context.");

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(0, 0, 0, 0.38)";
  drawSoftEllipse(context, 128, 82, 86, 42);
  drawSoftEllipse(context, 102, 82, 46, 34);
  context.fillStyle = "rgba(0, 0, 0, 0.58)";
  drawSoftEllipse(context, 76, 42, 24, 18);
  drawSoftEllipse(context, 180, 42, 24, 18);
  drawSoftEllipse(context, 76, 118, 24, 18);
  drawSoftEllipse(context, 180, 118, 24, 18);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function drawSoftEllipse(context: CanvasRenderingContext2D, x: number, y: number, radiusX: number, radiusY: number) {
  const gradient = context.createRadialGradient(x, y, Math.min(radiusX, radiusY) * 0.2, x, y, Math.max(radiusX, radiusY));
  gradient.addColorStop(0, context.fillStyle.toString());
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.save();
  context.translate(x, y);
  context.scale(radiusX / radiusY, 1);
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, radiusY, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function updateBall(ball: Group | null, sample: SampledReplayState) {
  if (!ball) return;
  if (!sample.ball) {
    ball.visible = false;
    return;
  }
  ball.visible = true;
  ball.position.fromArray(sample.ball.position);
  ball.quaternion.fromArray(sample.ball.rotation);
}

function updateCars(
  cars: Map<string, Group>,
  shadows: Map<string, Mesh>,
  sample: SampledReplayState,
  timeline: ReplayTimeline,
  time: number,
  boostRenderingEnabled: boolean
) {
  for (const [id, group] of cars) {
    const frame = sample.cars[id];
    const shadow = shadows.get(id);
    if (!frame) {
      group.visible = false;
      setCarAlphaBoostActive(group, false);
      setCarSupersonicTrailVisible(group, false);
      if (shadow) shadow.visible = false;
      continue;
    }
    group.visible = true;
    group.position.fromArray(carRenderPosition(frame.position));
    group.quaternion.fromArray(frame.rotation);
    const boosting = boostRenderingEnabled && isCarBoostingAt(timeline, id, time);
    let flameDistanceWindow: number | undefined;
    let flameSpawnAges: number[] | undefined;
    let alphaBoostEmitterAge: number | undefined;

    if (boosting) {
      flameDistanceWindow = sampleCarDistanceWindow(timeline, id, time, ALPHA_BOOST_CASCADE.flame.lifetimeSeconds);
      const flameEmitterStartTime = carBoostSegmentStartTime(timeline, id, time);
      alphaBoostEmitterAge = time - flameEmitterStartTime;
      flameSpawnAges = sampleCarSpawnPerUnitAgesWindow(
        timeline,
        id,
        time,
        ALPHA_BOOST_CASCADE.flame.lifetimeSeconds,
        ALPHA_BOOST_CASCADE.flame.spawnPerUnit,
        ALPHA_BOOST_CASCADE.flame.runtimeParameters.spawnRate.averageScalar,
        flameEmitterStartTime
      );
    }

    setCarAlphaBoostActive(group, boosting, frame, boostRenderingEnabled, time, flameDistanceWindow, flameSpawnAges, alphaBoostEmitterAge);
    setCarSupersonicTrailVisible(group, boostRenderingEnabled && Boolean(frame.supersonic) && !boosting);
    if (shadow) updateProjectedCarShadow(shadow, frame);
  }
}

function updateProjectedCarShadow(shadow: Mesh, frame: SampledReplayState["cars"][string]) {
  const renderPosition = carRenderPosition(frame.position);
  const height = Math.max(0, renderPosition[1] - PROJECTED_SHADOW_Y);
  const lightOffsetX = -(height * SHADOW_LIGHT_DIRECTION.x) / Math.max(0.001, SHADOW_LIGHT_DIRECTION.y);
  const lightOffsetZ = -(height * SHADOW_LIGHT_DIRECTION.z) / Math.max(0.001, SHADOW_LIGHT_DIRECTION.y);
  const liftScale = 1 + Math.min(height * 0.0001, 0.28);
  const opacity = Math.max(0.2, PROJECTED_SHADOW_BASE_OPACITY - height * 0.0001);

  shadow.visible = true;
  shadow.position.set(renderPosition[0] + lightOffsetX, PROJECTED_SHADOW_Y, renderPosition[2] + lightOffsetZ);
  SHADOW_QUATERNION.fromArray(frame.rotation);
  SHADOW_EULER.setFromQuaternion(SHADOW_QUATERNION, "YXZ");
  shadow.rotation.set(0, SHADOW_EULER.y, 0);
  shadow.scale.set(liftScale, liftScale, 1);
  if (shadow.material instanceof THREE.MeshBasicMaterial) shadow.material.opacity = opacity;
}

function completePlayers(players: ReplayPlayer[], sample: SampledReplayState): ReplayPlayer[] {
  const knownIds = new Set(players.map((player) => player.id));
  const actors = Object.keys(sample.cars)
    .filter((id) => !knownIds.has(id))
    .map((id, index): ReplayPlayer => ({ id, name: id.startsWith("actor-") ? `Car ${index + 1}` : id, team: index % 2 === 0 ? 0 : 1 }));
  return [...players, ...actors];
}
