import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // 1.5 seconds between requests

async function fetchWithRateLimit(url: string, appid: string) {
  // Wait if we're making requests too fast
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();

  // Try with exponential backoff
  const maxRetries = 2;
  let delay = 2000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (response.ok) {
      return response;
    }

    // If rate limited (403 or 429), wait and retry
    if (
      (response.status === 403 || response.status === 429) &&
      attempt < maxRetries
    ) {
      console.log(
        `[Steam API] Rate limited for appid=${appid}, waiting ${delay}ms before retry ${
          attempt + 1
        }/${maxRetries}`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
      continue;
    }

    return response;
  }

  throw new Error("Max retries exceeded");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appid: string }> }
) {
  const { appid } = await params;

  if (!appid) {
    return NextResponse.json({ error: "App ID is required" }, { status: 400 });
  }

  try {
    const response = await fetchWithRateLimit(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`,
      appid
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(
        `[Steam API Error] appid=${appid}, status=${
          response.status
        }, statusText=${response.statusText}, body=${errorText.slice(0, 500)}`
      );
      // Return empty data instead of error to not break UI
      return NextResponse.json({
        appid: parseInt(appid),
        genres: [],
        categories: [],
        developers: [],
        publishers: [],
        _error: `Steam API returned ${response.status}: ${response.statusText}`,
      });
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error(
        `[Steam API Error] appid=${appid}, failed to parse JSON:`,
        parseError
      );
      return NextResponse.json({
        appid: parseInt(appid),
        genres: [],
        categories: [],
        developers: [],
        publishers: [],
        _error: "Failed to parse Steam API response",
      });
    }

    if (!data[appid] || !data[appid].success) {
      console.warn(
        `[Steam API] appid=${appid} not found or unsuccessful, response:`,
        JSON.stringify(data).slice(0, 200)
      );
      // Game might not exist or be delisted - return minimal data
      return NextResponse.json({
        appid: parseInt(appid),
        genres: [],
        categories: [],
        developers: [],
        publishers: [],
        _error: "Game not found or delisted",
      });
    }

    const gameData = data[appid].data;

    // Extract relevant information
    const result = {
      appid: gameData.steam_appid,
      name: gameData.name,
      short_description: gameData.short_description,
      genres: gameData.genres || [],
      categories: gameData.categories || [],
      developers: gameData.developers || [],
      publishers: gameData.publishers || [],
      release_date: gameData.release_date,
      metacritic: gameData.metacritic,
      recommendations: gameData.recommendations,
      header_image: gameData.header_image,
      is_free: gameData.is_free,
      price_overview: gameData.price_overview,
    };

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(
      `[Steam API Error] appid=${appid}, error=${errorMessage}`,
      errorStack ? `\nStack: ${errorStack}` : ""
    );
    // Return empty data instead of error to not break UI
    return NextResponse.json({
      appid: parseInt(appid),
      genres: [],
      categories: [],
      developers: [],
      publishers: [],
      _error: errorMessage,
    });
  }
}
