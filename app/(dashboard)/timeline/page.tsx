"use client";

import { useGamesStore } from "@/lib/stores/useGamesStore";
import GameTimeline from "@/app/components/GameTimeline";
import { Loader2 } from "lucide-react";

export default function TimelinePage() {
  const games = useGamesStore((s) => s.games);
  const loading = useGamesStore((s) => s.gamesLoading);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Game Timeline</h1>
        <p className="text-muted-foreground mt-1">
          A journey through your gaming history
        </p>
      </div>

      <GameTimeline games={games} />
    </div>
  );
}
