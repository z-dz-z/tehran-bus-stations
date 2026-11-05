import React, { useState } from 'react';
import { Compass, Crosshair, Plus, Minus, Loader2 } from 'lucide-react';

interface MapControlsProps {
  onLocateUser: (lon: number, lat: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetNorth: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onLocateUser,
  onZoomIn,
  onZoomOut,
  onResetNorth,
}) => {
  const [isLocating, setIsLocating] = useState(false);

  const handleLocate = () => {
    if (!('geolocation' in navigator)) {
      alert('مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        onLocateUser(pos.coords.longitude, pos.coords.latitude);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert('امکان دریافت موقعیت مکانی شما وجود نداشت. لطفا دسترسی لوکیشن را بررسی کنید.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15000,
      }
    );
  };

  return (
    <div className="flex flex-col gap-2 pointer-events-auto">
      {/* Locate Me */}
      <button
        onClick={handleLocate}
        disabled={isLocating}
        title="موقعیت مکانی من"
        className="w-11 h-11 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-white active:scale-95 transition-all"
      >
        {isLocating ? (
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        ) : (
          <Crosshair className="w-5 h-5" />
        )}
      </button>

      {/* Compass / Reset North */}
      <button
        onClick={onResetNorth}
        title="چرخش به سمت شمال"
        className="w-11 h-11 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-emerald-600 hover:bg-white active:scale-95 transition-all"
      >
        <Compass className="w-5 h-5 text-rose-500" />
      </button>

      {/* Zoom In & Zoom Out */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 flex flex-col overflow-hidden">
        <button
          onClick={onZoomIn}
          title="بزرگ‌نمایی"
          className="w-11 h-11 flex items-center justify-center text-slate-700 hover:text-emerald-600 hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-100"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          onClick={onZoomOut}
          title="کوچک‌نمایی"
          className="w-11 h-11 flex items-center justify-center text-slate-700 hover:text-emerald-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
