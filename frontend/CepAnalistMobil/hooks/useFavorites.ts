import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const FAVORITES_KEY = '@CepAnalist:favorites';
// type FavoriteSymbol = typeof SYMBOL_OPTIONS[number];
type FavoriteSymbol = string;

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteSymbol[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem(FAVORITES_KEY);
      if (json) {
        setFavorites(JSON.parse(json));
      }
    } catch (e) {
      console.error('Favoriler yüklenemedi:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleFavorite = useCallback(async (symbol: FavoriteSymbol) => {
    const newFavorites = favorites.includes(symbol)
      ? favorites.filter(f => f !== symbol)
      : [symbol, ...favorites.slice(0,9)]; // Max 10
    setFavorites(newFavorites);
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    } catch (e) {
      console.error('Favori kaydedilemedi:', e);
    }
  }, [favorites]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return { favorites, loading, toggleFavorite };
};


