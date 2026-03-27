import { ComponentType, ParameterConfig } from "../types";

interface ComponentDefinition {
  type: ComponentType;
  label: string;
  color: string;
  icon: string;
  defaultParams: Record<string, number | boolean>;
  parameters: ParameterConfig[];
}

export const COMPONENT_LIBRARY: Record<ComponentType, ComponentDefinition> = {
  battery: {
    type: "battery",
    label: "Batareya",
    color: "#f97316",
    icon: "🔋",
    defaultParams: { voltage: 9, internalResistance: 0.2 },
    parameters: [
      { key: "voltage", label: "Kuchlanish", min: 1, max: 24, step: 0.5, unit: "V" },
      { key: "internalResistance", label: "Ichki qarshilik", min: 0, max: 5, step: 0.1, unit: "Ω" },
    ],
  },
  resistor: {
    type: "resistor",
    label: "Rezistor",
    color: "#38bdf8",
    icon: "🧱",
    defaultParams: { resistance: 10 },
    parameters: [
      { key: "resistance", label: "Qarshilik", min: 1, max: 1000, step: 1, unit: "Ω" },
    ],
  },
  capacitor: {
    type: "capacitor",
    label: "Kondensator",
    color: "#a855f7",
    icon: "⚡",
    defaultParams: { capacitance: 0.001 },
    parameters: [
      { key: "capacitance", label: "Sig'im", min: 0.0001, max: 0.01, step: 0.0001, unit: "F" },
    ],
  },
  inductor: {
    type: "inductor",
    label: "Induktor",
    color: "#facc15",
    icon: "🌀",
    defaultParams: { inductance: 0.05 },
    parameters: [
      { key: "inductance", label: "Induktivlik", min: 0.001, max: 1, step: 0.001, unit: "H" },
    ],
  },
  switch: {
    type: "switch",
    label: "Kalit",
    color: "#22c55e",
    icon: "⏻",
    defaultParams: { closed: true },
    parameters: [
      { key: "closed", label: "Yopiq holat", min: 0, max: 1, step: 1, type: "boolean" },
    ],
  },
  bulb: {
    type: "bulb",
    label: "Chiroq",
    color: "#fb7185",
    icon: "💡",
    defaultParams: { resistance: 12, rating: 5 },
    parameters: [
      { key: "resistance", label: "Qarshilik", min: 1, max: 200, step: 1, unit: "Ω" },
      { key: "rating", label: "Quvvat reytingi", min: 1, max: 60, step: 1, unit: "W" },
    ],
  },
  ammeter: {
    type: "ammeter",
    label: "Ampermetr",
    color: "#0ea5e9",
    icon: "🧲",
    defaultParams: { internalResistance: 0.05 },
    parameters: [
      { key: "internalResistance", label: "Ichki qarshilik", min: 0.01, max: 1, step: 0.01, unit: "Ω" },
    ],
  },
  voltmeter: {
    type: "voltmeter",
    label: "Vol'tmetr",
    color: "#14b8a6",
    icon: "📟",
    defaultParams: { internalResistance: 1000 },
    parameters: [
      { key: "internalResistance", label: "Ichki qarshilik", min: 100, max: 10000, step: 50, unit: "Ω" },
    ],
  },
  diode: {
    type: "diode",
    label: "Diod",
    color: "#f59e0b",
    icon: "➡️",
    defaultParams: { forwardVoltage: 0.7, conducting: true },
    parameters: [
      { key: "forwardVoltage", label: "Forward kuchlanish", min: 0.2, max: 1.2, step: 0.05, unit: "V" },
      { key: "conducting", label: "O'tkazuvchan", min: 0, max: 1, step: 1, type: "boolean" },
    ],
  },
  transistor: {
    type: "transistor",
    label: "Tranzistor",
    color: "#6366f1",
    icon: "🔺",
    defaultParams: { gain: 100, enabled: true },
    parameters: [
      { key: "gain", label: "Kuchaytirish", min: 10, max: 300, step: 5 },
      { key: "enabled", label: "Faol", min: 0, max: 1, step: 1, type: "boolean" },
    ],
  },
};

export const COMPONENT_TYPES = Object.keys(COMPONENT_LIBRARY) as ComponentType[];
