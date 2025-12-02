"use client";

import { useEffect, useState } from "react";
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer, 
  Tooltip, 
} from "recharts";
import { SteamGame } from "../types/steam";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Tags, Info } from "lucide-react";
import { getCachedGameDetails, setCachedGameDetails } from "@/lib/cache";

const GENRE_COLORS: Record<string, string> = {
  "Action": "#ef4444",
  "Adventure": "#f97316",
  "RPG": "#8b5cf6",
  "Strategy": "#3b82f6",
  "Simulation": "#22c55e",
  "Casual": "#eab308",
  "Indie": "#ec4899",
  "Sports": "#14b8a6",
  "Racing": "#f97316",
  "Puzzle": "#06b6d4",
  "Shooter": "#dc2626",
  "Platformer": "#a855f7",
  "Horror": "#6b21a8",
  "Survival": "#15803d",
  "Open World": "#0891b2",
  "Multiplayer": "#2563eb",
  "Co-op": "#16a34a",
  "Singleplayer": "#ca8a04",
  "Free to Play": "#059669",
  "Early Access": "#d97706",
  "VR": "#7c3aed",
};

const FALLBACK_COLOR = "#6b7280";

interface GenreData {
  name: string;
  hours: number;
  gameCount: number;
  color: string;
}

interface GenreChartProps {
  games: SteamGame[];
}

export default function GenreChart({ games }: GenreChartProps) {
  const [genreData, setGenreData] = useState<GenreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Skip if no games
    if (games.length === 0) {
      return;
    }

    let cancelled = false;

    const fetchGenres = async () => {
      setLoading(true);
      setProgress(0);
      
      // Get top 100 games by playtime (to limit API calls)
      const topGames = [...games]
        .filter(g => g.playtime_forever > 0)
        .sort((a, b) => b.playtime_forever - a.playtime_forever)
        .slice(0, 100);

      if (topGames.length === 0) {
        setLoading(false);
        return;
      }

      const genreMap = new Map<string, { hours: number; gameCount: number }>();
      let completed = 0;

      // Fetch genres for each game
      for (const game of topGames) {
        if (cancelled) return;

        // Check IDB cache first
        const cached = await getCachedGameDetails(game.appid);
        
        if (cached && cached.genres.length > 0) {
          const hours = game.playtime_forever / 60;
          cached.genres.forEach(genre => {
            const existing = genreMap.get(genre) || { hours: 0, gameCount: 0 };
            genreMap.set(genre, { 
              hours: existing.hours + hours, 
              gameCount: existing.gameCount + 1 
            });
          });
        } else {
          try {
            const res = await fetch(`/api/steam/app/${game.appid}`);
            if (res.ok) {
              const data = await res.json();
              const genres = data.genres?.map((g: { description: string }) => g.description) || [];
              
              // Save to IDB cache
              await setCachedGameDetails(
                game.appid,
                genres,
                data.price_overview?.final ? data.price_overview.final / 100 : (data.is_free ? 0 : null),
                data.developers || [],
                data.metacritic || null
              );
              
              if (genres.length > 0) {
                const hours = game.playtime_forever / 60;
                genres.forEach((genre: string) => {
                  const existing = genreMap.get(genre) || { hours: 0, gameCount: 0 };
                  genreMap.set(genre, { 
                    hours: existing.hours + hours, 
                    gameCount: existing.gameCount + 1 
                  });
                });
              }
            }
            // Small delay to avoid rate limiting (only for API calls)
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (err) {
            console.error(`Failed to fetch genre for ${game.name}:`, err);
          }
        }
        
        completed++;
        if (!cancelled) {
          setProgress(Math.round((completed / topGames.length) * 100));
        }
      }

      if (cancelled) return;

      // Convert to array and sort by hours
      const result: GenreData[] = Array.from(genreMap.entries())
        .map(([name, data]) => ({
          name,
          hours: Math.round(data.hours),
          gameCount: data.gameCount,
          color: GENRE_COLORS[name] || FALLBACK_COLOR,
        }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 15); // Top 15 genres

      setGenreData(result);
      setLoading(false);
    };

    fetchGenres();

    return () => {
      cancelled = true;
    };
  }, [games.length]); // Use games.length to avoid unnecessary re-runs

  const CustomTooltip = ({ active, payload }: { 
    active?: boolean; 
    payload?: Array<{ payload: GenreData }> 
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{data.name}</p>
          <p className="text-muted-foreground text-sm">
            {data.hours.toLocaleString()} hours
          </p>
          <p className="text-muted-foreground text-sm">
            {data.gameCount} games with this tag
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Playtime by Genre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Loading game genres...</p>
              <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
            </div>
            <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (genreData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Playtime by Genre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No genre data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxHours = Math.max(...genreData.map(d => d.hours));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Tags className="h-4 w-4" />
              Playtime by Genre
            </CardTitle>
            <CardDescription className="mt-1">
              Based on top 100 most played games
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            <Info className="h-3 w-3" />
            <span>Games can have multiple genres</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Bar Chart */}
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={genreData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e6e6e6" />
              <XAxis 
                type="number" 
                tick={{ fontSize: 11, fill: "#6b6f76" }} 
                stroke="#e6e6e6" 
                axisLine={{ stroke: "#e6e6e6" }}
                tickFormatter={(value) => `${value}h`}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={100} 
                tick={{ fontSize: 11, fill: "#1a1a1a" }} 
                stroke="#e6e6e6"
                axisLine={{ stroke: "#e6e6e6" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="hours" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Visual bars with game count */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Game Count per Genre</h4>
            <div className="grid gap-2">
              {genreData.slice(0, 10).map((genre) => (
                <div key={genre.name} className="flex items-center gap-3">
                  <span className="text-sm w-24 truncate" title={genre.name}>{genre.name}</span>
                  <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                    <div 
                      className="h-full rounded flex items-center justify-end pr-2 text-xs font-medium text-white"
                      style={{ 
                        width: `${(genre.hours / maxHours) * 100}%`,
                        backgroundColor: genre.color,
                        minWidth: '40px'
                      }}
                    >
                      {genre.gameCount}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right">
                    {genre.hours.toLocaleString()}h
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
