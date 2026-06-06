export type PlaybackState = {
  playing: boolean;
  currentTime: number;
  duration: number;
  speed: number;
};

export function stepFrame(currentTime: number, direction: -1 | 1, duration = Number.POSITIVE_INFINITY, fps = 30): number {
  return Math.max(0, Math.min(duration, currentTime + direction / fps));
}

export function advancePlayback(state: PlaybackState, deltaSeconds: number): PlaybackState {
  if (!state.playing) return state;
  const currentTime = Math.min(state.duration, state.currentTime + deltaSeconds * state.speed);
  return {
    ...state,
    currentTime,
    playing: currentTime < state.duration
  };
}
