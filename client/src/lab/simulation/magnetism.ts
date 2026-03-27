import { Vec3 } from "../types";

export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

export const calculateLorentzForce = (
  charge: number,
  velocity: Vec3,
  magneticField: Vec3
) => {
  const vxB = cross(velocity, magneticField);
  return {
    x: charge * vxB.x,
    y: charge * vxB.y,
    z: charge * vxB.z,
  };
};

export const calculateInducedEmf = (
  turns: number,
  area: number,
  deltaB: number,
  deltaT: number
) => {
  if (deltaT === 0) {
    return 0;
  }
  return -turns * area * (deltaB / deltaT);
};

export const generateMagneticLoops = (radius: number, count: number) => {
  const loops: Vec3[][] = [];
  for (let i = 0; i < count; i += 1) {
    const points: Vec3[] = [];
    const offset = (i - count / 2) * 0.3;
    for (let step = 0; step <= 40; step += 1) {
      const angle = (step / 40) * Math.PI * 2;
      points.push({
        x: Math.cos(angle) * radius,
        y: offset,
        z: Math.sin(angle) * radius,
      });
    }
    loops.push(points);
  }
  return loops;
};
