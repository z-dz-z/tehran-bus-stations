import type { BusStopETARoute, TimetableResponse } from '../types';

const API_BASE_URL = 'https://application2.irantracking.com/modsapi/api/PublicTransport';

export async function fetchBusStopETA(
  stationCode: string | number,
  signal?: AbortSignal
): Promise<BusStopETARoute[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/BusStopETA`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusStopCode: String(stationCode),
      }),
      signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch ETA`);
    }

    const data = await res.json();
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    console.error('Error fetching BusStopETA:', err);
    return [];
  }
}

export function normalizeDirection(dir: string | number): string {
  const s = String(dir ?? '').trim();
  const num = Number(s);
  // Replicates original Android client: (char) cursor.getInt("Direction")
  // Converts numeric ASCII code (e.g. 66 -> 'B', 82 -> 'R') to character.
  if (!isNaN(num) && num > 0) {
    return String.fromCharCode(num);
  }
  return s;
}

export async function fetchStationTimetable(
  stationCode: number,
  routeCode: number,
  direction: string,
  signal?: AbortSignal
): Promise<TimetableResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/BusStationStaticTimeTable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        StationCode: stationCode,
        Route: {
          RouteCode: routeCode,
          Direction: normalizeDirection(direction),
        },
      }),
      signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch timetable`);
    }

    const data: TimetableResponse = await res.json();
    return data;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    console.error('Error fetching BusStationStaticTimeTable:', err);
    return null;
  }
}

