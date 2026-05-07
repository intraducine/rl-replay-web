import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALPHA_BOOST_CASCADE,
  sampleAlphaBoostFloatCurve,
  sampleAlphaBoostSourceFloatCurve,
  sampleAlphaBoostVectorCurve
} from "../viewer/alphaBoostConfig";

describe("Alpha boost Cascade constants", () => {
  it("matches the decoded Gold Rush emitter contract", () => {
    expect(ALPHA_BOOST_CASCADE.coreColorRgb).toEqual([2.5, 1, 0.125]);
    expect(ALPHA_BOOST_CASCADE.randomStream).toEqual({
      sourceExecutable: "RocketLeague.exe",
      disassemblyAddress: "0x1402e6e80",
      multiplier: 0x0bb38435,
      increment: 0x3619636b,
      mantissaMask: 0x007fffff,
      floatOneBits: 0x3f800000,
      webBaseSeed: 0,
      seedStatus: "No serialized Cascade RandomSeedInfo was found in Boost_AlphaReward_SF; base seed remains an unresolved runtime state.",
      drawOrder: {
        flame: {
          drawsPerParticle: 6,
          particleSize: { firstDraw: 0, draws: 3, source: "FXTrait_BoostParticle_TA_1.ParticleSize" },
          acceleration: { firstDraw: 3, draws: 3, source: "ParticleModuleAcceleration_1.Acceleration" }
        },
        main: {
          drawsPerParticle: 6,
          startSize: { firstDraw: 0, draws: 3, source: "ParticleModuleSize_0.StartSize" },
          startVelocity: { firstDraw: 3, draws: 3, source: "ParticleModuleVelocity_0.StartVelocity" }
        }
      }
    });
    expect(ALPHA_BOOST_CASCADE.texturePaths).toEqual({
      cone: "/rl-assets/alpha-boost/Noise_Cones01_D.png",
      cloud: "/rl-assets/alpha-boost/Cloud_T.png",
      dust: "/rl-assets/alpha-boost/Dust_T.png",
      particle: "/rl-assets/alpha-boost/ParticleSheet_T.png",
      smokeNoise: "/rl-assets/alpha-boost/Noise_Smoke_03_Pack.png"
    });
    expect(ALPHA_BOOST_CASCADE.updateStepSeconds).toBe(0.01666666753590107);
    expect(ALPHA_BOOST_CASCADE.flame).toMatchObject({
      emitterName: "Flame",
      peakActiveParticles: 2,
      lifetimeSeconds: 1,
      particleSize: [75, 50, 50],
      spawnPerUnit: 1 / 32,
      referenceSpeed: 2300,
      particlesPerExhaustAtReferenceSpeed: 144,
      fixedRelativeBoundingBox: [
        [-32, -12, -12],
        [8, 12, 12]
      ],
      acceleration: [0, 0, 30],
      accelerationRange: {
        min: [0, 0, 15],
        max: [0, 0, 30],
        alwaysInWorldSpace: true,
        rawDistribution: {
          sourceExport: "ParticleModuleAcceleration_1",
          moduleRef: 127,
          op: 2,
          lookupTableNumElements: 2,
          lookupTableChunkSize: 6,
          lookupTable: [0, 30, 0, 0, 15, 0, 0, 30, 0, 0, 15, 0, 0, 30],
          decodedSourceEntry: [0, 0, 15, 0, 0, 30]
        }
      },
      velocityOverLifeInWorldSpace: true
    });
    expect(ALPHA_BOOST_CASCADE.flame.runtimeParameters).toEqual({
      sourceExport: "FXTrait_BoostParticle_TA_1",
      particleSize: {
        parameterName: "ParticleSize",
        parameterType: "PSPT_VectorRand",
        vector: [50, 10, 10],
        vectorLow: [35, 5, 5]
      },
      spawnRate: {
        parameterName: "SpawnRate",
        parameterType: "PSPT_ScalarRand",
        scalar: 4,
        scalarLow: 0,
        averageScalar: 2
      },
      coneSize: {
        parameterName: "ConeSize",
        parameterType: "PSPT_Vector",
        vector: [0.20000000298023224, 0.20000000298023224, 0.3499999940395355]
      },
      hotSourceSize: {
        parameterName: "HotSourceSize",
        parameterType: "PSPT_Vector",
        vector: [8, 0, 0]
      },
      glowSize: {
        parameterName: "GlowSize",
        parameterType: "PSPT_Vector",
        vector: [45, 0, 0]
      },
      cone2Size: {
        parameterName: "Cone2Size",
        parameterType: "PSPT_Vector",
        vector: [0.20000000298023224, 0.20000000298023224, 0.5]
      }
    });
    expect(ALPHA_BOOST_CASCADE.flame.requiredModule).toEqual({
      sourceExport: "ParticleModuleRequired_8",
      moduleRef: 141,
      materialRef: 24,
      material: "LiquidGold_02_MAT",
      sortMode: "PSORTMODE_DistanceToView",
      allowImageFlipping: false,
      useLocalSpace: false,
      killOnCompleted: true,
      useLegacyEmitterTime: false,
      randomImageTime: 1
    });
    expect(ALPHA_BOOST_CASCADE.flame.sourceDistributions).toEqual({
      spawnPerUnit: {
        sourceExport: "DistributionFloatParticleParameter_18",
        objectRef: 10,
        parameterName: "SpawnRate",
        mode: "DPM_Direct",
        constant: 1
      },
      coreColor: {
        sourceExport: "DistributionVectorParticleParameter_3",
        objectRef: 11,
        parameterName: "CoreColor",
        mode: "DPM_Direct",
        constant: [2.5, 1, 0.125]
      },
      particleSize: {
        sourceExport: "DistributionVectorParticleParameter_19",
        objectRef: 12,
        parameterName: "ParticleSize",
        mode: "DPM_Direct",
        constant: [75, 50, 50]
      }
    });
    expect(ALPHA_BOOST_CASCADE.main).toMatchObject({
      emitterName: "Main",
      peakActiveParticles: 8,
      lifetimeSeconds: 0.5,
      spawnRate: 10,
      emitterDurationSeconds: 0.25,
      useLocalSpace: true,
      fixedRelativeBoundingBox: [
        [-1, -1, -1],
        [1, 1, 1]
      ],
      startVelocity: {
        low: [-50, -5, -5],
        high: [-100, 5, 5],
        rawDistribution: {
          op: 2,
          lookupTableNumElements: 2,
          lookupTableChunkSize: 6,
          lookupTable: [-50, 5, -50, -5, -5, -100, 5, 5, -50, -5, -5, -100, 5, 5],
          decodedSourceEntry: [-50, -5, -5, -100, 5, 5]
        }
      }
    });
    expect(ALPHA_BOOST_CASCADE.main.requiredModule).toEqual({
      sourceExport: "ParticleModuleRequired_0",
      moduleRef: 142,
      materialRef: 24,
      material: "LiquidGold_02_MAT",
      allowImageFlipping: true,
      useLocalSpace: true,
      killOnCompleted: true,
      useLegacyEmitterTime: false,
      emitterDurationSeconds: 0.25,
      randomImageTime: 1
    });
    expect(ALPHA_BOOST_CASCADE.main.runtimeParameters).toEqual({
      sourceExport: "FXTrait_BoostParticle_TA_0",
      sourceActorPath: "FXActor_Boost_TA.BodyParticleParameters[0]",
      sourceActorParameterCount: 1,
      driveConeSize: {
        parameterName: "DriveConeSize",
        parameterType: "PSPT_Vector",
        vector: [0.20000000298023224, 0.20000000298023224, 0.10000000149011612]
      }
    });
    expect(ALPHA_BOOST_CASCADE.main.sourceDistributions).toEqual({
      coreColor: {
        sourceExport: "DistributionVectorParticleParameter_3",
        objectRef: 13,
        parameterName: "CoreColor",
        mode: "DPM_Direct",
        constant: [2.5, 1, 0.125]
      }
    });
    expect(ALPHA_BOOST_CASCADE.material.scalar).toMatchObject({
      distortion: 8,
      fresnelBase: 3,
      fresnelEnd: 12,
      gradientAmount: 12,
      gradientSharpness: 3,
      innerIntensity: 1,
      innerSpeed: 1,
      outerIntensity: 1,
      outerSpeed: 1.5,
      opacity: 1,
      tileX: 2,
      tileY: 2
    });
    expect(ALPHA_BOOST_CASCADE.material.innerColorRgba).toEqual([1.5, 0.800000011920929, 0.20000000298023224, 6]);
    expect(ALPHA_BOOST_CASCADE.material.outerColorRgba).toEqual([1.5, 0.800000011920929, 0.20000000298023224, 3]);
    expect(ALPHA_BOOST_CASCADE.material.innerEnergyRgb).toEqual([9, 4.800000071525574, 1.2000000178813934]);
    expect(ALPHA_BOOST_CASCADE.material.outerEnergyRgb).toEqual([4.5, 2.400000035762787, 0.6000000089406967]);
    expect(ALPHA_BOOST_CASCADE.material.subUvTiles).toEqual([2, 2]);
    expect(ALPHA_BOOST_CASCADE.material.resource).toEqual({
      blendMode: "BLEND_Translucent",
      lightingModel: "MLM_Unlit",
      numUserTexCoords: 1,
      usesDynamicParameter: true,
      particleColorParameter: "CoreColor",
      uniformTexturePaths: [
        "/rl-assets/alpha-boost/Noise_Smoke_03_Pack.png",
        "/rl-assets/alpha-boost/Noise_Cones01_D.png",
        "/rl-assets/alpha-boost/Cloud_T.png",
        "/rl-assets/alpha-boost/Dust_T.png"
      ],
      textureAddressModes: {
        cone: ["TA_Wrap", "TA_Wrap"],
        cloud: ["TA_Clamp", "TA_Clamp"],
        dust: ["TA_Wrap", "TA_Wrap"],
        smokeNoise: ["TA_Wrap", "TA_Wrap"]
      },
      textureCompressionSettings: {
        cone: "TC_Grayscale",
        cloud: "TC_Default",
        dust: "TC_Default",
        smokeNoise: "TC_Default"
      },
      textureColorSpaces: {
        cone: "linear",
        cloud: "srgb",
        dust: "srgb",
        smokeNoise: "srgb"
      },
      shaderCache: {
        package: "RefShaderCache-PC-D3D-SM5.upk",
        chunk: "chunk20_uo4871f4b0",
        material: "LiquidGold_02_MAT",
        vertexFactory: "FParticleSubUVDynamicParameterVertexFactory",
        shaderType: "TBasePassPixelShaderFNoLightMapPolicyNoSkyLightNoPixelVelocity",
        shaderHash: "6d9e0e755ca6024b9942065801ad3dac",
        dxbcOffset: "0x91fb7",
        disassembly: "output/exact-liquidgold-disasm/subuv_tbase_ps_6d9e0e75_91fb7_67c.asm"
      },
      shaderUniformTransforms: {
        smokeRotationRateRadiansPerSecond: -0.25,
        dustPanRate: [0.1, 0.1],
        disassemblyConstantBufferRows: ["cb0[58].xy", "cb0[59].xy"],
        disassemblyDustOffset: "cb0[60].xy"
      }
    });
    expect(ALPHA_BOOST_CASCADE.boostMesh).toEqual({
      sourcePackage: "Startup.upk",
      sourceExport: "Octane_SM",
      assetPath: "/rl-assets/alpha-boost/boostmesh/Octane_SM.gltf",
      archetype: "Parent_Boost_Mesh",
      runtimeOwner: "FXActor_Boost_TA",
      fadeInTime: [0, 1],
      fadeOutTime: [1, 2],
      bodyOverridePath: "Body_Octane.FXActor",
      sourceAttachmentOverrides: [
        {
          attachmentName: "BoostConeMesh",
          sourceComponent: "StaticMeshComponent_20",
          staticMesh: "Boost_Tests.Meshes.Octane_SM",
          translation: [-50, 9, 10],
          rotation: [-16384, 0, 0],
          scale3D: [0.503028, 0.088923, 0.503028]
        },
        {
          attachmentName: "BoostConeMesh02",
          sourceComponent: "StaticMeshComponent_22",
          staticMesh: "Boost_Tests.Meshes.Octane_SM",
          translation: [-50, -9, 10],
          rotation: [16384, 37235, 4467],
          scale3D: [0.503028, 0.088923, 0.503028]
        }
      ],
      materialInstance: "AlphaReward_MIC",
      materialOverrides: [
        { materialRef: 42, material: "AlphaReward_MIC", materialIndex: 0 },
        { materialRef: 42, material: "AlphaReward_MIC", materialIndex: 1 }
      ],
      parentMaterial: "VertexColorCone_mat",
        referencedTexturePaths: ["/rl-assets/alpha-boost/Water_02_N.png", "/rl-assets/alpha-boost/ParticleSheet_T.png"],
        materialResource: {
          blendMode: "BLEND_Translucent",
          twoSided: true,
          textureCompressionSettings: {
            particle: "TC_Default",
            waterNormal: "TC_Default"
          },
          textureColorSpaces: {
            particle: "srgb",
            waterNormal: "srgb"
          },
          scalarParameters: {
          distortion: 8,
          fresnelBase: 3,
          fresnelEnd: 12,
          gradientAmount: 12,
          gradientSharpness: 3,
          innerIntensity: 1,
          innerSpeed: 1,
          outerIntensity: 1,
          outerSpeed: 1.5,
          opacity: 1,
          tileX: 2,
          tileY: 2
        },
        vectorParameters: {
          innerColorRgba: [1.5, 0.800000011920929, 0.20000000298023224, 6],
          outerColorRgba: [1.5, 0.800000011920929, 0.20000000298023224, 3]
        },
        shaderCache: {
          package: "RefShaderCache-PC-D3D-SM5.upk",
          chunk: "chunk29_uo6b55b294",
          material: "VertexColorCone_mat",
          materialInstance: "AlphaReward_MIC",
          vertexFactory: "FLocalVertexFactory",
          shaderType: "TBasePassPixelShaderFNoLightMapPolicyNoSkyLightNoPixelVelocity",
          shaderHash: "52751c43fba5db46ba50a7d3ec65deb1",
          dxbcOffset: "0x809df",
          disassembly: "output/exact-vertexcolorcone-disasm/vcc_local_ps_52751c43_809df_af0.asm"
        }
      }
    });
    expect(ALPHA_BOOST_CASCADE.carBoostGlowColorRgba).toEqual([1, 0.6689812541007996, 0.08848005533218384, 1]);
    expect(ALPHA_BOOST_CASCADE.lensFlare).toEqual({
      attachmentName: "BoostLensFlare",
      sourceComponent: "LensFlareComponent_0",
      sourceExport: "BoostFlare_LF",
      objectName: "BoostFlare_LF",
      attachmentSocketName: "RocketBoost",
      colorRgb: [1, 1, 1],
      sourceColorRgba: [4.5, 0.9375, 0.15000000596046448, 1],
      sourceComponentRotation: [0, 32768, 0],
      material: {
        lfMaterialRef: -64,
        sourceMaterial: "StandardFlare_Mat",
        sourcePackagePath: "LensFlares.Materials.StandardFlare_Mat",
        blendMode: "BLEND_Additive",
        referencedTexture: "LensFlares_Textures.CloudyFlare",
        referencedTexturePath: "/rl-assets/alpha-boost/CloudyFlare.png"
      },
      bCreateDuplicates: false,
      outerConeDegrees: 170,
      innerConeDegrees: 40,
      coneFudgeFactor: 0.5,
      sourceElementSize: [512, 512, 512],
      sourceElement: {
        size: [512, 512, 512],
        lfMaterials: [],
        inheritedAlphaSamples: [1, 1, 1, 1],
        serializedAlphaDistributionRef: 0,
        inheritedFrom: "Engine.Default__LensFlare.SourceElement"
      },
      radius: 400,
      fixedRelativeBoundingBox: {
        serializedMin: [8, 8, 8],
        serializedMax: [-8, -8, -8],
        halfExtent: [8, 8, 8],
        isValid: true
      },
      screenPercentageMap: {
        lookupRange: [0, 1],
        lookupTableTimeScale: 20,
        lookupTableStartTime: 0,
        samples: expect.arrayContaining([0, 0.007250000257045031, 0.5, 0.8960000276565552, 1])
      },
      reflections: [
        {
          elementName: "None",
          rayDistance: 0,
          isEnabled: true,
          useSourceDistance: true,
          normalizeRadialDistance: false,
          modulateColorBySource: true,
          size: [0.3499999940395355, 0.3499999940395355, 0],
          lfMaterials: [-64],
          scaling: {
            samples: [1, 1, 1, 1]
          },
          axisScaling: {
            samples: [
              [1, 1, 1],
              [1, 1, 1]
            ]
          },
          rotation: {
            samples: [0, 0, 0, 0]
          },
          orientTowardsSource: false,
          color: {
            samples: [
              [1, 1, 1],
              [1, 1, 1]
            ]
          },
          alpha: {
            samples: [1, 1, 1, 1]
          },
          offset: {
            samples: [
              [0, 0, 0],
              [0, 0, 0]
            ]
          },
          distMapScale: {
            samples: [
              [1, 1, 1],
              [1, 1, 1]
            ]
          },
          distMapColor: {
            distributionRef: 14,
            parameterName: "LensFlareColor",
            constant: [1, 1, 1]
          },
        distMapAlpha: {
          lookupTableTimeScale: 0.024774467572569847,
          lookupTableStartTime: 0.01387698668986559,
          samples: expect.arrayContaining([0, 1.0082802772521973, 0.00021551268582697958, 1.205660993264246e-7])
        }
      }
    ],
      useTrueConeCalculation: true,
      useFixedRelativeBoundingBox: true
    });
  });

  it("stores and samples the full decoded LensFlare reflection DistMap_Alpha curve", () => {
    const distMapAlpha = ALPHA_BOOST_CASCADE.lensFlare.reflections[0].distMapAlpha;

    expect(distMapAlpha.samples).toHaveLength(102);
    expect(distMapAlpha.samples[0]).toBe(0);
    expect(distMapAlpha.samples[1]).toBe(1.0082802772521973);
    expect(distMapAlpha.samples.at(-1)).toBe(1.205660993264246e-7);
    expect(sampleAlphaBoostSourceFloatCurve(distMapAlpha, distMapAlpha.lookupTableStartTime)).toBe(0);
    expect(sampleAlphaBoostSourceFloatCurve(distMapAlpha, distMapAlpha.lookupTableStartTime + 1 / distMapAlpha.lookupTableTimeScale)).toBe(1.0082802772521973);
    expect(sampleAlphaBoostSourceFloatCurve(distMapAlpha, 10_000)).toBe(1.205660993264246e-7);
  });

  it("stores the decoded LensFlare ScreenPercentageMap occlusion curve", () => {
    const screenPercentageMap = ALPHA_BOOST_CASCADE.lensFlare.screenPercentageMap;

    expect(screenPercentageMap.lookupRange).toEqual([0, 1]);
    expect(screenPercentageMap.lookupTableTimeScale).toBe(20);
    expect(screenPercentageMap.lookupTableStartTime).toBe(0);
    expect(screenPercentageMap.samples).toHaveLength(21);
    expect(screenPercentageMap.samples[0]).toBe(0);
    expect(screenPercentageMap.samples[1]).toBe(0.007250000257045031);
    expect(screenPercentageMap.samples[10]).toBe(0.5);
    expect(screenPercentageMap.samples.at(-1)).toBe(1);
    expect(sampleAlphaBoostSourceFloatCurve(screenPercentageMap, 0)).toBe(0);
    expect(sampleAlphaBoostSourceFloatCurve(screenPercentageMap, 0.5)).toBe(0.5);
    expect(sampleAlphaBoostSourceFloatCurve(screenPercentageMap, 1)).toBe(1);
  });

  it("ships the decoded StandardFlare CloudyFlare texture used by BoostFlare_LF", () => {
    expect(existsSync(resolve(process.cwd(), "public/rl-assets/alpha-boost/CloudyFlare.png"))).toBe(true);
  });

  it("keeps the baked UE3 life curves decoded from Gold Rush", () => {
    expect(ALPHA_BOOST_CASCADE.flame.sizeMultiplierLife.samples[0]).toEqual([0.047922998666763306, 1, 1]);
    expect(ALPHA_BOOST_CASCADE.flame.sizeMultiplierLife.samples.at(-1)).toEqual([1, 1, 1]);
    expect(ALPHA_BOOST_CASCADE.flame.sizeMultiplierLife.lookupRange).toEqual([0.047922998666763306, 1.0134541988372803]);
    expect(ALPHA_BOOST_CASCADE.flame.sizeMultiplierLife.lookupTableTimeScale).toBeCloseTo(19.0814208984375, 6);
    expect(ALPHA_BOOST_CASCADE.flame.sizeMultiplierLife.lookupTableStartTime).toBeCloseTo(0.0013199220411479473, 9);
    expect(ALPHA_BOOST_CASCADE.flame.alphaScaleOverLife.samples[7]).toBeCloseTo(0.9434999823570251, 6);
    expect(ALPHA_BOOST_CASCADE.flame.alphaScaleOverLife.lookupRange).toEqual([0, 0.9434999823570251]);
    expect(ALPHA_BOOST_CASCADE.flame.alphaScaleOverLife.lookupTableTimeScale).toBe(20);
    expect(ALPHA_BOOST_CASCADE.flame.velocityOverLife.samples.at(-1)).toEqual([0.23823696374893188, 0.23823696374893188, 0.23823696374893188]);
    expect(ALPHA_BOOST_CASCADE.flame.velocityOverLife.lookupRange).toEqual([0.23823696374893188, 0.9890985488891602]);
    expect(ALPHA_BOOST_CASCADE.flame.velocityOverLife.lookupTableTimeScale).toBeCloseTo(18.396982192993164, 6);
    expect(ALPHA_BOOST_CASCADE.flame.velocityOverLife.lookupTableStartTime).toBeCloseTo(-0.001477687619626522, 9);
    expect(ALPHA_BOOST_CASCADE.flame.velocityOverLifeSource).toEqual({
      sourceExport: "ParticleModuleVelocityOverLifetime_4",
      bInWorldSpace: true
    });

    expect(ALPHA_BOOST_CASCADE.main.sizeMultiplierLife.samples[0]).toEqual([1, 1, 1]);
    expect(ALPHA_BOOST_CASCADE.main.sizeMultiplierLife.samples.at(-1)).toEqual([4, 4, 4]);
    expect(ALPHA_BOOST_CASCADE.main.sizeMultiplierLife.lookupRange).toEqual([1, 4]);
    expect(ALPHA_BOOST_CASCADE.main.sizeMultiplierLife.lookupTableTimeScale).toBe(20);
    expect(ALPHA_BOOST_CASCADE.main.startSize).toEqual({
      low: [6.5, 25, 25],
      high: [12.5, 50, 25],
      rawDistribution: {
        op: 2,
        lookupTableNumElements: 2,
        lookupTableChunkSize: 6,
        lookupTable: [6.5, 50, 6.5, 25, 25, 12.5, 50, 25, 6.5, 25, 25, 12.5, 50, 25],
        decodedSourceEntry: [6.5, 25, 25, 12.5, 50, 25]
      }
    });
    expect(ALPHA_BOOST_CASCADE.main.colorScaleOverLife.samples[0]).toEqual([2, 2, 2]);
    expect(ALPHA_BOOST_CASCADE.main.colorScaleOverLife.lookupRange).toEqual([0, 2]);
    expect(ALPHA_BOOST_CASCADE.main.colorScaleOverLife.lookupTableTimeScale).toBe(20);
    expect(ALPHA_BOOST_CASCADE.main.alphaScaleOverLife.samples.at(-1)).toBe(0);
    expect(ALPHA_BOOST_CASCADE.main.alphaScaleOverLife.lookupRange).toEqual([0, 0.25]);
    expect(ALPHA_BOOST_CASCADE.main.alphaScaleOverLife.lookupTableTimeScale).toBe(20);
    expect(ALPHA_BOOST_CASCADE.flame.dynamicParams.distortionAmount.lookupRange).toEqual([0, 5.012330055236816]);
    expect(ALPHA_BOOST_CASCADE.flame.dynamicParams.distortionAmount.lookupTableTimeScale).toBeCloseTo(19.988426208496094, 6);
    expect(ALPHA_BOOST_CASCADE.flame.dynamicParams.distortionAmount.lookupTableStartTime).toBeCloseTo(-0.0005789999850094318, 9);
    expect(ALPHA_BOOST_CASCADE.flame.dynamicParams.distortionAmount.samples[1]).toBeCloseTo(0.14795534312725067, 6);
    expect(ALPHA_BOOST_CASCADE.flame.dynamicParams.brightness.samples.at(-1)).toBe(0.5);
    expect(ALPHA_BOOST_CASCADE.flame.dynamicParams.brightness.lookupTableTimeScale).toBe(20);
    expect(ALPHA_BOOST_CASCADE.flame.dynamicParams.noiseAmount.lookupRange).toEqual([0.10000000149011612, 1]);
    expect(ALPHA_BOOST_CASCADE.flame.dynamicParams.noiseAmount.samples[0]).toBe(1);
    expect(ALPHA_BOOST_CASCADE.flame.dynamicParameterModule).toEqual({
      sourceExport: "ParticleModuleParameterDynamic_2",
      moduleRef: 138,
      sourceParameterNames: ["DistortionAmount", "Brightness", "SoftAmount", "NoiseAmount"],
      slotOrder: ["DistortionAmount", "Brightness", "SoftAmount", "NoiseAmount"],
      sourceFlags: {
        valueMethod: "EDPV_UserSet",
        useEmitterTime: false,
        spawnTimeOnly: false,
        scaleVelocityByParamValue: false
      }
    });
    expect(ALPHA_BOOST_CASCADE.main.dynamicParams.noiseAmount.samples[0]).toBe(0.25);
    expect(ALPHA_BOOST_CASCADE.main.dynamicParams.noiseAmount.samples.at(-1)).toBe(1);
    expect(ALPHA_BOOST_CASCADE.main.dynamicParams.noiseAmount.lookupRange).toEqual([0.25, 1]);
    expect(ALPHA_BOOST_CASCADE.main.dynamicParameterModule).toEqual({
      sourceExport: "ParticleModuleParameterDynamic_5",
      moduleRef: 139,
      sourceParameterNames: ["None", "None", "None", "None"],
      slotOrder: ["DistortionAmount", "Brightness", "SoftAmount", "NoiseAmount"],
      sourceFlags: {
        valueMethod: "EDPV_UserSet",
        useEmitterTime: false,
        spawnTimeOnly: false,
        scaleVelocityByParamValue: false
      }
    });
  });

  it("samples baked UE3 lookup tables with clamped linear interpolation", () => {
    const mainHalfSize = sampleAlphaBoostVectorCurve(ALPHA_BOOST_CASCADE.main.sizeMultiplierLife, 0.5);
    expect(mainHalfSize).toEqual([2.5, 2.5, 2.5]);

    expect(sampleAlphaBoostFloatCurve(ALPHA_BOOST_CASCADE.main.alphaScaleOverLife, -1)).toBe(0.25);
    expect(sampleAlphaBoostFloatCurve(ALPHA_BOOST_CASCADE.main.alphaScaleOverLife, 2)).toBe(0);
    expect(sampleAlphaBoostVectorCurve(ALPHA_BOOST_CASCADE.flame.velocityOverLife, 1)).toEqual([0.23823696374893188, 0.23823696374893188, 0.23823696374893188]);
    expect(sampleAlphaBoostVectorCurve(ALPHA_BOOST_CASCADE.flame.velocityOverLife, 0.48773298321680114)).toEqual([
      0.23823696374893188,
      0.23823696374893188,
      0.23823696374893188
    ]);
    expect(sampleAlphaBoostFloatCurve(ALPHA_BOOST_CASCADE.flame.dynamicParams.distortionAmount, 0.4997105123403528)).toBeCloseTo(5.000516414642334, 6);
  });
});
