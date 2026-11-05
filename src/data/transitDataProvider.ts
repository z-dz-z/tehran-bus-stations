import type { TransitData } from '../types';

let cachedData: TransitData | null = null;
let cachedGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> | null = null;

export async function loadTransitData(): Promise<{
  data: TransitData;
  geoJson: GeoJSON.FeatureCollection<GeoJSON.Point>;
}> {
  if (cachedData && cachedGeoJSON) {
    return { data: cachedData, geoJson: cachedGeoJSON };
  }

  // Load from relative URL for GitHub Pages / PWA compatibility
  const response = await fetch('./data/transit-data.json');
  if (!response.ok) {
    throw new Error(`Failed to load transit data: HTTP ${response.status}`);
  }

  const data: TransitData = await response.json();
  cachedData = data;

  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  for (const [codeStr, station] of Object.entries(data.stations)) {
    const code = Number(codeStr);
    const [name, lon, lat, address] = station;
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lon, lat],
      },
      properties: {
        code,
        name,
        address,
      },
    });
  }

  cachedGeoJSON = {
    type: 'FeatureCollection',
    features,
  };

  return { data, geoJson: cachedGeoJSON };
}
