import { publicAssetWithBase } from "../viewer/publicAsset";

export const SAMPLE_REPLAY_FILE_NAME = "sample-replay.replay";
export const SAMPLE_REPLAY_PATH = "/sample-replays/cd2c5d33-422a-4d11-b6ca-9d827c5d26fe.replay";

export function sampleReplayUrl() {
  return sampleReplayUrlWithBase(import.meta.env.BASE_URL || "/");
}

export function sampleReplayUrlWithBase(base: string) {
  return publicAssetWithBase(SAMPLE_REPLAY_PATH, base);
}
