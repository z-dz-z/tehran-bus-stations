import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { TransitData, RouteData } from './types';
import { loadTransitData } from './data/transitDataProvider';
import { fetchBusStopETA } from './api/transitApi';
import { useFavorites } from './hooks/useFavorites';
import TransitMap, { type TransitMapHandle } from './components/TransitMap';
import { SearchOverlay } from './components/SearchOverlay';
import { FavoritesBar } from './components/FavoritesBar';
import { MapControls } from './components/MapControls';
import { StationSheet } from './components/StationSheet';
import { TimetableModal } from './components/TimetableModal';
import { Bus, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const mapRef = useRef<TransitMapHandle>(null);

  // Core Data
  const [transitData, setTransitData] = useState<TransitData | null>(null);
  const [stationsGeoJson, setStationsGeoJson] = useState<GeoJSON.FeatureCollection<GeoJSON.Point> | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Selection State
  const [selectedStationCode, setSelectedStationCode] = useState<number | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteData | null>(null);
  const [isSheetMinimized, setIsSheetMinimized] = useState(false);

  // Live ETA State
  const [etaDataMap, setEtaDataMap] = useState<Record<string, any>>({});
  const [isLoadingETA, setIsLoadingETA] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Modals
  const [timetableRoute, setTimetableRoute] = useState<RouteData | null>(null);

  // Favorites Hook
  const { favorites, isFavorite, toggleFavorite, removeFavorite } = useFavorites();

  // Load static transit data on mount
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        setInitialLoading(true);
        const { data, geoJson } = await loadTransitData();
        if (!mounted) return;
        setTransitData(data);
        setStationsGeoJson(geoJson);
        setInitialLoading(false);
      } catch (err: any) {
        if (!mounted) return;
        console.error('Failed to load transit data:', err);
        setLoadError(err.message || 'خطا در بارگذاری اطلاعات حمل‌ونقل');
        setInitialLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  // Compute routes passing through currently selected station
  const stationRoutes = useMemo<RouteData[]>(() => {
    if (!transitData || selectedStationCode === null) return [];

    const routeIds = transitData.stationRoutes[String(selectedStationCode)] || [];
    const localRoutes: RouteData[] = [];
    const seenIds = new Set<number>();

    for (const rid of routeIds) {
      const rt = transitData.routes[String(rid)];
      if (rt && !seenIds.has(rt.id)) {
        seenIds.add(rt.id);
        localRoutes.push(rt);
      }
    }

    // Edge Case: If ETA returned a RouteCode not in stationRoutes, append it
    for (const codeStr of Object.keys(etaDataMap)) {
      const rCode = Number(codeStr);
      const alreadyHas = localRoutes.some((r) => r.code === rCode);
      if (!alreadyHas) {
        // Find route with this code in transitData.routes
        for (const rt of Object.values(transitData.routes)) {
          if (rt.code === rCode && !seenIds.has(rt.id)) {
            seenIds.add(rt.id);
            localRoutes.push(rt);
            break;
          }
        }
      }
    }

    return localRoutes;
  }, [transitData, selectedStationCode, etaDataMap]);

  // Compute station codes belonging to the active route for dimming other stations
  const activeRouteStationCodes = useMemo<number[]>(() => {
    if (!transitData || !activeRoute) return [];
    return transitData.routeStations[String(activeRoute.id)] || [];
  }, [transitData, activeRoute]);

  // Handle URL query parameters syncing
  const syncUrlParams = useCallback((stationCode: number | null, routeCode?: number | null) => {
    const url = new URL(window.location.href);
    if (stationCode !== null) {
      url.searchParams.set('stop', String(stationCode));
      if (routeCode !== undefined && routeCode !== null) {
        url.searchParams.set('route', String(routeCode));
      } else {
        url.searchParams.delete('route');
      }
    } else {
      url.searchParams.delete('stop');
      url.searchParams.delete('route');
    }
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Fetch Live ETA for a station
  const fetchETA = useCallback(
    async (stationCode: number, signal?: AbortSignal) => {
      setIsLoadingETA(true);
      try {
        const routesEta = await fetchBusStopETA(stationCode, signal);
        const map: Record<string, any> = {};
        for (const r of routesEta) {
          map[String(r.RouteCode)] = r;
        }
        setEtaDataMap(map);
        setLastUpdated(new Date());
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('ETA fetch error:', err);
        }
      } finally {
        setIsLoadingETA(false);
      }
    },
    []
  );

  // Station Selection Trigger
  const handleSelectStation = useCallback(
    (stationCode: number, targetRouteCode?: number) => {
      setSelectedStationCode(stationCode);
      setIsSheetMinimized(false);

      if (!transitData) return;

      const station = transitData.stations[String(stationCode)];
      if (station) {
        mapRef.current?.flyToStation(station[1], station[2]);
      }

      // Find routes for this station
      const rIds = transitData.stationRoutes[String(stationCode)] || [];
      const routes = rIds
        .map((id) => transitData.routes[String(id)])
        .filter(Boolean);

      let targetRoute: RouteData | null = null;
      if (targetRouteCode) {
        targetRoute = routes.find((r) => r.code === targetRouteCode) || null;
        if (!targetRoute) {
          targetRoute = Object.values(transitData.routes).find((r) => r.code === targetRouteCode) || null;
        }
      }
      if (!targetRoute && routes.length > 0) {
        targetRoute = routes[0];
      }

      setActiveRoute(targetRoute);
      syncUrlParams(stationCode, targetRoute?.code);
    },
    [transitData, syncUrlParams, fetchETA]
  );

  // Auto-refresh ETA every 20 seconds while station is selected, plus on tab focus/visibility
  useEffect(() => {
    if (selectedStationCode === null) return;

    let controller = new AbortController();
    fetchETA(selectedStationCode, controller.signal);

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchETA(selectedStationCode);
      }
    }, 20000);

    const handleVisibility = () => {
      if (!document.hidden && selectedStationCode !== null) {
        fetchETA(selectedStationCode);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      controller.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [selectedStationCode, fetchETA]);

  // Handle URL deep link on initial data load
  useEffect(() => {
    if (!transitData || initialLoading) return;

    const params = new URLSearchParams(window.location.search);
    const stopParam = params.get('stop');
    const routeParam = params.get('route');

    if (stopParam && transitData.stations[stopParam]) {
      const code = Number(stopParam);
      const targetRouteCode = routeParam ? Number(routeParam) : undefined;
      // Delay slightly so map initializes
      setTimeout(() => {
        handleSelectStation(code, targetRouteCode);
      }, 350);
    }
  }, [transitData, initialLoading, handleSelectStation]);

  // Route Selection Trigger
  const handleSelectRoute = useCallback(
    (route: RouteData) => {
      setActiveRoute(route);
      if (selectedStationCode !== null) {
        syncUrlParams(selectedStationCode, route.code);
      } else if (transitData) {
        // If no station was selected, find first station of this route
        const stationsOnRoute = transitData.routeStations[String(route.id)] || [];
        if (stationsOnRoute.length > 0) {
          const firstStCode = stationsOnRoute[0];
          handleSelectStation(firstStCode, route.code);
        }
        if (route.path.length > 0) {
          mapRef.current?.fitRouteBounds(route.path);
        }
      }
    },
    [selectedStationCode, syncUrlParams, transitData, handleSelectStation]
  );

  // Close Station Sheet
  const handleCloseStation = useCallback(() => {
    setSelectedStationCode(null);
    setActiveRoute(null);
    setIsSheetMinimized(false);
    setEtaDataMap({});
    setLastUpdated(null);
    syncUrlParams(null);
  }, [syncUrlParams]);

  // Selected station metadata
  const selectedStationInfo = useMemo(() => {
    if (!transitData || selectedStationCode === null) return null;
    const st = transitData.stations[String(selectedStationCode)];
    if (!st) return null;
    return {
      code: selectedStationCode,
      name: st[0],
      lon: st[1],
      lat: st[2],
      address: st[3],
    };
  }, [transitData, selectedStationCode]);

  // Handle favorite toggle from card
  const handleToggleFavorite = (
    stCode: number,
    rtCode: number,
    destName: string
  ) => {
    const stName = selectedStationInfo?.name || `ایستگاه ${stCode}`;
    toggleFavorite({
      stationCode: stCode,
      routeCode: rtCode,
      stationName: stName,
      destName,
    });
  };

  // Handle favorite chip click
  const handleSelectFavorite = (fav: { stationCode: number; routeCode: number }) => {
    handleSelectStation(fav.stationCode, fav.routeCode);
  };

  if (initialLoading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30 animate-bounce">
            <Bus className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-xl font-bold mb-2">اتوبوس تهران</h1>
        <p className="text-xs text-slate-400 mb-6 font-medium">
          در حال بارگذاری اطلاعات ایستگاه‌ها و خطوط...
        </p>
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h1 className="text-lg font-bold mb-2">خطا در بارگذاری نقشه</h1>
        <p className="text-xs text-slate-400 mb-6 max-w-sm">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          تلاش دوباره
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-slate-100">
      {/* Background Interactive WebGL Map */}
      <div className="absolute inset-0 z-0">
        <TransitMap
          ref={mapRef}
          stationsGeoJson={stationsGeoJson}
          selectedStationCode={selectedStationCode}
          activeRoute={activeRoute}
          activeRouteStationCodes={activeRouteStationCodes}
          onSelectStation={(code) => handleSelectStation(code)}
        />
      </div>

      {/* Top Floating Overlay (Search & Favorites) */}
      <div className="absolute top-0 inset-x-0 z-20 p-3 sm:p-4 max-w-xl mx-auto w-full pointer-events-none flex flex-col gap-2">
        <div className="pointer-events-auto">
          <SearchOverlay
            transitData={transitData}
            onSelectStation={(code) => handleSelectStation(code)}
            onSelectRoute={(rt) => handleSelectRoute(rt)}
            onOpenChange={(open) => {
              if (open && selectedStationCode !== null) {
                setIsSheetMinimized(true);
              }
            }}
          />
        </div>

        <div className="pointer-events-auto">
          <FavoritesBar
            favorites={favorites}
            onSelectFavorite={handleSelectFavorite}
            onRemoveFavorite={removeFavorite}
          />
        </div>
      </div>

      {/* Floating Map Controls (Right Side / Left Side) */}
      <div
        className={`absolute left-3 sm:left-4 z-20 pointer-events-none transition-all duration-300 ${
          selectedStationInfo
            ? isSheetMinimized
              ? 'bottom-20 sm:bottom-24'
              : 'bottom-[calc(55vh+1rem)] sm:bottom-[calc(45vh+1rem)]'
            : 'bottom-6 sm:bottom-8'
        }`}
      >
        <MapControls
          onLocateUser={(lon, lat) => mapRef.current?.flyToUserLocation(lon, lat)}
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onResetNorth={() => mapRef.current?.resetNorth()}
        />
      </div>

      {/* Bottom Station Sheet */}
      {selectedStationInfo && (
        <div className="absolute bottom-0 inset-x-0 z-30 pointer-events-none">
          <StationSheet
            stationCode={selectedStationInfo.code}
            stationName={selectedStationInfo.name}
            stationAddress={selectedStationInfo.address}
            routes={stationRoutes}
            activeRoute={activeRoute}
            etaDataMap={etaDataMap}
            isLoadingETA={isLoadingETA}
            onSelectRoute={(rt) => handleSelectRoute(rt)}
            onClose={handleCloseStation}
            onRefreshETA={() => fetchETA(selectedStationInfo.code)}
            isFavorite={isFavorite}
            onToggleFavorite={handleToggleFavorite}
            onOpenTimetable={(rt) => setTimetableRoute(rt)}
            onFitRoute={(rt) => mapRef.current?.fitRouteBounds(rt.path)}
            lastUpdated={lastUpdated}
            isMinimized={isSheetMinimized}
            onToggleMinimize={setIsSheetMinimized}
          />
        </div>
      )}

      {/* Timetable Modal */}
      {timetableRoute && selectedStationInfo && (
        <TimetableModal
          stationCode={selectedStationInfo.code}
          stationName={selectedStationInfo.name}
          route={timetableRoute}
          onClose={() => setTimetableRoute(null)}
        />
      )}
    </div>
  );
};

export default App;
