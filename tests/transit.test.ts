import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { toPersianDigits, toEnglishDigits, formatETA } from '../src/utils/format';
import { fetchBusStopETA, fetchStationTimetable } from '../src/api/transitApi';

describe('Format Utilities', () => {
  it('converts English digits to Persian digits correctly', () => {
    expect(toPersianDigits(1001)).toBe('۱۰۰۱');
    expect(toPersianDigits('301-82')).toBe('۳۰۱-۸۲');
    expect(toPersianDigits(null)).toBe('');
    expect(toPersianDigits(undefined)).toBe('');
  });

  it('normalizes Persian and Arabic digits to English digits for search', () => {
    expect(toEnglishDigits('۱۰۰۱')).toBe('1001');
    expect(toEnglishDigits('۳۰۱')).toBe('301');
    expect(toEnglishDigits('١٢٣٤')).toBe('1234');
    expect(toEnglishDigits('ایستگاه ۱۰۱')).toBe('ایستگاه 101');
  });

  it('formats ETA values accurately', () => {
    const arriving = formatETA(1);
    expect(arriving.status).toBe('arriving');
    expect(arriving.displayText).toBe('در حال ورود به ایستگاه');

    const approaching = formatETA(4);
    expect(approaching.status).toBe('approaching');
    expect(approaching.displayText).toBe('۴ دقیقه دیگر');

    const far = formatETA(12);
    expect(far.status).toBe('far');
    expect(far.displayText).toBe('۱۲ دقیقه دیگر');

    const fallbackText = formatETA(null, 'بیش از 14 دقیقه');
    expect(fallbackText.status).toBe('far');
    expect(fallbackText.displayText).toBe('بیش از ۱۴ دقیقه');

    const none = formatETA(null);
    expect(none.status).toBe('none');
    expect(none.displayText).toBe('اطلاعات در دسترس نیست');
  });
});

describe('Static Transit Data Validation', () => {
  const jsonPath = path.resolve(__dirname, '../public/data/transit-data.json');

  it('verifies transit-data.json exists and is valid JSON', () => {
    expect(fs.existsSync(jsonPath)).toBe(true);
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(raw);

    expect(data).toHaveProperty('stations');
    expect(data).toHaveProperty('routes');
    expect(data).toHaveProperty('stationRoutes');
    expect(data).toHaveProperty('routeStations');

    const stationKeys = Object.keys(data.stations);
    expect(stationKeys.length).toBe(4759);

    const routeKeys = Object.keys(data.routes);
    expect(routeKeys.length).toBe(474);

    // Verify sample station
    const st1001 = data.stations['1001'];
    expect(st1001).toBeDefined();
    expect(st1001[0]).toBe('بلوار ارتش');
    expect(typeof st1001[1]).toBe('number'); // lon
    expect(typeof st1001[2]).toBe('number'); // lat

    // Verify sample route
    const sampleRoute = data.routes[routeKeys[0]];
    expect(sampleRoute).toBeDefined();
    expect(sampleRoute).toHaveProperty('code');
    expect(sampleRoute).toHaveProperty('dir');
    expect(sampleRoute).toHaveProperty('path');
    expect(Array.isArray(sampleRoute.path)).toBe(true);
    if (sampleRoute.path.length > 0) {
      expect(sampleRoute.path[0].length).toBe(2);
    }
  });
});

describe('Live Transit API Integration', () => {
  it('fetches live BusStopETA for station 1001', async () => {
    const routes = await fetchBusStopETA(1001);
    expect(Array.isArray(routes)).toBe(true);
    // Even if no active buses running right now, API should return an array without throwing
    if (routes.length > 0) {
      expect(routes[0]).toHaveProperty('RouteCode');
      expect(routes[0]).toHaveProperty('Details');
    }
  });

  it('fetches BusStationStaticTimeTable for station 1001', async () => {
    const timetable = await fetchStationTimetable(1001, 301, '82');
    if (timetable) {
      expect(timetable).toHaveProperty('CurrentDayType');
      expect(timetable).toHaveProperty('Normal');
      expect(timetable).toHaveProperty('HalfHoliday');
      expect(timetable).toHaveProperty('Holiday');
    }
  });
});
