import { useState, useEffect, useCallback } from 'react';
import type { FavoriteItem } from '../types';

const STORAGE_KEY = 'tehran_bus_favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse favorites from localStorage', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.warn('Failed to save favorites to localStorage', e);
    }
  }, [favorites]);

  const isFavorite = useCallback(
    (stationCode: number, routeCode: number) => {
      return favorites.some(
        (f) => f.stationCode === stationCode && f.routeCode === routeCode
      );
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    (item: FavoriteItem) => {
      setFavorites((prev) => {
        const exists = prev.some(
          (f) => f.stationCode === item.stationCode && f.routeCode === item.routeCode
        );
        if (exists) {
          return prev.filter(
            (f) => !(f.stationCode === item.stationCode && f.routeCode === item.routeCode)
          );
        } else {
          return [item, ...prev];
        }
      });
    },
    []
  );

  const removeFavorite = useCallback(
    (stationCode: number, routeCode: number) => {
      setFavorites((prev) =>
        prev.filter(
          (f) => !(f.stationCode === stationCode && f.routeCode === routeCode)
        )
      );
    },
    []
  );

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    removeFavorite,
  };
}
