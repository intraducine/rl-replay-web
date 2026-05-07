import { create } from "zustand";
import type { ReplayInspection, ReplayTimeline } from "../replay/types";

type ReplayStore = {
  timeline?: ReplayTimeline;
  inspection?: ReplayInspection;
  parsing: boolean;
  progressStage: string;
  progress?: number;
  error?: string;
  setTimeline: (timeline: ReplayTimeline | undefined) => void;
  setInspection: (inspection: ReplayInspection | undefined) => void;
  setParsing: (parsing: boolean) => void;
  setProgress: (stage: string, progress?: number) => void;
  setError: (error?: string) => void;
};

export const useReplayStore = create<ReplayStore>((set) => ({
  parsing: false,
  progressStage: "",
  setTimeline: (timeline) => set({ timeline }),
  setInspection: (inspection) => set({ inspection }),
  setParsing: (parsing) => set({ parsing }),
  setProgress: (progressStage, progress) => set({ progressStage, progress }),
  setError: (error) => set({ error })
}));
