import { create } from "zustand";
import type { CoordinateDebugOptions } from "../math/coordinateSystem";
import type { CameraMode } from "../viewer/SpectatorCamera";

type PlaybackState = {
  playing: boolean;
  currentTime: number;
  duration: number;
  speed: number;
};

type ViewerStore = PlaybackState & {
  cameraMode: CameraMode;
  selectedPlayerId?: string;
  boostRenderingEnabled: boolean;
  coordinateOptions: CoordinateDebugOptions;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (currentTime: number) => void;
  setDuration: (duration: number) => void;
  setSpeed: (speed: number) => void;
  seekBy: (delta: number) => void;
  setCameraMode: (mode: CameraMode) => void;
  setSelectedPlayerId: (id?: string) => void;
  setBoostRenderingEnabled: (enabled: boolean) => void;
  setCoordinateOption: (key: keyof CoordinateDebugOptions, value: boolean) => void;
};

export const useViewerStore = create<ViewerStore>((set, get) => ({
  playing: false,
  currentTime: 0,
  duration: 0,
  speed: 1,
  cameraMode: "free",
  boostRenderingEnabled: false,
  coordinateOptions: {},
  setPlaying: (playing) => set({ playing }),
  setCurrentTime: (currentTime) => set({ currentTime: Math.max(0, Math.min(get().duration, currentTime)) }),
  setDuration: (duration) => set({ duration, currentTime: Math.min(get().currentTime, duration) }),
  setSpeed: (speed) => set({ speed }),
  seekBy: (delta) => get().setCurrentTime(get().currentTime + delta),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setSelectedPlayerId: (selectedPlayerId) => set({ selectedPlayerId }),
  setBoostRenderingEnabled: (boostRenderingEnabled) => set({ boostRenderingEnabled }),
  setCoordinateOption: (key, value) =>
    set((state) => ({ coordinateOptions: { ...state.coordinateOptions, [key]: value } }))
}));
