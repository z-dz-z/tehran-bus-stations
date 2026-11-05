import { describe, it, expect } from 'vitest';
import { findClosestStation, getHitRadius } from '../src/utils/mapHitTest';

describe('Map Fat-Finger Hit Testing', () => {
  const mockProject = (coords: [number, number]) => ({
    x: coords[0] * 10,
    y: coords[1] * 10,
  });

  const createStationFeature = (code: number, screenX: number, screenY: number, name = 'ایستگاه'): GeoJSON.Feature => ({
    type: 'Feature',
    properties: {
      code,
      name,
    },
    geometry: {
      type: 'Point',
      coordinates: [screenX / 10, screenY / 10],
    },
  });

  it('selects station on a direct hit', () => {
    const feature = createStationFeature(1001, 100, 200);
    const tap = { x: 100, y: 200 };

    const result = findClosestStation(tap, [feature], mockProject, 28);
    expect(result).not.toBeNull();
    expect(result?.code).toBe(1001);
    expect(result?.dist).toBe(0);
  });

  it('selects station on an off-center fat-finger touch within 28px radius', () => {
    // Tap is 15px to the right and 10px below the station (hypot ~18px)
    const feature = createStationFeature(1001, 100, 200);
    const tap = { x: 115, y: 210 };

    const result = findClosestStation(tap, [feature], mockProject, 28);
    expect(result).not.toBeNull();
    expect(result?.code).toBe(1001);
    expect(result?.dist).toBeCloseTo(18.027, 2);
  });

  it('ignores station when tap is outside the hit radius', () => {
    // Tap is 35px away
    const feature = createStationFeature(1001, 100, 200);
    const tap = { x: 135, y: 200 };

    const result = findClosestStation(tap, [feature], mockProject, 28);
    expect(result).toBeNull();
  });

  it('disambiguates between multiple stations and picks the closest one', () => {
    const stationA = createStationFeature(1001, 100, 100); // 8px away
    const stationB = createStationFeature(1002, 120, 100); // 12px away
    const tap = { x: 108, y: 100 };

    const result = findClosestStation(tap, [stationB, stationA], mockProject, 28);
    expect(result).not.toBeNull();
    expect(result?.code).toBe(1001);
    expect(result?.dist).toBe(8);
  });

  it('handles duplicate features for the same station code gracefully', () => {
    const feature1 = createStationFeature(1001, 100, 100);
    const feature2 = createStationFeature(1001, 100, 100);
    const tap = { x: 105, y: 100 };

    const result = findClosestStation(tap, [feature1, feature2], mockProject, 28);
    expect(result).not.toBeNull();
    expect(result?.code).toBe(1001);
    expect(result?.dist).toBe(5);
  });

  it('safely skips features with missing or invalid code', () => {
    const invalidFeature: GeoJSON.Feature = {
      type: 'Feature',
      properties: { name: 'Invalid' },
      geometry: { type: 'Point', coordinates: [10, 10] },
    };
    const validFeature = createStationFeature(2002, 100, 100);
    const tap = { x: 100, y: 100 };

    const result = findClosestStation(tap, [invalidFeature, validFeature], mockProject, 28);
    expect(result).not.toBeNull();
    expect(result?.code).toBe(2002);
  });

  it('returns null for empty candidate array', () => {
    const result = findClosestStation({ x: 50, y: 50 }, [], mockProject, 28);
    expect(result).toBeNull();
  });

  describe('getHitRadius', () => {
    it('returns 28 for touch pointer event', () => {
      const radius = getHitRadius({ pointerType: 'touch' });
      expect(radius).toBe(28);
    });

    it('returns 28 for touchstart/touchend event', () => {
      const radius = getHitRadius({ type: 'touchend' });
      expect(radius).toBe(28);
    });

    it('returns 22 for mouse pointer event', () => {
      const radius = getHitRadius({ pointerType: 'mouse' });
      expect(radius).toBe(22);
    });

    it('returns default 22 when event is undefined', () => {
      const radius = getHitRadius(undefined);
      expect(radius).toBe(22);
    });
  });
});

