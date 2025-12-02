"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useGamesStore } from "@/lib/stores/useGamesStore";
import { SteamGame } from "../../types/steam";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Gamepad2,
  Loader2,
  RefreshCw,
  Database,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  ExternalLink,
  Trophy,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Zap,
} from "lucide-react";
import {
  getCachedGameDetails,
  setCachedGameDetails,
  fetchAndCacheGameDetails,
} from "@/lib/cache";

type SortField = "name" | "playtime" | "lastPlayed";
type SortDirection = "asc" | "desc";

// Game details for display
interface GameDetails {
  genres?: { id: string; description: string }[];
  developers?: string[];
  metacritic?: { score: number };
}

// Review interface
interface UserReview {
  gameName: string;
  recommended: boolean;
  reviewText: string;
  hoursPlayed: string;
}

// In-memory cache for current session (faster than IndexedDB for repeated lookups)
const sessionCache = new Map<number, GameDetails>();

function GameHoverCard({
  game,
  rank,
  totalGames,
  totalPlaytime,
  review,
}: {
  game: SteamGame;
  rank: number;
  totalGames: number;
  totalPlaytime: number;
  review?: UserReview;
}) {
  const [details, setDetails] = useState<GameDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      // Check session cache first
      if (sessionCache.has(game.appid)) {
        setDetails(sessionCache.get(game.appid)!);
        return;
      }

      // Check IndexedDB cache
      const cached = await getCachedGameDetails(game.appid);
      if (cached) {
        const details: GameDetails = {
          genres: cached.genres.map((g, i) => ({
            id: String(i),
            description: g,
          })),
          developers: cached.developers,
          metacritic: cached.metacritic ?? undefined,
        };
        sessionCache.set(game.appid, details);
        setDetails(details);
        return;
      }

      // Fetch from API
      setLoading(true);
      try {
        const res = await fetch(`/api/steam/app/${game.appid}`);
        if (res.ok) {
          const data = await res.json();
          sessionCache.set(game.appid, data);
          setDetails(data);

          // Cache to IndexedDB
          await setCachedGameDetails(
            game.appid,
            data.genres?.map((g: { description: string }) => g.description) ||
              [],
            data.price_overview?.final || null,
            data.developers || [],
            data.metacritic || null
          );
        }
      } catch (err) {
        console.error("Failed to fetch game details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [game.appid]);

  const playtimeHours = Math.round(game.playtime_forever / 60);
  const playtimePercent =
    totalPlaytime > 0
      ? ((game.playtime_forever / totalPlaytime) * 100).toFixed(1)
      : "0";

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "Never";
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <HoverCardContent
      side="left"
      align="start"
      className="w-96 p-0 overflow-hidden"
    >
      <div className="relative h-44 bg-muted overflow-hidden">
        <img
          src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
          alt={game.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute top-3 right-3 flex gap-2">
          {details?.metacritic && (
            <Badge
              className={`border-0 ${
                details.metacritic.score >= 75
                  ? "bg-green-600"
                  : details.metacritic.score >= 50
                  ? "bg-yellow-600"
                  : "bg-red-600"
              } text-white`}
            >
              {details.metacritic.score}
            </Badge>
          )}
          <Badge
            variant="secondary"
            className="bg-black/60 text-white border-0"
          >
            #{rank} / {totalGames}
          </Badge>
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-bold text-white text-lg leading-tight line-clamp-2">
            {game.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-white/60">App ID: {game.appid}</p>
            {details?.developers?.[0] && (
              <>
                <span className="text-white/40">•</span>
                <p className="text-xs text-white/60">{details.developers[0]}</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex gap-1.5 flex-wrap">
            <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            <div className="h-5 w-20 bg-muted rounded animate-pulse" />
          </div>
        ) : details?.genres?.length ? (
          <div className="flex gap-1.5 flex-wrap">
            {details.genres.slice(0, 5).map((genre) => (
              <Badge
                key={genre.id}
                variant="secondary"
                className="text-[10px] px-2 py-0.5"
              >
                {genre.description}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-semibold">
              {playtimeHours > 0
                ? `${playtimeHours.toLocaleString()}h`
                : `${game.playtime_forever}m`}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Last 2 Weeks</p>
            <p className="font-semibold">
              {game.playtime_2weeks
                ? `${Math.round(game.playtime_2weeks / 60)}h`
                : "—"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">% of Library</p>
            <p className="font-semibold">{playtimePercent}%</p>
          </div>
        </div>

        <div className="flex justify-between items-center py-2 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Last Played</p>
            <p className="text-sm font-medium">
              {formatDate(game.rtime_last_played)}
            </p>
          </div>
        </div>

        {/* User Review */}
        {review && (
          <div className="py-3 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Your Review
              </span>
              {review.recommended ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <ThumbsUp className="h-3 w-3" /> Recommended
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <ThumbsDown className="h-3 w-3" /> Not Recommended
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              &ldquo;{review.reviewText}&rdquo;
            </p>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border">
          <a
            href={`https://store.steampowered.com/app/${game.appid}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-auto py-2 flex-col gap-1"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="text-[10px]">Store</span>
            </Button>
          </a>
          <a
            href={`https://steamdb.info/app/${game.appid}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-auto py-2 flex-col gap-1"
            >
              <Database className="h-4 w-4" />
              <span className="text-[10px]">SteamDB</span>
            </Button>
          </a>
          <a
            href={`https://www.protondb.com/app/${game.appid}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-auto py-2 flex-col gap-1"
            >
              <Gamepad2 className="h-4 w-4" />
              <span className="text-[10px]">ProtonDB</span>
            </Button>
          </a>
          <a href={`steam://run/${game.appid}`}>
            <Button
              variant="default"
              size="sm"
              className="w-full h-auto py-2 flex-col gap-1"
            >
              <Trophy className="h-4 w-4" />
              <span className="text-[10px]">Play</span>
            </Button>
          </a>
        </div>
      </div>
    </HoverCardContent>
  );
}

export default function LibraryPage() {
  const games = useGamesStore((s) => s.games);
  const loading = useGamesStore((s) => s.gamesLoading);
  const refreshing = useGamesStore((s) => s.gamesRefreshing);
  const fromCache = useGamesStore((s) => s.gamesFromCache);
  const cacheAge = useGamesStore((s) => s.gamesCacheAge);
  const fetchGames = useGamesStore((s) => s.fetchGames);
  const reviews = useGamesStore((s) => s.reviews);
  const [sortField, setSortField] = useState<SortField>("playtime");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [prefetching, setPrefetching] = useState(false);
  const [prefetchProgress, setPrefetchProgress] = useState<string | null>(null);

  // Pre-fetch top games metadata
  const prefetchTopGames = useCallback(async () => {
    if (prefetching || games.length === 0) return;

    setPrefetching(true);
    setPrefetchProgress("Starting...");

    try {
      // Get top 50 most played games
      const topGames = [...games]
        .sort((a, b) => b.playtime_forever - a.playtime_forever)
        .slice(0, 50);

      const appids = topGames.map((g) => g.appid);
      setPrefetchProgress(`Fetching ${appids.length} games...`);

      const cached = await fetchAndCacheGameDetails(appids);

      // Update session cache
      cached.forEach((details, appid) => {
        sessionCache.set(appid, {
          genres: details.genres.map((g, i) => ({
            id: String(i),
            description: g,
          })),
          developers: details.developers,
          metacritic: details.metacritic ?? undefined,
        });
      });

      setPrefetchProgress(`Cached ${cached.size} games!`);
      setTimeout(() => setPrefetchProgress(null), 2000);
    } catch (err) {
      console.error("Prefetch failed:", err);
      setPrefetchProgress("Failed to prefetch");
      setTimeout(() => setPrefetchProgress(null), 2000);
    } finally {
      setPrefetching(false);
    }
  }, [games, prefetching]);

  // Create a map of game names to reviews
  const reviewMap = useMemo(() => {
    const map = new Map<string, UserReview>();
    reviews.forEach((review) => {
      map.set(review.gameName.toLowerCase(), review);
    });
    return map;
  }, [reviews]);

  const getReviewForGame = (gameName: string): UserReview | undefined => {
    return reviewMap.get(gameName.toLowerCase());
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "name" ? "asc" : "desc");
    }
  };

  const filteredAndSortedGames = useMemo(() => {
    let result = [...games];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((game) => game.name.toLowerCase().includes(query));
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "playtime":
          comparison = a.playtime_forever - b.playtime_forever;
          break;
        case "lastPlayed":
          comparison = a.rtime_last_played - b.rtime_last_played;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [games, searchQuery, sortField, sortDirection]);

  const totalPlaytime = games.reduce(
    (acc, game) => acc + game.playtime_forever,
    0
  );

  const gameRanks = useMemo(() => {
    const sorted = [...games].sort(
      (a, b) => b.playtime_forever - a.playtime_forever
    );
    const ranks = new Map<number, number>();
    sorted.forEach((game, index) => {
      ranks.set(game.appid, index + 1);
    });
    return ranks;
  }, [games]);

  const formatCacheAge = (ms: number) => {
    const minutes = Math.floor(ms / 1000 / 60);
    if (minutes < 1) return "just now";
    if (minutes === 1) return "1 min ago";
    return `${minutes} min ago`;
  };

  const formatPlaytime = (minutes: number) => {
    const hours = Math.round(minutes / 60);
    if (hours < 1) return `${minutes}m`;
    return `${hours.toLocaleString()}h`;
  };

  const formatLastPlayed = (timestamp: number) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Game Library</h1>
          <p className="text-muted-foreground">
            {games.length} games in your collection
            {reviews.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {reviews.length} reviews
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {prefetchProgress && (
            <span className="text-xs text-muted-foreground">
              {prefetchProgress}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={prefetchTopGames}
            disabled={prefetching}
            title="Pre-load metadata for top 50 games"
          >
            <Zap className={`h-4 w-4 ${prefetching ? "animate-pulse" : ""}`} />
          </Button>
          {fromCache && cacheAge !== null && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              <span>{formatCacheAge(cacheAge)}</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchGames(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Badge variant="secondary">{filteredAndSortedGames.length} games</Badge>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-12">#</TableHead>
              <TableHead className="w-14"></TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  Name <SortIcon field="name" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button
                  onClick={() => handleSort("playtime")}
                  className="flex items-center gap-2 hover:text-foreground transition-colors ml-auto"
                >
                  Playtime <SortIcon field="playtime" />
                </button>
              </TableHead>
              <TableHead className="text-right hidden sm:table-cell">
                <button
                  onClick={() => handleSort("lastPlayed")}
                  className="flex items-center gap-2 hover:text-foreground transition-colors ml-auto"
                >
                  Last Played <SortIcon field="lastPlayed" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedGames.map((game, index) => (
              <TableRow key={game.appid} className="group">
                <TableCell className="text-muted-foreground text-xs">
                  {index + 1}
                </TableCell>
                <TableCell className="p-1">
                  <div className="w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                    {game.img_icon_url ? (
                      <img
                        src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                        alt={game.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <HoverCard openDelay={300} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <span className="font-medium hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-2">
                        {game.name}
                        {getReviewForGame(game.name) && (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                              getReviewForGame(game.name)?.recommended
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                            title={
                              getReviewForGame(game.name)?.recommended
                                ? "You recommended this"
                                : "Not recommended"
                            }
                          >
                            <MessageSquare className="h-3 w-3" />
                            {getReviewForGame(game.name)?.recommended ? (
                              <ThumbsUp className="h-2.5 w-2.5" />
                            ) : (
                              <ThumbsDown className="h-2.5 w-2.5" />
                            )}
                          </span>
                        )}
                      </span>
                    </HoverCardTrigger>
                    <GameHoverCard
                      game={game}
                      rank={gameRanks.get(game.appid) || 0}
                      totalGames={games.length}
                      totalPlaytime={totalPlaytime}
                      review={getReviewForGame(game.name)}
                    />
                  </HoverCard>
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={`font-mono text-sm ${
                      game.playtime_forever > 0
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatPlaytime(game.playtime_forever)}
                  </span>
                </TableCell>
                <TableCell className="text-right hidden sm:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {formatLastPlayed(game.rtime_last_played)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredAndSortedGames.length === 0 && searchQuery && (
        <div className="text-center py-12 text-muted-foreground">
          No games found matching &quot;{searchQuery}&quot;
        </div>
      )}
    </div>
  );
}
