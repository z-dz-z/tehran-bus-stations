import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import maplibregl, { type Map, type GeoJSONSource } from 'maplibre-gl';
import type { RouteData } from '../types';

export interface TransitMapHandle {
  flyToStation: (lon: number, lat: number, zoom?: number) => void;
  flyToUserLocation: (lon: number, lat: number) => void;
  fitRouteBounds: (coordinates: [number, number][]) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetNorth: () => void;
  getMap: () => Map | null;
}

interface TransitMapProps {
  stationsGeoJson: GeoJSON.FeatureCollection<GeoJSON.Point> | null;
  selectedStationCode: number | null;
  activeRoute: RouteData | null;
  activeRouteStationCodes: number[];
  onSelectStation: (stationCode: number) => void;
}

const TransitMap = forwardRef<TransitMapHandle, TransitMapProps>(
  (
    {
      stationsGeoJson,
      selectedStationCode,
      activeRoute,
      activeRouteStationCodes,
      onSelectStation,
    },
    ref
  ) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<Map | null>(null);
    const userMarkerRef = useRef<maplibregl.Marker | null>(null);
    const hoverPopupRef = useRef<maplibregl.Popup | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    // Keep reference to latest callback to avoid stale closures in event listeners
    const onSelectStationRef = useRef(onSelectStation);
    useEffect(() => {
      onSelectStationRef.current = onSelectStation;
    }, [onSelectStation]);

    // Initialize RTL plugin if not already done
    useEffect(() => {
      try {
        const status = maplibregl.getRTLTextPluginStatus();
        if (status === 'unavailable') {
          const localPluginUrl = new URL('./mapbox-gl-rtl-text.js', window.location.href).href;
          maplibregl.setRTLTextPlugin(localPluginUrl, true);
        }
      } catch (e) {
        console.warn('MapLibre RTL plugin setup issue:', e);
      }
    }, []);

    // Expose map control methods to parent component
    useImperativeHandle(ref, () => ({
      flyToStation: (lon: number, lat: number, zoom = 15.5) => {
        if (!mapRef.current) return;
        mapRef.current.easeTo({
          center: [lon, lat],
          zoom,
          duration: 900,
          padding: { top: 70, bottom: 270, left: 20, right: 20 },
        });
      },
      flyToUserLocation: (lon: number, lat: number) => {
        if (!mapRef.current) return;

        if (!userMarkerRef.current) {
          const el = document.createElement('div');
          el.className = 'relative flex items-center justify-center';
          el.innerHTML = `
            <div class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></div>
            <div class="relative w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg"></div>
          `;
          userMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([lon, lat])
            .addTo(mapRef.current);
        } else {
          userMarkerRef.current.setLngLat([lon, lat]);
        }

        mapRef.current.flyTo({
          center: [lon, lat],
          zoom: 15.5,
          duration: 1200,
        });
      },
      fitRouteBounds: (coordinates: [number, number][]) => {
        if (!mapRef.current || coordinates.length === 0) return;
        const bounds = new maplibregl.LngLatBounds(coordinates[0], coordinates[0]);
        for (const coord of coordinates) {
          bounds.extend(coord);
        }
        mapRef.current.fitBounds(bounds, {
          padding: { top: 90, bottom: 290, left: 40, right: 40 },
          maxZoom: 16,
          duration: 1100,
        });
      },
      zoomIn: () => {
        mapRef.current?.zoomIn({ duration: 300 });
      },
      zoomOut: () => {
        mapRef.current?.zoomOut({ duration: 300 });
      },
      resetNorth: () => {
        mapRef.current?.resetNorth({ duration: 500 });
      },
      getMap: () => mapRef.current,
    }));

    // Initialize Map
    useEffect(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [51.389, 35.6892],
        zoom: 13.5,
        minZoom: 10,
        maxZoom: 19,
        attributionControl: false,
      });

      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution: '© OpenFreeMap / OpenStreetMap / NEDA BusETA',
        }),
        'bottom-left'
      );

      mapRef.current = map;

      hoverPopupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
        anchor: 'bottom',
      });

      map.on('load', () => {
        // 1. Add active route source
        map.addSource('active-route-source', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });

        // 2. Add stations source
        map.addSource('stations-source', {
          type: 'geojson',
          data: stationsGeoJson || {
            type: 'FeatureCollection',
            features: [],
          },
        });

        // 3. Active route casing (dark emerald)
        map.addLayer({
          id: 'active-route-casing',
          type: 'line',
          source: 'active-route-source',
          paint: {
            'line-color': '#065f46',
            'line-width': 8,
            'line-opacity': 0.85,
          },
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
        });

        // 4. Active route line (bright green)
        map.addLayer({
          id: 'active-route-line',
          type: 'line',
          source: 'active-route-source',
          paint: {
            'line-color': '#10b981',
            'line-width': 5,
            'line-opacity': 0.95,
          },
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
        });

        // 5. Stations circles
        map.addLayer({
          id: 'stations-circle',
          type: 'circle',
          source: 'stations-source',
          minzoom: 11.5,
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              11.5,
              2.5,
              13,
              5,
              15,
              7.5,
            ],
            'circle-color': '#f97316',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1.5,
            'circle-opacity': 1.0,
            'circle-stroke-opacity': 1.0,
          },
        });

        // Interactions: Click on station circle
        map.on('click', 'stations-circle', (e) => {
          if (!e.features || e.features.length === 0) return;
          const feat = e.features[0];
          const code = feat.properties?.code;
          if (typeof code === 'number') {
            onSelectStationRef.current(code);
            const geom = feat.geometry as GeoJSON.Point;
            if (map.getZoom() < 14 && geom?.coordinates) {
              map.easeTo({
                center: [geom.coordinates[0], geom.coordinates[1]],
                zoom: 14.8,
                duration: 600,
                padding: { top: 70, bottom: 270, left: 20, right: 20 },
              });
            }
          }
        });

        // Cursor style & hover popup
        map.on('mouseenter', 'stations-circle', (e) => {
          map.getCanvas().style.cursor = 'pointer';
          if (e.features && e.features[0] && hoverPopupRef.current) {
            const feat = e.features[0];
            const name = feat.properties?.name || '';
            const code = feat.properties?.code || '';
            const geom = feat.geometry as GeoJSON.Point;
            if (geom?.coordinates) {
              hoverPopupRef.current
                .setLngLat(geom.coordinates as [number, number])
                .setHTML(
                  `<div class="text-xs font-semibold text-slate-800">${name}</div><div class="text-[11px] text-slate-500 font-mono mt-0.5">کد: ${code}</div>`
                )
                .addTo(map);
            }
          }
        });

        map.on('mouseleave', 'stations-circle', () => {
          map.getCanvas().style.cursor = '';
          hoverPopupRef.current?.remove();
        });

        setMapLoaded(true);
      });

      return () => {
        hoverPopupRef.current?.remove();
        userMarkerRef.current?.remove();
        map.remove();
        mapRef.current = null;
        setMapLoaded(false);
      };
    }, [stationsGeoJson]);

    // Update stations GeoJSON source if it arrived after map load
    useEffect(() => {
      if (!mapLoaded) return;
      const map = mapRef.current;
      if (!map || !stationsGeoJson) return;

      const source = map.getSource('stations-source') as GeoJSONSource | undefined;
      if (source) {
        source.setData(stationsGeoJson);
      }
    }, [mapLoaded, stationsGeoJson]);

    // Update active route geometry
    useEffect(() => {
      if (!mapLoaded) return;
      const map = mapRef.current;
      if (!map) return;

      const source = map.getSource('active-route-source') as GeoJSONSource | undefined;
      if (!source) return;

      if (activeRoute && activeRoute.path.length > 0) {
        source.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: activeRoute.path,
              },
              properties: {},
            },
          ],
        });
      } else {
        source.setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
    }, [mapLoaded, activeRoute]);

    // Update station circle paint properties for selected station and route filtering
    const updateStationStyles = useCallback(() => {
      if (!mapLoaded) return;
      const map = mapRef.current;
      if (!map || !map.getLayer('stations-circle')) return;

      const selected = selectedStationCode ?? -1;
      const codeExpr = ['coalesce', ['get', 'code'], -1];

      // 1. Circle radius: selected station gets 10.5px
      map.setPaintProperty('stations-circle', 'circle-radius', [
        'case',
        ['==', codeExpr, selected],
        10.5,
        [
          'interpolate',
          ['linear'],
          ['zoom'],
          11.5,
          2.5,
          13,
          5,
          15,
          7.5,
        ],
      ]);

      // 2. Circle color: selected is blue (#2563eb), regular is orange (#f97316)
      map.setPaintProperty('stations-circle', 'circle-color', [
        'case',
        ['==', codeExpr, selected],
        '#2563eb',
        '#f97316',
      ]);

      // 3. Circle stroke width: selected gets 3px
      map.setPaintProperty('stations-circle', 'circle-stroke-width', [
        'case',
        ['==', codeExpr, selected],
        3,
        1.5,
      ]);

      // 4. Dim unrelated stations if a route is active
      if (activeRouteStationCodes && activeRouteStationCodes.length > 0) {
        const inRouteExpr = [
          'in',
          codeExpr,
          ['literal', activeRouteStationCodes],
        ];

        map.setPaintProperty('stations-circle', 'circle-opacity', [
          'case',
          ['==', codeExpr, selected],
          1.0,
          inRouteExpr,
          1.0,
          0.35,
        ]);

        map.setPaintProperty('stations-circle', 'circle-stroke-opacity', [
          'case',
          ['==', codeExpr, selected],
          1.0,
          inRouteExpr,
          1.0,
          0.35,
        ]);
      } else {
        map.setPaintProperty('stations-circle', 'circle-opacity', 1.0);
        map.setPaintProperty('stations-circle', 'circle-stroke-opacity', 1.0);
      }
    }, [mapLoaded, selectedStationCode, activeRouteStationCodes]);

    useEffect(() => {
      updateStationStyles();
    }, [updateStationStyles]);

    return (
      <div className="relative w-full h-full">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    );
  }
);

TransitMap.displayName = 'TransitMap';
export default TransitMap;
