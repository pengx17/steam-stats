"use client";

import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { SteamGame } from "../types/steam";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Clock, Gamepad2, Trophy } from "lucide-react";
import GenreChart from "./GenreChart";

const COLORS = [
  "hsl(217, 91%, 60%)",  // Blue
  "hsl(142, 71%, 45%)",  // Green
  "hsl(38, 92%, 50%)",   // Amber
  "hsl(346, 77%, 50%)",  // Rose
  "hsl(262, 83%, 58%)",  // Purple
  "hsl(199, 89%, 48%)",  // Cyan
  "hsl(24, 95%, 53%)",   // Orange
  "hsl(173, 80%, 40%)",  // Teal
  "hsl(280, 65%, 60%)",  // Violet
  "hsl(47, 96%, 53%)",   // Yellow
];

interface PlaytimeChartProps {
  games: SteamGame[];
}

export default function PlaytimeCharts({ games }: PlaytimeChartProps) {
  // ============ TOP 10 BAR CHART DATA ============
  const sortedGames = [...games]
    .filter(g => g.playtime_forever > 0)
    .sort((a, b) => b.playtime_forever - a.playtime_forever);
  
  const top10 = sortedGames.slice(0, 10);
  
  const barChartData = top10.map(game => ({
    name: game.name.length > 12 ? game.name.substring(0, 12) + "..." : game.name,
    fullName: game.name,
    hours: Math.round(game.playtime_forever / 60),
  }));

  // ============ PLAYTIME DISTRIBUTION DATA ============
  const playtimeRanges = [
    { range: "0h", min: 0, max: 0, count: 0, color: "hsl(0, 70%, 50%)" },
    { range: "<1h", min: 1, max: 60, count: 0, color: "hsl(30, 70%, 50%)" },
    { range: "1-10h", min: 60, max: 600, count: 0, color: "hsl(45, 70%, 50%)" },
    { range: "10-50h", min: 600, max: 3000, count: 0, color: "hsl(90, 70%, 50%)" },
    { range: "50-100h", min: 3000, max: 6000, count: 0, color: "hsl(170, 70%, 50%)" },
    { range: "100-500h", min: 6000, max: 30000, count: 0, color: "hsl(200, 70%, 50%)" },
    { range: "500h+", min: 30000, max: Infinity, count: 0, color: "hsl(260, 70%, 50%)" },
  ];

  games.forEach(game => {
    const playtime = game.playtime_forever;
    for (const range of playtimeRanges) {
      if (playtime >= range.min && (playtime < range.max || range.max === Infinity)) {
        if (range.range === "0h" && playtime === 0) {
          range.count++;
          break;
        } else if (range.range !== "0h" && playtime > 0) {
          if (playtime >= range.min && playtime < range.max) {
            range.count++;
            break;
          }
        }
      }
    }
  });

  // ============ PLAYED VS UNPLAYED DATA ============
  const playedCount = games.filter(g => g.playtime_forever > 0).length;
  const unplayedCount = games.filter(g => g.playtime_forever === 0).length;
  const playedVsUnplayedData = [
    { name: "Played", value: playedCount, color: "hsl(142, 71%, 45%)" },
    { name: "Unplayed", value: unplayedCount, color: "hsl(0, 70%, 50%)" },
  ];

  // ============ RECENT ACTIVITY DATA ============
  const now = Date.now() / 1000;
  const activityData = [
    { name: "Today", count: games.filter(g => g.rtime_last_played && now - g.rtime_last_played < 86400).length },
    { name: "This Week", count: games.filter(g => g.rtime_last_played && now - g.rtime_last_played < 604800).length },
    { name: "This Month", count: games.filter(g => g.rtime_last_played && now - g.rtime_last_played < 2592000).length },
    { name: "This Year", count: games.filter(g => g.rtime_last_played && now - g.rtime_last_played < 31536000).length },
    { name: "Older", count: games.filter(g => g.rtime_last_played && now - g.rtime_last_played >= 31536000).length },
    { name: "Never", count: games.filter(g => !g.rtime_last_played || g.rtime_last_played === 0).length },
  ];

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { fullName?: string; name: string; value?: number; hours?: number; count?: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{data.fullName || data.name}</p>
          {data.value !== undefined && (
            <p className="text-muted-foreground text-sm">
              {data.value.toLocaleString()} games
            </p>
          )}
          {data.hours !== undefined && (
            <p className="text-muted-foreground text-sm">{data.hours.toLocaleString()} hours</p>
          )}
          {data.count !== undefined && (
            <p className="text-muted-foreground text-sm">{data.count} games</p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
  }) => {
    if (!cx || !cy || !midAngle || !innerRadius || !outerRadius || !percent || percent < 0.05) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
      >
        {(percent * 100).toFixed(0)}%
      </text>
    );
  };

  if (games.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No games in library
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Genre Charts - Takes full width at top */}
      <GenreChart games={games} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Played vs Unplayed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              Library Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={playedVsUnplayedData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {playedVsUnplayedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: "12px", color: "#1a1a1a" }}
                  formatter={(value: string) => {
                    const item = playedVsUnplayedData.find(d => d.name === value);
                    return `${value}: ${item?.value} games`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-center text-sm text-muted-foreground mt-2">
              {((playedCount / games.length) * 100).toFixed(1)}% of your library has been played
            </p>
          </CardContent>
        </Card>

        {/* Playtime Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Playtime Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={playtimeRanges} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e6e6" />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#6b6f76" }} stroke="#e6e6e6" axisLine={{ stroke: "#e6e6e6" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b6f76" }} stroke="#e6e6e6" axisLine={{ stroke: "#e6e6e6" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Games">
                  {playtimeRanges.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Number of games by playtime range
            </p>
          </CardContent>
        </Card>

        {/* Top 10 Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Top 10 Games (Hours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barChartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e6e6e6" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6b6f76" }} stroke="#e6e6e6" axisLine={{ stroke: "#e6e6e6" }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  tick={{ fontSize: 10, fill: "#6b6f76" }} 
                  stroke="#e6e6e6"
                  axisLine={{ stroke: "#e6e6e6" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                  {barChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Last Played Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={activityData} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e6e6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b6f76" }} stroke="#e6e6e6" axisLine={{ stroke: "#e6e6e6" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b6f76" }} stroke="#e6e6e6" axisLine={{ stroke: "#e6e6e6" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} name="Games" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-center text-sm text-muted-foreground mt-2">
              When you last played your games
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
