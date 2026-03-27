export const calculateDriftVelocity = (
  mobility: number,
  electricField: number
) => mobility * electricField;

export const calculateCurrentDensity = (
  chargeDensity: number,
  mobility: number,
  electricField: number
) => chargeDensity * mobility * electricField;
