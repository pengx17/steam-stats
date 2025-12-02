"use client";

import { useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useGamesStore } from "@/lib/stores/useGamesStore";

/**
 * GamesProvider initializes the Zustand store with user data.
 * It runs once when the user enters the dashboard area.
 */
export function GamesProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const { setSteamId, initializeData, reset, steamId } = useGamesStore();

  // Set steamId when session is available
  useEffect(() => {
    if (session?.user) {
      // @ts-expect-error - steamId is custom property
      const userSteamId = session.user.steamId as string;
      if (userSteamId && userSteamId !== steamId) {
        setSteamId(userSteamId);
      }
    }
  }, [session, setSteamId, steamId]);

  // Initialize data when steamId is set
  useEffect(() => {
    if (steamId) {
      initializeData();
    }
  }, [steamId, initializeData]);

  // Reset store on logout
  useEffect(() => {
    if (!session?.user) {
      reset();
    }
  }, [session, reset]);

  return <>{children}</>;
}
