import { Charge, FieldLine, Vec3 } from "../types";

// Coulomb constant (N·m²/C²).
const K = 8.9875517923e9;

export const calculateCoulombForce = (
  charges: Charge[],
  dielectricConstant = 1
) => {
  if (charges.length < 2) {
    return {
      force: { x: 0, y: 0, z: 0 },
      magnitude: 0,
      distance: 0,
      potential: 0,
      fieldStrength: 0,
    };
  }
  const [a, b] = charges;
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  const dz = b.position.z - a.position.z;
  const distance = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 0.1);
  const effectiveK = K / Math.max(dielectricConstant, 0.2);
  const magnitude = (effectiveK * a.value * b.value) / (distance * distance);
  const potential = (effectiveK * a.value) / distance;
  const fieldStrength =
    Math.abs(b.value) > 0 ? Math.abs(magnitude / b.value) : 0;
  const direction = { x: dx / distance, y: dy / distance, z: dz / distance };
  return {
    force: {
      x: direction.x * magnitude,
      y: direction.y * magnitude,
      z: direction.z * magnitude,
    },
    magnitude,
    distance,
    potential,
    fieldStrength,
  };
};

export const generateFieldLines = (charges: Charge[]): FieldLine[] => {
  const lines: FieldLine[] = [];
  charges.forEach((charge) => {
    const lineCount = 12;
    for (let i = 0; i < lineCount; i += 1) {
      const angle = (i / lineCount) * Math.PI * 2;
      const points: Vec3[] = [];
      for (let step = 0; step <= 20; step += 1) {
        const radius = 0.3 + step * 0.12;
        const sign = charge.value >= 0 ? 1 : -1;
        points.push({
          x: charge.position.x + Math.cos(angle) * radius * sign,
          y: charge.position.y + 0.1 * step * sign,
          z: charge.position.z + Math.sin(angle) * radius * sign,
        });
      }
      lines.push({ id: `${charge.id}-${i}`, points });
    }
  });
  return lines;
};
