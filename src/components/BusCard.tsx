import React from 'react';
import { Star, Calendar, Maximize2, Radio } from 'lucide-react';
import type { RouteData, BusStopETARoute } from '../types';
import { toPersianDigits, formatETA } from '../utils/format';

interface BusCardProps {
  route: RouteData;
  isActive: boolean;
  isFavorite: boolean;
  etaData: BusStopETARoute | undefined;
  isLoadingETA: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onOpenTimetable: () => void;
  onFitRoute: () => void;
}

export const BusCard: React.FC<BusCardProps> = ({
  route,
  isActive,
  isFavorite,
  etaData,
  isLoadingETA,
  onSelect,
  onToggleFavorite,
  onOpenTimetable,
  onFitRoute,
}) => {
  const details = etaData?.Details || [];

  return (
    <div
      onClick={onSelect}
      className={`relative min-w-[280px] sm:min-w-[320px] max-w-[340px] shrink-0 p-4 rounded-3xl transition-all cursor-pointer snap-start border ${
        isActive
          ? 'bg-gradient-to-b from-white to-emerald-50/40 border-emerald-500 shadow-lg shadow-emerald-600/10 ring-2 ring-emerald-500/30'
          : 'bg-white/95 backdrop-blur-sm border-slate-200/90 shadow-sm hover:border-slate-300'
      }`}
    >
      {/* Top Row: Line Number Badge & Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1 px-3 py-1 rounded-xl text-sm font-black transition-colors ${
              isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800'
            }`}
          >
            <span>خط</span>
            <span>{toPersianDigits(route.code)}</span>
          </div>
          {isActive && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              مسیر انتخابی
            </span>
          )}
        </div>

        {/* Favorite Star Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          title={isFavorite ? 'حذف از نشان‌شده‌ها' : 'نشان کردن خط'}
          className={`p-2 rounded-xl transition-all ${
            isFavorite
              ? 'bg-amber-50 text-amber-500 hover:bg-amber-100'
              : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
          }`}
        >
          <Star
            className={`w-4 h-4 ${
              isFavorite ? 'fill-amber-400 text-amber-500' : ''
            }`}
          />
        </button>
      </div>

      {/* Destination & Origin */}
      <div className="mt-3">
        <div className="text-xs text-slate-400 font-medium">به سمت</div>
        <div className="text-sm font-bold text-slate-800 truncate mt-0.5">
          {route.dest}
        </div>
        <div className="text-[11px] text-slate-400 truncate mt-0.5">
          از: {route.orig}
        </div>
      </div>

      {/* Live ETA Section */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-600" />
            زمان رسیدن اتوبوس
          </span>
          {isLoadingETA && (
            <span className="text-[10px] text-emerald-600 animate-pulse font-medium">
              در حال به‌روزرسانی...
            </span>
          )}
        </div>

        {isLoadingETA && details.length === 0 ? (
          <div className="h-8 bg-slate-100 rounded-xl animate-pulse"></div>
        ) : details.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {details.map((item, idx) => {
              const formatted = formatETA(item.ETAValue, item.ETA);
              return (
                <div
                  key={idx}
                  className={`text-xs px-2.5 py-1 rounded-xl shadow-2xs ${formatted.badgeClass}`}
                >
                  {idx > 0 && <span className="opacity-75 text-[10px] ml-1">بعدی: </span>}
                  <span>{formatted.displayText}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs font-medium text-slate-400 bg-slate-50 border border-slate-100 rounded-xl py-1.5 px-3 text-center">
            اتوبوسی در مسیر نیست
          </div>
        )}
      </div>

      {/* Action Buttons Row */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenTimetable();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-emerald-700 bg-slate-100/80 hover:bg-emerald-50 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>زمان‌بندی</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onFitRoute();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-emerald-700 bg-slate-100/80 hover:bg-emerald-50 transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>نمایش کل مسیر</span>
        </button>
      </div>
    </div>
  );
};
