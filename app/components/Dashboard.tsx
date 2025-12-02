"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import { SteamGame } from "../types/steam";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Clock, 
  Gamepad2, 
  Trophy, 
  Calendar, 
  Loader2, 
  RefreshCw,
  Database,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  ExternalLink,
  List,
  PieChart,
  Skull
} from "lucide-react";
import { getCachedGames, setCachedGames, getCacheInfo } from "@/lib/cache";
import PlaytimeChart from "./PlaytimeChart";
import WallOfShame from "./WallOfShame";

type SortField = "name" | "playtime" | "lastPlayed";
type SortDirection = "asc" | "desc";

interface GameDetails {
  genres?: { id: string; description: string }[];
  categories?: { id: number; description: string }[];
  developers?: string[];
  short_description?: string;
  metacritic?: { score: number };
  release_date?: { date: string };
}

// Simple in-memory cache for game details
const gameDetailsCache = new Map<number, GameDetails>();

interface GameHoverCardContentProps {
  game: SteamGame;
  rank: number;
  totalGames: number;
  totalLibraryPlaytime: number;
}

function GameHoverCardContent({ game, rank, totalGames, totalLibraryPlaytime }: GameHoverCardContentProps) {
  const [details, setDetails] = useState<GameDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const playtimeHours = Math.round(game.playtime_forever / 60);
  const playtimeMinutes = game.playtime_forever % 60;
  const playtime2Weeks = game.playtime_2weeks ? Math.round(game.playtime_2weeks / 60) : 0;
  
  // Calculate percentage of total library playtime
  const playtimePercent = totalLibraryPlaytime > 0 
    ? ((game.playtime_forever / totalLibraryPlaytime) * 100).toFixed(1)
    : "0";
  
  // Calculate days since last played
  const daysSinceLastPlayed = game.rtime_last_played 
    ? Math.floor((Date.now() / 1000 - game.rtime_last_played) / 86400)
    : null;

  // Fetch game details on mount
  useEffect(() => {
    const fetchDetails = async () => {
      // Check cache first
      if (gameDetailsCache.has(game.appid)) {
        setDetails(gameDetailsCache.get(game.appid)!);
        return;
      }
      
      setLoadingDetails(true);
      try {
        const res = await fetch(`/api/steam/app/${game.appid}`);
        if (res.ok) {
          const data = await res.json();
          gameDetailsCache.set(game.appid, data);
          setDetails(data);
        }
      } catch (err) {
        console.error("Failed to fetch game details:", err);
      } finally {
        setLoadingDetails(false);
      }
    };
    
    fetchDetails();
  }, [game.appid]);
  
  const formatDate = (timestamp: number) => {
    if (!timestamp) return "Never";
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const formatDaysSince = (days: number | null) => {
    if (days === null) return "Never played";
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  return (
    <HoverCardContent side="left" align="start" className="w-96 p-0 overflow-hidden">
      {/* Game Header Image */}
      <div className="relative h-44 bg-muted overflow-hidden">
        <img
          src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
          alt={game.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute top-3 right-3 flex gap-2">
          {details?.metacritic && (
            <Badge 
              className={`border-0 ${
                details.metacritic.score >= 75 
                  ? "bg-green-600 text-white" 
                  : details.metacritic.score >= 50 
                    ? "bg-yellow-600 text-white" 
                    : "bg-red-600 text-white"
              }`}
            >
              {details.metacritic.score}
            </Badge>
          )}
          <Badge variant="secondary" className="bg-black/60 text-white border-0">
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
      
      {/* Game Stats */}
      <div className="p-4 space-y-4">
        {/* Genre Tags */}
        {loadingDetails ? (
          <div className="flex gap-1.5 flex-wrap">
            <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            <div className="h-5 w-20 bg-muted rounded animate-pulse" />
            <div className="h-5 w-14 bg-muted rounded animate-pulse" />
          </div>
        ) : details?.genres && details.genres.length > 0 ? (
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
        
        {/* Playtime Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-semibold">
              {playtimeHours > 0 ? `${playtimeHours.toLocaleString()}h` : `${playtimeMinutes}m`}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Last 2 Weeks</p>
            <p className="font-semibold">
              {playtime2Weeks > 0 ? `${playtime2Weeks}h` : "—"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">% of Library</p>
            <p className="font-semibold">{playtimePercent}%</p>
          </div>
        </div>

        {/* Progress bar for playtime percentage */}
        {parseFloat(playtimePercent) > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(parseFloat(playtimePercent), 100)}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Last Played */}
        <div className="flex justify-between items-center py-2 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Last Played</p>
            <p className="text-sm font-medium">{formatDate(game.rtime_last_played)}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {formatDaysSince(daysSinceLastPlayed)}
          </Badge>
        </div>
        
        {/* External Links */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border">
          <a
            href={`https://store.steampowered.com/app/${game.appid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center"
          >
            <Button variant="ghost" size="sm" className="w-full h-auto py-2 flex-col gap-1">
              <ExternalLink className="h-4 w-4" />
              <span className="text-[10px]">Store</span>
            </Button>
          </a>
          <a
            href={`https://steamdb.info/app/${game.appid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center"
          >
            <Button variant="ghost" size="sm" className="w-full h-auto py-2 flex-col gap-1">
              <Database className="h-4 w-4" />
              <span className="text-[10px]">SteamDB</span>
            </Button>
          </a>
          <a
            href={`https://www.protondb.com/app/${game.appid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center"
          >
            <Button variant="ghost" size="sm" className="w-full h-auto py-2 flex-col gap-1">
              <Gamepad2 className="h-4 w-4" />
              <span className="text-[10px]">ProtonDB</span>
            </Button>
          </a>
          <a
            href={`steam://run/${game.appid}`}
            className="text-center"
          >
            <Button variant="default" size="sm" className="w-full h-auto py-2 flex-col gap-1">
              <Trophy className="h-4 w-4" />
              <span className="text-[10px]">Play</span>
            </Button>
          </a>
        </div>
      </div>
    </HoverCardContent>
  );
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [games, setGames] = useState<SteamGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>("playtime");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  
  // Search
  const [searchQuery, setSearchQuery] = useState("");

  const fetchGames = useCallback(async (steamId: string, forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = await getCachedGames(steamId);
      if (cached) {
        setGames(cached);
        setFromCache(true);
        const info = await getCacheInfo(steamId);
        setCacheAge(info.age);
        setLoading(false);
        return;
      }
    }

    setRefreshing(forceRefresh);
    try {
      const res = await axios.get(`/api/steam/games?steamId=${steamId}`);
      if (res.data.response && res.data.response.games) {
        const fetchedGames = res.data.response.games;
        setGames(fetchedGames);
        setFromCache(false);
        setCacheAge(null);
        await setCachedGames(steamId, fetchedGames);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      // @ts-expect-error - steamId is custom
      const steamId = session.user.steamId;
      if (steamId) {
        fetchGames(steamId);
      }
    }
  }, [session, fetchGames]);

  const handleRefresh = () => {
    if (session?.user) {
      // @ts-expect-error - steamId is custom
      const steamId = session.user.steamId;
      if (steamId) {
        fetchGames(steamId, true);
            }
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "name" ? "asc" : "desc");
      }
  };

  const filteredAndSortedGames = useMemo(() => {
    let result = [...games];
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(game => 
        game.name.toLowerCase().includes(query)
      );
    }
    
    // Sort
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

  const totalPlaytime = games.reduce((acc, game) => acc + game.playtime_forever, 0);
  const totalHours = Math.round(totalPlaytime / 60);
  const playedGames = games.filter(g => g.playtime_forever > 0).length;
  const topGame = [...games].sort((a, b) => b.playtime_forever - a.playtime_forever)[0];
  
  // Calculate rank for each game based on playtime
  const gameRanks = useMemo(() => {
    const sorted = [...games].sort((a, b) => b.playtime_forever - a.playtime_forever);
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
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="h-4 w-4" /> 
      : <ArrowDown className="h-4 w-4" />;
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
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Playtime</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{totalHours.toLocaleString()}h</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Games</CardTitle>
            <Gamepad2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{games.length}</div>
            <p className="text-xs text-muted-foreground">{playedGames} played</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Most Played</CardTitle>
            <Trophy className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-sm font-bold truncate">{topGame?.name || "None"}</div>
            <p className="text-xs text-muted-foreground">
              {topGame ? formatPlaytime(topGame.playtime_forever) : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Recently Played</CardTitle>
            <Calendar className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-sm font-bold truncate">
              {games.filter(g => g.rtime_last_played > 0).sort((a, b) => b.rtime_last_played - a.rtime_last_played)[0]?.name || "None"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="library" className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <TabsList>
            <TabsTrigger value="library" className="gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Library</span>
            </TabsTrigger>
            <TabsTrigger value="charts" className="gap-2">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Charts</span>
            </TabsTrigger>
            <TabsTrigger value="shame" className="gap-2">
              <Skull className="h-4 w-4" />
              <span className="hidden sm:inline">Wall of Shame</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Cache & Refresh */}
          <div className="flex items-center gap-2">
            {fromCache && cacheAge !== null && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <Database className="h-3 w-3" />
                <span>{formatCacheAge(cacheAge)}</span>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Library Tab */}
        <TabsContent value="library" className="space-y-4">
          {/* Search Bar */}
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

          {/* Games Table */}
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
                      Name
                      <SortIcon field="name" />
          </button>
                  </TableHead>
                  <TableHead className="text-right">
          <button 
                      onClick={() => handleSort("playtime")}
                      className="flex items-center gap-2 hover:text-foreground transition-colors ml-auto"
          >
                      Playtime
                      <SortIcon field="playtime" />
          </button>
                  </TableHead>
                  <TableHead className="text-right hidden sm:table-cell">
          <button 
                      onClick={() => handleSort("lastPlayed")}
                      className="flex items-center gap-2 hover:text-foreground transition-colors ml-auto"
          >
                      Last Played
                      <SortIcon field="lastPlayed" />
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
                          <span className="font-medium hover:text-primary transition-colors cursor-pointer">
                            {game.name}
                          </span>
                        </HoverCardTrigger>
                        <GameHoverCardContent 
                          game={game} 
                          rank={gameRanks.get(game.appid) || 0}
                          totalGames={games.length}
                          totalLibraryPlaytime={totalPlaytime}
                        />
                      </HoverCard>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-sm ${game.playtime_forever > 0 ? "text-foreground" : "text-muted-foreground"}`}>
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
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts">
          <PlaytimeChart games={games} />
        </TabsContent>

        {/* Wall of Shame Tab */}
        <TabsContent value="shame">
          <WallOfShame games={games} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
