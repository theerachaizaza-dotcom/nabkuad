export type CountMode = 'fractional' | 'unit';

export interface NormalizedCount {
  fullBottles: number;
  leftoverMl: number;
  netBottles: number;
}

export function normalizeCount(
  fullBottles: number,
  leftoverMl: number,
  capacityMl: number,
  countMode: CountMode
): NormalizedCount {
  if (!Number.isInteger(fullBottles) || fullBottles < 0) {
    throw new Error('fullBottles must be an integer >= 0');
  }

  if (!Number.isInteger(leftoverMl) || leftoverMl < 0) {
    throw new Error('leftoverMl must be an integer >= 0');
  }

  if (!Number.isInteger(capacityMl) || capacityMl <= 0) {
    throw new Error('capacityMl must be an integer > 0');
  }

  if (countMode === 'unit') {
    return {
      fullBottles: fullBottles + Math.floor(leftoverMl / capacityMl),
      leftoverMl: 0,
      netBottles: fullBottles + Math.floor(leftoverMl / capacityMl),
    };
  }

  const extraFull = Math.floor(leftoverMl / capacityMl);
  const normalizedLeftover = leftoverMl % capacityMl;
  const normalizedFull = fullBottles + extraFull;
  const netBottles = normalizedFull + normalizedLeftover / capacityMl;

  return {
    fullBottles: normalizedFull,
    leftoverMl: normalizedLeftover,
    netBottles,
  };
}
