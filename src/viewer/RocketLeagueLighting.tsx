import { Environment, Lightformer, Sky } from "@react-three/drei";

export const FLOATING_ARENA_SKY_COLOR = "#78b9e8";
const FLOATING_ARENA_HAZE_COLOR = "#b5d9ed";
const SUN_POSITION: [number, number, number] = [7200, 9800, -6800];

export function RocketLeagueLighting() {
  return (
    <>
      <color attach="background" args={[FLOATING_ARENA_SKY_COLOR]} />
      <fog attach="fog" args={[FLOATING_ARENA_HAZE_COLOR, 18_000, 29_500]} />
      <Sky
        distance={240_000}
        sunPosition={SUN_POSITION}
        turbidity={4.4}
        rayleigh={2.8}
        mieCoefficient={0.004}
        mieDirectionalG={0.82}
      />

      <ambientLight intensity={0.34} color="#edf8ff" />
      <hemisphereLight args={["#d8efff", "#33413c", 0.72]} />
      <directionalLight
        position={SUN_POSITION}
        intensity={1.72}
        color="#fff4dc"
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
      <directionalLight position={[-4200, 3600, 4600]} intensity={0.32} color="#d8edff" />
      <spotLight
        position={[0, 5600, 0]}
        intensity={1.25}
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
      <pointLight position={[0, 760, 5200]} intensity={360} distance={8600} color="#ddebff" decay={1.7} />
      <pointLight position={[0, 760, -5200]} intensity={360} distance={8600} color="#ffe6cf" decay={1.7} />
      <pointLight position={[-4200, 1500, 0]} intensity={70} distance={7200} color="#edf8ff" decay={1.9} />
      <pointLight position={[4200, 1500, 0]} intensity={70} distance={7200} color="#edf8ff" decay={1.9} />

      <Environment resolution={96} frames={1} environmentIntensity={0.48}>
        <Lightformer form="rect" color="#fff6e5" intensity={1.35} position={[0, 6500, -6200]} rotation-x={Math.PI / 2} scale={[9000, 2600, 1]} />
        <Lightformer form="rect" color="#dff4ff" intensity={0.9} position={[0, 7200, 1400]} rotation-x={Math.PI / 2} scale={[9800, 1800, 1]} />
        <Lightformer form="rect" color="#dceeff" intensity={0.62} position={[-5200, 1800, -1600]} rotation-y={Math.PI / 2} scale={[1800, 4400, 1]} />
        <Lightformer form="rect" color="#fff0dd" intensity={0.62} position={[5200, 1800, 1600]} rotation-y={-Math.PI / 2} scale={[1800, 4400, 1]} />
        <Lightformer form="ring" color="#f2fbff" intensity={0.85} position={[0, 3800, 0]} rotation-x={Math.PI / 2} scale={[7200, 7200, 1]} />
      </Environment>
    </>
  );
}
