import { create } from "zustand";
import type { Alert } from "../types";

interface AlertState {
  alerts: Alert[];
  activeAlert: Alert | null;
  addAlert: (alert: Alert) => void;
  dismissAlert: () => void;
  clearAll: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  activeAlert: null,

  /** Yangi ogohlantirishni qo'shadi va activeAlert ga belgilaydi */
  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts],
      activeAlert: alert,
    })),

  /** Joriy aktiv ogohlantirishni yopadi */
  dismissAlert: () => set({ activeAlert: null }),

  /** Barcha ogohlantirishlarni tozalaydi */
  clearAll: () => set({ alerts: [], activeAlert: null }),
}));
