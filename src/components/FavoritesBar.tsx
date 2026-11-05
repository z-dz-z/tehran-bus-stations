import React from 'react';
import { Star, X } from 'lucide-react';
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
  if (favorites.length === 0) {
    return null;
  }

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-1">
      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50/90 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-amber-200/80 shrink-0">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
          <span>نشان‌شده‌ها</span>
        </div>

        {favorites.map((fav) => (
          <div
            key={`${fav.stationCode}-${fav.routeCode}`}
            className="flex items-center bg-white/95 backdrop-blur-md border border-slate-200/90 hover:border-emerald-300 rounded-full shadow-sm hover:shadow transition-all shrink-0 overflow-hidden group"
          >
            <button
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
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFavorite(fav.stationCode, fav.routeCode);
              }}
              title="حذف از نشان‌شده‌ها"
              className="p-1 pl-2 text-slate-300 hover:text-rose-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

