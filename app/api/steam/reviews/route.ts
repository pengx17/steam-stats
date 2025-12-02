import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

interface ParsedReview {
  appId: string;
  gameName: string;
  recommended: boolean;
  reviewText: string;
  hoursPlayed: string;
}

// Parse reviews from a single page HTML
function parseReviewsFromHtml(html: string): Omit<ParsedReview, "gameName">[] {
  const reviews: Omit<ParsedReview, "gameName">[] = [];

  // Split by review_box to find individual reviews
  const reviewBoxes = html.split(/class="review_box(?:\s+pad)?"/);

  for (let i = 1; i < reviewBoxes.length; i++) {
    const box = reviewBoxes[i].slice(0, 5000);

    // Extract app ID - this is what we need
    const appIdMatch = box.match(/href="[^"]*\/app\/(\d+)/i);
    const appId = appIdMatch?.[1];

    if (!appId) continue;

    // Extract recommendation status - look for thumb icons
    const hasThumbDown =
      /thumbsDown|icon_thumbsDown|voted_down|not_recommended/i.test(box);
    // Default to true (recommended) if we can't determine
    const recommended = hasThumbDown ? false : true;

    // Extract hours played
    const hoursMatch = box.match(
      /(\d+[\d,\.]*)\s*hrs?\s*(?:on record|at review time)?/i
    );
    const hoursPlayed = hoursMatch ? hoursMatch[1].replace(/,/g, "") : "0";

    // Extract review content - try multiple patterns
    let reviewText = "";

    // Pattern 1: apphub_CardTextContent (new Steam layout)
    const cardTextMatch = box.match(
      /class="[^"]*apphub_CardTextContent[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    );
    if (cardTextMatch) {
      reviewText = cardTextMatch[1]
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    // Pattern 2: content div (Steam profile reviews - note: class may have trailing space)
    if (!reviewText) {
      const contentMatch = box.match(
        /<div[^>]*class="content\s*"[^>]*>([\s\S]*?)<\/div>/i
      );
      if (contentMatch) {
        reviewText = contentMatch[1]
          .replace(/<br\s*\/?>/gi, " ")
          .replace(/<[^>]*>/g, "")
          .replace(/\s+/g, " ")
          .trim();
      }
    }

    // Pattern 3: review_content
    if (!reviewText) {
      const reviewContentMatch = box.match(
        /class="[^"]*review_content[^"]*"[^>]*>([\s\S]*?)<\/div>/i
      );
      if (reviewContentMatch) {
        reviewText = reviewContentMatch[1]
          .replace(/<br\s*\/?>/gi, " ")
          .replace(/<[^>]*>/g, "")
          .replace(/\s+/g, " ")
          .trim();
      }
    }

    // Pattern 4: Look for text after review_box_content (Steam profile reviews page)
    if (!reviewText) {
      // Try to find the actual review text in the rightcol section
      const rightColMatch = box.match(
        /class="[^"]*rightcol[^"]*"[^>]*>([\s\S]*?)(?:<div class="[^"]*footer|$)/i
      );
      if (rightColMatch) {
        // Look for the review text inside rightcol (usually after vote_header)
        const innerTextMatch = rightColMatch[1].match(
          /(?:vote_header[\s\S]*?<\/div>|<\/div>)\s*([\s\S]*?)(?:<div|$)/i
        );
        if (innerTextMatch) {
          const text = innerTextMatch[1]
            .replace(/<br\s*\/?>/gi, " ")
            .replace(/<[^>]*>/g, "")
            .replace(/\s+/g, " ")
            .trim();
          if (text.length > 5) {
            reviewText = text;
          }
        }
      }
    }

    // Debug: Log first review box if no text found
    if (!reviewText && i === 1) {
      // Find potential text areas
      const textAreas = box.match(
        /<div[^>]*>((?!<div)[^<]*[a-zA-Z\u4e00-\u9fa5]{3,}[^<]*)<\/div>/g
      );
      console.log(
        `[Reviews Debug] Box ${i} appId=${appId} has ${
          textAreas?.length || 0
        } potential text areas`
      );
      if (textAreas) {
        console.log(
          `[Reviews Debug] Sample text areas:`,
          textAreas.slice(0, 3).join("\n").slice(0, 500)
        );
      }
    }

    reviewText = reviewText.slice(0, 200);

    reviews.push({ appId, recommended, reviewText, hoursPlayed });
  }

  return reviews;
}

// Check if there are more pages
function hasNextPage(html: string, currentPage: number): boolean {
  const nextPagePattern = new RegExp(`[?&]p=${currentPage + 1}`, "i");
  return nextPagePattern.test(html);
}

// Get total review count from HTML
function getTotalReviewCount(html: string): number {
  const match = html.match(/(\d+)\s*(?:Reviews?|评测|测评)/i);
  return match ? parseInt(match[1]) : 0;
}

// Get game names from Steam API for multiple app IDs
async function getGameNames(appIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();

  // Batch fetch using Steam's API (it can handle multiple apps)
  for (const appId of appIds) {
    try {
      const response = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data[appId]?.success && data[appId]?.data?.name) {
          names.set(appId, data[appId].data.name);
        }
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 100));
    } catch (e) {
      console.log(`[Reviews API] Failed to get name for app ${appId}:`, e);
    }
  }

  return names;
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const steamId = token.sub?.split("/").pop();
  if (!steamId) {
    return NextResponse.json({ error: "Steam ID not found" }, { status: 400 });
  }

  try {
    const allRawReviews: Omit<ParsedReview, "gameName">[] = [];
    let totalReviews = 0;
    let page = 1;
    const maxPages = 10;

    while (page <= maxPages) {
      const response = await fetch(
        `https://steamcommunity.com/profiles/${steamId}/reviews/?p=${page}`,
        {
          headers: {
            Accept: "text/html",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
        }
      );

      if (!response.ok) {
        console.error(`[Reviews API] Page ${page} failed: ${response.status}`);
        break;
      }

      const html = await response.text();

      if (page === 1) {
        totalReviews = getTotalReviewCount(html);
        console.log(
          `[Reviews API] steamId=${steamId}, totalReviews=${totalReviews}`
        );
      }

      const pageReviews = parseReviewsFromHtml(html);
      console.log(
        `[Reviews API] Page ${page}: found ${pageReviews.length} reviews`
      );

      if (pageReviews.length === 0) {
        break;
      }

      allRawReviews.push(...pageReviews);

      if (!hasNextPage(html, page)) {
        break;
      }

      page++;
      await new Promise((r) => setTimeout(r, 200));
    }

    // Deduplicate by app ID
    const uniqueRawReviews = Array.from(
      new Map(allRawReviews.map((r) => [r.appId, r])).values()
    );

    // Get game names for all app IDs
    const appIds = uniqueRawReviews.map((r) => r.appId);
    console.log(`[Reviews API] Fetching names for ${appIds.length} apps...`);

    const gameNames = await getGameNames(appIds);
    console.log(`[Reviews API] Got ${gameNames.size} game names`);

    // Combine reviews with game names
    const reviews: ParsedReview[] = uniqueRawReviews
      .map((r) => ({
        ...r,
        gameName: gameNames.get(r.appId) || `App ${r.appId}`,
      }))
      .filter((r) => r.gameName && !r.gameName.startsWith("App "));

    console.log(
      `[Reviews API] steamId=${steamId}, total ${reviews.length} reviews with names`
    );

    return NextResponse.json({
      totalReviews: totalReviews || reviews.length,
      reviews,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[Reviews API Error] steamId=${steamId}, error=${errorMessage}`
    );
    return NextResponse.json({
      totalReviews: 0,
      reviews: [],
      _error: errorMessage,
    });
  }
}
