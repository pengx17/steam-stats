import Dexie, { type EntityTable } from "dexie";
import { SteamGame } from "@/app/types/steam";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MBTIResult = any; // Flexible type for MBTI result

// Database entity interfaces
interface GamesCache {
  steamId: string;
  games: SteamGame[];
  timestamp: number;
}

interface PersonalityCache {
  steamId: string;
  result: MBTIResult;
  gamesHash: string;
  timestamp: number;
}

interface GameDetails {
  appid: number;
  genres: string[];
  price: number | null;
  developers: string[];
  metacritic: { score: number } | null;
  timestamp: number;
}

interface UserReview {
  appId: string;
  gameName: string;
  recommended: boolean;
  reviewText: string;
  hoursPlayed: string;
}

interface ReviewsCache {
  steamId: string;
  reviews: UserReview[];
  totalReviews: number;
  timestamp: number;
}

// Cache durations
const GAMES_CACHE_DURATION = 1000 * 60 * 30; // 30 minutes
const PERSONALITY_CACHE_DURATION = 1000 * 60 * 60 * 24 * 7; // 7 days
const GAME_DETAILS_CACHE_DURATION = 1000 * 60 * 60 * 24 * 30; // 30 days
const REVIEWS_CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

// Define the database with Dexie
const db = new Dexie("SteamStatsDB") as Dexie & {
  games: EntityTable<GamesCache, "steamId">;
  personality: EntityTable<PersonalityCache, "steamId">;
  gameDetails: EntityTable<GameDetails, "appid">;
  reviews: EntityTable<ReviewsCache, "steamId">;
};

// Define schema - bump version when adding new stores
db.version(2).stores({
  games: "steamId",
  personality: "steamId",
  gameDetails: "appid",
  reviews: "steamId",
});

// ============================================
// Games Cache Functions
// ============================================

export async function getCachedGames(
  steamId: string
): Promise<SteamGame[] | null> {
  try {
    const cached = await db.games.get(steamId);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > GAMES_CACHE_DURATION;
    if (isExpired) {
      await db.games.delete(steamId);
      return null;
    }

    return cached.games;
  } catch (error) {
    console.error("Error reading games from cache:", error);
    return null;
  }
}

export async function setCachedGames(
  steamId: string,
  games: SteamGame[]
): Promise<void> {
  try {
    await db.games.put({
      steamId,
      games,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error writing games to cache:", error);
  }
}

export async function getCacheInfo(
  steamId: string
): Promise<{ cached: boolean; age: number | null }> {
  try {
    const cached = await db.games.get(steamId);
    if (!cached) {
      return { cached: false, age: null };
    }
    return { cached: true, age: Date.now() - cached.timestamp };
  } catch {
    return { cached: false, age: null };
  }
}

// ============================================
// Personality Cache Functions
// ============================================

function generateGamesHash(
  games: Array<{ name: string; hours: number }>
): string {
  return games
    .slice(0, 10)
    .map((g) => `${g.name}:${g.hours}`)
    .join("|");
}

export async function getCachedPersonality(
  steamId: string,
  currentGamesHash: string
): Promise<MBTIResult | null> {
  try {
    const cached = await db.personality.get(steamId);
    if (!cached) return null;

    const isExpired =
      Date.now() - cached.timestamp > PERSONALITY_CACHE_DURATION;
    if (isExpired) {
      await db.personality.delete(steamId);
      return null;
    }

    // Check if games have changed significantly
    if (cached.gamesHash !== currentGamesHash) {
      console.log("Games changed, invalidating personality cache");
      await db.personality.delete(steamId);
      return null;
    }

    return cached.result;
  } catch (error) {
    console.error("Error reading personality from cache:", error);
    return null;
  }
}

export async function setCachedPersonality(
  steamId: string,
  result: MBTIResult,
  topGames: Array<{ name: string; hours: number }>
): Promise<void> {
  try {
    await db.personality.put({
      steamId,
      result,
      gamesHash: generateGamesHash(topGames),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error writing personality to cache:", error);
  }
}

export async function getPersonalityCacheInfo(
  steamId: string
): Promise<{ cached: boolean; age: number | null }> {
  try {
    const cached = await db.personality.get(steamId);
    if (!cached) {
      return { cached: false, age: null };
    }
    return { cached: true, age: Date.now() - cached.timestamp };
  } catch {
    return { cached: false, age: null };
  }
}

export async function clearPersonalityCache(steamId: string): Promise<void> {
  try {
    await db.personality.delete(steamId);
  } catch (error) {
    console.error("Error clearing personality cache:", error);
  }
}

// ============================================
// Game Details Cache Functions
// ============================================

export async function getCachedGameDetails(
  appid: number
): Promise<GameDetails | null> {
  try {
    const cached = await db.gameDetails.get(appid);
    if (!cached) return null;

    const isExpired =
      Date.now() - cached.timestamp > GAME_DETAILS_CACHE_DURATION;
    if (isExpired) {
      await db.gameDetails.delete(appid);
      return null;
    }

    return cached;
  } catch (error) {
    console.error("Error reading game details from cache:", error);
    return null;
  }
}

export async function setCachedGameDetails(
  appid: number,
  genres: string[],
  price: number | null,
  developers: string[],
  metacritic: { score: number } | null
): Promise<void> {
  try {
    await db.gameDetails.put({
      appid,
      genres,
      price,
      developers,
      metacritic,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error writing game details to cache:", error);
  }
}

export async function getCachedGameDetailsMany(
  appids: number[]
): Promise<Map<number, GameDetails>> {
  const result = new Map<number, GameDetails>();
  try {
    const now = Date.now();

    // Dexie supports bulkGet for efficient batch reads
    const cached = await db.gameDetails.bulkGet(appids);

    cached.forEach((item) => {
      if (item && now - item.timestamp < GAME_DETAILS_CACHE_DURATION) {
        result.set(item.appid, item);
      }
    });
  } catch (error) {
    console.error("Error reading game details batch from cache:", error);
  }
  return result;
}

// Batch fetch and cache game details
export async function fetchAndCacheGameDetails(
  appids: number[]
): Promise<Map<number, GameDetails>> {
  // First, check which ones we already have cached
  const cached = await getCachedGameDetailsMany(appids);
  const uncachedAppids = appids.filter((id) => !cached.has(id));

  if (uncachedAppids.length === 0) {
    console.log(`[Cache] All ${appids.length} games already cached`);
    return cached;
  }

  console.log(
    `[Cache] ${cached.size} games cached, fetching ${uncachedAppids.length} more`
  );

  // Fetch uncached games in batch
  try {
    const response = await fetch("/api/steam/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appids: uncachedAppids }),
    });

    if (!response.ok) {
      console.error(`[Cache] Batch fetch failed: ${response.status}`);
      return cached;
    }

    const data = await response.json();
    const now = Date.now();
    const toCache: GameDetails[] = [];

    // Prepare batch insert
    for (const [appidStr, gameData] of Object.entries(data.results)) {
      const appid = parseInt(appidStr);
      if (gameData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const game = gameData as any;
        const details: GameDetails = {
          appid,
          genres:
            game.genres?.map((g: { description: string }) => g.description) ||
            [],
          price: game.price_overview?.final || null,
          developers: game.developers || [],
          metacritic: game.metacritic || null,
          timestamp: now,
        };

        toCache.push(details);
        cached.set(appid, details);
      }
    }

    // Dexie bulkPut for efficient batch writes
    if (toCache.length > 0) {
      await db.gameDetails.bulkPut(toCache);
    }

    console.log(
      `[Cache] Batch fetch complete, now have ${cached.size} games cached`
    );
  } catch (error) {
    console.error("[Cache] Error in batch fetch:", error);
  }

  return cached;
}

// ============================================
// Reviews Cache Functions
// ============================================

export async function getCachedReviews(
  steamId: string
): Promise<{ reviews: UserReview[]; totalReviews: number } | null> {
  try {
    const cached = await db.reviews.get(steamId);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > REVIEWS_CACHE_DURATION;
    if (isExpired) {
      await db.reviews.delete(steamId);
      return null;
    }

    return { reviews: cached.reviews, totalReviews: cached.totalReviews };
  } catch (error) {
    console.error("Error reading reviews from cache:", error);
    return null;
  }
}

export async function setCachedReviews(
  steamId: string,
  reviews: UserReview[],
  totalReviews: number
): Promise<void> {
  try {
    await db.reviews.put({
      steamId,
      reviews,
      totalReviews,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error writing reviews to cache:", error);
  }
}

export async function getReviewsCacheInfo(
  steamId: string
): Promise<{ cached: boolean; age: number | null }> {
  try {
    const cached = await db.reviews.get(steamId);
    if (!cached) {
      return { cached: false, age: null };
    }
    return { cached: true, age: Date.now() - cached.timestamp };
  } catch {
    return { cached: false, age: null };
  }
}

export async function clearReviewsCache(steamId: string): Promise<void> {
  try {
    await db.reviews.delete(steamId);
  } catch (error) {
    console.error("Error clearing reviews cache:", error);
  }
}

// ============================================
// Clear Cache Functions
// ============================================

export async function clearCache(steamId?: string): Promise<void> {
  try {
    if (steamId) {
      await db.games.delete(steamId);
      await db.personality.delete(steamId);
      await db.reviews.delete(steamId);
    } else {
      await db.games.clear();
      await db.personality.clear();
      await db.gameDetails.clear();
      await db.reviews.clear();
    }
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}

// Get cache statistics
export async function getCacheStats(): Promise<{
  gamesCount: number;
  personalityCount: number;
  gameDetailsCount: number;
  reviewsCount: number;
}> {
  try {
    const [gamesCount, personalityCount, gameDetailsCount, reviewsCount] =
      await Promise.all([
        db.games.count(),
        db.personality.count(),
        db.gameDetails.count(),
        db.reviews.count(),
      ]);
    return { gamesCount, personalityCount, gameDetailsCount, reviewsCount };
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return {
      gamesCount: 0,
      personalityCount: 0,
      gameDetailsCount: 0,
      reviewsCount: 0,
    };
  }
}

export { generateGamesHash };
export type { GameDetails, UserReview };
