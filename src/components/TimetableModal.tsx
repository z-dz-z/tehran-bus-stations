import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import type { RouteData, TimetableResponse, TimetableSlot } from '../types';
import { fetchStationTimetable } from '../api/transitApi';
import { toPersianDigits } from '../utils/format';

interface TimetableModalProps {
  stationCode: number;
  stationName: string;
  route: RouteData;
  onClose: () => void;
}

export const TimetableModal: React.FC<TimetableModalProps> = ({
  stationCode,
  stationName,
  route,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<TimetableResponse | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetchStationTimetable(
          stationCode,
          route.code,
          route.dir,
          controller.signal
        );
        if (!isCancelled) {
          if (res) {
            setData(res);
            if (
              typeof res.CurrentDayType === 'number' &&
              res.CurrentDayType >= 0 &&
              res.CurrentDayType <= 2
            ) {
              setActiveTab(res.CurrentDayType);
            }
          } else {
            setError(true);
          }
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled && !(err instanceof DOMException && err.name === 'AbortError')) {
          setError(true);
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [stationCode, route.code, route.dir, reloadTrigger]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Current time in minutes from midnight in Tehran time zone for highlighting next bus
  const currentMinutes = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Tehran',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23',
      }).formatToParts(new Date());
      const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
      const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
      return h * 60 + m;
    } catch {
      const now = new Date();
      return now.getHours() * 60 + now.getMinutes();
    }
  }, []);

  const currentSlots: TimetableSlot[] = useMemo(() => {
    if (!data) return [];
    if (activeTab === 0) return data.Normal || [];
    if (activeTab === 1) return data.HalfHoliday || [];
    if (activeTab === 2) return data.Holiday || [];
    return [];
  }, [data, activeTab]);

  // Find next upcoming time index for current active day type
  const nextSlotIndex = useMemo(() => {
    if (!data || data.CurrentDayType !== activeTab) return -1;
    for (let i = 0; i < currentSlots.length; i++) {
      const parts = currentSlots[i].StaticTime.split(':');
      if (parts.length >= 2) {
        const slotMins = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        if (slotMins >= currentMinutes) {
          return i;
        }
      }
    }
    return -1;
  }, [data, activeTab, currentSlots, currentMinutes]);

  const isTodayEnded = useMemo(() => {
    return Boolean(
      data &&
      data.CurrentDayType === activeTab &&
      nextSlotIndex === -1 &&
      currentSlots.length > 0
    );
  }, [data, activeTab, nextSlotIndex, currentSlots.length]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] animate-in slide-in-from-bottom-6 duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white">
                خط {toPersianDigits(route.code)}
              </span>
              <h2 className="text-sm font-bold text-slate-800">برنامه زمان‌بندی حرکت</h2>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              ایستگاه {stationName} (کد {toPersianDigits(stationCode)})
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Day Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-100/60 p-1 m-3 rounded-2xl">
          <button
            onClick={() => setActiveTab(0)}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 0
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            شنبه تا چهارشنبه
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 1
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            پنجشنبه‌ها
          </button>
          <button
            onClick={() => setActiveTab(2)}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 2
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            جمعه و تعطیلات
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-4 flex-1">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs font-medium">در حال دریافت برنامه حرکت...</span>
            </div>
          )}

          {!loading && error && (
            <div className="py-10 flex flex-col items-center justify-center text-center gap-3 text-slate-500">
              <AlertCircle className="w-8 h-8 text-rose-500" />
              <span className="text-xs font-semibold text-slate-700">
                خطا در برقراری ارتباط و دریافت برنامه زمان‌بندی
              </span>
              <button
                type="button"
                onClick={() => setReloadTrigger((prev) => prev + 1)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                تلاش مجدد
              </button>
            </div>
          )}

          {!loading && !error && currentSlots.length === 0 && (
            <div className="py-10 flex flex-col items-center justify-center text-center gap-2 text-slate-400">
              <AlertCircle className="w-8 h-8 text-slate-300" />
              <span className="text-xs font-medium">
                برنامه زمان‌بندی ثابتی برای این روز ثبت نشده است.
              </span>
              <span className="text-[11px] text-slate-400">
                حرکت اتوبوس‌ها به صورت مداوم در خط انجام می‌شود.
              </span>
            </div>
          )}

          {!loading && !error && currentSlots.length > 0 && (
            <div>
              {isTodayEnded && (
                <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center gap-2 text-xs text-amber-800 font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>حرکت‌های امروز پایان یافته است</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  زمان‌های حرکت از ایستگاه
                </span>
                <span>تعداد: {toPersianDigits(currentSlots.length)} نوبت</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {currentSlots.map((slot, idx) => {
                  const isNext = idx === nextSlotIndex;
                  return (
                    <div
                      key={idx}
                      className={`relative p-2.5 rounded-xl text-center text-xs font-mono font-bold transition-all ${
                        isNext
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-400'
                          : 'bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {toPersianDigits(slot.StaticTime)}
                      {isNext && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 text-[9px] font-sans font-extrabold px-1.5 py-0.2 rounded-full whitespace-nowrap shadow-xs">
                          حرکت بعدی
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
