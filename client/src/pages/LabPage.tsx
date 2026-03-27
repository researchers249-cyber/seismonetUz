import { useMemo, useState } from "react";
import { COMPONENT_LIBRARY } from "../lab/components/ComponentLibrary";
import { LabScene } from "../lab/components/LabScene";
import { calculateReactance, calculateImpedance, calculatePhaseAngle } from "../lab/simulation/ac";
import { solveCircuit } from "../lab/simulation/circuitSolver";
import { calculateCoulombForce } from "../lab/simulation/electrostatics";
import { calculateInducedEmf, calculateLorentzForce } from "../lab/simulation/magnetism";
import { calculateCurrentDensity, calculateDriftVelocity } from "../lab/simulation/media";
import { LabInspector } from "../lab/ui/LabInspector";
import { LabSidebar } from "../lab/ui/LabSidebar";
import { LabTabs } from "../lab/ui/LabTabs";
import { WaveformChart } from "../lab/ui/WaveformChart";
import {
  Charge,
  ComponentType,
  Connection,
  LabComponent,
  LabMode,
  MediumState,
  Vec3,
} from "../lab/types";

type Metric = { label: string; value: string; tone?: "info" | "success" | "danger" };

const createId = () => Math.random().toString(36).slice(2, 10);

const createComponent = (type: ComponentType, position: Vec3, id = createId()): LabComponent => {
  const definition = COMPONENT_LIBRARY[type];
  return {
    id,
    type,
    label: definition.label,
    position,
    params: { ...definition.defaultParams },
  };
};

const initialBattery = createComponent("battery", { x: -2.4, y: 0.4, z: 0 }, "battery-1");
const initialResistor = createComponent("resistor", { x: 0, y: 0.3, z: 0 }, "resistor-1");
const initialBulb = createComponent("bulb", { x: 2.4, y: 0.4, z: 0 }, "bulb-1");

const initialConnections: Connection[] = [
  {
    id: "wire-1",
    from: { componentId: initialBattery.id, terminal: 1 },
    to: { componentId: initialResistor.id, terminal: 0 },
  },
  {
    id: "wire-2",
    from: { componentId: initialResistor.id, terminal: 1 },
    to: { componentId: initialBulb.id, terminal: 0 },
  },
  {
    id: "wire-3",
    from: { componentId: initialBulb.id, terminal: 1 },
    to: { componentId: initialBattery.id, terminal: 0 },
  },
];

const initialCharges: Charge[] = [
  { id: "charge-pos", value: 4e-6, position: { x: -1.5, y: 0.6, z: 0 } },
  { id: "charge-neg", value: -3e-6, position: { x: 1.5, y: 0.6, z: 0 } },
];

// Units: conductivity (S/m), mobility (m²/V·s), density (1/m³).
const mediaOptions: MediumState[] = [
  { id: "metal", label: "Metall", chargeCarrier: "Elektronlar", conductivity: 5.8e7, mobility: 0.003, density: 8.5e28 },
  { id: "electrolyte", label: "Elektrolit", chargeCarrier: "Ionlar", conductivity: 1.2, mobility: 4.5e-8, density: 6e26 },
  { id: "gas", label: "Gaz", chargeCarrier: "Plazma", conductivity: 0.01, mobility: 2.5e-4, density: 2e25 },
  { id: "semiconductor", label: "Yarim o'tkazuvchi", chargeCarrier: "Elektron/kovak", conductivity: 0.5, mobility: 0.0014, density: 1e22 },
];

export default function LabPage() {
  const [activeMode, setActiveMode] = useState<LabMode>("dc");
  const [components, setComponents] = useState<LabComponent[]>([
    initialBattery,
    initialResistor,
    initialBulb,
  ]);
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    initialResistor.id
  );
  const [connectMode, setConnectMode] = useState(false);

  const [charges, setCharges] = useState<Charge[]>(initialCharges);
  const [dielectricConstant, setDielectricConstant] = useState(1.0);
  const [magneticFieldStrength, setMagneticFieldStrength] = useState(2);
  const [coilTurns, setCoilTurns] = useState(8);
  const [velocity, setVelocity] = useState(1.6);

  const [frequency, setFrequency] = useState(50);
  const [acVoltage, setAcVoltage] = useState(12);
  const [acResistance, setAcResistance] = useState(18);
  const [acInductance, setAcInductance] = useState(0.05);
  const [acCapacitance, setAcCapacitance] = useState(0.001);
  const [primaryTurns, setPrimaryTurns] = useState(120);
  const [secondaryTurns, setSecondaryTurns] = useState(60);

  const [electricField, setElectricField] = useState(120);
  const [activeMediumId, setActiveMediumId] = useState("metal");
  const [flowSpeed, setFlowSpeed] = useState(1.2);

  const [maxSafeCurrent, setMaxSafeCurrent] = useState(2.5);
  const [maxSafePower, setMaxSafePower] = useState(45);

  const circuitSolution = useMemo(() => {
    const mode = activeMode === "ac" ? "ac" : activeMode === "safety" ? "safety" : "dc";
    return solveCircuit(components, connections, { mode, frequency });
  }, [activeMode, components, connections, frequency]);

  const currentsByConnection = useMemo(() => {
    return connections.reduce<Record<string, number>>((acc, connection) => {
      acc[connection.id] =
        Math.abs(circuitSolution.currents[connection.from.componentId] ?? 0) ||
        Math.abs(circuitSolution.currents[connection.to.componentId] ?? 0);
      return acc;
    }, {});
  }, [connections, circuitSolution.currents]);

  const selectedComponent = components.find((component) => component.id === selectedComponentId) ?? null;

  const electroStats = useMemo(
    () => calculateCoulombForce(charges, dielectricConstant),
    [charges, dielectricConstant]
  );

  const magneticForce = useMemo(() => {
    return calculateLorentzForce(1.6e-19, { x: velocity, y: 0, z: 0 }, { x: 0, y: magneticFieldStrength, z: 0 });
  }, [magneticFieldStrength, velocity]);

  const inducedEmf = useMemo(() => calculateInducedEmf(coilTurns, 0.2, magneticFieldStrength, 0.02), [coilTurns, magneticFieldStrength]);
  const ampereForce = useMemo(() => {
    const current = Math.max(circuitSolution.totalCurrent, 0.5);
    return current * magneticFieldStrength * 0.8;
  }, [circuitSolution.totalCurrent, magneticFieldStrength]);

  const activeMedium = mediaOptions.find((medium) => medium.id === activeMediumId) ?? mediaOptions[0];
  const driftVelocity = useMemo(
    () => calculateDriftVelocity(activeMedium.mobility, electricField),
    [activeMedium.mobility, electricField]
  );
  const currentDensity = useMemo(
    () => calculateCurrentDensity(activeMedium.density, activeMedium.mobility, electricField),
    [activeMedium.density, activeMedium.mobility, electricField]
  );

  const acReactance = useMemo(() => calculateReactance(frequency, acInductance, acCapacitance), [frequency, acInductance, acCapacitance]);
  const acImpedance = useMemo(
    () => calculateImpedance(acResistance, acReactance.net),
    [acResistance, acReactance.net]
  );
  const acPhase = useMemo(
    () => calculatePhaseAngle(acResistance, acReactance.net),
    [acResistance, acReactance.net]
  );
  const secondaryVoltage = useMemo(
    () => (acVoltage * secondaryTurns) / Math.max(primaryTurns, 1),
    [acVoltage, primaryTurns, secondaryTurns]
  );

  const isSafe = circuitSolution.totalCurrent <= maxSafeCurrent &&
    Object.values(circuitSolution.power).every((value) => Math.abs(value) <= maxSafePower);

  const metrics = useMemo<Metric[]>(() => {
    switch (activeMode) {
      case "electrostatics":
        return [
          { label: "Masofa", value: `${electroStats.distance.toFixed(2)} m` },
          { label: "Kuch (N)", value: electroStats.magnitude.toExponential(2), tone: "info" },
          { label: "Potensial", value: `${electroStats.potential.toExponential(2)} V` },
          { label: "Maydon kuchi", value: `${electroStats.fieldStrength.toExponential(2)} N/C` },
        ];
      case "magnetism":
        return [
          { label: "Lorentz kuchi", value: `${magneticForce.x.toExponential(2)} N`, tone: "info" },
          { label: "Induksiya emf", value: `${inducedEmf.toFixed(3)} V` },
          { label: "Amper kuchi", value: `${ampereForce.toFixed(3)} N` },
          { label: "Maydon kuchi", value: `${magneticFieldStrength.toFixed(2)} T` },
        ];
      case "media":
        return [
          { label: "Drift tezligi", value: `${driftVelocity.toExponential(2)} m/s` },
          { label: "Tok zichligi", value: `${currentDensity.toExponential(2)} A/m²` },
          { label: "Zaryad tashuvchi", value: activeMedium.chargeCarrier },
        ];
      case "ac":
        return [
          { label: "Impedans", value: `${acImpedance.toFixed(2)} Ω` },
          { label: "Faza burchagi", value: `${acPhase.toFixed(1)}°` },
          { label: "Reaktans", value: `${acReactance.net.toFixed(2)} Ω` },
          { label: "Transformator (V₂)", value: `${secondaryVoltage.toFixed(2)} V` },
        ];
      case "safety":
        return [
          { label: "Umumiy tok", value: `${circuitSolution.totalCurrent.toFixed(2)} A`, tone: isSafe ? "success" : "danger" },
          { label: "Xavfsizlik", value: isSafe ? "Xavfsiz" : "Xavfli", tone: isSafe ? "success" : "danger" },
          { label: "Maks. quvvat", value: `${maxSafePower.toFixed(1)} W` },
        ];
      default:
        return [
          { label: "Umumiy tok", value: `${circuitSolution.totalCurrent.toFixed(2)} A` },
          { label: "Aktiv kuchlanish", value: `${(circuitSolution.voltages[selectedComponent?.id ?? ""] ?? 0).toFixed(2)} V` },
          { label: "Quvvat", value: `${(circuitSolution.power[selectedComponent?.id ?? ""] ?? 0).toFixed(2)} W` },
        ];
    }
  }, [
    activeMode,
    acImpedance,
    acPhase,
    acReactance.net,
    activeMedium.chargeCarrier,
    ampereForce,
    circuitSolution,
    currentDensity,
    driftVelocity,
    electroStats,
    inducedEmf,
    isSafe,
    magneticFieldStrength,
    magneticForce,
    maxSafePower,
    secondaryVoltage,
    selectedComponent?.id,
  ]);

  const waveformData = useMemo<{
    labels: string[];
    voltage: number[];
    current: number[];
    phaseVoltages?: { label: string; data: number[]; color: string }[];
  }>(() => {
    const points = Array.from({ length: 60 }, (_, i) => i);
    const labels = points.map((i) => `${i} ms`);
    if (activeMode === "ac") {
      const omega = (2 * Math.PI * frequency) / 1000;
      const phaseA = points.map((i) => acVoltage * Math.sin(omega * i));
      const phaseB = points.map((i) => acVoltage * Math.sin(omega * i - (2 * Math.PI) / 3));
      const phaseC = points.map((i) => acVoltage * Math.sin(omega * i + (2 * Math.PI) / 3));
      const voltage = phaseA;
      const current = points.map(
        (i) =>
          (acVoltage / acImpedance) *
          Math.sin(omega * i - (acPhase * Math.PI) / 180)
      );
      return {
        labels,
        voltage,
        current,
        phaseVoltages: [
          { label: "Faza A", data: phaseA, color: "#38bdf8" },
          { label: "Faza B", data: phaseB, color: "#22c55e" },
          { label: "Faza C", data: phaseC, color: "#f97316" },
        ],
      };
    }
    const voltage = points.map(() => acVoltage);
    const current = points.map(() => circuitSolution.totalCurrent);
    return { labels, voltage, current };
  }, [activeMode, acImpedance, acPhase, acVoltage, circuitSolution.totalCurrent, frequency]);

  const handleAddComponent = (type: ComponentType, position: Vec3) => {
    const component = createComponent(type, position);
    setComponents((prev) => [...prev, component]);
    setSelectedComponentId(component.id);
  };

  const handleMoveComponent = (id: string, position: Vec3) => {
    setComponents((prev) =>
      prev.map((component) =>
        component.id === id ? { ...component, position } : component
      )
    );
  };

  const handleConnectTerminals = (from: Connection["from"], to: Connection["to"]) => {
    setConnections((prev) => {
      const exists = prev.some(
        (connection) =>
          (connection.from.componentId === from.componentId &&
            connection.from.terminal === from.terminal &&
            connection.to.componentId === to.componentId &&
            connection.to.terminal === to.terminal) ||
          (connection.from.componentId === to.componentId &&
            connection.from.terminal === to.terminal &&
            connection.to.componentId === from.componentId &&
            connection.to.terminal === from.terminal)
      );
      if (exists) {
        return prev;
      }
      return [
        ...prev,
        {
          id: `wire-${createId()}`,
          from,
          to,
        },
      ];
    });
  };

  const handleUpdateParam = (id: string, key: string, value: number | boolean) => {
    setComponents((prev) =>
      prev.map((component) =>
        component.id === id
          ? { ...component, params: { ...component.params, [key]: value } }
          : component
      )
    );
  };

  const handleChargeUpdate = (id: string, position: Vec3) => {
    setCharges((prev) =>
      prev.map((charge) => (charge.id === id ? { ...charge, position } : charge))
    );
  };

  const handleChargeValue = (id: string, value: number) => {
    setCharges((prev) =>
      prev.map((charge) => (charge.id === id ? { ...charge, value } : charge))
    );
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Elektr va Magnetizm 3D laboratoriyasi</h1>
        <p className="text-gray-400">
          Interaktiv 3D muhitda zanjirlar tuzing, parametrlarni real-vaqt sozlang va fizik hodisalarni kuzating.
        </p>
      </div>

      <LabTabs active={activeMode} onChange={setActiveMode} />

      <section className="grid gap-6 lg:grid-cols-[240px_1fr_300px]">
        <LabSidebar
          activeMode={activeMode}
          connectMode={connectMode}
          onToggleConnect={() => setConnectMode((prev) => !prev)}
        />

        <div className="space-y-4">
          <LabScene
            mode={activeMode}
            components={components}
            connections={connections}
            selectedComponentId={selectedComponentId}
            connectMode={connectMode}
            currentsByConnection={currentsByConnection}
            charges={charges}
            magneticFieldStrength={magneticFieldStrength}
            coilTurns={coilTurns}
            mediaFlowSpeed={flowSpeed}
            onAddComponent={handleAddComponent}
            onSelectComponent={setSelectedComponentId}
            onMoveComponent={handleMoveComponent}
            onConnectTerminals={handleConnectTerminals}
            onMoveCharge={handleChargeUpdate}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">Rejim parametrlari</h3>
              {activeMode === "electrostatics" && (
                <div className="space-y-3">
                  {charges.map((charge) => (
                    <div key={charge.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{charge.id.includes("pos") ? "Musbat zaryad" : "Manfiy zaryad"}</span>
                        <span>{(charge.value * 1e6).toFixed(2)} μC</span>
                      </div>
                      <input
                        type="range"
                        min={-6}
                        max={6}
                        step={0.1}
                        value={charge.value * 1e6}
                        onChange={(event) => handleChargeValue(charge.id, Number(event.target.value) * 1e-6)}
                        className="w-full accent-sky-500"
                      />
                    </div>
                  ))}
                  <label className="block text-xs text-gray-400">
                    Dielektrik koeffitsienti
                    <input
                      type="range"
                      min={1}
                      max={6}
                      step={0.1}
                      value={dielectricConstant}
                      onChange={(event) => setDielectricConstant(Number(event.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </label>
                </div>
              )}

              {activeMode === "magnetism" && (
                <div className="space-y-3">
                  <label className="block text-xs text-gray-400">
                    Maydon kuchi (T)
                    <input
                      type="range"
                      min={0.5}
                      max={5}
                      step={0.1}
                      value={magneticFieldStrength}
                      onChange={(event) => setMagneticFieldStrength(Number(event.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </label>
                  <label className="block text-xs text-gray-400">
                    G'altak buramlari
                    <input
                      type="range"
                      min={4}
                      max={12}
                      step={1}
                      value={coilTurns}
                      onChange={(event) => setCoilTurns(Number(event.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </label>
                  <label className="block text-xs text-gray-400">
                    Zaryad tezligi (m/s)
                    <input
                      type="range"
                      min={0.2}
                      max={4}
                      step={0.1}
                      value={velocity}
                      onChange={(event) => setVelocity(Number(event.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </label>
                </div>
              )}

              {activeMode === "media" && (
                <div className="space-y-3">
                  <label className="block text-xs text-gray-400">
                    Muhit turi
                    <select
                      className="mt-1 w-full rounded-md border border-gray-700 bg-gray-950 px-2 py-1 text-sm text-gray-200"
                      value={activeMediumId}
                      onChange={(event) => setActiveMediumId(event.target.value)}
                    >
                      {mediaOptions.map((medium) => (
                        <option key={medium.id} value={medium.id}>
                          {medium.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs text-gray-400">
                    Elektr maydon kuchi (V/m)
                    <input
                      type="range"
                      min={20}
                      max={200}
                      step={5}
                      value={electricField}
                      onChange={(event) => setElectricField(Number(event.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </label>
                  <label className="block text-xs text-gray-400">
                    Oqim tezligi
                    <input
                      type="range"
                      min={0.4}
                      max={3}
                      step={0.1}
                      value={flowSpeed}
                      onChange={(event) => setFlowSpeed(Number(event.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </label>
                </div>
              )}

              {activeMode === "ac" && (
                <div className="space-y-3">
                  <label className="block text-xs text-gray-400">
                    Chastota (Hz)
                    <input
                      type="range"
                      min={10}
                      max={120}
                      step={1}
                      value={frequency}
                      onChange={(event) => setFrequency(Number(event.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </label>
                  <label className="block text-xs text-gray-400">
                    Amplituda (V)
                    <input
                      type="range"
                      min={2}
                      max={24}
                      step={0.5}
                      value={acVoltage}
                      onChange={(event) => setAcVoltage(Number(event.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </label>
                  <label className="block text-xs text-gray-400">
                    Transformator buramlari (N₁ / N₂)
                    <div className="space-y-2">
                      <input
                        type="range"
                        min={60}
                        max={200}
                        step={5}
                        value={primaryTurns}
                        onChange={(event) => setPrimaryTurns(Number(event.target.value))}
                        className="w-full accent-sky-500"
                      />
                      <input
                        type="range"
                        min={20}
                        max={120}
                        step={5}
                        value={secondaryTurns}
                        onChange={(event) => setSecondaryTurns(Number(event.target.value))}
                        className="w-full accent-sky-500"
                      />
                    </div>
                  </label>
                  <label className="block text-xs text-gray-400">
                    R/L/C parametrlari
                    <input
                      type="range"
                      min={5}
                      max={60}
                      step={1}
                      value={acResistance}
                      onChange={(event) => setAcResistance(Number(event.target.value))}
                      className="w-full accent-sky-500"
                    />
                    <input
                      type="range"
                      min={0.01}
                      max={0.3}
                      step={0.01}
                      value={acInductance}
                      onChange={(event) => setAcInductance(Number(event.target.value))}
                      className="w-full accent-sky-500"
                    />
                    <input
                      type="range"
                      min={0.0002}
                      max={0.005}
                      step={0.0001}
                      value={acCapacitance}
                      onChange={(event) => setAcCapacitance(Number(event.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </label>
                </div>
              )}

              {activeMode === "safety" && (
                <div className="space-y-3">
                  <label className="block text-xs text-gray-400">
                    Maksimal tok (A)
                    <input
                      type="range"
                      min={0.5}
                      max={5}
                      step={0.1}
                      value={maxSafeCurrent}
                      onChange={(event) => setMaxSafeCurrent(Number(event.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </label>
                  <label className="block text-xs text-gray-400">
                    Maksimal quvvat (W)
                    <input
                      type="range"
                      min={10}
                      max={80}
                      step={1}
                      value={maxSafePower}
                      onChange={(event) => setMaxSafePower(Number(event.target.value))}
                      className="w-full accent-sky-500"
                    />
                  </label>
                </div>
              )}

              {activeMode === "dc" && (
                <div className="text-xs text-gray-400">
                  DC zanjirlar: komponentlarni sudrab joylashtiring, terminal tugunlarini bog'lab simulatsiyani kuzating.
                </div>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 h-[220px]">
              <h3 className="text-sm font-semibold text-white mb-2">Signal grafigi</h3>
              <div className="h-[170px]">
                <WaveformChart
                  labels={waveformData.labels}
                  voltage={waveformData.voltage}
                  current={waveformData.current}
                  phaseVoltages={waveformData.phaseVoltages}
                />
              </div>
            </div>
          </div>
        </div>

        <LabInspector
          mode={activeMode}
          selectedComponent={selectedComponent}
          solution={circuitSolution}
          onUpdateParam={handleUpdateParam}
          metrics={metrics}
        />
      </section>
    </main>
  );
}
