"use client";

import { useEffect, useState, useMemo } from "react";
import { SteamGame } from "../types/steam";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  Loader2,
  Sparkles,
  ThumbsDown,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getCachedGameDetails,
  setCachedGameDetails,
  clearGameDetailsCache,
} from "@/lib/cache";

interface GameWithPrice extends SteamGame {
  price?: number;
  costPerHour?: number;
  currency?: string;
  priceFormatted?: string;
}

interface ValueAnalysisProps {
  games: SteamGame[];
}

// Currency symbols
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CNY: "¥",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  RUB: "₽",
  BRL: "R$",
  AUD: "A$",
  CAD: "C$",
  KRW: "₩",
  TWD: "NT$",
  HKD: "HK$",
};

const getCurrencySymbol = (currency: string) =>
  CURRENCY_SYMBOLS[currency] || currency + " ";

export default function ValueAnalysis({ games }: ValueAnalysisProps) {
  const [gamesWithPrices, setGamesWithPrices] = useState<GameWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = async () => {
    await clearGameDetailsCache();
    setGamesWithPrices([]);
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    // Skip if no games
    if (games.length === 0) {
      return;
    }

    let cancelled = false;

    const fetchPrices = async () => {
      setLoading(true);
      setProgress(0);

      // Get top 100 games by playtime
      const topGames = [...games]
        .sort((a, b) => b.playtime_forever - a.playtime_forever)
        .slice(0, 100);

      if (topGames.length === 0) {
        setLoading(false);
        return;
      }

      const results: GameWithPrice[] = [];
      let completed = 0;

      let detectedCurrency = "USD";

      for (const game of topGames) {
        if (cancelled) return;

        let price: number | null = null;
        let currency = "USD";
        let priceFormatted = "";

        // Check IDB cache first
        const cached = await getCachedGameDetails(game.appid);

        // Only use cache if it has both price AND currency info
        // Old cache entries without currency are invalid (might have wrong currency interpretation)
        if (
          cached &&
          cached.price !== undefined &&
          cached.price !== null &&
          cached.currency
        ) {
          price = cached.price;
          currency = cached.currency;
          detectedCurrency = currency;
        } else {
          try {
            const res = await fetch(`/api/steam/app/${game.appid}`);
            if (res.ok) {
              const data = await res.json();
              if (data.price_overview) {
                // Get currency and convert to base unit
                currency = data.price_overview.currency || "USD";
                detectedCurrency = currency;
                price = data.price_overview.final / 100;
                priceFormatted = data.price_overview.final_formatted || "";
              } else if (data.is_free) {
                price = 0;
              }

              // Save to IDB cache (including currency)
              await setCachedGameDetails(
                game.appid,
                data.genres?.map(
                  (g: { description: string }) => g.description
                ) || [],
                price,
                data.developers || [],
                data.metacritic || null,
                currency
              );
            }
            // Small delay to avoid rate limiting (only for API calls)
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (err) {
            console.error(`Failed to fetch price for ${game.name}:`, err);
          }
        }

        const playtimeHours = game.playtime_forever / 60;
        results.push({
          ...game,
          price: price ?? undefined,
          currency: currency || detectedCurrency,
          priceFormatted,
          costPerHour:
            price !== null && price > 0 && playtimeHours > 0
              ? price / playtimeHours
              : undefined,
        });

        completed++;
        if (!cancelled) {
          setProgress(Math.round((completed / topGames.length) * 100));
        }
      }

      if (cancelled) return;

      setGamesWithPrices(results);
      setCurrency(detectedCurrency);
      setLoading(false);
    };

    fetchPrices();

    return () => {
      cancelled = true;
    };
  }, [games.length, refreshKey]); // Use games.length to avoid unnecessary re-runs, refreshKey to force refresh

  const stats = useMemo(() => {
    const withPrices = gamesWithPrices.filter(
      (g) => g.price !== undefined && g.price > 0
    );
    const totalValue = withPrices.reduce((sum, g) => sum + (g.price || 0), 0);
    const totalPlaytime = withPrices.reduce(
      (sum, g) => sum + g.playtime_forever / 60,
      0
    );

    // Best value games (lowest cost per hour, with at least 1 hour played)
    const bestValue = [...withPrices]
      .filter((g) => g.costPerHour !== undefined && g.playtime_forever >= 60)
      .sort((a, b) => (a.costPerHour || 999) - (b.costPerHour || 999))
      .slice(0, 10);

    // Worst value games (highest cost per hour, with price > $5)
    const worstValue = [...withPrices]
      .filter(
        (g) =>
          g.costPerHour !== undefined &&
          (g.price || 0) > 5 &&
          g.playtime_forever >= 60
      )
      .sort((a, b) => (b.costPerHour || 0) - (a.costPerHour || 0))
      .slice(0, 10);

    // Regrets (expensive games with less than 1 hour played)
    const regrets = [...withPrices]
      .filter((g) => (g.price || 0) > 10 && g.playtime_forever < 60)
      .sort((a, b) => (b.price || 0) - (a.price || 0))
      .slice(0, 10);

    // Overall cost per hour
    const overallCostPerHour =
      totalPlaytime > 0 ? totalValue / totalPlaytime : 0;

    return {
      totalValue,
      totalPlaytime,
      bestValue,
      worstValue,
      regrets,
      overallCostPerHour,
      gamesAnalyzed: withPrices.length,
    };
  }, [gamesWithPrices]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Value Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Fetching game prices...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {progress}% complete
              </p>
            </div>
            <Progress value={progress} className="w-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getValueColor = (costPerHour: number) => {
    if (costPerHour < 0.5) return "text-green-600 bg-green-50";
    if (costPerHour < 1) return "text-emerald-600 bg-emerald-50";
    if (costPerHour < 2) return "text-yellow-600 bg-yellow-50";
    if (costPerHour < 5) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Value Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Based on current Steam store prices ({currency})
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          刷新价格
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" />
              Estimated Value
            </div>
            <p className="text-2xl font-bold mt-1">
              {getCurrencySymbol(currency)}
              {stats.totalValue.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.gamesAnalyzed} games analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              Total Playtime
            </div>
            <p className="text-2xl font-bold mt-1">
              {Math.round(stats.totalPlaytime).toLocaleString()}h
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(stats.totalPlaytime / 24)} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Award className="h-4 w-4" />
              Avg Cost/Hour
            </div>
            <p className="text-2xl font-bold mt-1">
              {getCurrencySymbol(currency)}
              {stats.overallCostPerHour.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.overallCostPerHour < 1
                ? "Great value!"
                : stats.overallCostPerHour < 2
                ? "Good value"
                : "Room to improve"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertTriangle className="h-4 w-4" />
              Potential Regrets
            </div>
            <p className="text-2xl font-bold mt-1">{stats.regrets.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {getCurrencySymbol(currency)}
              {stats.regrets
                .reduce((sum, g) => sum + (g.price || 0), 0)
                .toFixed(0)}{" "}
              spent
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Best Value Games */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-green-500" />
              Best Value Games
            </CardTitle>
            <CardDescription>Lowest cost per hour played</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.bestValue.map((game, index) => (
                <div key={game.appid} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-5">
                    #{index + 1}
                  </span>
                  <img
                    src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                    alt=""
                    className="w-8 h-8 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{game.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getCurrencySymbol(currency)}
                      {game.price?.toFixed(2)} •{" "}
                      {Math.round(game.playtime_forever / 60)}h
                    </p>
                  </div>
                  <Badge className={getValueColor(game.costPerHour || 0)}>
                    {getCurrencySymbol(currency)}
                    {game.costPerHour?.toFixed(2)}/h
                  </Badge>
                </div>
              ))}
              {stats.bestValue.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Worst Value Games */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Needs More Love
            </CardTitle>
            <CardDescription>
              Highest cost per hour (play more!)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.worstValue.map((game, index) => (
                <div key={game.appid} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-5">
                    #{index + 1}
                  </span>
                  <img
                    src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                    alt=""
                    className="w-8 h-8 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{game.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getCurrencySymbol(currency)}
                      {game.price?.toFixed(2)} •{" "}
                      {Math.round(game.playtime_forever / 60)}h
                    </p>
                  </div>
                  <Badge variant="destructive">
                    {getCurrencySymbol(currency)}
                    {game.costPerHour?.toFixed(2)}/h
                  </Badge>
                </div>
              ))}
              {stats.worstValue.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regrets */}
      {stats.regrets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ThumbsDown className="h-4 w-4 text-orange-500" />
              Buyer&apos;s Regret Zone
            </CardTitle>
            <CardDescription>
              Expensive games (&gt;$10) with less than 1 hour played
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {stats.regrets.map((game) => (
                <div key={game.appid} className="text-center">
                  <div className="relative">
                    <img
                      src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/capsule_184x69.jpg`}
                      alt={game.name}
                      className="w-full rounded-lg opacity-75"
                    />
                    <Badge className="absolute top-1 right-1 bg-red-500 text-white text-xs">
                      {getCurrencySymbol(currency)}
                      {game.price?.toFixed(0)}
                    </Badge>
                  </div>
                  <p className="text-xs mt-2 truncate font-medium">
                    {game.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {game.playtime_forever} min played
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
