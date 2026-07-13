import * as THREE from "three";
import { ALPHA_BOOST_CASCADE } from "./alphaBoostConfig";

export type LiquidGoldTextureSet = {
  cloudMap: THREE.Texture;
  coneMap: THREE.Texture;
  dustMap: THREE.Texture;
  smokeNoiseMap: THREE.Texture;
};

export type AlphaRewardBoostMeshTextureSet = {
  particleMap: THREE.Texture;
  waterNormalMap: THREE.Texture;
};

export type LiquidGoldDynamicParams = {
  distortionAmount: number;
  brightness: number;
  noiseAmount: number;
  softAmount: number;
};

export type LiquidGoldParticleUpdate = {
  opacity: number;
  colorScale: number;
  phase: number;
  dynamic: LiquidGoldDynamicParams;
  time: number;
};

export function createLiquidGoldParticleMaterial(textures: LiquidGoldTextureSet, particleSeed = 0) {
  const material = new THREE.ShaderMaterial({
    name: "LiquidGold_02_MAT_particle",
    transparent: true,
    depthWrite: false,
    // Boost_AlphaReward_SF exports LiquidGold_02_MAT as BLEND_Translucent.
    blending: THREE.NormalBlending,
    toneMapped: true,
    uniforms: {
      uCloudMap: { value: textures.cloudMap },
      uConeMap: { value: textures.coneMap },
      uDustMap: { value: textures.dustMap },
      uSmokeNoiseMap: { value: textures.smokeNoiseMap },
      uCoreColor: { value: new THREE.Vector3(...ALPHA_BOOST_CASCADE.coreColorRgb) },
      uSourceAdditiveColor: { value: new THREE.Vector3(0, 0, 0) },
      uSourceBasePassFog: { value: new THREE.Vector4(0, 0, 0, 1) },
      uDynamicParams: { value: new THREE.Vector4(0, 1, 1, 1) },
      uSmokeRowX: { value: new THREE.Vector2(1, 0) },
      uSmokeRowY: { value: new THREE.Vector2(0, 1) },
      uDustPanOffset: { value: new THREE.Vector2(0, 0) },
      uOpacity: { value: 1 },
      uColorScale: { value: 1 },
      uPhase: { value: 0 },
      uParticleSeed: { value: particleSeed },
      uTime: { value: 0 }
    },
    vertexShader: LIQUID_GOLD_VERTEX_SHADER,
    fragmentShader: LIQUID_GOLD_FRAGMENT_SHADER
  });

  return material;
}

export function updateLiquidGoldParticleMaterial(material: THREE.ShaderMaterial, update: LiquidGoldParticleUpdate) {
  material.uniforms.uOpacity.value = THREE.MathUtils.clamp(update.opacity, 0, 1);
  material.uniforms.uColorScale.value = update.colorScale;
  material.uniforms.uPhase.value = update.phase;
  material.uniforms.uTime.value = update.time;
  const smokeAngle = update.time * ALPHA_BOOST_CASCADE.material.resource.shaderUniformTransforms.smokeRotationRateRadiansPerSecond;
  const smokeSin = Math.sin(smokeAngle);
  const smokeCos = Math.cos(smokeAngle);
  material.uniforms.uSmokeRowX.value.set(smokeCos, -smokeSin);
  material.uniforms.uSmokeRowY.value.set(smokeSin, smokeCos);
  material.uniforms.uDustPanOffset.value.set(
    update.time * ALPHA_BOOST_CASCADE.material.resource.shaderUniformTransforms.dustPanRate[0],
    update.time * ALPHA_BOOST_CASCADE.material.resource.shaderUniformTransforms.dustPanRate[1]
  );
  material.uniforms.uDynamicParams.value.set(
    update.dynamic.distortionAmount,
    update.dynamic.brightness,
    update.dynamic.softAmount,
    update.dynamic.noiseAmount
  );
}

export function createAlphaRewardBoostMeshMaterial(textures: AlphaRewardBoostMeshTextureSet) {
  return new THREE.ShaderMaterial({
    name: "AlphaReward_MIC_boost_mesh",
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    toneMapped: true,
    vertexColors: false,
    uniforms: {
      uParticleMap: { value: textures.particleMap },
      uWaterNormalMap: { value: textures.waterNormalMap },
      uInnerColor: { value: new THREE.Vector4(...ALPHA_BOOST_CASCADE.material.innerColorRgba) },
      uOuterColor: { value: new THREE.Vector4(...ALPHA_BOOST_CASCADE.material.outerColorRgba) },
      uSourceBasePassFog: { value: new THREE.Vector4(0, 0, 0, 1) },
      uMaterialParams: {
        value: new THREE.Vector4(
          ALPHA_BOOST_CASCADE.material.scalar.distortion,
          ALPHA_BOOST_CASCADE.material.scalar.fresnelBase,
          ALPHA_BOOST_CASCADE.material.scalar.fresnelEnd,
          ALPHA_BOOST_CASCADE.material.scalar.gradientAmount
        )
      },
      uTile: { value: new THREE.Vector2(ALPHA_BOOST_CASCADE.material.scalar.tileX, ALPHA_BOOST_CASCADE.material.scalar.tileY) },
      uOuterSpeed: { value: ALPHA_BOOST_CASCADE.material.scalar.outerSpeed },
      uSpeedParams: { value: new THREE.Vector2(ALPHA_BOOST_CASCADE.material.scalar.innerSpeed, ALPHA_BOOST_CASCADE.material.scalar.outerSpeed) },
      uIntensityParams: { value: new THREE.Vector2(ALPHA_BOOST_CASCADE.material.scalar.innerIntensity, ALPHA_BOOST_CASCADE.material.scalar.outerIntensity) },
      uSparkParams: { value: new THREE.Vector2(ALPHA_BOOST_CASCADE.material.scalar.innerSparks, ALPHA_BOOST_CASCADE.material.scalar.outerSparks) },
      uGradientParams: {
        value: new THREE.Vector2(ALPHA_BOOST_CASCADE.material.scalar.gradientAmount, ALPHA_BOOST_CASCADE.material.scalar.gradientSharpness)
      },
      uOpacity: { value: ALPHA_BOOST_CASCADE.material.scalar.opacity },
      uBoostMeshFade: { value: 0 },
      uTime: { value: 0 }
    },
    vertexShader: ALPHA_REWARD_BOOST_MESH_VERTEX_SHADER,
    fragmentShader: ALPHA_REWARD_BOOST_MESH_FRAGMENT_SHADER
  });
}

export function updateAlphaRewardBoostMeshMaterial(material: THREE.ShaderMaterial, time: number, boostMeshFade = 1) {
  material.uniforms.uTime.value = time;
  material.uniforms.uBoostMeshFade.value = THREE.MathUtils.clamp(boostMeshFade, 0, 1);
}

const LIQUID_GOLD_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ALPHA_REWARD_BOOST_MESH_VERTEX_SHADER = /* glsl */ `
  attribute vec2 uv1;
  attribute vec4 tangent;

  varying vec2 vUv;
  varying vec4 vMeshUv;
  varying vec3 vTangentViewVector;

  void main() {
    vUv = uv;
    vMeshUv = vec4(uv.xy, uv1.y, uv1.x);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 worldViewVector = cameraPosition - worldPosition;
    vec3 modelX = modelMatrix[0].xyz;
    vec3 modelY = modelMatrix[1].xyz;
    vec3 modelZ = modelMatrix[2].xyz;
    vec3 localViewVector = vec3(
      dot(worldViewVector, modelX) / max(dot(modelX, modelX), 0.000001),
      dot(worldViewVector, modelY) / max(dot(modelY, modelY), 0.000001),
      dot(worldViewVector, modelZ) / max(dot(modelZ, modelZ), 0.000001)
    );
    vec3 localNormal = normalize(normal);
    vec3 localTangent = normalize(tangent.xyz);
    vec3 localBitangent = normalize(cross(localNormal, localTangent) * tangent.w);
    localTangent = normalize(cross(localBitangent, localNormal) * tangent.w);
    vTangentViewVector = vec3(dot(localTangent, localViewVector), dot(localBitangent, localViewVector), dot(localNormal, localViewVector));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const ALPHA_REWARD_BOOST_MESH_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uParticleMap;
  uniform sampler2D uWaterNormalMap;
  uniform vec4 uInnerColor;
  uniform vec4 uOuterColor;
  uniform vec4 uSourceBasePassFog;
  uniform vec4 uMaterialParams; // distortion, fresnel base, fresnel end, gradient amount
  uniform vec2 uTile;
  uniform float uOuterSpeed;
  uniform vec2 uSpeedParams;
  uniform vec2 uIntensityParams;
  uniform vec2 uSparkParams;
  uniform vec2 uGradientParams;
  uniform float uOpacity;
  uniform float uBoostMeshFade;
  uniform float uTime;

  varying vec2 vUv;
  varying vec4 vMeshUv;
  varying vec3 vTangentViewVector;

  void main() {
    // AlphaReward_MIC overrides Parent_Boost_Mesh.Materials.VertexColorCone_mat.
    // VertexColorCone_mat local mesh shader hash 52751c43 from FLocalVertexFactory.
    float selector = clamp((vMeshUv.w - 0.5) * 100.0, 0.0, 1.0);
    float scroll = mix(uSpeedParams.x, uSpeedParams.y, selector) * uTime;

    vec2 waterUvA = vec2(vMeshUv.x - scroll * 0.05, vMeshUv.y * 0.25 + scroll);
    vec2 waterUvB = vec2(vMeshUv.x + scroll * 0.02, vMeshUv.y * 0.5 + scroll);
    vec4 waterA = texture2D(uWaterNormalMap, waterUvA);
    vec4 waterB = texture2D(uWaterNormalMap, waterUvB);
    vec3 normalSum = vec3(waterA.g + waterB.g, waterA.r + waterB.r, waterA.g + waterB.g);

    vec2 baseUv = vec2(vMeshUv.x * uTile.x, vMeshUv.y * uTile.y * 0.2);
    vec2 sheetUvA = vec2(baseUv.x + normalSum.y * 0.1, baseUv.y + scroll * 2.0 + normalSum.z * 0.1);
    vec2 sheetUvB = vec2(baseUv.x + normalSum.y * 0.1, baseUv.y + scroll + normalSum.z * 0.1);
    vec4 sheetA = texture2D(uParticleMap, sheetUvA);
    vec4 sheetB = texture2D(uParticleMap, sheetUvB);

    float edgeCoord = normalSum.x * 0.5 + vMeshUv.y;
    float sparkThreshold = mix(uSparkParams.x, uSparkParams.y, selector);
    float sparkMask = clamp(sheetB.r * sheetA.r - sparkThreshold, 0.0, 1.0);

    float edgePower = min(pow(abs(vMeshUv.y), 4.0) * 4.0, 1.0);
    float fresnelExponent = mix(uMaterialParams.y, uMaterialParams.z, edgePower);
    float viewFacingRaw = vTangentViewVector.z * inversesqrt(dot(vTangentViewVector, vTangentViewVector));
    float viewFacing = clamp(viewFacingRaw, 0.0, 1.0);
    float fresnel = min(pow(max(abs(viewFacingRaw), 0.000001), fresnelExponent), 1.0);
    float gradient = clamp(pow(max(abs(edgeCoord), 0.000001), uGradientParams.x) * uGradientParams.y, 0.0, 1.0);

    float edgeInverse = clamp(1.0 - edgeCoord, 0.0, 1.0);
    float edgeFalloff = min(pow(edgeInverse, 4.0) * 64.0, 1.0) * viewFacing;
    float bodyMask = edgeFalloff * fresnel * gradient * sparkMask;
    float shapedFresnel = fresnel * gradient;
    if (abs(edgeCoord) < 0.000001 || abs(viewFacingRaw) < 0.000001) shapedFresnel = 0.0;
    // The native HDR alpha fields are energy metadata. Literal multiplication clips to white in ACES.
    float sheetEnvelope = clamp(max(sheetA.r, sheetB.r) * 1.35, 0.0, 1.0);
    float alphaCore = bodyMask * 18.0 + shapedFresnel * sheetEnvelope * 0.22;
    float alpha = clamp(alphaCore, 0.0, 0.88);

    vec3 inner = uInnerColor.rgb * uIntensityParams.x;
    vec3 outer = uOuterColor.rgb * uIntensityParams.y;
    float sourceEnergy = mix(uInnerColor.a, uOuterColor.a, selector);
    vec3 sourceColor = (inner + selector * (outer - inner)) * mix(1.25, 1.75, sourceEnergy / 6.0);
    vec3 color = sourceColor * uSourceBasePassFog.a + uSourceBasePassFog.rgb;
    gl_FragColor = vec4(color, alpha * uOpacity * uBoostMeshFade);
  }
`;

const LIQUID_GOLD_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uCloudMap;
  uniform sampler2D uConeMap;
  uniform sampler2D uDustMap;
  uniform sampler2D uSmokeNoiseMap;
  uniform vec3 uCoreColor;
  uniform vec3 uSourceAdditiveColor;
  uniform vec4 uSourceBasePassFog;
  uniform vec4 uDynamicParams; // distortion amount, brightness, soft amount, noise amount
  uniform vec2 uSmokeRowX;
  uniform vec2 uSmokeRowY;
  uniform vec2 uDustPanOffset;
  uniform float uOpacity;
  uniform float uColorScale;
  uniform float uPhase;
  uniform float uParticleSeed;
  uniform float uTime;

  varying vec2 vUv;

  void main() {
    // LiquidGold_02_MAT shader hash 6d9e0e75, adapted from its native particle vertex-factory UVs
    // to a web plane's 0..1 UVs before preserving the decoded smoke/dust/cone operations below.
    // ParticleModuleRequired allows image flipping. Keep each particle's flip stable so
    // the overlapping Cloud_T sprites read as turbulent volume instead of one repeated wedge.
    float verticalFlip = mod(floor(uParticleSeed * 8.0), 2.0) < 1.0 ? 1.0 : -1.0;
    vec2 webUv = vec2(vUv.x, (vUv.y - 0.5) * verticalFlip + 0.5);
    vec2 sourceUv = webUv;
    vec2 centeredUv = sourceUv - vec2(0.5);
    vec2 smokeUv = vec2(dot(uSmokeRowX, centeredUv), dot(uSmokeRowY, centeredUv)) + vec2(0.5);
    vec4 smokeNoise = texture2D(uSmokeNoiseMap, smokeUv);
    vec2 distortion = (smokeNoise.xy * 2.0 - 1.0) * (0.035 + uDynamicParams.x * 0.003);
    vec2 distortedUv = clamp(sourceUv + distortion, vec2(0.001), vec2(0.999));

    vec4 cone = texture2D(uConeMap, distortedUv);
    vec3 coneEnergy = pow(max(abs(cone.rgb), vec3(0.000001)), vec3(15.0)) * 50.0;

    vec4 cloud = texture2D(uCloudMap, distortedUv);
    vec2 dustUv = distortedUv + uDustPanOffset;
    vec4 dust = texture2D(uDustMap, dustUv);
    vec3 dustWxy = vec3(dust.a, dust.r, dust.g);
    vec3 dustNoise = ((dust.a - 0.2) * 0.5 + dustWxy) * dustWxy + uDynamicParams.w;
    dustNoise = clamp(dustNoise * cloud.r, 0.0, 1.0) * 3.0;

    float radialEnvelope = 1.0 - smoothstep(0.46, 0.72, length(centeredUv));
    float coneSpark = dot(coneEnergy, vec3(0.333333));
    float cloudEnvelope = clamp(cloud.r * (0.68 + dustNoise.x * 0.26) + coneSpark * 0.16, 0.0, 1.0);
    float alpha = clamp(uOpacity * (cloudEnvelope * 3.2 + dustNoise.x * 0.22) * radialEnvelope, 0.0, 0.94);

    vec3 emberGold = vec3(1.45, 0.34, 0.025);
    vec3 texturedGold = mix(emberGold, uCoreColor, smoothstep(0.18, 0.86, cloudEnvelope));
    vec3 liquid = texturedGold * (0.3 + cloudEnvelope * 1.06) + coneEnergy * uCoreColor * 0.48;
    vec3 color = liquid * uColorScale * (0.55 + uDynamicParams.y * 0.9);
    color += uSourceAdditiveColor;
    color = color * uSourceBasePassFog.a + uSourceBasePassFog.rgb;

    gl_FragColor = vec4(color, alpha);
  }
`;
