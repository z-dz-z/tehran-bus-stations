export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ClosestStationResult {
  code: number;
  coords: [number, number];
  dist: number;
  feature: GeoJSON.Feature;
}

/**
 * Disambiguates candidate station features returned from a bounding-box query
 * by finding the one whose projected screen point is closest to the tap point.
 */
export function findClosestStation(
  tapPoint: ScreenPoint,
  candidateFeatures: GeoJSON.Feature[],
  project: (coords: [number, number]) => ScreenPoint,
  hitRadius: number
): ClosestStationResult | null {
  if (!candidateFeatures || candidateFeatures.length === 0) {
    return null;
  }

  const seenCodes = new Set<number>();
  let closest: ClosestStationResult | null = null;

  for (const feat of candidateFeatures) {
    const code = feat.properties?.code;
    if (typeof code !== 'number' || seenCodes.has(code)) continue;
    seenCodes.add(code);

    const geom = feat.geometry as GeoJSON.Point | undefined;
    if (!geom?.coordinates || !Array.isArray(geom.coordinates) || geom.coordinates.length < 2) {
      continue;
    }

    const coords = geom.coordinates as [number, number];
    const screenPt = project(coords);
    const dist = Math.hypot(screenPt.x - tapPoint.x, screenPt.y - tapPoint.y);

    if (dist <= hitRadius && (!closest || dist < closest.dist)) {
      closest = {
        code,
        coords,
        dist,
        feature: feat,
      };
    }
  }

  return closest;
}

/**
 * Determines appropriate hit-testing radius in screen pixels based on pointer type.
 * Touch interactions get 28px (~56px touch target diameter), mouse gets 22px (~44px diameter).
 */
export function getHitRadius(originalEvent?: any): number {
  const isTouch =
    originalEvent?.pointerType === 'touch' ||
    originalEvent?.type?.startsWith('touch') ||
    (typeof window !== 'undefined' && 'ontouchstart' in window && navigator.maxTouchPoints > 0);

  return isTouch ? 28 : 22;
}

