import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { ALPHA_BOOST_CASCADE } from "../viewer/alphaBoostConfig";
import { createAlphaRewardBoostMeshMaterial, createLiquidGoldParticleMaterial, updateAlphaRewardBoostMeshMaterial, updateLiquidGoldParticleMaterial } from "../viewer/alphaBoostMaterial";

describe("LiquidGold alpha boost material", () => {
  const textureSet = {
    cloudMap: new THREE.Texture(),
    coneMap: new THREE.Texture(),
    dustMap: new THREE.Texture(),
    smokeNoiseMap: new THREE.Texture()
  };

  it("uses the decoded unlit translucent material contract", () => {
    const material = createLiquidGoldParticleMaterial(textureSet);

    expect(material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.toneMapped).toBe(true);
    expect(material.blending).toBe(THREE.NormalBlending);
    expect(material.uniforms.uCoreColor.value.toArray()).toEqual(ALPHA_BOOST_CASCADE.coreColorRgb);
    expect(material.uniforms.uSourceAdditiveColor.value.toArray()).toEqual([0, 0, 0]);
    expect(material.uniforms.uSourceBasePassFog.value.toArray()).toEqual([0, 0, 0, 1]);
    expect(material.uniforms.uInnerEnergy).toBeUndefined();
    expect(material.uniforms.uOuterEnergy).toBeUndefined();
    expect(material.uniforms.uMaterialParams).toBeUndefined();
    expect(material.uniforms.uSpriteMap).toBeUndefined();
    expect(material.uniforms.uSubUvOffset).toBeUndefined();
    expect(material.uniforms.uSubUvScale).toBeUndefined();
    expect(material.fragmentShader).toContain("uSmokeNoiseMap");
    expect(material.fragmentShader).toContain("uConeMap");
    expect(material.fragmentShader).toContain("uCloudMap");
    expect(material.fragmentShader).toContain("uDustMap");
    expect(material.fragmentShader).toContain("uCoreColor");
    expect(material.fragmentShader).toContain("distortion amount, brightness, soft amount, noise amount");
    expect(material.fragmentShader).toContain("LiquidGold_02_MAT particle shader hash 6d9e0e75");
    expect(material.fragmentShader).toContain("vec2 centeredUv = vUv * 0.5 - vec2(0.5)");
    expect(material.uniforms.uSmokeRowX.value.toArray()).toEqual([1, 0]);
    expect(material.uniforms.uSmokeRowY.value.toArray()).toEqual([0, 1]);
    expect(material.uniforms.uDustPanOffset.value.toArray()).toEqual([0, 0]);
    expect(material.fragmentShader).toContain("uniform vec2 uSmokeRowX");
    expect(material.fragmentShader).toContain("uniform vec2 uSmokeRowY");
    expect(material.fragmentShader).toContain("uniform vec2 uDustPanOffset");
    expect(material.fragmentShader).toContain("vec2 smokeUv = vec2(dot(uSmokeRowX, centeredUv), dot(uSmokeRowY, centeredUv)) + vec2(0.5)");
    expect(material.fragmentShader).toContain("vec2 distortedUv = vUv + smokeNoise.xy * 0.08");
    expect(material.fragmentShader).toContain("vec2 dustUv = distortedUv + uDustPanOffset");
    expect(material.fragmentShader).toContain("pow(max(abs(cone.rgb), vec3(0.000001)), vec3(15.0)) * 50.0");
    expect(material.fragmentShader).toContain("vec3 dustWxy = vec3(dust.a, dust.r, dust.g)");
    expect(material.fragmentShader).toContain("vec3 dustNoise = ((dust.a - 0.2) * 0.5 + dustWxy) * dustWxy + uDynamicParams.w");
    expect(material.fragmentShader).toContain("dustNoise = clamp(dustNoise * cloud.r, 0.0, 1.0) * 3.0");
    expect(material.fragmentShader).toContain("float alphaSeed = uOpacity * dustNoise.x - 0.01");
    expect(material.fragmentShader).toContain("float alpha = clamp(alphaSeed + alphaSeed, 0.0, 1.0)");
    expect(material.fragmentShader).toContain("vec3 color = liquid * uCoreColor * uColorScale");
    expect(material.fragmentShader).toContain("color = color * uDynamicParams.y + uSourceAdditiveColor");
    expect(material.fragmentShader).toContain("color = color * uSourceBasePassFog.a + uSourceBasePassFog.rgb");
    expect(material.fragmentShader).not.toContain("normalize(max(uCoreColor");
    expect(material.fragmentShader).not.toContain("coneCutout");
    expect(material.fragmentShader).not.toContain("cone.a");
    expect(material.fragmentShader).not.toContain("length(centered)");
    expect(material.fragmentShader).not.toContain("float softMask");
    expect(material.fragmentShader).not.toContain("float core");
    expect(material.fragmentShader).not.toContain("max(cone.r, cone.a)");
    expect(material.fragmentShader).not.toContain("float cloudEnvelope");
    expect(material.fragmentShader).not.toContain("cloudMask * 0.68");
    expect(material.fragmentShader).not.toContain("0.28 + cloud.r");
    expect(material.fragmentShader).not.toContain("spriteAlpha * 0.74 + resourceMask");
    expect(material.fragmentShader).not.toContain("uPhase * 0.07");
    expect(material.fragmentShader).not.toContain("uPhase * 0.13");
    expect(material.fragmentShader).not.toContain("uTime * -0.25");
    expect(material.fragmentShader).not.toContain("uTime * 0.1");
    expect(material.fragmentShader).not.toContain("mat2 uSmokeRotationRows");
    expect(material.fragmentShader).not.toContain("uSmokeRotationRows * centeredUv");
    expect(material.fragmentShader).not.toContain("uSpriteMap");
    expect(material.fragmentShader).not.toContain("uInnerEnergy");
    expect(material.fragmentShader).not.toContain("uOuterEnergy");
  });

  it("updates per-particle dynamic parameter uniforms without replacing the material", () => {
    const material = createLiquidGoldParticleMaterial(textureSet);

    updateLiquidGoldParticleMaterial(material, {
      opacity: 0.5,
      colorScale: 1.25,
      phase: 0.375,
      dynamic: {
        distortionAmount: 4,
        brightness: 0.8,
        noiseAmount: 0.3,
        softAmount: 0.9
      },
      time: 2
    });

    expect(material.uniforms.uOpacity.value).toBe(0.5);
    expect(material.uniforms.uColorScale.value).toBe(1.25);
    expect(material.uniforms.uPhase.value).toBe(0.375);
    expect(material.uniforms.uDynamicParams.value.toArray()).toEqual([4, 0.8, 0.9, 0.3]);
    expect(material.uniforms.uTime.value).toBe(2);
    expect(material.uniforms.uSmokeRowX.value.toArray()).toEqual([
      Math.cos(-0.5),
      -Math.sin(-0.5)
    ]);
    expect(material.uniforms.uSmokeRowY.value.toArray()).toEqual([
      Math.sin(-0.5),
      Math.cos(-0.5)
    ]);
    expect(material.uniforms.uDustPanOffset.value.toArray()).toEqual([0.2, 0.2]);
  });

  it("uses the decoded AlphaReward boost mesh material contract", () => {
    const material = createAlphaRewardBoostMeshMaterial({
      particleMap: new THREE.Texture(),
      waterNormalMap: new THREE.Texture()
    });

    expect(material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(material.name).toBe("AlphaReward_MIC_boost_mesh");
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.side).toBe(THREE.DoubleSide);
    expect(material.forceSinglePass).toBe(true);
    expect(material.toneMapped).toBe(true);
    expect(material.vertexColors).toBe(false);
    expect(material.uniforms.uInnerColor.value.toArray()).toEqual(ALPHA_BOOST_CASCADE.material.innerColorRgba);
    expect(material.uniforms.uOuterColor.value.toArray()).toEqual(ALPHA_BOOST_CASCADE.material.outerColorRgba);
    expect(material.uniforms.uSourceBasePassFog.value.toArray()).toEqual([0, 0, 0, 1]);
    expect(material.uniforms.uSparkParams.value.toArray()).toEqual([
      ALPHA_BOOST_CASCADE.material.scalar.innerSparks,
      ALPHA_BOOST_CASCADE.material.scalar.outerSparks
    ]);
    expect(material.uniforms.uIntensityParams.value.toArray()).toEqual([
      ALPHA_BOOST_CASCADE.material.scalar.innerIntensity,
      ALPHA_BOOST_CASCADE.material.scalar.outerIntensity
    ]);
    expect(material.uniforms.uGradientParams.value.toArray()).toEqual([
      ALPHA_BOOST_CASCADE.material.scalar.gradientAmount,
      ALPHA_BOOST_CASCADE.material.scalar.gradientSharpness
    ]);
    expect(material.uniforms.uOpacity.value).toBe(ALPHA_BOOST_CASCADE.material.scalar.opacity);
    expect(material.uniforms.uBoostMeshFade.value).toBe(0);
    expect(material.fragmentShader).toContain("AlphaReward_MIC overrides Parent_Boost_Mesh.Materials.VertexColorCone_mat");
    expect(material.fragmentShader).toContain("uParticleMap");
    expect(material.fragmentShader).toContain("uWaterNormalMap");
    expect(material.fragmentShader).toContain("VertexColorCone_mat local mesh shader hash 52751c43");
    expect(material.fragmentShader).toContain("float selector = clamp((vMeshUv.w - 0.5) * 100.0, 0.0, 1.0)");
    expect(material.fragmentShader).toContain("float scroll = mix(uSpeedParams.x, uSpeedParams.y, selector) * uTime");
    expect(material.fragmentShader).toContain("vec2 waterUvA = vec2(vMeshUv.x - scroll * 0.05, vMeshUv.y * 0.25 + scroll)");
    expect(material.fragmentShader).toContain("vec2 waterUvB = vec2(vMeshUv.x + scroll * 0.02, vMeshUv.y * 0.5 + scroll)");
    expect(material.fragmentShader).toContain("vec3 normalSum = vec3(waterA.g + waterB.g, waterA.r + waterB.r, waterA.g + waterB.g)");
    expect(material.fragmentShader).not.toContain("waterA.b + waterB.r");
    expect(material.fragmentShader).toContain("vec2 sheetUvA = vec2(baseUv.x + normalSum.y * 0.1, baseUv.y + scroll * 2.0 + normalSum.z * 0.1)");
    expect(material.fragmentShader).toContain("vec2 sheetUvB = vec2(baseUv.x + normalSum.y * 0.1, baseUv.y + scroll + normalSum.z * 0.1)");
    expect(material.fragmentShader).toContain("float sparkThreshold = mix(uSparkParams.x, uSparkParams.y, selector)");
    expect(material.fragmentShader).toContain("float sparkMask = clamp(sheetB.r * sheetA.r - sparkThreshold, 0.0, 1.0)");
    expect(material.fragmentShader).toContain("float fresnelExponent = mix(uMaterialParams.y, uMaterialParams.z, edgePower)");
    expect(material.vertexShader).toContain("attribute vec4 tangent");
    expect(material.vertexShader).toContain("varying vec3 vTangentViewVector");
    expect(material.vertexShader).toContain("vec3 worldViewVector = cameraPosition - worldPosition");
    expect(material.vertexShader).toContain("vec3 localViewVector = vec3(");
    expect(material.vertexShader).toContain("dot(worldViewVector, modelX) / max(dot(modelX, modelX), 0.000001)");
    expect(material.vertexShader).toContain("vTangentViewVector = vec3(dot(localTangent, localViewVector), dot(localBitangent, localViewVector), dot(localNormal, localViewVector))");
    expect(material.fragmentShader).toContain("varying vec3 vTangentViewVector");
    expect(material.fragmentShader).toContain("float viewFacingRaw = vTangentViewVector.z * inversesqrt(dot(vTangentViewVector, vTangentViewVector))");
    expect(material.fragmentShader).toContain("float viewFacing = clamp(viewFacingRaw, 0.0, 1.0)");
    expect(material.fragmentShader).toContain("float fresnel = min(pow(max(abs(viewFacingRaw), 0.000001), fresnelExponent), 1.0)");
    expect(material.fragmentShader).toContain("float gradient = clamp(pow(max(abs(edgeCoord), 0.000001), uGradientParams.x) * uGradientParams.y, 0.0, 1.0)");
    expect(material.fragmentShader).toContain("if (abs(edgeCoord) < 0.000001 || abs(viewFacingRaw) < 0.000001) shapedFresnel = 0.0");
    expect(material.fragmentShader).toContain("float shapedFresnel = fresnel * gradient");
    expect(material.fragmentShader).toContain("float alphaCore = bodyMask * 64.0 + shapedFresnel");
    expect(material.fragmentShader).toContain("vec3 inner = uInnerColor.rgb * uInnerColor.a * uIntensityParams.x");
    expect(material.fragmentShader).toContain("vec3 outer = uOuterColor.rgb * uOuterColor.a * uIntensityParams.y");
    expect(material.fragmentShader).toContain("vec3 sourceColor = inner + selector * (outer - inner)");
    expect(material.fragmentShader).toContain("vec3 color = sourceColor * uSourceBasePassFog.a + uSourceBasePassFog.rgb");
    expect(material.fragmentShader).toContain("alpha * uOpacity * uBoostMeshFade");
    expect(material.fragmentShader).toContain("uBoostMeshFade");
    expect(material.vertexShader).toContain("attribute vec2 uv1");
    expect(material.vertexShader).toContain("vMeshUv = vec4(uv.xy, uv1.y, uv1.x)");
    expect(material.fragmentShader).not.toContain("(1.0 - gradient) * 0.22");
    expect(material.fragmentShader).not.toContain("fresnel * 0.18");
    expect(material.fragmentShader).not.toContain("0.2 + sparkMask");
    expect(material.fragmentShader).not.toContain("sparkAmount");
    expect(material.fragmentShader).not.toContain("sheet.r * sparkAmount");
    expect(material.fragmentShader).not.toContain("sheetBody");
    expect(material.vertexShader).not.toContain("varying vec3 vColor");
    expect(material.fragmentShader).not.toContain("varying vec3 vColor");
    expect(material.fragmentShader).not.toContain("vColor");

    updateAlphaRewardBoostMeshMaterial(material, 4.25, 1.4);
    expect(material.uniforms.uTime.value).toBe(4.25);
    expect(material.uniforms.uBoostMeshFade.value).toBe(1);

    updateAlphaRewardBoostMeshMaterial(material, 4.5, -0.25);
    expect(material.uniforms.uBoostMeshFade.value).toBe(0);
  });
});
