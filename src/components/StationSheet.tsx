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
  lastUpdated?: Date | null;
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
  lastUpdated,
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
    <div className="w-full bg-white/95 backdrop-blur-md rounded-t-3xl shadow-2xl border-t border-slate-200/80 overflow-hidden pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:pt-3 flex flex-col pointer-events-auto transition-all animate-in slide-in-from-bottom-8 duration-200 max-h-[55vh] sm:max-h-[45vh]">
      {/* Top Drag Handle Bar */}
      <div className="w-8 h-1 bg-slate-300 rounded-full mx-auto mb-1.5 shrink-0"></div>

      {/* Station Header Bar */}
      <div className="px-3.5 sm:px-6 flex items-center justify-between gap-2 border-b border-slate-100 pb-2 shrink-0">
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
              title="به‌روزرسانی زنده خودکار هر ۳۰ ثانیه"
              className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              زنده
            </span>
          </div>
          {stationAddress && (
            <p className="text-[11px] text-slate-500 truncate mt-0.5 pr-5">
              {stationAddress}
            </p>
          )}
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Share Button */}
          <button
            onClick={handleShare}
            title="کپی لینک اشتراک‌گذاری این ایستگاه"
            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 active:scale-95 transition-all relative"
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
            title={`به‌روزرسانی زمان ورود (خودکار هر ۳۰ ثانیه)${lastUpdated ? `\nآخرین به‌روزرسانی: ${lastUpdated.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}` : ''}`}
            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 active:scale-95 transition-all"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoadingETA ? 'animate-spin text-emerald-600' : ''}`}
            />
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            title="بستن"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Routes Horizontal Snap List */}
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

