import { create } from "zustand";
import type { Earthquake } from "../types";

interface EarthquakeState {
  earthquakes: Earthquake[];
  addEarthquake: (eq: Earthquake) => void;
  setEarthquakes: (list: Earthquake[]) => void;
  clearOld: () => void;
}

export const useEarthquakeStore = create<EarthquakeState>((set) => ({
  earthquakes: [],

  /** Yangi zilzilani ro'yxat boshiga qo'shadi */
  addEarthquake: (eq) =>
    set((state) => ({ earthquakes: [eq, ...state.earthquakes] })),

  /** Barcha zilzilalar ro'yxatini yangilaydi */
  setEarthquakes: (list) => set({ earthquakes: list }),

  /** 24 soatdan eski yozuvlarni o'chiradi */
  clearOld: () =>
    set((state) => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return {
        earthquakes: state.earthquakes.filter(
          (eq) => new Date(eq.timestamp).getTime() >= cutoff
        ),
      };
    }),
}));
