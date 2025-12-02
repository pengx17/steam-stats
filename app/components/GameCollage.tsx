"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { SteamGame } from "../types/steam";
import { Button } from "@/components/ui/button";
import { Download, Loader2, RefreshCw } from "lucide-react";

interface GameCollageProps {
  games: SteamGame[];
  maxGames?: number;
  userName?: string;
  steamId?: string;
  userAvatar?: string;
}

interface GameBox {
  game: SteamGame;
  w: number;
  h: number;
  x: number;
  y: number;
}

// Steam header images are 460x215 (aspect ratio ~2.14:1)
const HEADER_ASPECT_RATIO = 460 / 215;

// High DPI scale factor for better resolution
const SCALE_FACTOR = 2;

// Check if two rectangles overlap
function rectsOverlap(
  r1: { x: number; y: number; w: number; h: number },
  r2: { x: number; y: number; w: number; h: number }
): boolean {
  return !(
    r1.x + r1.w <= r2.x ||
    r2.x + r2.w <= r1.x ||
    r1.y + r1.h <= r2.y ||
    r2.y + r2.h <= r1.y
  );
}

// Check if a box overlaps with any placed boxes
function hasOverlap(
  box: { x: number; y: number; w: number; h: number },
  placedBoxes: GameBox[]
): boolean {
  for (const placed of placedBoxes) {
    if (rectsOverlap(box, placed)) {
      return true;
    }
  }
  return false;
}

// Place boxes in spiral pattern from center outward
function spiralPlacement(
  boxes: { game: SteamGame; w: number; h: number }[],
  canvasWidth: number,
  canvasHeight: number
): GameBox[] {
  const placed: GameBox[] = [];
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  for (const box of boxes) {
    let bestPos: { x: number; y: number } | null = null;
    let bestDist = Infinity;

    // Try to place at center first
    const startX = centerX - box.w / 2;
    const startY = centerY - box.h / 2;

    if (!hasOverlap({ x: startX, y: startY, w: box.w, h: box.h }, placed)) {
      bestPos = { x: startX, y: startY };
      bestDist = 0;
    } else {
      // Spiral outward to find a valid position
      const step = 8; // Search step size
      const maxRadius = Math.max(canvasWidth, canvasHeight);

      for (let radius = step; radius < maxRadius && !bestPos; radius += step) {
        // Try positions in a circle at this radius
        const circumference = 2 * Math.PI * radius;
        const numPoints = Math.max(8, Math.floor(circumference / step));

        for (let i = 0; i < numPoints; i++) {
          const angle = (2 * Math.PI * i) / numPoints;
          const x = centerX + Math.cos(angle) * radius - box.w / 2;
          const y = centerY + Math.sin(angle) * radius - box.h / 2;

          // Check bounds
          if (
            x < 0 ||
            y < 0 ||
            x + box.w > canvasWidth ||
            y + box.h > canvasHeight
          ) {
            continue;
          }

          if (!hasOverlap({ x, y, w: box.w, h: box.h }, placed)) {
            const dist = Math.sqrt(
              Math.pow(x + box.w / 2 - centerX, 2) +
                Math.pow(y + box.h / 2 - centerY, 2)
            );
            if (dist < bestDist) {
              bestDist = dist;
              bestPos = { x, y };
            }
          }
        }

        // If we found a position at this radius, use it
        if (bestPos) break;
      }
    }

    if (bestPos) {
      placed.push({
        game: box.game,
        w: box.w,
        h: box.h,
        x: bestPos.x,
        y: bestPos.y,
      });
    }
  }

  return placed;
}

// Calculate bounding box of all placed items
function getBoundingBox(boxes: GameBox[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const box of boxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.w);
    maxY = Math.max(maxY, box.y + box.h);
  }

  return { minX, minY, maxX, maxY };
}

export default function GameCollage({
  games,
  maxGames = 500,
  userName,
  steamId,
  userAvatar,
}: GameCollageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generated, setGenerated] = useState(false);
  const [canvasStyle, setCanvasStyle] = useState<{
    width: string;
    height: string;
  }>({ width: "100%", height: "auto" });

  const generateCollage = useCallback(async () => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setLoading(true);
    setProgress(0);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Filter games with playtime and sort by playtime (descending - most played first)
    const playedGames = games
      .filter((g) => g.playtime_forever > 0)
      .sort((a, b) => b.playtime_forever - a.playtime_forever)
      .slice(0, maxGames);

    if (playedGames.length === 0) {
      setLoading(false);
      return;
    }

    const maxPlaytime = playedGames[0].playtime_forever;
    const totalPlaytime = playedGames.reduce(
      (sum, g) => sum + g.playtime_forever,
      0
    );
    const totalHours = Math.round(totalPlaytime / 60);

    // Size parameters (in logical pixels, will be scaled up for high DPI)
    const minHeight = 50;
    const maxHeight = 250;

    // Create boxes with sizes based on playtime
    // Games are already sorted by playtime (highest first)
    const boxes = playedGames.map((game) => {
      const ratio = Math.sqrt(game.playtime_forever / maxPlaytime);
      const h = Math.round(minHeight + ratio * (maxHeight - minHeight));
      const w = Math.round(h * HEADER_ASPECT_RATIO);
      return { game, w, h };
    });

    // Initial canvas size for placement calculation
    const workingSize = 4000;

    // Place boxes using spiral algorithm (highest playtime = center)
    const placed = spiralPlacement(boxes, workingSize, workingSize);

    if (placed.length === 0) {
      setLoading(false);
      return;
    }

    // Calculate actual bounding box and normalize positions
    const bounds = getBoundingBox(placed);
    const padding = 40;
    const headerHeight = userName ? 80 : 0; // Add header space if user info available

    const logicalWidth = bounds.maxX - bounds.minX + padding * 2;
    const logicalHeight =
      bounds.maxY - bounds.minY + padding * 2 + headerHeight;

    // Normalize positions (offset by header)
    for (const box of placed) {
      box.x = box.x - bounds.minX + padding;
      box.y = box.y - bounds.minY + padding + headerHeight;
    }

    // Set canvas size with scale factor for high DPI
    canvas.width = logicalWidth * SCALE_FACTOR;
    canvas.height = logicalHeight * SCALE_FACTOR;

    // Scale context for high DPI rendering
    ctx.scale(SCALE_FACTOR, SCALE_FACTOR);

    // Dark background (use logical dimensions)
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    // Draw user header if available
    if (userName && headerHeight > 0) {
      // Load avatar image
      let avatarImg: HTMLImageElement | null = null;
      if (userAvatar) {
        try {
          const avatarUrl = `/api/image-proxy?url=${encodeURIComponent(
            userAvatar
          )}`;
          avatarImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = avatarUrl;
          });
        } catch {
          // Avatar loading failed, continue without it
        }
      }

      const avatarSize = 50;
      const avatarX = padding;
      const avatarY = padding - 5;

      // Draw avatar
      if (avatarImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(
          avatarX + avatarSize / 2,
          avatarY + avatarSize / 2,
          avatarSize / 2,
          0,
          Math.PI * 2
        );
        ctx.clip();
        ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        // Avatar border
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          avatarX + avatarSize / 2,
          avatarY + avatarSize / 2,
          avatarSize / 2,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }

      // Draw user name
      const textX = avatarImg ? avatarX + avatarSize + 15 : padding;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(userName, textX, avatarY + 5);

      // Draw stats
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText(
        `${playedGames.length} 款游戏 · ${totalHours.toLocaleString()} 小时`,
        textX,
        avatarY + 32
      );

      // Draw Steam ID on the right
      if (steamId) {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(
          `Steam ID: ${steamId}`,
          logicalWidth - padding,
          avatarY + 10
        );
      }

      // Separator line
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, headerHeight - 5);
      ctx.lineTo(logicalWidth - padding, headerHeight - 5);
      ctx.stroke();
    }

    // Load and draw images
    let loaded = 0;
    const totalToLoad = placed.length;

    // Load all images first
    const imageMap = new Map<number, HTMLImageElement>();

    for (const box of placed) {
      const imageUrl = `/api/image-proxy?url=${encodeURIComponent(
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${box.game.appid}/header.jpg`
      )}`;

      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = imageUrl;
        });
        imageMap.set(box.game.appid, img);
      } catch {
        // Skip failed images
      }

      loaded++;
      setProgress(Math.round((loaded / totalToLoad) * 100));
    }

    // Draw images (in reverse order so highest playtime is on top)
    for (let i = placed.length - 1; i >= 0; i--) {
      const box = placed[i];
      const img = imageMap.get(box.game.appid);

      if (img) {
        ctx.save();
        const radius = 4;
        ctx.beginPath();
        ctx.roundRect(box.x, box.y, box.w, box.h, radius);
        ctx.clip();
        ctx.drawImage(img, box.x, box.y, box.w, box.h);
        ctx.restore();

        // Border
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(box.x, box.y, box.w, box.h, radius);
        ctx.stroke();
      } else {
        // Placeholder
        ctx.fillStyle = "#1a1a24";
        const radius = 4;
        ctx.beginPath();
        ctx.roundRect(box.x, box.y, box.w, box.h, radius);
        ctx.fill();
      }
    }

    // Subtle radial gradient overlay (vignette)
    const maxDim = Math.max(logicalWidth, logicalHeight);
    const gradient = ctx.createRadialGradient(
      logicalWidth / 2,
      logicalHeight / 2,
      0,
      logicalWidth / 2,
      logicalHeight / 2,
      maxDim / 1.5
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.5, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    // Watermark
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(
      "https://steam-stats-brown.vercel.app",
      logicalWidth - padding,
      logicalHeight - padding / 2
    );

    // Calculate display size to fit container
    const containerWidth = containerRef.current?.clientWidth || 800;
    const aspectRatio = logicalWidth / logicalHeight;
    const displayWidth = containerWidth;
    const displayHeight = displayWidth / aspectRatio;

    setCanvasStyle({
      width: `${displayWidth}px`,
      height: `${displayHeight}px`,
    });

    setLoading(false);
    setGenerated(true);
  }, [games, maxGames, loading, userName, steamId, userAvatar]);

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "steam-game-collage.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const playedGamesCount = games.filter((g) => g.playtime_forever > 0).length;

  // Auto-generate on mount when games are available
  useEffect(() => {
    if (games.length > 0 && !generated && !loading) {
      // Use setTimeout to avoid calling setState directly within effect
      const timer = setTimeout(() => {
        generateCollage();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [games.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden bg-[#0a0a0f] border border-border"
      >
        <canvas
          ref={canvasRef}
          style={{
            display: generated ? "block" : "none",
            ...canvasStyle,
          }}
        />
        {!generated && (
          <div className="aspect-16/10 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">
                {loading
                  ? `正在生成拼贴画... ${progress}%`
                  : "准备生成拼贴画..."}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.min(maxGames, playedGamesCount)} 款游戏
              </p>
            </div>
          </div>
        )}
      </div>

      {generated && (
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={downloadImage}>
            <Download className="h-4 w-4 mr-2" />
            下载高清图片
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateCollage}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            重新生成
          </Button>
          <span className="text-xs text-muted-foreground">
            {Math.min(maxGames, playedGamesCount)} 款游戏 ·
            中心为游戏时长最长的游戏
          </span>
        </div>
      )}
    </div>
  );
}
