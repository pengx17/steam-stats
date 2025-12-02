"use client";

import { create } from "zustand";
import { SteamGame } from "@/app/types/steam";
import {
  getCachedGames,
  setCachedGames,
  getCacheInfo,
  getCachedReviews,
  setCachedReviews,
  getReviewsCacheInfo,
  clearReviewsCache,
  type UserReview,
} from "@/lib/cache";

interface GamesState {
  // Games
  games: SteamGame[];
  gamesLoading: boolean;
  gamesRefreshing: boolean;
  gamesFromCache: boolean;
  gamesCacheAge: number | null;

  // Reviews
  reviews: UserReview[];
  totalReviews: number;
  reviewsLoading: boolean;
  reviewsRefreshing: boolean;
  reviewsFromCache: boolean;
  reviewsCacheAge: number | null;

  // Steam ID (set once on login)
  steamId: string | null;

  // Actions
  setSteamId: (steamId: string) => void;
  fetchGames: (forceRefresh?: boolean) => Promise<void>;
  fetchReviews: (forceRefresh?: boolean) => Promise<void>;
  initializeData: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  games: [],
  gamesLoading: true,
  gamesRefreshing: false,
  gamesFromCache: false,
  gamesCacheAge: null,

  reviews: [],
  totalReviews: 0,
  reviewsLoading: true,
  reviewsRefreshing: false,
  reviewsFromCache: false,
  reviewsCacheAge: null,

  steamId: null,
};

export const useGamesStore = create<GamesState>((set, get) => ({
  ...initialState,

  setSteamId: (steamId: string) => {
    set({ steamId });
  },

  fetchGames: async (forceRefresh = false) => {
    const { steamId } = get();
    if (!steamId) return;

    if (forceRefresh) {
      set({ gamesRefreshing: true });
    }

    if (!forceRefresh) {
      const cached = await getCachedGames(steamId);
      if (cached) {
        const info = await getCacheInfo(steamId);
        set({
          games: cached,
          gamesFromCache: true,
          gamesCacheAge: info.age,
          gamesLoading: false,
          gamesRefreshing: false,
        });
        return;
      }
    }

    try {
      const res = await fetch(`/api/steam/games?steamId=${steamId}`);
      const data = await res.json();
      if (data.response?.games) {
        const fetchedGames = data.response.games;
        await setCachedGames(steamId, fetchedGames);
        set({
          games: fetchedGames,
          gamesFromCache: false,
          gamesCacheAge: null,
          gamesLoading: false,
          gamesRefreshing: false,
        });
      }
    } catch (err) {
      console.error("[Store] Failed to fetch games:", err);
      set({ gamesLoading: false, gamesRefreshing: false });
    }
  },

  fetchReviews: async (forceRefresh = false) => {
    const { steamId } = get();
    if (!steamId) return;

    if (forceRefresh) {
      set({ reviewsRefreshing: true });
      await clearReviewsCache(steamId);
    }

    if (!forceRefresh) {
      const cached = await getCachedReviews(steamId);
      if (cached) {
        console.log(`[Store] Using cached reviews (${cached.reviews.length})`);
        const info = await getReviewsCacheInfo(steamId);
        set({
          reviews: cached.reviews,
          totalReviews: cached.totalReviews,
          reviewsFromCache: true,
          reviewsCacheAge: info.age,
          reviewsLoading: false,
          reviewsRefreshing: false,
        });
        return;
      }
    }

    try {
      console.log("[Store] Fetching reviews from API...");
      const res = await fetch("/api/steam/reviews");
      if (res.ok) {
        const data = await res.json();
        const reviewsData = data.reviews || [];
        await setCachedReviews(steamId, reviewsData, data.totalReviews || reviewsData.length);
        console.log(`[Store] Fetched ${reviewsData.length} reviews`);
        set({
          reviews: reviewsData,
          totalReviews: data.totalReviews || reviewsData.length,
          reviewsFromCache: false,
          reviewsCacheAge: null,
          reviewsLoading: false,
          reviewsRefreshing: false,
        });
      }
    } catch (err) {
      console.error("[Store] Failed to fetch reviews:", err);
      set({ reviewsLoading: false, reviewsRefreshing: false });
    }
  },

  initializeData: async () => {
    const { steamId, gamesLoading } = get();
    // Only initialize if we have steamId and haven't started loading
    if (!steamId || !gamesLoading) return;

    // Fetch in parallel
    await Promise.all([
      get().fetchGames(),
      get().fetchReviews(),
    ]);
  },

  reset: () => {
    set(initialState);
  },
}));
