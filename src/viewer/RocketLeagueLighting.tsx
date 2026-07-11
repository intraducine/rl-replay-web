import { Environment, Lightformer } from "@react-three/drei";

const SKYBOX_BLUE = "#07131d";

export function RocketLeagueLighting() {
  return (
    <>
      <color attach="background" args={[SKYBOX_BLUE]} />

      <ambientLight intensity={0.46} color="#ffffff" />
      <hemisphereLight args={["#fffaf0", "#233026", 0.36]} />
      <directionalLight
        position={[2600, 6200, 3400]}
        intensity={2.05}
        color="#fff3d4"
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-6200}
        shadow-camera-right={6200}
        shadow-camera-top={7600}
        shadow-camera-bottom={-7600}
        shadow-camera-near={500}
        shadow-camera-far={13000}
        shadow-bias={-0.00025}
        shadow-normalBias={1.2}
      />
      <directionalLight position={[-3600, 3400, -4200]} intensity={0.52} color="#fff7e6" />
      <spotLight
        position={[0, 5600, 0]}
        intensity={2.35}
        color="#ffffff"
        angle={0.82}
        penumbra={0.72}
        decay={0.45}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={600}
        shadow-camera-far={9800}
        shadow-bias={-0.0002}
        shadow-normalBias={0.8}
      />
      <pointLight position={[0, 760, 5200]} intensity={620} distance={8600} color="#fff1dc" decay={1.6} />
      <pointLight position={[0, 760, -5200]} intensity={620} distance={8600} color="#fff1dc" decay={1.6} />
      <pointLight position={[-4200, 1500, 0]} intensity={110} distance={7200} color="#ffffff" decay={1.8} />
      <pointLight position={[4200, 1500, 0]} intensity={110} distance={7200} color="#ffffff" decay={1.8} />

      <Environment resolution={96} frames={1} environmentIntensity={0.86}>
        <Lightformer form="rect" color="#fff8ea" intensity={2.4} position={[0, 6500, -6200]} rotation-x={Math.PI / 2} scale={[9000, 2600, 1]} />
        <Lightformer form="rect" color="#ffffff" intensity={1.55} position={[0, 7200, 1400]} rotation-x={Math.PI / 2} scale={[9800, 1800, 1]} />
        <Lightformer form="rect" color="#fff5e3" intensity={1.2} position={[-5200, 1800, -1600]} rotation-y={Math.PI / 2} scale={[1800, 4400, 1]} />
        <Lightformer form="rect" color="#fff5e3" intensity={1.2} position={[5200, 1800, 1600]} rotation-y={-Math.PI / 2} scale={[1800, 4400, 1]} />
        <Lightformer form="ring" color="#ffffff" intensity={1.8} position={[0, 3800, 0]} rotation-x={Math.PI / 2} scale={[7200, 7200, 1]} />
      </Environment>
    </>
  );
}
