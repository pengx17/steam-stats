"use client";

import { useGamesStore } from "@/lib/stores/useGamesStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Gamepad2, 
  Trophy, 
  Calendar, 
  Loader2, 
  RefreshCw,
  Database,
  ArrowRight,
  Skull
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const games = useGamesStore((s) => s.games);
  const loading = useGamesStore((s) => s.gamesLoading);
  const refreshing = useGamesStore((s) => s.gamesRefreshing);
  const fromCache = useGamesStore((s) => s.gamesFromCache);
  const cacheAge = useGamesStore((s) => s.gamesCacheAge);
  const fetchGames = useGamesStore((s) => s.fetchGames);

  const totalPlaytime = games.reduce((acc, game) => acc + game.playtime_forever, 0);
  const totalHours = Math.round(totalPlaytime / 60);
  const playedGames = games.filter(g => g.playtime_forever > 0).length;
  const unplayedGames = games.filter(g => g.playtime_forever === 0).length;
  const topGame = [...games].sort((a, b) => b.playtime_forever - a.playtime_forever)[0];
  const recentGame = [...games].filter(g => g.rtime_last_played > 0).sort((a, b) => b.rtime_last_played - a.rtime_last_played)[0];

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
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your Steam gaming overview</p>
        </div>
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
            onClick={() => fetchGames(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Playtime</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold">{totalHours.toLocaleString()}h</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Games Owned</CardTitle>
            <Gamepad2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold">{games.length}</div>
            <p className="text-xs text-muted-foreground">{playedGames} played</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Most Played</CardTitle>
            <Trophy className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-lg font-bold truncate">{topGame?.name || "None"}</div>
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
            <div className="text-lg font-bold truncate">{recentGame?.name || "None"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/library">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Gamepad2 className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Game Library</h3>
                  <p className="text-sm text-muted-foreground">{games.length} games</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/charts">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Trophy className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Statistics</h3>
                  <p className="text-sm text-muted-foreground">Charts & insights</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/shame">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-500/10">
                  <Skull className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Wall of Shame</h3>
                  <p className="text-sm text-muted-foreground">{unplayedGames} unplayed</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Games Preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recently Played</CardTitle>
          <Link href="/library">
            <Button variant="ghost" size="sm" className="gap-2">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[...games]
              .filter(g => g.rtime_last_played > 0)
              .sort((a, b) => b.rtime_last_played - a.rtime_last_played)
              .slice(0, 5)
              .map(game => (
                <div key={game.appid} className="group">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted mb-2">
                    <img
                      src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                      alt={game.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-sm font-medium truncate">{game.name}</p>
                  <p className="text-xs text-muted-foreground">{formatPlaytime(game.playtime_forever)}</p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
