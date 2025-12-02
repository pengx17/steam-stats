"use client";

import { useState, useMemo } from "react";
import { useGamesStore } from "@/lib/stores/useGamesStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  RefreshCw,
  Clock,
  ExternalLink,
  Search,
  X,
  Filter,
  Database,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

type FilterType = "all" | "recommended" | "not_recommended";

export default function ReviewsPage() {
  const { t } = useI18n();
  const reviews = useGamesStore((s) => s.reviews);
  const loading = useGamesStore((s) => s.reviewsLoading);
  const refreshing = useGamesStore((s) => s.reviewsRefreshing);
  const fromCache = useGamesStore((s) => s.reviewsFromCache);
  const cacheAge = useGamesStore((s) => s.reviewsCacheAge);
  const fetchReviews = useGamesStore((s) => s.fetchReviews);

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredReviews = useMemo(() => {
    let result = [...reviews];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.gameName.toLowerCase().includes(query) ||
          r.reviewText.toLowerCase().includes(query)
      );
    }

    // Apply recommendation filter
    if (filter === "recommended") {
      result = result.filter((r) => r.recommended);
    } else if (filter === "not_recommended") {
      result = result.filter((r) => !r.recommended);
    }

    return result;
  }, [reviews, searchQuery, filter]);

  const stats = useMemo(() => {
    const recommended = reviews.filter((r) => r.recommended).length;
    const notRecommended = reviews.length - recommended;
    const totalHours = reviews.reduce(
      (acc, r) => acc + parseFloat(r.hoursPlayed || "0"),
      0
    );
    return { recommended, notRecommended, totalHours };
  }, [reviews]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            {t.nav.reviews}
          </h1>
          <p className="text-muted-foreground">
            共 {reviews.length} 条评测 · {stats.totalHours.toFixed(1)} 小时游戏时长
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fromCache && cacheAge !== null && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Database className="h-3 w-3" />
              {Math.round(cacheAge / 1000 / 60)} 分钟前缓存
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReviews(true)}
            disabled={refreshing}
            title="刷新评测列表"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-green-700 mb-1">
            <ThumbsUp className="h-5 w-5" />
            <span className="text-2xl font-bold">{stats.recommended}</span>
          </div>
          <p className="text-sm text-green-600">推荐</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-red-700 mb-1">
            <ThumbsDown className="h-5 w-5" />
            <span className="text-2xl font-bold">{stats.notRecommended}</span>
          </div>
          <p className="text-sm text-red-600">不推荐</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-blue-700 mb-1">
            <Clock className="h-5 w-5" />
            <span className="text-2xl font-bold">{stats.totalHours.toFixed(0)}</span>
          </div>
          <p className="text-sm text-blue-600">总时长</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索游戏或评测内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            <Filter className="h-4 w-4 mr-1" />
            全部
          </Button>
          <Button
            variant={filter === "recommended" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("recommended")}
            className={filter === "recommended" ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <ThumbsUp className="h-4 w-4 mr-1" />
            推荐
          </Button>
          <Button
            variant={filter === "not_recommended" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("not_recommended")}
            className={filter === "not_recommended" ? "bg-red-600 hover:bg-red-700" : ""}
          >
            <ThumbsDown className="h-4 w-4 mr-1" />
            不推荐
          </Button>
        </div>
      </div>

      {/* Results count */}
      {(searchQuery || filter !== "all") && (
        <p className="text-sm text-muted-foreground">
          找到 {filteredReviews.length} 条评测
        </p>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review) => (
          <div
            key={review.appId}
            className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="flex">
              {/* Game Image */}
              <div className="w-48 h-28 flex-shrink-0 bg-muted">
                <img
                  src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${review.appId}/header.jpg`}
                  alt={review.gameName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${review.appId}/capsule_184x69.jpg`;
                  }}
                />
              </div>

              {/* Content */}
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{review.gameName}</h3>
                      <Badge
                        variant={review.recommended ? "default" : "destructive"}
                        className={
                          review.recommended
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-red-600 hover:bg-red-700"
                        }
                      >
                        {review.recommended ? (
                          <ThumbsUp className="h-3 w-3 mr-1" />
                        ) : (
                          <ThumbsDown className="h-3 w-3 mr-1" />
                        )}
                        {review.recommended ? "推荐" : "不推荐"}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {review.reviewText || (
                        <span className="italic">无评测内容</span>
                      )}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <Clock className="h-4 w-4" />
                      <span>{review.hoursPlayed}h</span>
                    </div>
                    <a
                      href={`https://store.steampowered.com/app/${review.appId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredReviews.length === 0 && !loading && (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {searchQuery || filter !== "all" ? "没有找到评测" : "暂无评测"}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery || filter !== "all"
              ? "尝试调整搜索或筛选条件"
              : "去 Steam 上为你玩过的游戏写评测吧！"}
          </p>
        </div>
      )}
    </div>
  );
}
