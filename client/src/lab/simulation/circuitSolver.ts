import { LabComponent, Connection, CircuitSolution } from "../types";

interface ResistorElement {
  type: "resistor";
  componentId: string;
  nodeA: string;
  nodeB: string;
  resistance: number;
}

interface VoltageSourceElement {
  type: "voltage";
  componentId: string;
  nodeA: string;
  nodeB: string;
  voltage: number;
}

interface CircuitElements {
  nodes: string[];
  groundNode: string;
  resistors: ResistorElement[];
  voltages: VoltageSourceElement[];
}

const OPEN_CIRCUIT_RESISTANCE = 1_000_000;
const SHORT_CIRCUIT_RESISTANCE = 0.05;
const GAUSSIAN_ELIMINATION_PIVOT_TOLERANCE = 1e-9;

interface LinearSolveResult {
  solution: number[] | null;
  error?: string;
}

const clampResistance = (value: number, fallback: number) =>
  Number.isFinite(value) && value > 0 ? value : fallback;

const getTerminalKey = (componentId: string, terminal: number) =>
  `${componentId}:${terminal}`;

class UnionFind {
  private parent: Map<string, string> = new Map();

  find(item: string): string {
    if (!this.parent.has(item)) {
      this.parent.set(item, item);
      return item;
    }
    const parent = this.parent.get(item) ?? item;
    if (parent === item) {
      return parent;
    }
    const root = this.find(parent);
    this.parent.set(item, root);
    return root;
  }

  union(a: string, b: string) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA);
    }
  }

  roots() {
    return Array.from(this.parent.keys()).map((key) => this.find(key));
  }
}

const getResistanceFromComponent = (
  component: LabComponent,
  mode: "dc" | "ac" | "safety",
  frequency: number
) => {
  const params = component.params;
  switch (component.type) {
    case "resistor":
      return clampResistance(Number(params.resistance), 10);
    case "bulb":
      return clampResistance(Number(params.resistance), 12);
    case "ammeter":
      return clampResistance(Number(params.internalResistance), SHORT_CIRCUIT_RESISTANCE);
    case "voltmeter":
      return clampResistance(Number(params.internalResistance), OPEN_CIRCUIT_RESISTANCE);
    case "switch":
      return params.closed ? SHORT_CIRCUIT_RESISTANCE : OPEN_CIRCUIT_RESISTANCE;
    case "capacitor": {
      if (mode === "dc" || mode === "safety") {
        return OPEN_CIRCUIT_RESISTANCE;
      }
      const capacitance = clampResistance(Number(params.capacitance), 0.001);
      const reactance = 1 / (2 * Math.PI * frequency * capacitance);
      return Math.max(reactance, 0.01);
    }
    case "inductor": {
      if (mode === "dc" || mode === "safety") {
        return SHORT_CIRCUIT_RESISTANCE;
      }
      const inductance = clampResistance(Number(params.inductance), 0.05);
      const reactance = 2 * Math.PI * frequency * inductance;
      return Math.max(reactance, 0.01);
    }
    case "diode":
      return params.conducting ? 10 : OPEN_CIRCUIT_RESISTANCE;
    case "transistor": {
      if (!params.enabled) {
        return OPEN_CIRCUIT_RESISTANCE;
      }
      const gain = clampResistance(Number(params.gain), 100);
      return Math.max(1 / gain, 0.01);
    }
    default:
      return 10;
  }
};

const createCircuitElements = (
  components: LabComponent[],
  connections: Connection[],
  mode: "dc" | "ac" | "safety",
  frequency: number
): CircuitElements => {
  const unionFind = new UnionFind();

  components.forEach((component) => {
    unionFind.find(getTerminalKey(component.id, 0));
    unionFind.find(getTerminalKey(component.id, 1));
  });

  connections.forEach((connection) => {
    unionFind.union(
      getTerminalKey(connection.from.componentId, connection.from.terminal),
      getTerminalKey(connection.to.componentId, connection.to.terminal)
    );
  });

  const nodeMap = new Map<string, string>();
  unionFind.roots().forEach((root) => {
    if (!nodeMap.has(root)) {
      nodeMap.set(root, root);
    }
  });

  const nodes = Array.from(nodeMap.keys());
  const battery = components.find((component) => component.type === "battery");
  const groundNode = battery
    ? nodeMap.get(unionFind.find(getTerminalKey(battery.id, 0))) ?? nodes[0]
    : nodes[0];

  const resistors: ResistorElement[] = [];
  const voltages: VoltageSourceElement[] = [];

  components.forEach((component) => {
    const terminalA = nodeMap.get(
      unionFind.find(getTerminalKey(component.id, 0))
    );
    const terminalB = nodeMap.get(
      unionFind.find(getTerminalKey(component.id, 1))
    );
    if (!terminalA || !terminalB) {
      return;
    }

    if (component.type === "battery") {
      const voltage = clampResistance(Number(component.params.voltage), 9);
      const internalResistance = clampResistance(
        Number(component.params.internalResistance),
        0
      );
      if (internalResistance > 0.01) {
        const internalNode = `${component.id}:internal`;
        nodes.push(internalNode);
        resistors.push({
          type: "resistor",
          componentId: component.id,
          nodeA: terminalA,
          nodeB: internalNode,
          resistance: internalResistance,
        });
        voltages.push({
          type: "voltage",
          componentId: component.id,
          nodeA: internalNode,
          nodeB: terminalB,
          voltage,
        });
        return;
      }
      voltages.push({
        type: "voltage",
        componentId: component.id,
        nodeA: terminalA,
        nodeB: terminalB,
        voltage,
      });
      return;
    }

    const resistance = getResistanceFromComponent(component, mode, frequency);
    resistors.push({
      type: "resistor",
      componentId: component.id,
      nodeA: terminalA,
      nodeB: terminalB,
      resistance,
    });
  });

  return { nodes, groundNode, resistors, voltages };
};

const solveLinearSystem = (
  matrix: number[][],
  vector: number[]
): LinearSolveResult => {
  const size = vector.length;
  const augmented = matrix.map((row, i) => [...row, vector[i]]);

  for (let col = 0; col < size; col += 1) {
    let pivotRow = col;
    let pivotValue = Math.abs(augmented[col][col]);
    for (let row = col + 1; row < size; row += 1) {
      const value = Math.abs(augmented[row][col]);
      if (value > pivotValue) {
        pivotValue = value;
        pivotRow = row;
      }
    }
    if (pivotValue < GAUSSIAN_ELIMINATION_PIVOT_TOLERANCE) {
      return {
        solution: null,
        error: "Tizim singulyar. Ulanishlar ochiq yoki qisqa bo'lishi mumkin.",
      };
    }
    if (pivotRow !== col) {
      [augmented[pivotRow], augmented[col]] = [augmented[col], augmented[pivotRow]];
    }

    const pivot = augmented[col][col];
    for (let j = col; j <= size; j += 1) {
      augmented[col][j] /= pivot;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === col) {
        continue;
      }
      const factor = augmented[row][col];
      for (let j = col; j <= size; j += 1) {
        augmented[row][j] -= factor * augmented[col][j];
      }
    }
  }

  return { solution: augmented.map((row) => row[size]) };
};

export const solveCircuit = (
  components: LabComponent[],
  connections: Connection[],
  options: { mode: "dc" | "ac" | "safety"; frequency: number }
): CircuitSolution => {
  const warnings: string[] = [];
  if (components.length === 0) {
    return {
      currents: {},
      voltages: {},
      power: {},
      nodeVoltages: {},
      totalCurrent: 0,
      warnings: ["Komponentlar joylashtirilmagan."],
    };
  }

  const { nodes, groundNode, resistors, voltages } = createCircuitElements(
    components,
    connections,
    options.mode,
    options.frequency
  );

  const uniqueNodes = Array.from(new Set(nodes));
  const nodeIndices = new Map<string, number>();
  uniqueNodes
    .filter((node) => node !== groundNode)
    .forEach((node, index) => {
      nodeIndices.set(node, index);
    });

  const voltageCount = voltages.length;
  const size = nodeIndices.size + voltageCount;

  if (size === 0) {
    return {
      currents: {},
      voltages: {},
      power: {},
      nodeVoltages: {},
      totalCurrent: 0,
      warnings: ["Tarmoq yechimi topilmadi."],
    };
  }

  const matrix = Array.from({ length: size }, () => Array(size).fill(0));
  const vector = Array(size).fill(0);

  resistors.forEach((resistor) => {
    const conductance = 1 / clampResistance(resistor.resistance, 1);
    const i = nodeIndices.get(resistor.nodeA);
    const j = nodeIndices.get(resistor.nodeB);
    if (i !== undefined) {
      matrix[i][i] += conductance;
    }
    if (j !== undefined) {
      matrix[j][j] += conductance;
    }
    if (i !== undefined && j !== undefined) {
      matrix[i][j] -= conductance;
      matrix[j][i] -= conductance;
    }
  });

  voltages.forEach((source, index) => {
    const row = nodeIndices.size + index;
    const i = nodeIndices.get(source.nodeA);
    const j = nodeIndices.get(source.nodeB);
    if (i !== undefined) {
      matrix[row][i] = 1;
      matrix[i][row] = 1;
    }
    if (j !== undefined) {
      matrix[row][j] = -1;
      matrix[j][row] = -1;
    }
    vector[row] = source.voltage;
  });

  const { solution, error } = solveLinearSystem(matrix, vector);
  if (!solution) {
    warnings.push(
      error ?? "Tenglamalar yechimga ega emas. Ulanishlarni tekshiring."
    );
    return {
      currents: {},
      voltages: {},
      power: {},
      nodeVoltages: {},
      totalCurrent: 0,
      warnings,
    };
  }

  const nodeVoltages: Record<string, number> = { [groundNode]: 0 };
  nodeIndices.forEach((index, node) => {
    nodeVoltages[node] = solution[index];
  });

  const currents: Record<string, number> = {};
  const voltagesByComponent: Record<string, number> = {};
  const power: Record<string, number> = {};

  resistors.forEach((resistor) => {
    const va = nodeVoltages[resistor.nodeA] ?? 0;
    const vb = nodeVoltages[resistor.nodeB] ?? 0;
    const current = (va - vb) / clampResistance(resistor.resistance, 1);
    currents[resistor.componentId] =
      (currents[resistor.componentId] ?? 0) + current;
    voltagesByComponent[resistor.componentId] = va - vb;
    power[resistor.componentId] =
      (power[resistor.componentId] ?? 0) + current * (va - vb);
  });

  voltages.forEach((source, index) => {
    const currentIndex = nodeIndices.size + index;
    const current = solution[currentIndex] ?? 0;
    const va = nodeVoltages[source.nodeA] ?? 0;
    const vb = nodeVoltages[source.nodeB] ?? 0;
    currents[source.componentId] =
      (currents[source.componentId] ?? 0) + current;
    voltagesByComponent[source.componentId] = va - vb;
    power[source.componentId] =
      (power[source.componentId] ?? 0) + current * (va - vb);
  });

  const totalCurrent = Math.abs(
    voltages.length > 0
      ? currents[voltages[0].componentId] ?? 0
      : Object.values(currents)[0] ?? 0
  );

  return {
    currents,
    voltages: voltagesByComponent,
    power,
    nodeVoltages,
    totalCurrent,
    warnings,
  };
};
