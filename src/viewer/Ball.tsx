import { useGLTF, useTexture } from "@react-three/drei";
import { forwardRef, Suspense, useMemo } from "react";
import * as THREE from "three";
import type { Group } from "three";
import type { RigidBodyFrame } from "../replay/types";
import { publicAsset } from "./publicAsset";

const BALL_ASSET = publicAsset("/rl-assets/ball/Ball_DefaultBall00.gltf");
const BALL_DIFFUSE = publicAsset("/rl-assets/ball/Ball_Default00_D.png");
const BALL_NORMAL = publicAsset("/rl-assets/ball/Ball_Default00_N.png");
const BALL_SCALE = 100;

export const Ball = forwardRef<Group, { frame?: RigidBodyFrame }>(function Ball({ frame }, ref) {
  if (!frame) return null;
  return (
    <group ref={ref} position={frame.position} quaternion={frame.rotation} scale={BALL_SCALE}>
      <Suspense fallback={<FallbackBall />}>
        <GameBallMesh />
      </Suspense>
    </group>
  );
});

function GameBallMesh() {
  const { scene } = useGLTF(BALL_ASSET);
  const diffuse = useTexture(BALL_DIFFUSE);
  const normal = useTexture(BALL_NORMAL);
  const ball = useMemo(() => {
    diffuse.colorSpace = THREE.SRGBColorSpace;
    diffuse.flipY = false;
    normal.flipY = false;

    const clone = scene.clone(true);

    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (Array.isArray(object.material)) {
        object.material = object.material.map((material) => enhanceMaterial(material, diffuse, normal));
      } else {
        object.material = enhanceMaterial(object.material, diffuse, normal);
      }
      object.castShadow = true;
      object.receiveShadow = true;
    });

    return clone;
  }, [diffuse, normal, scene]);

  return <primitive object={ball} />;
}

function FallbackBall() {
  return (
    <mesh castShadow>
      <sphereGeometry args={[0.92, 32, 20]} />
      <meshStandardMaterial color="#d8d4c7" roughness={0.46} metalness={0.08} />
    </mesh>
  );
}

function enhanceMaterial(material: THREE.Material, map: THREE.Texture, normalMap: THREE.Texture) {
  if (!(material instanceof THREE.MeshStandardMaterial)) return material;

  const clone = material.clone();
  clone.vertexColors = false;
  clone.map = map;
  clone.normalMap = normalMap;
  clone.color.set("#ffffff");
  clone.emissive.set("#18252e");
  clone.emissiveIntensity = 0.14;
  clone.roughness = 0.36;
  clone.metalness = 0.12;
  clone.envMapIntensity = 1.25;
  return clone;
}

useGLTF.preload(BALL_ASSET);
useTexture.preload(BALL_DIFFUSE);
useTexture.preload(BALL_NORMAL);
