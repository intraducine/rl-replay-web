import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Group } from "three";
import type { CarFrame, ReplayPlayer } from "../replay/types";
import { Car } from "./Car";
import { setCarAlphaBoostActive } from "./carAlphaBoost";

const DEBUG_PLAYER: ReplayPlayer = {
  id: "alpha-boost-debug-octane",
  name: "Alpha Boost QA",
  team: 0
};

const DEBUG_FRAME: CarFrame = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  velocity: [2300, 0, 0],
  boost: 100
};

type DebugRuntimeWindow = Window & {
  advanceTime?: (ms: number) => void;
  render_game_to_text?: () => string;
};

export function AlphaBoostDebugScene() {
  useEffect(() => {
    const runtimeWindow = window as DebugRuntimeWindow;
    const previousRenderGameToText = runtimeWindow.render_game_to_text;
    const previousAdvanceTime = runtimeWindow.advanceTime;

    runtimeWindow.render_game_to_text = () =>
      JSON.stringify({
        scene: "alpha-boost-qa",
        isolated: true,
        stadium: false,
        boostActive: true,
        car: {
          position: DEBUG_FRAME.position,
          velocity: DEBUG_FRAME.velocity
        }
      });
    runtimeWindow.advanceTime = () => undefined;

    return () => {
      runtimeWindow.render_game_to_text = previousRenderGameToText;
      runtimeWindow.advanceTime = previousAdvanceTime;
    };
  }, []);

  return (
    <div className="alpha-boost-debug-scene" data-testid="alpha-boost-debug-scene">
      <Canvas
        dpr={1}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [-360, 150, 210], fov: 34, near: 1, far: 5000 }}
        onCreated={({ gl, scene }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.95;
          scene.background = new THREE.Color("#071014");
        }}
      >
        <ambientLight intensity={0.72} />
        <directionalLight position={[-400, 700, 500]} intensity={2.2} />
        <DebugOctaneBoost />
        <OrbitControls makeDefault target={[-70, 24, 0]} enablePan={false} minDistance={160} maxDistance={1500} />
      </Canvas>
    </div>
  );
}

function DebugOctaneBoost() {
  const carRef = useRef<Group | null>(null);

  useFrame(() => {
    if (!carRef.current) return;
    setCarAlphaBoostActive(carRef.current, true, DEBUG_FRAME, true);
  });

  return <Car ref={carRef} frame={DEBUG_FRAME} player={DEBUG_PLAYER} selected={false} showNameplate={false} />;
}
