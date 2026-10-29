/**
 * Independent block-count estimate for one elevation.
 *
 * SAM gives an instance count, but a missed or merged block silently lowers it.
 * The wall mask area divided by one block's face (plus its mortar joint) gives a
 * second estimate that doesn't depend on every block being found. If the two
 * disagree, the elevation goes to review instead of counting toward a milestone.
 */

// 450 x 225 mm sandcrete face with ~10-12 mm joints → (462 x 237) / (450 x 225).
export const MORTAR_FACTOR = 1.08;
export const AGREEMENT_TOLERANCE = 0.12;

export type CrossCheck = {
  instanceCount: number;
  areaEstimate: number | null;
  medianBlockArea: number | null;
  deviation: number | null;
  agrees: boolean;
};

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function crossCheck(blockAreas: number[], wallArea: number): CrossCheck {
  const instanceCount = blockAreas.length;
  const medianBlockArea = median(blockAreas);
  if (!medianBlockArea || wallArea <= 0) {
    return { instanceCount, areaEstimate: null, medianBlockArea, deviation: null, agrees: false };
  }
  const areaEstimate = Math.round(wallArea / (medianBlockArea * MORTAR_FACTOR));
  const deviation = Math.abs(instanceCount - areaEstimate) / Math.max(areaEstimate, 1);
  return {
    instanceCount,
    areaEstimate,
    medianBlockArea,
    deviation,
    agrees: deviation <= AGREEMENT_TOLERANCE,
  };
}
