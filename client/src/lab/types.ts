export type LabMode = "electrostatics" | "dc" | "media" | "magnetism" | "ac" | "safety";

export type ComponentType =
  | "battery"
  | "resistor"
  | "capacitor"
  | "inductor"
  | "switch"
  | "bulb"
  | "ammeter"
  | "voltmeter"
  | "diode"
  | "transistor";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface LabComponent {
  id: string;
  type: ComponentType;
  label: string;
  position: Vec3;
  params: Record<string, number | boolean>;
}

export interface TerminalRef {
  componentId: string;
  terminal: 0 | 1;
}

export interface Connection {
  id: string;
  from: TerminalRef;
  to: TerminalRef;
}

export interface CircuitSolution {
  currents: Record<string, number>;
  voltages: Record<string, number>;
  power: Record<string, number>;
  nodeVoltages: Record<string, number>;
  totalCurrent: number;
  warnings: string[];
}

export interface ParameterConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  type?: "number" | "boolean";
}

export interface Charge {
  id: string;
  value: number;
  position: Vec3;
}

export interface FieldLine {
  id: string;
  points: Vec3[];
}

export interface MediumState {
  id: string;
  label: string;
  chargeCarrier: string;
  conductivity: number;
  mobility: number;
  density: number;
}
