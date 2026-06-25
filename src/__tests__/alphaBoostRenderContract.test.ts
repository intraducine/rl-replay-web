import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Alpha boost render contract", () => {
  it("does not add non-Cascade broad mesh sheet emitters", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");

    expect(carSource).not.toContain("sheetRefs");
    expect(carSource).not.toContain("haloSheetRefs");
    expect(carSource).not.toContain("coreSheetRefs");
    expect(carSource).not.toContain("GoldRushPlumeMaterial");
    expect(carSource).not.toContain("GoldRushHaloMaterial");
    expect(carSource).not.toContain("GoldRushCoreMaterial");
    expect(carSource).not.toContain("coneRefs");
    expect(carSource).not.toContain("hotCoreRefs");
    expect(carSource).not.toContain("sparkRefs");
  });

  it("routes Cascade particles through the LiquidGold material path", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");
    const materialSource = readFileSync(resolve(process.cwd(), "src/viewer/alphaBoostMaterial.ts"), "utf8");

    expect(carSource).toContain("createLiquidGoldParticleMaterial");
    expect(carSource).toContain("updateLiquidGoldParticleMaterial");
    expect(carSource).toContain("createAlphaRewardBoostMeshMaterial");
    expect(carSource).toContain("updateAlphaRewardBoostMeshMaterial");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.boostMesh.assetPath");
    expect(carSource).toContain("sourceAttachmentOverrides");
    expect(carSource).toContain("applySourceBoostMeshTransform");
    expect(carSource).toContain("applySourceBoostMeshTransform(clone, attachment)");
    expect(carSource).not.toContain("applySourceBoostMeshTransform(mesh, ALPHA_BOOST_CASCADE.boostMesh.sourceAttachmentOverrides[index])");
    expect(carSource).toContain("ALPHA_BOOST_ATTACHMENT_POSITIONS");
    expect(carSource).toContain("sourceAttachmentViewerPosition");
    expect(carSource).not.toContain("sprite.position.set(-116, 34");
    expect(carSource).not.toContain("position={[-100, 34");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.boostMesh.fadeInTime");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.boostMesh.fadeOutTime");
    expect(carSource).toContain("boostMeshFade");
    expect(carSource).toContain("sourceBoostMeshFade(boostActive, delta, particleSystemTime, previousBoostMeshFade)");
    expect(carSource).toContain("particleSystemTime / ALPHA_BOOST_MESH_FADE_IN_DURATION");
    expect(carSource).not.toContain("boostGroup.visible = active");
    expect(carSource).toContain("Water_02_N.png");
    expect(carSource).toContain("ROCKET_LEAGUE_BLOOM_LAYER");
    expect(carSource).toContain("alphaTextureColorSpace");
    expect(carSource).toContain("alphaTextureWrap");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.material.resource.textureAddressModes");
    expect(carSource).toContain("THREE.SRGBColorSpace");
    expect(carSource).not.toContain("applyGoldRushMaterial");
    expect(materialSource).not.toContain("uSpriteMap");
    expect(materialSource).not.toContain("uSubUvOffset");
  });

  it("drives alpha boost particles from replay time instead of wall-clock time", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(sceneRootSource).toContain("sampleCarDistanceAndSpawnPerUnitAgesWindow(");
    expect(sceneRootSource).not.toContain("sampleCarDistanceWindow(timeline, id, time, ALPHA_BOOST_CASCADE.flame.lifetimeSeconds)");
    expect(sceneRootSource).not.toContain("sampleCarSpawnPerUnitAgesWindow(");
    expect(sceneRootSource).toContain("carBoostSegmentAt(timeline, id, time)");
    expect(sceneRootSource).toContain("let alphaBoostEmitterAge: number | undefined");
    expect(sceneRootSource).toContain("if (boosting) {");
    expect(sceneRootSource).toContain("const flameEmitterStartTime = boostSegment.start");
    expect(sceneRootSource).toContain("alphaBoostEmitterAge = time - flameEmitterStartTime");
    expect(sceneRootSource).toContain("const flameWindow = alphaBoostFlameWindowForCar(alphaBoostFlameWindowCache, timeline, id, time, flameEmitterStartTime)");
    expect(sceneRootSource).toContain("flameDistanceWindow = flameWindow.distance");
    expect(sceneRootSource).toContain("flameSpawnAges = flameWindow.spawnAges");
    expect(sceneRootSource).toContain("setCarAlphaBoostActive(group, boosting, frame, boostRenderingEnabled, time, flameDistanceWindow, flameSpawnAges, alphaBoostEmitterAge)");
    expect(carSource).toContain("root.userData.alphaBoostTime");
    expect(carSource).toContain("root.userData.alphaBoostEmitterAge");
    expect(carSource).toContain('typeof root.userData.alphaBoostTime === "number" ? root.userData.alphaBoostTime : clock.elapsedTime');
    expect(carSource).toContain("const particleSystemTime = typeof root.userData.alphaBoostEmitterAge === \"number\" ? root.userData.alphaBoostEmitterAge : replayTime");
  });

  it("caches Alpha Boost flame window sampling on the Cascade update step", () => {
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(sceneRootSource).toContain("type AlphaBoostFlameWindowCache = Map<string, AlphaBoostFlameWindow>");
    expect(sceneRootSource).toContain("const alphaBoostFlameWindowCache = useRef<AlphaBoostFlameWindowCache>(new Map())");
    expect(sceneRootSource).toContain("alphaBoostFlameWindowCache.current.clear()");
    expect(sceneRootSource).toContain("alphaBoostFlameWindowCache.delete(id)");
    expect(sceneRootSource).toContain("function alphaBoostFlameWindowForCar");
    expect(sceneRootSource).toContain("const sampleTime = alphaBoostFlameWindowSampleTime(time, emitterStartTime)");
    expect(sceneRootSource).toContain("cached.emitterStartTime === emitterStartTime && cached.sampleTime === sampleTime");
    expect(sceneRootSource).toContain("sampleCarDistanceAndSpawnPerUnitAgesWindow(");
    expect(sceneRootSource).toContain("ALPHA_BOOST_CASCADE.updateStepSeconds");
    expect(sceneRootSource).toContain("Math.floor(emitterAge / step) * step");
  });

  it("advances alpha boost particles on the decoded Cascade update step", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");

    expect(carSource).toContain("sourceParticleSystemTime");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.updateStepSeconds");
    expect(carSource).toContain("const t = sourceParticleSystemTime(particleSystemTime)");
  });

  it("keeps Flame particle placement on decoded Cascade motion instead of hand-authored spread", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");

    expect(carSource).toContain("sourceFlameWorldOffset");
    expect(carSource).toContain("sourceRuntimeFlameParticleSize");
    expect(carSource).toContain("const ALPHA_RENDERED_FLAME_PARTICLES_PER_EXHAUST = ALPHA_BOOST_CASCADE.flame.peakActiveParticles");
    expect(carSource).toContain("activeFlameParticlesPerExhaust");
    expect(carSource).toContain("root.userData.alphaBoostFlameDistanceWindow");
    expect(carSource).toContain("root.userData.alphaBoostFlameSpawnAges");
    expect(carSource).toContain("sourceSpawnPerUnitRateFromDistance(flameDistanceWindow, ALPHA_BOOST_CASCADE.flame.lifetimeSeconds, ALPHA_BOOST_CASCADE.flame.spawnPerUnit, ALPHA_BOOST_CASCADE.flame.runtimeParameters.spawnRate.averageScalar)");
    expect(carSource).toContain("sourceSpawnPerUnitParticleAge(emitterIndex, flameSpawnAges, flameSpawnRate, ALPHA_BOOST_CASCADE.flame.lifetimeSeconds, ALPHA_BOOST_CASCADE.updateStepSeconds)");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.flame.runtimeParameters.particleSize");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.flame.runtimeParameters.spawnRate.averageScalar");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.flame.velocityOverLife.samples.length - 1");
    expect(carSource).not.toContain("flameSpread");
    expect(carSource).not.toContain("flameTaper");
    expect(carSource).not.toContain("lateralDrift");
    expect(carSource).not.toContain("Math.sin(t * 18");
    expect(carSource).not.toContain("Math.sin(t * 29");
    expect(carSource).not.toContain("const phase = (t * flameSpawnRate + emitterIndex / activeFlameParticlesPerExhaust) % 1");
    expect(carSource).not.toContain("const steps = 6");
  });

  it("does not force distance-based Flame SpawnPerUnit to emit when replay distance is zero", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");

    expect(carSource).toContain("distanceRate * spawnPerUnit * spawnRateScalar");
    expect(carSource).not.toContain("Math.max(1, spawnRate * ALPHA_BOOST_CASCADE.flame.lifetimeSeconds)");
    expect(carSource).not.toContain("return Math.max(1 / ALPHA_BOOST_CASCADE.flame.lifetimeSeconds, distanceRate * spawnPerUnit * spawnRateScalar)");
  });

  it("samples Alpha Boost debug component flags once per frame instead of inside particle loops", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");

    expect(carSource).toContain('const meshComponentEnabled = alphaBoostComponentEnabled("mesh")');
    expect(carSource).toContain('const flameComponentEnabled = alphaBoostComponentEnabled("flame")');
    expect(carSource).toContain('const mainComponentEnabled = alphaBoostComponentEnabled("main")');
    expect(carSource).toContain('const lensFlareComponentEnabled = alphaBoostComponentEnabled("lensFlare")');
    expect(carSource).toContain('const lensFlareReflectionComponentEnabled = alphaBoostComponentEnabled("lensFlareReflection")');
    expect(carSource).toContain("mesh.visible = meshComponentEnabled");
    expect(carSource).toContain("particle.visible = flameComponentEnabled && emitterIndex < activeFlameParticlesPerExhaust");
    expect(carSource).toContain("particle.visible = mainComponentEnabled && particleVisibility > 0");
    expect(carSource).not.toContain('mesh.visible = alphaBoostComponentEnabled("mesh")');
    expect(carSource).not.toContain('particle.visible = alphaBoostComponentEnabled("flame")');
    expect(carSource).not.toContain('particle.visible = alphaBoostComponentEnabled("main")');
  });

  it("keeps boost glow on decoded particles, lens flare, and bloom instead of a web-only light", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");

    expect(carSource).not.toContain("ALPHA_LENS_FLARE_RENDER_SCALE");
    expect(carSource).not.toContain("ALPHA_LENS_FLARE_OPACITY");
    expect(carSource).toContain("sourceLensFlareWorldSize(camera, size.height, sprite");
    expect(carSource).toContain("sourceLensFlareElementAlpha()");
    expect(carSource).toContain("sourceLensFlareElementHasMaterial()");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.lensFlare.sourceElement.lfMaterials.length > 0");
    expect(carSource).toContain("ALPHA_LENS_FLARE_POSITION");
    expect(carSource).toContain("lensFlareRef");
    expect(carSource).toContain("lensFlareReflectionRef");
    expect(carSource).toContain("ALPHA_LENS_FLARE_REFLECTION");
    expect(carSource).toContain("ALPHA_BOOST_LENS_FLARE_TEXTURE");
    expect(carSource).toContain("sourceLensFlareReflectionOpacity");
    expect(carSource).toContain("sourceLensFlareConeVisibility");
    expect(carSource).toContain("ALPHA_LENS_FLARE_VIEWER_DIRECTION");
    expect(carSource).toContain("sourceAttachmentViewerVector(");
    expect(carSource).toContain("{ rotation: ALPHA_BOOST_CASCADE.lensFlare.sourceComponentRotation }");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.lensFlare.useTrueConeCalculation");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.lensFlare.innerConeDegrees");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.lensFlare.outerConeDegrees");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.lensFlare.coneFudgeFactor");
    expect(carSource).toContain("sourceDistance > ALPHA_BOOST_CASCADE.lensFlare.radius");
    expect(carSource).toContain("sourceLensFlareScreenPercentageOpacity");
    expect(carSource).toContain("sourceLensFlareVisibleScreenPercentage(scene, camera, sprite, root)");
    expect(carSource).toContain("sourceLensFlareOcclusionRadius()");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.lensFlare.fixedRelativeBoundingBox.halfExtent");
    expect(carSource).not.toContain("sprite.scale.x * 0.5");
    expect(carSource).toContain("ALPHA_LENS_FLARE_OCCLUSION_RAYCASTER.intersectObjects(scene.children, true)");
    expect(carSource).toContain("ALPHA_LENS_FLARE_OCCLUSION_RAYCASTER.camera = camera");
    expect(carSource).toContain("isAlphaLensFlareOccluder");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.lensFlare.screenPercentageMap");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.lensFlare.reflections[0]");
    expect(carSource).toContain("sourceLensFlareReflectionColor()");
    expect(carSource).toContain("sourceLensFlareReflectionAlpha()");
    expect(carSource).toContain("sourceLensFlareReflectionScale()");
    expect(carSource).toContain("ALPHA_LENS_FLARE_REFLECTION.distMapColor.constant");
    expect(carSource).toContain("ALPHA_LENS_FLARE_REFLECTION.alpha.samples[0]");
    expect(carSource).toContain("sampleAlphaBoostSourceFloatCurve(ALPHA_LENS_FLARE_REFLECTION.distMapAlpha, sourceDistance)");
    expect(carSource).not.toContain("alphaDistanceTable.peakSample");
    expect(carSource).not.toContain("lensFlareRefs");
    expect(carSource).not.toContain("<pointLight");
    expect(carSource).not.toContain("PointLight");
    expect(carSource).not.toContain("ALPHA_BOOST_POINT_LIGHT_INTENSITY");
    expect(carSource).not.toContain("ALPHA_BOOST_POINT_LIGHT_DISTANCE");
    expect(carSource).not.toContain("ALPHA_BOOST_ATTACHMENT_POSITIONS.map((origin, index) =>");
    expect(carSource).not.toContain("intensity={0.48}");
    expect(carSource).not.toContain("normalizedSpeed");
    expect(carSource).not.toContain("ALPHA_LENS_FLARE_WORLD_DIRECTION.set(-1, 0, 0)");
    expect(carSource).toContain("texture={textures.lensFlare}");
    expect(carSource).not.toContain("texture={textures.particle} tileIndex={0} color={ALPHA_LENS_FLARE_COLOR}");
    expect(carSource).not.toContain('alphaBoostComponentEnabled("lensFlare") ? sourceLensFlareElementAlpha()');
  });

  it("preserves the source ParticleSheet_T color space for lens flare SubUV clones", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");

    expect(carSource).toContain("configureAlphaSubUvTexture(texture, tileIndex)");
    expect(carSource).toContain("subTexture.colorSpace = texture.colorSpace");
    expect(carSource).not.toContain("subTexture.colorSpace = THREE.NoColorSpace");
  });

  it("initializes source transform scratch matrices before derived Alpha boost constants use them", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");

    expect(carSource.indexOf("const SOURCE_ROTATION_MATRIX")).toBeLessThan(carSource.indexOf("const ALPHA_LENS_FLARE_VIEWER_DIRECTION"));
  });

  it("keeps the generic supersonic placeholder from contaminating active Alpha boost", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");
    const carAlphaBoostSource = readFileSync(resolve(process.cwd(), "src/viewer/carAlphaBoost.ts"), "utf8");
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(carSource).toContain("SUPERSONIC_TRAIL_OBJECT_NAME");
    expect(carSource).not.toContain("frame?.supersonic ? (");
    expect(carAlphaBoostSource).toContain("car.userData.supersonicTrail");
    expect(sceneRootSource).toContain("setCarSupersonicTrailVisible(group, boostRenderingEnabled && Boolean(frame.supersonic) && !boosting)");
  });

  it("drives Main particles from decoded Cascade start velocity instead of a long hand-made trail", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");

    expect(carSource).toContain("sourceMainVelocity");
    expect(carSource).toContain("sourceMainBodyVelocity");
    expect(carSource).toContain("sourceMainStartSize");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.randomStream.drawOrder.main.startVelocity");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.randomStream.drawOrder.main.startSize");
    expect(carSource).toContain("sourceMainParticleSize");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.main.startVelocity");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.main.startSize");
    expect(carSource).not.toContain("sampleAlphaBoostVectorCurve(ALPHA_BOOST_CASCADE.main.startSize, phase)");
    expect(carSource).not.toContain("ALPHA_BOOST_CASCADE.main.startVelocity.min");
    expect(carSource).not.toContain("340 + normalizedSpeed * 360");
    expect(carSource).not.toContain("Math.sin(t * 8");
    expect(carSource).not.toContain("* 0.18");
    expect(carSource).not.toContain("origin[1] + velocity[2] * age");
    expect(carSource).not.toContain("origin[2] + velocity[1] * age");
  });

  it("does not apply trait shared parameters as decoded Cascade particle geometry scale", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");
    const mainSizeFunction = carSource.match(/function sourceMainParticleSize[\s\S]*?\n}/)?.[0] ?? "";

    expect(mainSizeFunction).toContain("startSize[0] * sizeLife[0]");
    expect(mainSizeFunction).toContain("startSize[1] * sizeLife[1]");
    expect(mainSizeFunction).not.toContain("driveConeSize");
    expect(mainSizeFunction).not.toContain("runtimeParameters");
    expect(carSource).not.toContain("particleSize[0] * sizeLife[0] * dynamic.softAmount");
  });

  it("renders Drive_PS Main as the single decoded body particle emitter instead of duplicating it per exhaust", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");

    expect(carSource).toContain("ALPHA_BOOST_MAIN_BODY_POSITION");
    expect(carSource).toContain("const ALPHA_MAIN_SPAWN_BIRTH_OFFSETS = sourceCascadeSpawnOffsets(");
    expect(carSource).toContain("const ALPHA_RENDERED_MAIN_PARTICLES = sourceCascadeSpawnAccumulatorActiveParticles(");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.main.spawnRate");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.main.lifetimeSeconds");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.main.emitterDurationSeconds");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.main.peakActiveParticles");
    expect(carSource).toContain("sourceCascadeSpawnAccumulatorActiveParticles(");
    expect(carSource).toContain("sourceCascadeSpawnBirthOffset(particleIndex, ALPHA_MAIN_SPAWN_BIRTH_OFFSETS)");
    expect(carSource).toContain("sourceParticleAge(");
    expect(carSource).toContain("sourceCascadeSpawnBirthOffsetFromParameters(particleIndex, spawnRate, lifetimeSeconds, updateStepSeconds)");
    expect(carSource).not.toContain("sourceCascadeSpawnBirthOffset(particleIndex, ALPHA_BOOST_CASCADE.main.spawnRate, ALPHA_BOOST_CASCADE.main.lifetimeSeconds, ALPHA_BOOST_CASCADE.updateStepSeconds)");
    expect(carSource).toContain("for (const offset of offsets)");
    expect(carSource).not.toContain("offsets.filter((offset) => offset < lifetimeSeconds).length");
    expect(carSource).toContain("return positiveModulo(time - birthOffset, lifetimeSeconds)");
    expect(carSource).toContain("spawnFraction += spawnRate * sourceUpdateStep");
    expect(carSource).toContain("Array.from({ length: ALPHA_RENDERED_MAIN_PARTICLES }");
    expect(carSource).not.toContain("Array.from({ length: ALPHA_BOOST_CASCADE.main.peakActiveParticles }");
    expect(carSource).not.toContain("ALPHA_BOOST_ATTACHMENT_POSITIONS.length * ALPHA_BOOST_CASCADE.main.peakActiveParticles");
    expect(carSource).not.toContain("const exhaustIndex = Math.floor(index / ALPHA_BOOST_CASCADE.main.peakActiveParticles)");
    expect(carSource).not.toContain("sourceAttachmentViewerVector(attachment, sourceMainVelocity");
    expect(carSource).not.toContain("Math.ceil(ALPHA_BOOST_CASCADE.main.spawnRate * duration)");
  });

  it("uses the UE3 rotator matrix for source boost attachments so both Octane cones point rearward", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");

    expect(carSource).toContain("function setUnrealRotatorMatrix");
    expect(carSource).toContain("cp * cy");
    expect(carSource).toContain("sr * sp * cy - cr * sy");
    expect(carSource).toContain("-(cr * sp * cy + sr * sy)");
    expect(carSource).toContain("cr * cp");
    expect(carSource).toContain("setUnrealRotatorMatrix(SOURCE_ROTATION_MATRIX, transform.rotation)");
    expect(carSource).not.toContain("unrealRotatorUnitsToRadians(-transform.rotation[0])");
    expect(carSource).not.toContain("SOURCE_ROTATION_MATRIX.makeRotationZ(yaw).multiply(SOURCE_PITCH_MATRIX.makeRotationY(pitch)).multiply(SOURCE_ROLL_MATRIX.makeRotationX(roll))");
  });

  it("keeps Flame particles in source world-space instead of a compact local car plume", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");
    const runtimeIntegrationSource = carSource.slice(
      carSource.indexOf("function integrateFlameVelocityOverLife"),
      carSource.indexOf("function sourceIntegratedFlameVelocityOverLifeSamples")
    );

    expect(carSource).toContain("sourceFlameWorldOffset");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.flame.velocityOverLifeInWorldSpace");
    expect(carSource).toContain("localVelocity");
    expect(carSource).toContain("integrateFlameVelocityOverLife");
    expect(carSource).toContain("ALPHA_FLAME_VELOCITY_OVER_LIFE_INTEGRAL");
    expect(carSource).toContain("sourceIntegratedFlameVelocityOverLifeSamples");
    expect(carSource).toContain("sourceIntegratedFlameVelocityOverLifeAt");
    expect(runtimeIntegrationSource).toContain("ALPHA_FLAME_VELOCITY_OVER_LIFE_INTEGRAL");
    expect(runtimeIntegrationSource).not.toContain("for (let step");
    expect(carSource).toContain("sourceRuntimeFlameAcceleration");
    expect(carSource).toContain("const velocityOverLife = integrateFlameVelocityOverLife(phase)");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.flame.velocityOverLife");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.flame.accelerationRange");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.randomStream.drawOrder.flame.acceleration");
    expect(carSource).toContain("flameParticleStates");
    expect(carSource).toContain("spawnWorldPosition");
    expect(carSource).toContain("worldToLocal");
    expect(carSource).toContain("localToWorld");
    expect(carSource).not.toContain("spawnWorldQuaternion");
    expect(carSource).not.toContain("root.getWorldQuaternion(new THREE.Quaternion())");
    expect(carSource).not.toContain("root.localToWorld(FLAME_SPAWN_LOCAL_POSITION.clone())");
    expect(carSource).not.toContain("\n  integrateFlameVelocityOverLife(phase);\n");
    expect(carSource).not.toContain("const steps = 6");
    expect(carSource).not.toContain("-localVelocity[0] * age");
    expect(carSource).not.toContain("-localVelocity[2] * age");
    expect(carSource).not.toContain("145 + normalizedSpeed * 285");
  });

  it("uses Rocket League's SRand float path instead of a web sine hash for particle distribution samples", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");

    expect(carSource).toContain("sourceSrandFraction");
    expect(carSource).toContain("Math.imul(seed, ALPHA_BOOST_CASCADE.randomStream.multiplier)");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.randomStream.floatOneBits");
    expect(carSource).toContain("SOURCE_RANDOM_FLOAT_VIEW.getFloat32(0, true) - 1");
    expect(carSource).toContain("sourceParticleRandomSeed(drawOrder, particleIndex, componentIndex)");
    expect(carSource).toContain("particleIndex * drawOrder.drawsPerParticle + drawOrder.firstDraw + componentIndex");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.randomStream.drawOrder.flame.particleSize");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.randomStream.drawOrder.flame.acceleration");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.randomStream.drawOrder.main.startSize");
    expect(carSource).toContain("ALPHA_BOOST_CASCADE.randomStream.drawOrder.main.startVelocity");
    expect(carSource).not.toContain("index * 32 + channel");
    expect(carSource).not.toContain("Math.sin((index + 1) * 12.9898");
    expect(carSource).not.toContain("43758.5453");
  });

  it("keeps Car.tsx compatible with Vite Fast Refresh component exports", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");
    const sceneRootSource = readFileSync(resolve(process.cwd(), "src/viewer/SceneRoot.tsx"), "utf8");

    expect(carSource).not.toContain("export function setCarAlphaBoostActive");
    expect(sceneRootSource).toContain('import { setCarAlphaBoostActive, setCarSupersonicTrailVisible } from "./carAlphaBoost"');
  });

  it("respawns legacy Flame particle state retained by hot updates before reading acceleration", () => {
    const carSource = readFileSync(resolve(process.cwd(), "src/viewer/Car.tsx"), "utf8");

    expect(carSource).toContain("hasCompleteFlameParticleState");
    expect(carSource).toContain("!hasCompleteFlameParticleState(particleState)");
    expect(carSource).not.toContain("if (!particleState || phase < particleState.phase)");
  });
});
