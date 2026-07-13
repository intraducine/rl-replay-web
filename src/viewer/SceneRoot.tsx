import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { forwardRef, memo, useEffect, useMemo, useRef, type ForwardedRef } from "react";
import { Suspense } from "react";
import * as THREE from "three";
import { useShallow } from "zustand/shallow";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { Group, Mesh } from "three";
import { Vector3 } from "three";
import { normalizeTimelineCoordinates } from "../replay/ReplayNormalizer";
import { samplePlayerCameraState, sampleTimeline, timelineDuration } from "../replay/ReplayTimeline";
import type { ReplayPlayer, ReplayTimeline, SampledReplayState } from "../replay/types";
import { useViewerStore } from "../state/viewerStore";
import { Ball } from "./Ball";
import { BoostPads } from "./BoostPads";
import { Car } from "./Car";
import { DemoExplosions } from "./DemoExplosions";
import { RocketLeagueLighting } from "./RocketLeagueLighting";
import {
  ballCamTransitionDuration,
  cameraRigForMode,
  cameraVerticalFov,
  constrainPlayerCameraTarget,
  replayCameraResponseRates,
  cameraSmoothingAlpha,
  directorTargetPlayerId,
  freeCameraKeyboardDisplacement,
  freeCameraMoveIntentForCode,
  playerCameraMaxAngularStep,
  smoothPlayerCameraOrbit,
  smoothPlayerCameraTarget,
  type FreeCameraMoveIntent
} from "./SpectatorCamera";
import { StandardArena } from "./StandardArena";
import { carBoostSegmentAt } from "./boostActivity";
import { setCarBoostActive, setCarSupersonicTrailVisible } from "./carBoost";
import { setCarRenderPosition } from "./carPlacement";
import { ROCKET_LEAGUE_BLOOM_LAYER } from "./renderLayers";

const PLAYBACK_UI_COMMIT_FPS = 15;
const PLAYBACK_UI_COMMIT_INTERVAL_SECONDS = 1 / PLAYBACK_UI_COMMIT_FPS;
const EXTERNAL_SEEK_EPSILON_SECONDS = 0.05;
const PROJECTED_SHADOW_Y = 12;
const PROJECTED_SHADOW_BASE_OPACITY = 0.28;
const CAR_PRESENTATION_RESPONSE_RATE = 40;
const BALL_PRESENTATION_RESPONSE_RATE = 44;
const ROTATION_PRESENTATION_RESPONSE_RATE = 38;
const CAR_PRESENTATION_SNAP_DISTANCE = 900;
const BALL_PRESENTATION_SNAP_DISTANCE = 1800;
const SHADOW_LIGHT_DIRECTION = new Vector3(2600, 6200, 3400).normalize();
const SHADOW_QUATERNION = new THREE.Quaternion();
const SHADOW_EULER = new THREE.Euler();
const SHADOW_RENDER_POSITION = new Vector3();
const PRESENTATION_TARGET_POSITION = new Vector3();
const PRESENTATION_TARGET_QUATERNION = new THREE.Quaternion();
const SAFE_INITIAL_CAMERA_POSITION: [number, number, number] = [0, 620, 1400];
const FREE_CAMERA_LOOK_SENSITIVITY = 0.0022;
const FREE_CAMERA_PITCH_LIMIT = Math.PI / 2 - 0.035;
type RocketLeagueRendererParameters = THREE.WebGLRendererParameters & {
  outputBufferType: THREE.TextureDataType;
};

const ROCKET_LEAGUE_RENDERER_PARAMETERS: RocketLeagueRendererParameters = {
  antialias: true,
  outputBufferType: THREE.HalfFloatType,
  powerPreference: "high-performance"
};

function SceneRootComponent({ timeline }: { timeline: ReplayTimeline }) {
  const { coordinateOptions, selectedPlayerId, cameraMode } = useViewerStore(
    useShallow((state) => ({
      coordinateOptions: state.coordinateOptions,
      selectedPlayerId: state.selectedPlayerId,
      cameraMode: state.cameraMode
    }))
  );
  const normalized = useMemo(() => normalizeTimelineCoordinates(timeline, coordinateOptions), [timeline, coordinateOptions]);
  const initialSample = useMemo(() => sampleTimeline(normalized, useViewerStore.getState().currentTime), [normalized]);
  const initialCameraRig = useMemo(
    () =>
      cameraRigForMode(
        cameraMode,
        initialSample,
        selectedPlayerId,
        normalized.events,
        samplePlayerCameraState(normalized, selectedPlayerId, initialSample.t)
      ),
    [cameraMode, initialSample, normalized, selectedPlayerId]
  );
  const initialCameraPosition = cameraMode === "free" ? SAFE_INITIAL_CAMERA_POSITION : initialCameraRig.position;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={ROCKET_LEAGUE_RENDERER_PARAMETERS}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.96;
      }}
      camera={{ position: initialCameraPosition, fov: cameraVerticalFov(initialCameraRig, 16 / 9) ?? 58, near: 0.1, far: 30000 }}
    >
      <RocketLeagueLighting />
      <StandardArena />
      <Suspense fallback={null}>
        <BoostPads timeline={normalized} />
      </Suspense>
      <ReplayObjects timeline={normalized} initialSample={initialSample} selectedPlayerId={selectedPlayerId} cameraMode={cameraMode} />
      <FirstPersonFreeCameraControls enabled={cameraMode === "free"} />
      <RocketLeaguePostprocess />
    </Canvas>
  );
}

export const SceneRoot = memo(SceneRootComponent);

function FirstPersonFreeCameraControls({ enabled }: { enabled: boolean }) {
  const { camera, gl } = useThree();
  const activeIntents = useRef(new Set<FreeCameraMoveIntent>());
  const looking = useRef(false);
  const movement = useMemo(() => new Vector3(), []);
  const forward = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const yawPitch = useMemo(() => new THREE.Euler(0, 0, 0, "YXZ"), []);

  useEffect(() => {
    activeIntents.current.clear();
    if (!enabled) return;
    const canvas = gl.domElement;
    yawPitch.setFromQuaternion(camera.quaternion, "YXZ");
    canvas.style.cursor = "grab";

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

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      looking.current = true;
      canvas.style.cursor = "grabbing";
      canvas.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!looking.current) return;
      yawPitch.y -= event.movementX * FREE_CAMERA_LOOK_SENSITIVITY;
      yawPitch.x = THREE.MathUtils.clamp(
        yawPitch.x - event.movementY * FREE_CAMERA_LOOK_SENSITIVITY,
        -FREE_CAMERA_PITCH_LIMIT,
        FREE_CAMERA_PITCH_LIMIT
      );
      camera.quaternion.setFromEuler(yawPitch);
    };

    const handlePointerUp = () => {
      looking.current = false;
      canvas.style.cursor = "grab";
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      activeIntents.current.clear();
      looking.current = false;
      canvas.style.cursor = "";
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [camera, enabled, gl, yawPitch]);

  useFrame((_, delta) => {
    if (!enabled || activeIntents.current.size === 0) return;
    const displacement = freeCameraKeyboardDisplacement(camera, activeIntents.current, delta, undefined, movement, forward, right);
    if (displacement.lengthSq() === 0) return;

    camera.position.add(displacement);
  });

  return null;
}

function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

function RocketLeaguePostprocess() {
  const { camera, gl, scene, size } = useThree();
  const { bloomComposer, finalComposer, smaaPass } = useMemo(() => {
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
    const nextSmaaPass = new SMAAPass();
    nextFinalComposer.addPass(new RenderPass(scene, camera));
    nextFinalComposer.addPass(finalPass);
    nextFinalComposer.addPass(nextSmaaPass);
    nextFinalComposer.addPass(new OutputPass());

    return { bloomComposer: nextBloomComposer, finalComposer: nextFinalComposer, smaaPass: nextSmaaPass };
  }, [camera, gl, scene, size.height, size.width]);

  useEffect(() => {
    bloomComposer.setSize(size.width, size.height);
    finalComposer.setSize(size.width, size.height);
    bloomComposer.setPixelRatio(gl.getPixelRatio());
    finalComposer.setPixelRatio(gl.getPixelRatio());
  }, [bloomComposer, finalComposer, gl, size.height, size.width]);

  useEffect(
    () => () => {
      smaaPass.dispose();
      bloomComposer.dispose();
      finalComposer.dispose();
    },
    [bloomComposer, finalComposer, smaaPass]
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
  const tmpUp = useMemo(() => new Vector3(), []);
  const tmpSampledCameraCarPosition = useMemo(() => new Vector3(), []);
  const tmpRenderedCameraCarPosition = useMemo(() => new Vector3(), []);
  const tmpCameraAnchorDelta = useMemo(() => new Vector3(), []);
  const tmpCurrentCameraViewDirection = useMemo(() => new Vector3(), []);
  const tmpDesiredSafeCameraTarget = useMemo(() => new Vector3(), []);
  const tmpSafeCameraTarget = useMemo(() => new Vector3(), []);
  const smoothedTarget = useRef(new Vector3());
  const smoothedUp = useRef(new Vector3(0, 1, 0));
  const cameraInitialized = useRef(false);
  const previousBallCam = useRef<boolean | undefined>(undefined);
  const previousCameraAnchor = useRef(new Vector3());
  const previousCameraAnchorPlayerId = useRef<string | undefined>(undefined);
  const ballCamTransitionRemaining = useRef(0);

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
    updateBall(ballRef.current, sample, delta, state.speed, externalSeek);
    updateCars(
      carRefs.current,
      projectedShadowRefs.current,
      sample,
      timeline,
      playbackTime.current,
      state.boostRenderingEnabled,
      delta,
      state.speed,
      externalSeek
    );

    if (state.cameraMode === "free") {
      previousBallCam.current = undefined;
      previousCameraAnchorPlayerId.current = undefined;
      ballCamTransitionRemaining.current = 0;
      cameraInitialized.current = false;
      return;
    }

    const cameraPlayerId =
      state.cameraMode === "director" ? directorTargetPlayerId(sample, timeline.events) ?? state.selectedPlayerId : state.selectedPlayerId;
    const sampledCameraCar = cameraPlayerId ? sample.cars[cameraPlayerId] : undefined;
    const renderedCameraCar = cameraPlayerId ? carRefs.current.get(cameraPlayerId) : undefined;
    const playerCameraState = samplePlayerCameraState(timeline, cameraPlayerId, sample.t);
    const rig = cameraRigForMode(
      state.cameraMode,
      sample,
      cameraPlayerId,
      timeline.events,
      playerCameraState
    );
    tmpDesired.fromArray(rig.position);
    tmpTarget.fromArray(rig.target);
    tmpUp.fromArray(rig.up);

    const currentBallCam = rig.ballCam === true;
    const hasRenderedPlayerAnchor =
      state.cameraMode === "player" && sampledCameraCar !== undefined && renderedCameraCar?.visible === true;
    if (hasRenderedPlayerAnchor) {
      tmpSampledCameraCarPosition.fromArray(sampledCameraCar.position);
      tmpRenderedCameraCarPosition.copy(renderedCameraCar.position);
      tmpDesired.add(tmpRenderedCameraCarPosition).sub(tmpSampledCameraCarPosition);
      if (!currentBallCam) tmpTarget.add(tmpRenderedCameraCarPosition).sub(tmpSampledCameraCarPosition);
    }
    if (
      state.cameraMode === "player"
      && previousBallCam.current !== undefined
      && previousBallCam.current !== currentBallCam
    ) {
      ballCamTransitionRemaining.current = ballCamTransitionDuration(playerCameraState?.settings);
    }
    if (externalSeek) ballCamTransitionRemaining.current = 0;
    const ballCamTransitioning = ballCamTransitionRemaining.current > 0;
    const responseRates = replayCameraResponseRates(state.cameraMode, playerCameraState?.settings, ballCamTransitioning);
    const playerCameraAngularStep = playerCameraMaxAngularStep(
      delta,
      playerCameraState?.settings,
      ballCamTransitioning
    );
    const shouldSnap = !cameraInitialized.current || externalSeek;

    if (hasRenderedPlayerAnchor) {
      if (!shouldSnap && previousCameraAnchorPlayerId.current === cameraPlayerId) {
        tmpCameraAnchorDelta.copy(tmpRenderedCameraCarPosition).sub(previousCameraAnchor.current);
        camera.position.add(tmpCameraAnchorDelta);
        if (!currentBallCam) smoothedTarget.current.add(tmpCameraAnchorDelta);
      }
      previousCameraAnchor.current.copy(tmpRenderedCameraCarPosition);
      previousCameraAnchorPlayerId.current = cameraPlayerId;
    } else {
      previousCameraAnchorPlayerId.current = undefined;
    }

    if (shouldSnap) {
      camera.position.copy(tmpDesired);
      smoothedTarget.current.copy(tmpTarget);
      smoothedUp.current.copy(tmpUp);
    } else {
      if (hasRenderedPlayerAnchor) {
        smoothPlayerCameraOrbit(
          camera.position,
          tmpDesired,
          tmpRenderedCameraCarPosition,
          cameraSmoothingAlpha(delta, responseRates.position),
          camera.position,
          playerCameraAngularStep
        );
      } else {
        camera.position.lerp(tmpDesired, cameraSmoothingAlpha(delta, responseRates.position));
      }
      smoothedTarget.current.lerp(tmpTarget, cameraSmoothingAlpha(delta, responseRates.target));
      smoothedUp.current.lerp(tmpUp, cameraSmoothingAlpha(delta, responseRates.up)).normalize();
    }
    camera.up.copy(smoothedUp.current);

    if ("fov" in camera && typeof rig.fov === "number") {
      const targetFov = cameraVerticalFov(rig, camera.aspect) ?? camera.fov;
      const nextFov = shouldSnap
        ? targetFov
        : THREE.MathUtils.lerp(camera.fov, targetFov, cameraSmoothingAlpha(delta, responseRates.fov));
      if (Math.abs(camera.fov - nextFov) > 0.001) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    }
    if (
      hasRenderedPlayerAnchor
      && "fov" in camera
      && typeof camera.fov === "number"
      && "aspect" in camera
      && typeof camera.aspect === "number"
    ) {
      constrainPlayerCameraTarget(
        camera.position,
        smoothedTarget.current,
        tmpRenderedCameraCarPosition,
        camera.fov,
        camera.aspect,
        tmpDesiredSafeCameraTarget
      );
      if (shouldSnap) {
        tmpSafeCameraTarget.copy(tmpDesiredSafeCameraTarget);
      } else {
        camera.getWorldDirection(tmpCurrentCameraViewDirection);
        smoothPlayerCameraTarget(
          camera.position,
          tmpCurrentCameraViewDirection,
          tmpDesiredSafeCameraTarget,
          cameraSmoothingAlpha(delta, responseRates.target),
          playerCameraAngularStep,
          tmpSafeCameraTarget
        );
      }
      constrainPlayerCameraTarget(
        camera.position,
        tmpSafeCameraTarget,
        tmpRenderedCameraCarPosition,
        camera.fov,
        camera.aspect,
        tmpSafeCameraTarget
      );
      camera.lookAt(tmpSafeCameraTarget);
    } else {
      camera.lookAt(smoothedTarget.current);
    }
    ballCamTransitionRemaining.current = Math.max(0, ballCamTransitionRemaining.current - delta);
    cameraInitialized.current = true;
    previousBallCam.current = currentBallCam;
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
  return !(cameraMode === "player" && selected);
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

function updateBall(ball: Group | null, sample: SampledReplayState, deltaSeconds: number, playbackSpeed: number, snap: boolean) {
  if (!ball) return;
  if (!sample.ball) {
    ball.visible = false;
    return;
  }
  const wasVisible = ball.visible;
  ball.visible = true;
  PRESENTATION_TARGET_POSITION.fromArray(sample.ball.position);
  PRESENTATION_TARGET_QUATERNION.fromArray(sample.ball.rotation);
  applyPresentationTransform(
    ball,
    PRESENTATION_TARGET_POSITION,
    PRESENTATION_TARGET_QUATERNION,
    deltaSeconds,
    playbackSpeed,
    snap || !wasVisible,
    BALL_PRESENTATION_RESPONSE_RATE,
    BALL_PRESENTATION_SNAP_DISTANCE
  );
}

function updateCars(
  cars: Map<string, Group>,
  shadows: Map<string, Mesh>,
  sample: SampledReplayState,
  timeline: ReplayTimeline,
  time: number,
  boostRenderingEnabled: boolean,
  deltaSeconds: number,
  playbackSpeed: number,
  snap: boolean
) {
  for (const [id, group] of cars) {
    const frame = sample.cars[id];
    const shadow = shadows.get(id);
    if (!frame) {
      group.visible = false;
      setCarBoostActive(group, false);
      setCarSupersonicTrailVisible(group, false);
      if (shadow) shadow.visible = false;
      continue;
    }
    const wasVisible = group.visible;
    group.visible = true;
    setCarRenderPosition(PRESENTATION_TARGET_POSITION, frame.position);
    PRESENTATION_TARGET_QUATERNION.fromArray(frame.rotation);
    applyPresentationTransform(
      group,
      PRESENTATION_TARGET_POSITION,
      PRESENTATION_TARGET_QUATERNION,
      deltaSeconds,
      playbackSpeed,
      snap || !wasVisible,
      CAR_PRESENTATION_RESPONSE_RATE,
      CAR_PRESENTATION_SNAP_DISTANCE
    );
    const boosting = boostRenderingEnabled && carBoostSegmentAt(timeline, id, time) !== undefined;
    setCarBoostActive(group, boosting, frame, boostRenderingEnabled, time);
    setCarSupersonicTrailVisible(group, boostRenderingEnabled && Boolean(frame.supersonic) && !boosting);
    if (shadow) updateProjectedCarShadow(shadow, group);
  }
}

function applyPresentationTransform(
  object: Group,
  targetPosition: Vector3,
  targetQuaternion: THREE.Quaternion,
  deltaSeconds: number,
  playbackSpeed: number,
  snap: boolean,
  positionResponseRate: number,
  snapDistance: number
) {
  const teleport = object.position.distanceToSquared(targetPosition) > snapDistance * snapDistance;
  if (snap || teleport) {
    object.position.copy(targetPosition);
    object.quaternion.copy(targetQuaternion);
    return;
  }

  object.position.lerp(targetPosition, presentationSmoothingAlpha(deltaSeconds, playbackSpeed, positionResponseRate));
  object.quaternion.slerp(
    targetQuaternion,
    presentationSmoothingAlpha(deltaSeconds, playbackSpeed, ROTATION_PRESENTATION_RESPONSE_RATE)
  );
}

export function presentationSmoothingAlpha(deltaSeconds: number, playbackSpeed: number, responseRate: number): number {
  return cameraSmoothingAlpha(deltaSeconds, responseRate * Math.max(1, playbackSpeed));
}

function updateProjectedCarShadow(shadow: Mesh, car: Group) {
  const renderPosition = SHADOW_RENDER_POSITION.copy(car.position);
  const height = Math.max(0, renderPosition.y - PROJECTED_SHADOW_Y);
  const lightOffsetX = -(height * SHADOW_LIGHT_DIRECTION.x) / Math.max(0.001, SHADOW_LIGHT_DIRECTION.y);
  const lightOffsetZ = -(height * SHADOW_LIGHT_DIRECTION.z) / Math.max(0.001, SHADOW_LIGHT_DIRECTION.y);
  const liftScale = 1 + Math.min(height * 0.0001, 0.28);
  const opacity = Math.max(0.2, PROJECTED_SHADOW_BASE_OPACITY - height * 0.0001);

  shadow.visible = true;
  shadow.position.set(renderPosition.x + lightOffsetX, PROJECTED_SHADOW_Y, renderPosition.z + lightOffsetZ);
  SHADOW_QUATERNION.copy(car.quaternion);
  SHADOW_EULER.setFromQuaternion(SHADOW_QUATERNION, "YXZ");
  shadow.rotation.set(0, SHADOW_EULER.y, 0);
  shadow.scale.set(liftScale, liftScale, 1);
  if (shadow.material instanceof THREE.MeshBasicMaterial) shadow.material.opacity = opacity;
}

function completePlayers(players: ReplayPlayer[], sample: SampledReplayState): ReplayPlayer[] {
  const knownIds = new Set<string>();
  for (const player of players) {
    knownIds.add(player.id);
  }

  let actors: ReplayPlayer[] | undefined;
  for (const id in sample.cars) {
    if (!Object.prototype.hasOwnProperty.call(sample.cars, id) || knownIds.has(id)) continue;
    const actorIndex = actors?.length ?? 0;
    const actor = { id, name: id.startsWith("actor-") ? `Car ${actorIndex + 1}` : id, team: actorIndex % 2 === 0 ? 0 : 1 } satisfies ReplayPlayer;
    if (actors) actors.push(actor);
    else actors = [actor];
  }

  if (!actors) return players;
  return players.concat(actors);
}
