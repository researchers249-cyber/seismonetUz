export const calculateReactance = (
  frequency: number,
  inductance: number,
  capacitance: number
) => {
  const xl = 2 * Math.PI * frequency * inductance;
  const xc = capacitance > 0 ? 1 / (2 * Math.PI * frequency * capacitance) : 0;
  return { xl, xc, net: xl - xc };
};

export const calculateImpedance = (resistance: number, reactance: number) =>
  Math.sqrt(resistance * resistance + reactance * reactance);

export const calculatePhaseAngle = (resistance: number, reactance: number) =>
  Math.atan2(reactance, resistance) * (180 / Math.PI);
