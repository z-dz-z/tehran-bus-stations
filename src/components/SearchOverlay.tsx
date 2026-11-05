import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, MapPin, Bus, ArrowLeft } from 'lucide-react';
import type { TransitData, RouteData, StationInfo } from '../types';
import { toPersianDigits, toEnglishDigits } from '../utils/format';

interface SearchOverlayProps {
  transitData: TransitData | null;
  onSelectStation: (stationCode: number) => void;
  onSelectRoute: (route: RouteData) => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  transitData,
  onSelectStation,
  onSelectRoute,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const normalizedQuery = useMemo(() => {
    return toEnglishDigits(query.trim()).toLowerCase();
  }, [query]);

  // Filter stations and routes
  const { filteredStations, filteredRoutes } = useMemo(() => {
    if (!transitData || normalizedQuery.length < 2) {
      return { filteredStations: [], filteredRoutes: [] };
    }

    const q = normalizedQuery;

    // Search Stations: max 8 results
    const stations: StationInfo[] = [];
    for (const [codeStr, station] of Object.entries(transitData.stations)) {
      const code = Number(codeStr);
      const [name, lon, lat, address] = station;
      if (
        codeStr.includes(q) ||
        name.toLowerCase().includes(q) ||
        (address && address.toLowerCase().includes(q))
      ) {
        stations.push({ code, name, lon, lat, address });
        if (stations.length >= 8) break;
      }
    }

    // Search Routes: max 8 results
    const routes: RouteData[] = [];
    const seenCodes = new Set<string>();
    for (const route of Object.values(transitData.routes)) {
      const codeStr = String(route.code);
      const key = `${route.code}-${route.dir}`;
      if (seenCodes.has(key)) continue;

      if (
        codeStr.includes(q) ||
        route.orig.toLowerCase().includes(q) ||
        route.dest.toLowerCase().includes(q)
      ) {
        seenCodes.add(key);
        routes.push(route);
        if (routes.length >= 8) break;
      }
    }

    return { filteredStations: stations, filteredRoutes: routes };
  }, [transitData, normalizedQuery]);

  const handleStationClick = (code: number) => {
    onSelectStation(code);
    setIsOpen(false);
    setQuery('');
  };

  const handleRouteClick = (route: RouteData) => {
    onSelectRoute(route);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="relative w-full">
      {/* Top Search Trigger Bar */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 w-full bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-slate-200/80 cursor-pointer transition-all hover:bg-white active:scale-[0.99] text-right"
      >
        <Search className="w-5 h-5 text-emerald-600 shrink-0" />
        <span className="text-sm text-slate-500 font-medium select-none truncate">
          جستجوی ایستگاه (نام یا کد) یا خط اتوبوس...
        </span>
      </button>

      {/* Full Modal Search Dialog */}
      {isOpen && (
        <div
          onClick={() => {
            setIsOpen(false);
            setQuery('');
          }}
          className="fixed inset-0 z-50 flex flex-col bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150 pointer-events-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-xl mx-auto rounded-b-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border-b border-slate-200"
          >
            {/* Input Bar */}
            <div className="p-3.5 border-b border-slate-100 flex items-center gap-2">
              <Search className="w-5 h-5 text-emerald-600 shrink-0 mr-1" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="نام ایستگاه، کد ایستگاه (مثلاً ۱۰۰۱) یا شماره خط..."
                className="w-full text-base font-medium text-slate-800 placeholder-slate-400 bg-transparent outline-none pr-1"
                dir="rtl"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setQuery('');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                بستن
              </button>
            </div>

            {/* Results Area */}
            <div className="overflow-y-auto p-3 space-y-4 max-h-[70vh]">
              {normalizedQuery.length < 2 && (
                <div className="py-12 text-center text-slate-400 text-sm">
                  حداقل ۲ حرف یا عدد وارد کنید تا نتایج نمایش داده شوند.
                </div>
              )}

              {normalizedQuery.length >= 2 &&
                filteredStations.length === 0 &&
                filteredRoutes.length === 0 && (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    موردی یافت نشد.
                  </div>
                )}

              {/* Station Results */}
              {filteredStations.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-400 px-2 mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    <span>ایستگاه‌ها ({toPersianDigits(filteredStations.length)})</span>
                  </div>
                  <div className="space-y-1">
                    {filteredStations.map((st) => (
                      <button
                        key={st.code}
                        onClick={() => handleStationClick(st.code)}
                        className="w-full text-right p-2.5 rounded-xl hover:bg-orange-50 transition-colors flex items-center justify-between group border border-transparent hover:border-orange-100"
                      >
                        <div className="min-w-0 pr-1">
                          <div className="font-semibold text-sm text-slate-800 group-hover:text-orange-900 truncate">
                            {st.name}
                          </div>
                          {st.address && (
                            <div className="text-xs text-slate-500 truncate mt-0.5">
                              {st.address}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 group-hover:bg-orange-100 group-hover:text-orange-800">
                            کد {toPersianDigits(st.code)}
                          </span>
                          <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-transform group-hover:-translate-x-0.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Route Results */}
              {filteredRoutes.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-400 px-2 mb-2 flex items-center gap-1.5">
                    <Bus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>خطوط اتوبوس ({toPersianDigits(filteredRoutes.length)})</span>
                  </div>
                  <div className="space-y-1">
                    {filteredRoutes.map((rt) => (
                      <button
                        key={rt.id}
                        onClick={() => handleRouteClick(rt)}
                        className="w-full text-right p-2.5 rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-between group border border-transparent hover:border-emerald-100"
                      >
                        <div className="min-w-0 pr-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shrink-0">
                              خط {toPersianDigits(rt.code)}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 truncate">
                              به سمت {rt.dest}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-1">
                            مبدأ: {rt.orig}
                          </div>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 shrink-0 transition-transform group-hover:-translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
