"use client";

import { useGamesStore } from "@/lib/stores/useGamesStore";
import WallOfShame from "../../components/WallOfShame";
import { Loader2 } from "lucide-react";

export default function ShamePage() {
  const games = useGamesStore((s) => s.games);
  const loading = useGamesStore((s) => s.gamesLoading);

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
      <div>
        <h1 className="text-2xl font-bold">Wall of Shame</h1>
        <p className="text-muted-foreground">Games you bought but never played</p>
      </div>

      {/* Wall of Shame Content */}
      <WallOfShame games={games} />
    </div>
  );
}
