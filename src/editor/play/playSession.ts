import { create } from "zustand";
import {
  DEFAULT_PLAY_DEVICE,
  type PlayOrientation,
} from "./playLayouts";

export type PlayStatus = "idle" | "starting" | "running" | "error";

interface PlaySession {
  status: PlayStatus;
  url: string | null;
  error: string | null;
  reloadToken: number;
  deviceId: string;
  orientation: PlayOrientation;
  muted: boolean;
  statsOpen: boolean;
  setStarting: () => void;
  setRunning: (url: string) => void;
  setError: (error: string) => void;
  bumpReload: () => void;
  setDeviceId: (deviceId: string) => void;
  setOrientation: (orientation: PlayOrientation) => void;
  setMuted: (muted: boolean) => void;
  setStatsOpen: (statsOpen: boolean) => void;
  reset: () => void;
}

export const usePlaySession = create<PlaySession>((set) => ({
  status: "idle",
  url: null,
  error: null,
  reloadToken: 0,
  deviceId: DEFAULT_PLAY_DEVICE,
  orientation: "portrait",
  muted: false,
  statsOpen: true,
  setStarting: () => set({ status: "starting", error: null }),
  setRunning: (url) => set({ status: "running", url, error: null }),
  setError: (error) => set({ status: "error", error, url: null }),
  bumpReload: () => set((s) => ({ reloadToken: s.reloadToken + 1, status: "running" })),
  setDeviceId: (deviceId) => set({ deviceId }),
  setOrientation: (orientation) => set({ orientation }),
  setMuted: (muted) => set({ muted }),
  setStatsOpen: (statsOpen) => set({ statsOpen }),
  reset: () => set({ status: "idle", url: null, error: null }),
}));
