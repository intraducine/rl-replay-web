import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import { BoostPadDebugPreview } from "./BoostPads";

export function BoostPadDebugScene() {
  return (
    <div className="boost-pad-debug-scene" data-testid="boost-pad-debug-scene">
      <Canvas
        dpr={1}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 160, 390], fov: 36, near: 1, far: 3000 }}
        onCreated={({ gl, scene }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.95;
          scene.background = new THREE.Color("#08131b");
        }}
      >
        <ambientLight intensity={0.46} />
        <directionalLight position={[-180, 360, 220]} intensity={2.1} />
        <mesh rotation-x={-Math.PI / 2} position-y={-0.5} receiveShadow>
          <planeGeometry args={[620, 360]} />
          <meshStandardMaterial color="#263524" roughness={0.88} metalness={0.02} />
        </mesh>
        <gridHelper args={[600, 30, "#496143", "#324431"]} position-y={0.05} />
        <Suspense fallback={null}>
          <BoostPadDebugPreview />
        </Suspense>
        <OrbitControls makeDefault target={[0, 38, 0]} enablePan={false} minDistance={170} maxDistance={800} />
      </Canvas>
    </div>
  );
}
