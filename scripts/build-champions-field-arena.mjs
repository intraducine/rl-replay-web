import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune } from "@gltf-transform/functions";

const workspace = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(workspace, "public/rl-assets/champions-field-placed");
const outputRoot = resolve(workspace, "public/rl-assets/champions-field-arena");
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const ARENA_PARTS = [
  {
    input: "CS_Field_combined.gltf",
    output: "champions-field-playable.glb",
    keep: new Set([
      "CS_FieldHexShell_01",
      "CS_FieldWallsRL_02",
      "CS_FieldWallsGlass_01",
      "CS_FieldClampsCombined_01a",
      "CS_FieldLightTrim_01",
      "CS_Lattice_01",
      "CS_FieldGoalInner_02",
      "CS_FieldGoalInner_03",
      "CS_FieldLightsCombined_01"
    ])
  },
  {
    input: "CS_P_combined.gltf",
    output: "champions-field-boundary.glb",
    keep: new Set(["CS_FieldWalls_01", "CS_FieldGoalOuter_01", "CS_CornerArrows"])
  }
];

await mkdir(outputRoot, { recursive: true });

for (const part of ARENA_PARTS) {
  const document = await io.read(resolve(sourceRoot, part.input));
  const root = document.getRoot();
  const keptNames = [];

  for (const node of root.listNodes()) {
    if (part.keep.has(node.getName())) {
      keptNames.push(node.getName());
    } else {
      node.dispose();
    }
  }

  await document.transform(dedup(), prune());
  const glb = await io.writeBinary(document);
  await writeFile(resolve(outputRoot, part.output), glb);
  console.log(`${part.output}: ${keptNames.length} placed nodes, ${(glb.byteLength / 1024 / 1024).toFixed(2)} MB`);
}
