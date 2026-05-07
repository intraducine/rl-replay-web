export type AlphaBoostComponentName = "mesh" | "flame" | "main" | "lensFlare" | "lensFlareReflection";

type AlphaBoostDebugState = {
  components?: Partial<Record<AlphaBoostComponentName, boolean>>;
  bloom?: Partial<Record<AlphaBoostComponentName, boolean>>;
};

declare global {
  // Debug-only browser QA hook. Undefined in normal app usage.
  // eslint-disable-next-line no-var
  var __rlAlphaBoostDebug: AlphaBoostDebugState | undefined;
}

export function alphaBoostComponentEnabled(component: AlphaBoostComponentName): boolean {
  return globalThis.__rlAlphaBoostDebug?.components?.[component] !== false;
}

export function alphaBoostBloomEnabled(component: AlphaBoostComponentName): boolean {
  return globalThis.__rlAlphaBoostDebug?.bloom?.[component] !== false;
}
