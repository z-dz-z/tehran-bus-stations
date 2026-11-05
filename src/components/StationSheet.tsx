import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Share2, Check, MapPin, Bus } from 'lucide-react';
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
  onRefreshETA: () => void;
  isFavorite: (stationCode: number, routeCode: number) => boolean;
  onToggleFavorite: (stationCode: number, routeCode: number, destName: string) => void;
  onOpenTimetable: (route: RouteData) => void;
  onFitRoute: (route: RouteData) => void;
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
  onRefreshETA,
  isFavorite,
  onToggleFavorite,
  onOpenTimetable,
  onFitRoute,
}) => {
  const [copied, setCopied] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('stop', String(stationCode));
    if (activeRoute) {
      url.searchParams.set('route', String(activeRoute.code));
    }
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Scroll active card into view when activeRoute changes
  useEffect(() => {
    if (!activeRoute || !scrollContainerRef.current) return;
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
  }, [activeRoute]);

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-t-3xl shadow-2xl border-t border-slate-200/80 overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 flex flex-col pointer-events-auto transition-all animate-in slide-in-from-bottom-8 duration-200 max-h-[50vh] sm:max-h-[45vh]">
      {/* Top Drag Handle Bar */}
      <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-2 shrink-0"></div>

      {/* Station Header Bar */}
      <div className="px-4 sm:px-6 flex items-center justify-between gap-3 border-b border-slate-100 pb-3 shrink-0">
        <div className="min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
            <h1 className="text-base sm:text-lg font-black text-slate-800 truncate">
              {stationName}
            </h1>
            <span className="text-xs font-mono font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-lg shrink-0">
              کد {toPersianDigits(stationCode)}
            </span>
          </div>
          {stationAddress && (
            <p className="text-xs text-slate-500 truncate mt-0.5 pr-6">
              {stationAddress}
            </p>
          )}
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Share Button */}
          <button
            onClick={handleShare}
            title="کپی لینک اشتراک‌گذاری این ایستگاه"
            className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-slate-100 active:scale-95 transition-all relative"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            {copied && (
              <span className="absolute -top-7 right-1/2 translate-x-1/2 bg-slate-800 text-white text-[10px] py-0.5 px-2 rounded-md whitespace-nowrap shadow-md">
                کپی شد!
              </span>
            )}
          </button>

          {/* Refresh ETA Button */}
          <button
            onClick={onRefreshETA}
            disabled={isLoadingETA}
            title="به‌روزرسانی زمان ورود اتوبوس‌ها"
            className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-slate-100 active:scale-95 transition-all"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoadingETA ? 'animate-spin text-emerald-600' : ''}`}
            />
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            title="بستن"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Routes Horizontal Snap List */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 sm:px-6 pt-3 flex gap-3 items-stretch"
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
  );
};

