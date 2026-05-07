export type ChampionsFieldAssetCategory = "field" | "glass" | "grass" | "goal" | "light" | "oob" | "sky" | "trim" | "utility";

export type ChampionsFieldAsset = {
  path: string;
  category: ChampionsFieldAssetCategory;
};

export const CHAMPIONS_FIELD_ASSET_ROOT = "/rl-assets/champions-field-full";

export const CHAMPIONS_FIELD_ASSETS = [
  {
    "path": "CS_FX/StaticMesh3/DroneBotThruster_SM.gltf",
    "category": "utility"
  },
  {
    "path": "CS_FX/StaticMesh3/TC_SearchLights_SM.gltf",
    "category": "light"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_FieldClampsCombined_01.gltf",
    "category": "trim"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_FieldClampsCombined_01a.gltf",
    "category": "trim"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_FieldFog_01.gltf",
    "category": "light"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_FieldGlow_01.gltf",
    "category": "light"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_FieldGoalInner_02.gltf",
    "category": "goal"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_FieldGoalInner_03.gltf",
    "category": "goal"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_FieldGoalOuter_01.gltf",
    "category": "goal"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_FieldHexShell_01.gltf",
    "category": "glass"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_FieldLightTrim_01.gltf",
    "category": "light"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_FieldLightsCombined_01.gltf",
    "category": "light"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_FieldWallsGlass_01.gltf",
    "category": "glass"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_FieldWallsRL_02.gltf",
    "category": "field"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_FieldWalls_01.gltf",
    "category": "field"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_FireworkLauncher_01.gltf",
    "category": "field"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_GroundsLights_01.gltf",
    "category": "light"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_Grounds_Driveway01.gltf",
    "category": "field"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_Grounds_Floor01.gltf",
    "category": "field"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_Grounds_Floor02.gltf",
    "category": "field"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_Grounds_Grass01.gltf",
    "category": "grass"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_Grounds_Grass02.gltf",
    "category": "grass"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_Grounds_Trim01.gltf",
    "category": "trim"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_Grounds_Trim02.gltf",
    "category": "trim"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/CS_Lattice_01.gltf",
    "category": "trim"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/Grass_Base.gltf",
    "category": "grass"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/Grass_Base_Flat.gltf",
    "category": "grass"
  },
  {
    "path": "CS_FieldAssets01/StaticMesh3/Grass_Goal.gltf",
    "category": "grass"
  },
  {
    "path": "CS_StadiumAssets_01/SkeletalMesh3/Drone_SK.gltf",
    "category": "utility"
  },
  {
    "path": "CS_StadiumAssets_01/StaticMesh3/Blimp_Offset_SM.gltf",
    "category": "oob"
  },
  {
    "path": "CS_StadiumAssets_01/StaticMesh3/CS_EmblemWing_00.gltf",
    "category": "trim"
  },
  {
    "path": "CS_StadiumAssets_01/StaticMesh3/CS_Emblem_00.gltf",
    "category": "trim"
  },
  {
    "path": "CS_StadiumAssets_01/StaticMesh3/CS_SeparatedAds.gltf",
    "category": "utility"
  },
  {
    "path": "CS_StadiumAssets_01/StaticMesh3/CS_StadiumLightBar_Cone.gltf",
    "category": "light"
  },
  {
    "path": "CS_StadiumAssets_01/StaticMesh3/CS_Stands_00.gltf",
    "category": "oob"
  },
  {
    "path": "CS_StadiumAssets_01/StaticMesh3/CS_Stands_01.gltf",
    "category": "oob"
  },
  {
    "path": "CS_StadiumAssets_01/StaticMesh3/CS_Stands_02.gltf",
    "category": "oob"
  },
  {
    "path": "CS_StadiumAssets_01/StaticMesh3/CS_Stands_03.gltf",
    "category": "oob"
  },
  {
    "path": "CS_StadiumAssets_01/StaticMesh3/CS_Stands_04.gltf",
    "category": "oob"
  },
  {
    "path": "CS_StadiumAssets_01/StaticMesh3/CS_Stands_05.gltf",
    "category": "oob"
  },
  {
    "path": "CS_StadiumAssets_01/StaticMesh3/CS_TV_00.gltf",
    "category": "utility"
  },
  {
    "path": "CS_StadiumAssets_01/StaticMesh3/CS_Tent_00.gltf",
    "category": "oob"
  },
  {
    "path": "CS_StadiumAssets_01/StaticMesh3/OOB_Lights_00.gltf",
    "category": "light"
  },
  {
    "path": "CS_StadiumAssets_01/StaticMesh3/SC_TV_00.gltf",
    "category": "utility"
  },
  {
    "path": "City/StaticMesh3/CityGround_01.gltf",
    "category": "oob"
  },
  {
    "path": "City/StaticMesh3/City_OOB_A.gltf",
    "category": "oob"
  },
  {
    "path": "EngineVolumetrics/StaticMesh3/S_EV_SimpleLightBeam_01.gltf",
    "category": "light"
  },
  {
    "path": "EuroStadium_Assets/StaticMesh3/Grass_1x1.gltf",
    "category": "grass"
  },
  {
    "path": "EuroStadium_Assets/StaticMesh3/Grass_Corner.gltf",
    "category": "grass"
  },
  {
    "path": "EuroStadium_Assets/StaticMesh3/Grass_GoalCorner.gltf",
    "category": "grass"
  },
  {
    "path": "EuroStadium_Assets/StaticMesh3/Grass_Side.gltf",
    "category": "grass"
  },
  {
    "path": "Park_Assets/StaticMesh3/BoostPads_01_Combined.gltf",
    "category": "field"
  },
  {
    "path": "Park_Assets/StaticMesh3/BoostPads_02_Combined.gltf",
    "category": "field"
  },
  {
    "path": "Park_Assets/StaticMesh3/BoostPads_03_Combined.gltf",
    "category": "field"
  },
  {
    "path": "Park_Assets/StaticMesh3/Park_BannerScaffold00.gltf",
    "category": "oob"
  },
  {
    "path": "Pickup_Boost/StaticMesh3/BoostPad_Glow_SM.gltf",
    "category": "light"
  },
  {
    "path": "Pickup_Boost/StaticMesh3/BoostPad_Large.gltf",
    "category": "field"
  },
  {
    "path": "Pickup_Boost/StaticMesh3/BoostPad_Large_Glow.gltf",
    "category": "light"
  },
  {
    "path": "Pickup_Boost/StaticMesh3/BoostPad_Scroll_SM.gltf",
    "category": "field"
  },
  {
    "path": "Pickup_Boost/StaticMesh3/BoostPad_Small_02_SM.gltf",
    "category": "field"
  },
  {
    "path": "Proto_Neo_FX/StaticMesh3/SpotLightBeam.gltf",
    "category": "light"
  },
  {
    "path": "Proto_World01/StaticMesh3/SkyDome01.gltf",
    "category": "sky"
  },
  {
    "path": "SS_OOB/StaticMesh3/CS_CornerArrows.gltf",
    "category": "oob"
  },
  {
    "path": "SS_OOB/StaticMesh3/CS_CountryFlags.gltf",
    "category": "oob"
  },
  {
    "path": "SS_OOB/StaticMesh3/CS_Crowd_Final_01.gltf",
    "category": "oob"
  },
  {
    "path": "SS_OOB/StaticMesh3/CS_Crowd_Final_02.gltf",
    "category": "oob"
  },
  {
    "path": "SS_OOB/StaticMesh3/CS_Crowd_Final_Statue.gltf",
    "category": "oob"
  },
  {
    "path": "SS_OOB/StaticMesh3/CS_LightCones_Wide.gltf",
    "category": "light"
  },
  {
    "path": "SS_OOB/StaticMesh3/CS_RLCS_Flags.gltf",
    "category": "oob"
  },
  {
    "path": "SS_OOB/StaticMesh3/CS_StadiumLightBar.gltf",
    "category": "light"
  },
  {
    "path": "SS_OOB/StaticMesh3/CS_StatueVegetation.gltf",
    "category": "oob"
  },
  {
    "path": "SS_OOB/StaticMesh3/CS_Statue_BallCar_SM.gltf",
    "category": "oob"
  },
  {
    "path": "SS_OOB/StaticMesh3/CS_Statue_Base.gltf",
    "category": "oob"
  },
  {
    "path": "SS_OOB/StaticMesh3/CS_Statue_Floor_02.gltf",
    "category": "oob"
  },
  {
    "path": "SS_OOB/StaticMesh3/CS_Statue_Lights.gltf",
    "category": "light"
  },
  {
    "path": "SS_OOB/StaticMesh3/CS_Statue_SM.gltf",
    "category": "oob"
  },
  {
    "path": "SS_OOB/StaticMesh3/CS_TunnelBanners.gltf",
    "category": "oob"
  },
  {
    "path": "SS_OOB/StaticMesh3/Stadium_LightCones.gltf",
    "category": "light"
  },
  {
    "path": "Stadium/StaticMesh3/Tifo.gltf",
    "category": "oob"
  },
  {
    "path": "Stadium/StaticMesh3/WavyFlagPatch.gltf",
    "category": "oob"
  },
  {
    "path": "Stadium_Assets/StaticMesh3/FieldSpotLights_Team1_Combined.gltf",
    "category": "light"
  },
  {
    "path": "Stadium_Assets/StaticMesh3/FieldSpotLights_Team2_Combined.gltf",
    "category": "light"
  }
] as const satisfies readonly ChampionsFieldAsset[];
