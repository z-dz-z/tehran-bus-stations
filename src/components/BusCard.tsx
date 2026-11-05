import React, { useState } from 'react';
import { Star, Calendar, Maximize2, Radio, Share2, Check } from 'lucide-react';
import type { RouteData, BusStopETARoute } from '../types';
import { toPersianDigits, formatETA } from '../utils/format';

interface BusCardProps {
  stationCode: number;
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
  stationCode,
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
  const [copied, setCopied] = useState(false);
  const details = etaData?.Details || [];

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('stop', String(stationCode));
    url.searchParams.set('route', String(route.code));

    const shareUrl = url.toString();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`relative min-w-[260px] sm:min-w-[300px] max-w-[320px] shrink-0 p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl transition-all cursor-pointer snap-start border ${
        isActive
          ? 'bg-gradient-to-b from-white to-emerald-50/40 border-emerald-500 shadow-md shadow-emerald-600/10 ring-2 ring-emerald-500/30'
          : 'bg-white/95 backdrop-blur-sm border-slate-200/90 shadow-sm hover:border-slate-300'
      }`}
    >
      {/* Top Row: Line Number Badge & Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs sm:text-sm font-black transition-colors shrink-0 ${
              isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800'
            }`}
          >
            <span>خط</span>
            <span>{toPersianDigits(route.code)}</span>
          </div>
          {isActive && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-full truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse shrink-0"></span>
              مسیر انتخابی
            </span>
          )}
        </div>

        {/* Action Buttons: Share & Favorite */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleShare}
            title="کپی لینک مستقیم این خط و ایستگاه"
            className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-600 hover:bg-slate-100 transition-all active:scale-95 relative cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            {copied && (
              <span className="absolute -top-7 right-1/2 translate-x-1/2 bg-slate-800 text-white text-[10px] py-0.5 px-2 rounded-md whitespace-nowrap shadow-md z-20">
                کپی شد!
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            title={isFavorite ? 'حذف از نشان‌شده‌ها' : 'نشان کردن خط'}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              isFavorite
                ? 'bg-amber-50 text-amber-500 hover:bg-amber-100'
                : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                isFavorite ? 'fill-amber-400 text-amber-500' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Destination & Origin */}
      <div className="mt-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium shrink-0">به سمت:</span>
          <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
            {route.dest}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 truncate mt-0.5">
          از: {route.orig}
        </div>
      </div>

      {/* Live ETA Section: Compact Inline */}
      <div className="mt-2 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between gap-1.5 min-h-[26px]">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 shrink-0">
            <Radio className="w-3 h-3 text-emerald-600" />
            زمان رسیدن:
          </span>

          {isLoadingETA && details.length === 0 ? (
            <div className="h-5 w-20 bg-slate-100 rounded-md animate-pulse"></div>
          ) : details.length > 0 ? (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
              {details.map((item, idx) => {
                const formatted = formatETA(item.ETAValue, item.ETA);
                return (
                  <div
                    key={idx}
                    className={`text-[11px] px-2 py-0.5 rounded-lg font-medium shadow-2xs whitespace-nowrap ${formatted.badgeClass}`}
                  >
                    {idx > 0 && <span className="opacity-75 text-[9px] ml-0.5">بعدی: </span>}
                    <span>{formatted.displayText}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-100 rounded-md py-0.5 px-2 whitespace-nowrap">
              اتوبوسی در مسیر نیست
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTimetable();
          }}
          title="مشاهده برنامه حرکت خط"
          className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-emerald-700 bg-slate-100/80 hover:bg-emerald-50 transition-colors whitespace-nowrap active:scale-[0.98]"
        >
          <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-500" />
          <span>زمان‌بندی</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFitRoute();
          }}
          title="نمایش کل مسیر خط روی نقشه"
          className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-emerald-700 bg-slate-100/80 hover:bg-emerald-50 transition-colors whitespace-nowrap active:scale-[0.98]"
        >
          <Maximize2 className="w-3.5 h-3.5 shrink-0 text-slate-500" />
          <span>کل مسیر</span>
        </button>
      </div>
    </div>
  );
};

