import React, { useState } from 'react';
import { Star, X, ChevronLeft } from 'lucide-react';
import type { FavoriteItem } from '../types';
import { toPersianDigits } from '../utils/format';

interface FavoritesBarProps {
  favorites: FavoriteItem[];
  onSelectFavorite: (fav: FavoriteItem) => void;
  onRemoveFavorite: (stationCode: number, routeCode: number) => void;
}

export const FavoritesBar: React.FC<FavoritesBarProps> = ({
  favorites,
  onSelectFavorite,
  onRemoveFavorite,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (favorites.length === 0) {
    return null;
  }

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-1">
      <div className="flex items-center gap-2 px-1">
        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          title={isExpanded ? 'بستن نشان‌شده‌ها' : 'مشاهده ایستگاه‌ها و خطوط نشان‌شده'}
          aria-expanded={isExpanded}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border shadow-sm transition-all cursor-pointer active:scale-95 shrink-0 ${
            isExpanded
              ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20 shadow-md'
              : 'bg-white/95 backdrop-blur-md text-amber-800 border-amber-200/90 hover:bg-amber-50/80'
          }`}
        >
          <Star
            className={`w-3.5 h-3.5 ${
              isExpanded ? 'fill-white text-white' : 'fill-amber-400 text-amber-500'
            }`}
          />
          <span>نشان‌شده‌ها</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              isExpanded ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {toPersianDigits(favorites.length)}
          </span>
          <ChevronLeft
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Saved Items Pills (Only shown when expanded) */}
        {isExpanded &&
          favorites.map((fav) => (
            <div
              key={`${fav.stationCode}-${fav.routeCode}`}
              className="flex items-center bg-white/95 backdrop-blur-md border border-slate-200/90 hover:border-emerald-300 rounded-full shadow-sm hover:shadow transition-all shrink-0 overflow-hidden group animate-in fade-in slide-in-from-right-3 duration-200"
            >
              <button
                type="button"
                onClick={() => onSelectFavorite(fav)}
                className="flex items-center gap-1.5 py-1.5 pr-3 pl-1.5 text-right cursor-pointer"
              >
                <span className="text-[11px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">
                  {toPersianDigits(fav.routeCode)}
                </span>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-emerald-700 max-w-[120px] truncate">
                  {fav.stationName}
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFavorite(fav.stationCode, fav.routeCode);
                }}
                title="حذف از نشان‌شده‌ها"
                className="p-1 pl-2 text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
};

