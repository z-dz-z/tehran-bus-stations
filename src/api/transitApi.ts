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
          Direction: direction,
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
