export type AlphaBoostFloatCurve = {
  lookupRange?: readonly [number, number];
  lookupTableTimeScale?: number;
  lookupTableStartTime?: number;
  samples: readonly number[];
};

export type AlphaBoostVectorCurve = {
  lookupRange?: readonly [number, number];
  lookupTableTimeScale?: number;
  lookupTableStartTime?: number;
  samples: readonly (readonly [number, number, number])[];
};

const FLAME_ALPHA_SCALE_OVER_LIFE = {
  lookupRange: [0, 0.9434999823570251],
  lookupTableTimeScale: 20,
  lookupTableStartTime: 0,
  samples: [
    0,
    0.05226385220885277,
    0.18704956769943237,
    0.37134844064712524,
    0.5721516013145447,
    0.756450355052948,
    0.8912361264228821,
    0.9434999823570251,
    0.9335408806800842,
    0.9059054255485535,
    0.8639565706253052,
    0.8110570311546326,
    0.7505698204040527,
    0.6858575940132141,
    0.6202834248542786,
    0.557209849357605,
    0.5,
    0.3919740915298462,
    0.22342133522033691,
    0.06815808266401291,
    0
  ]
} as const;

const FLAME_SIZE_MULTIPLIER_LIFE = {
  lookupRange: [0.047922998666763306, 1.0134541988372803],
  lookupTableTimeScale: 19.0814208984375,
  lookupTableStartTime: 0.0013199220411479473,
  samples: [
    [0.047922998666763306, 1, 1],
    [0.48780012130737305, 1, 1],
    [0.6964847445487976, 1, 1],
    [0.7762359976768494, 1, 1],
    [0.8233342170715332, 1, 1],
    [0.8654533624649048, 1, 1],
    [0.9011528491973877, 1, 1],
    [0.9309138059616089, 1, 1],
    [0.9552173614501953, 1, 1],
    [0.974544882774353, 1, 1],
    [0.9893773794174194, 1, 1],
    [1.0001962184906006, 1, 1],
    [1.007482647895813, 1, 1],
    [1.0117177963256836, 1, 1],
    [1.013382911682129, 1, 1],
    [1.0129590034484863, 1, 1],
    [1.010927677154541, 1, 1],
    [1.0077699422836304, 1, 1],
    [1.0039669275283813, 1, 1],
    [1, 1, 1]
  ]
} as const;

const FLAME_VELOCITY_OVER_LIFE = {
  lookupRange: [0.23823696374893188, 0.9890985488891602],
  lookupTableTimeScale: 18.396982192993164,
  lookupTableStartTime: -0.001477687619626522,
  samples: [
    [0.9890985488891602, 0.9890985488891602, 0.9890985488891602],
    [0.9633488655090332, 0.9633488655090332, 0.9633488655090332],
    [0.8943396210670471, 0.8943396210670471, 0.8943396210670471],
    [0.7944307327270508, 0.7944307327270508, 0.7944307327270508],
    [0.6759821176528931, 0.6759821176528931, 0.6759821176528931],
    [0.5513534545898438, 0.5513534545898438, 0.5513534545898438],
    [0.43290483951568604, 0.43290483951568604, 0.43290483951568604],
    [0.3329959511756897, 0.3329959511756897, 0.3329959511756897],
    [0.26398685574531555, 0.26398685574531555, 0.26398685574531555],
    [0.23823696374893188, 0.23823696374893188, 0.23823696374893188]
  ]
} as const;

const MAIN_SIZE_MULTIPLIER_LIFE = {
  lookupRange: [1, 4],
  lookupTableTimeScale: 20,
  lookupTableStartTime: 0,
  samples: [
    [1, 1, 1],
    [1.0217499732971191, 1.0217499732971191, 1.0217499732971191],
    [1.0839999914169312, 1.0839999914169312, 1.0839999914169312],
    [1.1822500228881836, 1.1822500228881836, 1.1822500228881836],
    [1.312000036239624, 1.312000036239624, 1.312000036239624],
    [1.46875, 1.46875, 1.46875],
    [1.6480000019073486, 1.6480000019073486, 1.6480000019073486],
    [1.845249891281128, 1.845249891281128, 1.845249891281128],
    [2.055999994277954, 2.055999994277954, 2.055999994277954],
    [2.275750160217285, 2.275750160217285, 2.275750160217285],
    [2.5, 2.5, 2.5],
    [2.724250078201294, 2.724250078201294, 2.724250078201294],
    [2.944000005722046, 2.944000005722046, 2.944000005722046],
    [3.154750347137451, 3.154750347137451, 3.154750347137451],
    [3.3519997596740723, 3.3519997596740723, 3.3519997596740723],
    [3.53125, 3.53125, 3.53125],
    [3.688000202178955, 3.688000202178955, 3.688000202178955],
    [3.8177499771118164, 3.8177499771118164, 3.8177499771118164],
    [3.9160003662109375, 3.9160003662109375, 3.9160003662109375],
    [3.978250026702881, 3.978250026702881, 3.978250026702881],
    [4, 4, 4]
  ]
} as const;

const MAIN_START_SIZE = {
  low: [6.5, 25, 25],
  high: [12.5, 50, 25],
  rawDistribution: {
    op: 2,
    lookupTableNumElements: 2,
    lookupTableChunkSize: 6,
    lookupTable: [6.5, 50, 6.5, 25, 25, 12.5, 50, 25, 6.5, 25, 25, 12.5, 50, 25],
    decodedSourceEntry: [6.5, 25, 25, 12.5, 50, 25]
  }
} as const;

const MAIN_COLOR_SCALE_OVER_LIFE = {
  lookupRange: [0, 2],
  lookupTableTimeScale: 20,
  lookupTableStartTime: 0,
  samples: [
    [2, 2, 2],
    [1.9854999780654907, 1.9854999780654907, 1.9854999780654907],
    [1.944000005722046, 1.944000005722046, 1.944000005722046],
    [1.878499984741211, 1.878499984741211, 1.878499984741211],
    [1.7920000553131104, 1.7920000553131104, 1.7920000553131104],
    [1.6875, 1.6875, 1.6875],
    [1.5679999589920044, 1.5679999589920044, 1.5679999589920044],
    [1.436500072479248, 1.436500072479248, 1.436500072479248],
    [1.2960000038146973, 1.2960000038146973, 1.2960000038146973],
    [1.1494998931884766, 1.1494998931884766, 1.1494998931884766],
    [1, 1, 1],
    [0.8504999876022339, 0.8504999876022339, 0.8504999876022339],
    [0.7039999961853027, 0.7039999961853027, 0.7039999961853027],
    [0.5634998083114624, 0.5634998083114624, 0.5634998083114624],
    [0.43200016021728516, 0.43200016021728516, 0.43200016021728516],
    [0.3125, 0.3125, 0.3125],
    [0.20799994468688965, 0.20799994468688965, 0.20799994468688965],
    [0.12150001525878906, 0.12150001525878906, 0.12150001525878906],
    [0.055999755859375, 0.055999755859375, 0.055999755859375],
    [0.014499902725219727, 0.014499902725219727, 0.014499902725219727],
    [0, 0, 0]
  ]
} as const;

const MAIN_ALPHA_SCALE_OVER_LIFE = {
  lookupRange: [0, 0.25],
  lookupTableTimeScale: 20,
  lookupTableStartTime: 0,
  samples: [
    0.25,
    0.24818749725818634,
    0.24300000071525574,
    0.23481249809265137,
    0.2239999920129776,
    0.2109375,
    0.19599999487400055,
    0.179562509059906,
    0.16200000047683716,
    0.14368748664855957,
    0.125,
    0.10631249845027924,
    0.08799999952316284,
    0.0704374760389328,
    0.054000020027160645,
    0.0390625,
    0.025999993085861206,
    0.015187501907348633,
    0.006999969482421875,
    0.0018124878406524658,
    0
  ]
} as const;

const DYNAMIC_DISTORTION_AMOUNT = {
  lookupRange: [0, 5.012330055236816],
  lookupTableTimeScale: 19.988426208496094,
  lookupTableStartTime: -0.0005789999850094318,
  samples: [
    0,
    0.14795534312725067,
    0.5482879281044006,
    1.1356977224349976,
    1.8448843955993652,
    2.610548257827759,
    3.3673887252807617,
    4.050105571746826,
    4.5933990478515625,
    4.931969165802002,
    5.000516414642334,
    4.788702011108398,
    4.367000102996826,
    3.79010009765625,
    3.1126887798309326,
    2.3894548416137695,
    1.6750843524932861,
    1.0242671966552734,
    0.49168792366981506,
    0.132036954164505,
    0
  ]
} as const;

const DYNAMIC_BRIGHTNESS = {
  lookupRange: [0, 1],
  lookupTableTimeScale: 20,
  lookupTableStartTime: 0,
  samples: [
    0,
    0.10400000214576721,
    0.35199999809265137,
    0.6480000019073486,
    0.8960000276565552,
    1,
    0.9936296343803406,
    0.9757037162780762,
    0.9480000138282776,
    0.9122962951660156,
    0.8703703284263611,
    0.8240000009536743,
    0.7749629616737366,
    0.7250369787216187,
    0.6759999990463257,
    0.6296296119689941,
    0.5877037048339844,
    0.5519999861717224,
    0.5242963433265686,
    0.5063704252243042,
    0.5
  ]
} as const;

const DYNAMIC_SOFT_AMOUNT = {
  lookupRange: [1, 1],
  lookupTableTimeScale: 0,
  lookupTableStartTime: 0,
  samples: [1, 1, 1, 1]
} as const;

const FLAME_DYNAMIC_NOISE_AMOUNT = {
  lookupRange: [0.10000000149011612, 1],
  lookupTableTimeScale: 20,
  lookupTableStartTime: 0,
  samples: [
    1,
    0.9747999906539917,
    0.9064000248908997,
    0.8055999875068665,
    0.6832000017166138,
    0.550000011920929,
    0.41679999232292175,
    0.29440006613731384,
    0.19359996914863586,
    0.12519988417625427,
    0.10000000149011612
  ]
} as const;

const MAIN_DYNAMIC_NOISE_AMOUNT = {
  lookupRange: [0.25, 1],
  lookupTableTimeScale: 20,
  lookupTableStartTime: 0,
  samples: [0.25, 0.2709999978542328, 0.328000009059906, 0.41200000047683716, 0.5139999985694885, 0.625, 0.7360000014305115, 0.8379999399185181, 0.9220000505447388, 0.9790000915527344, 1]
} as const;

const LENS_FLARE_REFLECTION_DIST_MAP_ALPHA = {
  lookupTableTimeScale: 0.024774467572569847,
  lookupTableStartTime: 0.01387698668986559,
  samples: [
    0,
    1.0082802772521973,
    1.0082802772521973,
    0.9930481314659119,
    0.9778185486793518,
    0.9625946879386902,
    0.9473795294761658,
    0.9321763515472412,
    0.9169880747795105,
    0.9018179774284363,
    0.8866690397262573,
    0.8715444803237915,
    0.8564472794532776,
    0.8413806557655334,
    0.8263476490974426,
    0.8113513588905334,
    0.796394944190979,
    0.7814814448356628,
    0.7666140198707581,
    0.751795768737793,
    0.7370298504829407,
    0.7223191857337952,
    0.7076671123504639,
    0.6930766105651855,
    0.6785507798194885,
    0.6640927791595459,
    0.6497056484222412,
    0.6353926062583923,
    0.621156632900238,
    0.6070009469985962,
    0.5929285287857056,
    0.5789425373077393,
    0.5650461912155151,
    0.5512424111366272,
    0.5375344157218933,
    0.5239253044128418,
    0.5104181170463562,
    0.4970160722732544,
    0.4837222397327423,
    0.4705396294593811,
    0.45747143030166626,
    0.4445208013057709,
    0.4316907227039337,
    0.41898438334465027,
    0.40640485286712646,
    0.393955260515213,
    0.3816387951374054,
    0.3694583475589752,
    0.3574172258377075,
    0.34551841020584106,
    0.33376505970954895,
    0.3221602737903595,
    0.3107072412967682,
    0.2994089722633362,
    0.2882685363292694,
    0.27728912234306335,
    0.2664738595485687,
    0.2558256685733795,
    0.24534791707992554,
    0.23504360020160675,
    0.22491565346717834,
    0.2149674892425537,
    0.20520207285881042,
    0.19562244415283203,
    0.18623176217079163,
    0.1770332008600235,
    0.16802966594696045,
    0.15922456979751587,
    0.15062077343463898,
    0.14222145080566406,
    0.13402965664863586,
    0.1260487139225006,
    0.11828143894672394,
    0.11073113232851028,
    0.10340087115764618,
    0.09629371762275696,
    0.08941276371479034,
    0.082761250436306,
    0.07634194195270538,
    0.07015848159790039,
    0.06421345472335815,
    0.058510202914476395,
    0.05305197462439537,
    0.047841642051935196,
    0.04288225993514061,
    0.03817715123295784,
    0.03372931107878685,
    0.02954203635454178,
    0.025618016719818115,
    0.0219609085470438,
    0.01857343688607216,
    0.015458531677722931,
    0.012619850225746632,
    0.010060086846351624,
    0.007782503496855497,
    0.005790005903691053,
    0.00408594636246562,
    0.0026734108105301857,
    0.0015554524725303054,
    0.0007350953528657556,
    0.00021551268582697958,
    1.205660993264246e-7
  ]
} as const;

const LENS_FLARE_SCREEN_PERCENTAGE_MAP = {
  lookupRange: [0, 1],
  lookupTableTimeScale: 20,
  lookupTableStartTime: 0,
  samples: [
    0,
    0.007250000257045031,
    0.02800000086426735,
    0.060750000178813934,
    0.10400000214576721,
    0.15625,
    0.2160000056028366,
    0.281749963760376,
    0.35199999809265137,
    0.4252500534057617,
    0.5,
    0.5747500061988831,
    0.6480000019073486,
    0.7182500958442688,
    0.7839999198913574,
    0.84375,
    0.8960000276565552,
    0.9392499923706055,
    0.9720001220703125,
    0.9927500486373901,
    1
  ]
} as const;

const ALPHA_BOOST_REFERENCE_SPEED = 2300;
const FLAME_RUNTIME_SPAWN_RATE_AVERAGE = 2;
const FLAME_PARTICLES_PER_EXHAUST_AT_REFERENCE_SPEED = Math.ceil(ALPHA_BOOST_REFERENCE_SPEED * (1 / 32) * FLAME_RUNTIME_SPAWN_RATE_AVERAGE);
const DYNAMIC_PARAMETER_SOURCE_FLAGS = {
  valueMethod: "EDPV_UserSet",
  useEmitterTime: false,
  spawnTimeOnly: false,
  scaleVelocityByParamValue: false
} as const;
const DYNAMIC_PARAMETER_SLOT_ORDER = ["DistortionAmount", "Brightness", "SoftAmount", "NoiseAmount"] as const;
const SOURCE_DIRECT_DISTRIBUTION_MODE = "DPM_Direct";

export const ALPHA_BOOST_CASCADE = {
  texturePaths: {
    cone: "/rl-assets/alpha-boost/Noise_Cones01_D.png",
    cloud: "/rl-assets/alpha-boost/Cloud_T.png",
    dust: "/rl-assets/alpha-boost/Dust_T.png",
    particle: "/rl-assets/alpha-boost/ParticleSheet_T.png",
    smokeNoise: "/rl-assets/alpha-boost/Noise_Smoke_03_Pack.png"
  },
  coreColorRgb: [2.5, 1, 0.125],
  randomStream: {
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
  },
  carBoostGlowColorRgba: [1, 0.6689812541007996, 0.08848005533218384, 1],
  lensFlare: {
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
    screenPercentageMap: LENS_FLARE_SCREEN_PERCENTAGE_MAP,
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
        distMapAlpha: LENS_FLARE_REFLECTION_DIST_MAP_ALPHA
      }
    ],
    useTrueConeCalculation: true,
    useFixedRelativeBoundingBox: true
  },
  material: {
    scalar: {
      distortion: 8,
      fresnelBase: 3,
      fresnelEnd: 12,
      gradientAmount: 12,
      gradientSharpness: 3,
      innerIntensity: 1,
      innerSparks: 0,
      innerSpeed: 1,
      outerIntensity: 1,
      outerSparks: 0,
      outerSpeed: 1.5,
      opacity: 1,
      tileX: 2,
      tileY: 2
    },
    innerColorRgba: [1.5, 0.800000011920929, 0.20000000298023224, 6],
    outerColorRgba: [1.5, 0.800000011920929, 0.20000000298023224, 3],
    innerEnergyRgb: [9, 4.800000071525574, 1.2000000178813934],
    outerEnergyRgb: [4.5, 2.400000035762787, 0.6000000089406967],
    subUvTiles: [2, 2],
    resource: {
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
    }
  },
  boostMesh: {
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
  },
  exhaustZ: [-38, 38],
  updateStepSeconds: 0.01666666753590107,
  randomImageTime: 1,
  flame: {
    sourceSystem: "Boost_PS",
    emitterName: "Flame",
    lodLevel: 0,
    requiredModule: {
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
    },
    moduleOrder: [
      "ParticleModuleSpawnPerUnit",
      "ParticleModuleLifetime",
      "ParticleModuleSize",
      "ParticleModuleSize",
      "ParticleModuleSizeMultiplyLife",
      "ParticleModuleAcceleration",
      "ParticleModuleVelocityOverLifetime",
      "ParticleModuleColor",
      "ParticleModuleColor",
      "ParticleModuleColorScaleOverLife",
      "ParticleModuleColorScaleOverLife",
      "ParticleModuleParameterDynamic",
      "ParticleModuleRotation",
      "ParticleModuleColorOverLife"
    ],
    peakActiveParticles: 2,
    lifetimeSeconds: 1,
    particleSize: [75, 50, 50],
    spawnPerUnit: 1 / 32,
    runtimeParameters: {
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
        averageScalar: FLAME_RUNTIME_SPAWN_RATE_AVERAGE
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
    },
    sourceDistributions: {
      spawnPerUnit: {
        sourceExport: "DistributionFloatParticleParameter_18",
        objectRef: 10,
        parameterName: "SpawnRate",
        mode: SOURCE_DIRECT_DISTRIBUTION_MODE,
        constant: 1
      },
      coreColor: {
        sourceExport: "DistributionVectorParticleParameter_3",
        objectRef: 11,
        parameterName: "CoreColor",
        mode: SOURCE_DIRECT_DISTRIBUTION_MODE,
        constant: [2.5, 1, 0.125]
      },
      particleSize: {
        sourceExport: "DistributionVectorParticleParameter_19",
        objectRef: 12,
        parameterName: "ParticleSize",
        mode: SOURCE_DIRECT_DISTRIBUTION_MODE,
        constant: [75, 50, 50]
      }
    },
    referenceSpeed: ALPHA_BOOST_REFERENCE_SPEED,
    particlesPerExhaustAtReferenceSpeed: FLAME_PARTICLES_PER_EXHAUST_AT_REFERENCE_SPEED,
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
    velocityOverLifeInWorldSpace: true,
    alphaScaleOverLife: FLAME_ALPHA_SCALE_OVER_LIFE,
    sizeMultiplierLife: FLAME_SIZE_MULTIPLIER_LIFE,
    velocityOverLife: FLAME_VELOCITY_OVER_LIFE,
    velocityOverLifeSource: {
      sourceExport: "ParticleModuleVelocityOverLifetime_4",
      bInWorldSpace: true
    },
    dynamicParams: {
      distortionAmount: DYNAMIC_DISTORTION_AMOUNT,
      brightness: DYNAMIC_BRIGHTNESS,
      softAmount: DYNAMIC_SOFT_AMOUNT,
      noiseAmount: FLAME_DYNAMIC_NOISE_AMOUNT
    },
    dynamicParameterModule: {
      sourceExport: "ParticleModuleParameterDynamic_2",
      moduleRef: 138,
      sourceParameterNames: DYNAMIC_PARAMETER_SLOT_ORDER,
      slotOrder: DYNAMIC_PARAMETER_SLOT_ORDER,
      sourceFlags: DYNAMIC_PARAMETER_SOURCE_FLAGS
    }
  },
  main: {
    sourceSystem: "Drive_PS",
    emitterName: "Main",
    lodLevel: 0,
    requiredModule: {
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
    },
    moduleOrder: [
      "ParticleModuleLifetime",
      "ParticleModuleSize",
      "ParticleModuleVelocity",
      "ParticleModuleSizeMultiplyLife",
      "ParticleModuleRotation",
      "ParticleModuleColor",
      "ParticleModuleColorScaleOverLife",
      "ParticleModuleParameterDynamic"
    ],
    peakActiveParticles: 8,
    lifetimeSeconds: 0.5,
    spawnRate: 10,
    emitterDurationSeconds: 0.25,
    particleSize: [75, 50, 50],
    runtimeParameters: {
      sourceExport: "FXTrait_BoostParticle_TA_0",
      sourceActorPath: "FXActor_Boost_TA.BodyParticleParameters[0]",
      sourceActorParameterCount: 1,
      driveConeSize: {
        parameterName: "DriveConeSize",
        parameterType: "PSPT_Vector",
        vector: [0.20000000298023224, 0.20000000298023224, 0.10000000149011612]
      }
    },
    sourceDistributions: {
      coreColor: {
        sourceExport: "DistributionVectorParticleParameter_3",
        objectRef: 13,
        parameterName: "CoreColor",
        mode: SOURCE_DIRECT_DISTRIBUTION_MODE,
        constant: [2.5, 1, 0.125]
      }
    },
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
    },
    startSize: MAIN_START_SIZE,
    alphaScaleOverLife: MAIN_ALPHA_SCALE_OVER_LIFE,
    colorScaleOverLife: MAIN_COLOR_SCALE_OVER_LIFE,
    sizeMultiplierLife: MAIN_SIZE_MULTIPLIER_LIFE,
    dynamicParams: {
      distortionAmount: DYNAMIC_DISTORTION_AMOUNT,
      brightness: DYNAMIC_BRIGHTNESS,
      softAmount: DYNAMIC_SOFT_AMOUNT,
      noiseAmount: MAIN_DYNAMIC_NOISE_AMOUNT
    },
    dynamicParameterModule: {
      sourceExport: "ParticleModuleParameterDynamic_5",
      moduleRef: 139,
      sourceParameterNames: ["None", "None", "None", "None"],
      slotOrder: DYNAMIC_PARAMETER_SLOT_ORDER,
      sourceFlags: DYNAMIC_PARAMETER_SOURCE_FLAGS
    }
  }
} as const;

export const ALPHA_BOOST_TEXTURE_PATHS: string[] = [
  ALPHA_BOOST_CASCADE.texturePaths.cone,
  ALPHA_BOOST_CASCADE.texturePaths.cloud,
  ALPHA_BOOST_CASCADE.texturePaths.dust,
  ALPHA_BOOST_CASCADE.texturePaths.particle,
  ALPHA_BOOST_CASCADE.texturePaths.smokeNoise
];

export function sampleAlphaBoostFloatCurve(curve: AlphaBoostFloatCurve, phase: number): number {
  const samples = curve.samples;
  if (samples.length === 0) return 0;
  if (samples.length === 1) return samples[0];

  const scaled = lookupTableIndex(curve, phase, samples.length);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(index + 1, samples.length - 1);
  const alpha = scaled - index;
  return lerp(samples[index], samples[nextIndex], alpha);
}

export function sampleAlphaBoostSourceFloatCurve(curve: AlphaBoostFloatCurve, sourceValue: number): number {
  const samples = curve.samples;
  if (samples.length === 0) return 0;
  if (samples.length === 1) return samples[0];

  const scaled = lookupTableSourceIndex(curve, sourceValue, samples.length);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(index + 1, samples.length - 1);
  const alpha = scaled - index;
  return lerp(samples[index], samples[nextIndex], alpha);
}

export function sampleAlphaBoostVectorCurve(curve: AlphaBoostVectorCurve, phase: number): [number, number, number] {
  const samples = curve.samples;
  if (samples.length === 0) return [0, 0, 0];
  if (samples.length === 1) return [...samples[0]];

  const scaled = lookupTableIndex(curve, phase, samples.length);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(index + 1, samples.length - 1);
  const alpha = scaled - index;
  const current = samples[index];
  const next = samples[nextIndex];
  return [lerp(current[0], next[0], alpha), lerp(current[1], next[1], alpha), lerp(current[2], next[2], alpha)];
}

function lookupTableIndex(curve: AlphaBoostFloatCurve | AlphaBoostVectorCurve, phase: number, sampleCount: number) {
  if (curve.lookupTableTimeScale === undefined) return clamp01(phase) * (sampleCount - 1);

  const startTime = curve.lookupTableStartTime ?? 0;
  return clamp((clamp01(phase) - startTime) * curve.lookupTableTimeScale, 0, sampleCount - 1);
}

function lookupTableSourceIndex(curve: AlphaBoostFloatCurve, sourceValue: number, sampleCount: number) {
  if (curve.lookupTableTimeScale === undefined) return clamp01(sourceValue) * (sampleCount - 1);

  const startTime = curve.lookupTableStartTime ?? 0;
  return clamp((sourceValue - startTime) * curve.lookupTableTimeScale, 0, sampleCount - 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}

function lerp(a: number, b: number, alpha: number) {
  return a + (b - a) * alpha;
}
