import { Suspense } from "react";
import { ChampionsFieldStadium } from "./ChampionsFieldStadium";

export function StandardArena() {
  return (
    <group>
      <Suspense fallback={null}>
        <ChampionsFieldStadium />
      </Suspense>
    </group>
  );
}
