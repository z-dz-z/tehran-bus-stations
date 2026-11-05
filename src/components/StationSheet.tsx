import React, { useEffect, useRef } from 'react';
import { X, MapPin, Bus } from 'lucide-react';
import type { RouteData, BusStopETARoute } from '../types';
import { BusCard } from './BusCard';
import { toPersianDigits } from '../utils/format';

interface StationSheetProps {
  stationCode: number;
  stationName: string;
  stationAddress: string;
  routes: RouteData[];
  activeRoute: RouteData | null;
  etaDataMap: Record<string, BusStopETARoute>;
  isLoadingETA: boolean;
  onSelectRoute: (route: RouteData) => void;
  onClose: () => void;
  onRefreshETA?: () => void;
  isFavorite: (stationCode: number, routeCode: number) => boolean;
  onToggleFavorite: (stationCode: number, routeCode: number, destName: string) => void;
  onOpenTimetable: (route: RouteData) => void;
  onFitRoute: (route: RouteData) => void;
  lastUpdated?: Date | null;
  isMinimized?: boolean;
  onToggleMinimize?: (minimized: boolean) => void;
}

export const StationSheet: React.FC<StationSheetProps> = ({
  stationCode,
  stationName,
  stationAddress,
  routes,
  activeRoute,
  etaDataMap,
  isLoadingETA,
  onSelectRoute,
  onClose,
  isFavorite,
  onToggleFavorite,
  onOpenTimetable,
  onFitRoute,
  isMinimized: propIsMinimized,
  onToggleMinimize,
}) => {
  const [internalMinimized, setInternalMinimized] = React.useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  const isMinimized = propIsMinimized !== undefined ? propIsMinimized : internalMinimized;

  const setMinimizedState = (minimized: boolean) => {
    setInternalMinimized(minimized);
    onToggleMinimize?.(minimized);
  };

  // Reset minimized state whenever stationCode changes
  useEffect(() => {
    setMinimizedState(false);
  }, [stationCode]);

  // Touch gesture handlers on handle / header
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchEndY - touchStartY.current;

    // Drag down (positive diff) -> minimize
    if (diff > 35 && !isMinimized) {
      setMinimizedState(true);
    }
    // Drag up (negative diff) -> expand
    else if (diff < -35 && isMinimized) {
      setMinimizedState(false);
    }
    touchStartY.current = null;
  };

  // Scroll active card into view when activeRoute changes
  useEffect(() => {
    if (isMinimized || !activeRoute || !scrollContainerRef.current) return;
    const activeEl = scrollContainerRef.current.querySelector(
      `[data-route-id="${activeRoute.id}"]`
    ) as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeRoute, isMinimized]);

  return (
    <div
      className={`w-full bg-white/95 backdrop-blur-md rounded-t-3xl shadow-2xl border-t border-slate-200/80 overflow-hidden pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col pointer-events-auto transition-all duration-300 ease-in-out ${
        isMinimized ? 'max-h-24 pt-1.5' : 'max-h-[55vh] sm:max-h-[45vh] pt-2 sm:pt-3'
      }`}
    >
      {/* Top Drag Handle Bar */}
      <button
        type="button"
        onClick={() => setMinimizedState(!isMinimized)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-label={isMinimized ? 'نمایش اطلاعات ایستگاه' : 'کوچک‌کردن پنل ایستگاه'}
        title={isMinimized ? 'برای گسترش لمس یا کلیک کنید' : 'برای بستن به پایین بکشید یا لمس کنید'}
        className="w-full pt-1.5 pb-2 flex flex-col items-center justify-center cursor-pointer group touch-none select-none focus:outline-none"
      >
        <div className="w-10 h-1.5 bg-slate-300 group-hover:bg-slate-400 rounded-full transition-colors" />
      </button>

      {/* Station Header Bar */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (isMinimized) setMinimizedState(false);
        }}
        className={`px-3.5 sm:px-6 flex items-center justify-between gap-2 border-b border-slate-100 pb-2 shrink-0 ${
          isMinimized ? 'cursor-pointer select-none border-b-0' : ''
        }`}
      >
        <div className="min-w-0 pr-0.5">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
            <h1 className="text-sm sm:text-base font-black text-slate-800 truncate">
              {stationName}
            </h1>
            <span className="text-[11px] font-mono font-bold bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-md shrink-0">
              کد {toPersianDigits(stationCode)}
            </span>
            <span
              title="به‌روزرسانی زنده خودکار هر ۲۰ ثانیه"
              className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0"
            >
              <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isLoadingETA ? 'animate-ping' : 'animate-pulse'}`} />
              زنده
            </span>
          </div>
          {stationAddress && !isMinimized && (
            <p className="text-[11px] text-slate-500 truncate mt-0.5 pr-5">
              {stationAddress}
            </p>
          )}
        </div>

        {/* Header Actions - Just Close Button */}
        <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onClose}
            title="بستن"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Routes Horizontal Snap List Area */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isMinimized ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-[300px] opacity-100'
        }`}
      >
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto no-scrollbar snap-x snap-mandatory px-3.5 sm:px-6 pt-2 pb-1 flex gap-2.5 items-stretch"
        >
          {routes.length === 0 ? (
            <div className="w-full py-8 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
              <Bus className="w-8 h-8 text-slate-300" />
              <span>خط اتوبوسی برای این ایستگاه ثبت نشده است.</span>
            </div>
          ) : (
            routes.map((rt) => {
              const eta = etaDataMap[String(rt.code)];
              const active = activeRoute?.id === rt.id;
              const fav = isFavorite(stationCode, rt.code);

              return (
                <div key={rt.id} data-route-id={rt.id} className="snap-start shrink-0">
                  <BusCard
                    stationCode={stationCode}
                    route={rt}
                    isActive={active}
                    isFavorite={fav}
                    etaData={eta}
                    isLoadingETA={isLoadingETA}
                    onSelect={() => onSelectRoute(rt)}
                    onToggleFavorite={() =>
                      onToggleFavorite(stationCode, rt.code, rt.dest)
                    }
                    onOpenTimetable={() => onOpenTimetable(rt)}
                    onFitRoute={() => onFitRoute(rt)}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

