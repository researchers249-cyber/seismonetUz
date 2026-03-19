import { create } from "zustand";
import type { Device } from "../types";

const STORAGE_KEY = "seismon-device-id";

function getOrCreateDeviceId(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  // crypto.randomUUID() — barcha zamonaviy brauzerlarda mavjud
  const id: string =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}

interface DeviceState {
  devices: Device[];
  myDeviceId: string;
  setDevices: (list: Device[]) => void;
}

export const useDeviceStore = create<DeviceState>(() => ({
  devices: [],
  myDeviceId: getOrCreateDeviceId(),

  /** Qurilmalar ro'yxatini yangilaydi */
  setDevices: (list) =>
    useDeviceStore.setState({ devices: list }),
}));
