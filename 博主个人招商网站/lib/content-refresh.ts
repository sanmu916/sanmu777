import { refreshBilibiliContent } from "@/lib/bilibili";
import { fetchAllDouyin } from "@/lib/douyin";
import { fetchSocialProfile, fetchSocialVideo } from "@/lib/social-import";
import type { Platform, SiteContent, Video, VideoMetrics } from "@/lib/site-content";

const DAY = 24 * 60 * 60 * 1000;

function isFresh(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && Date.now() - timestamp < DAY;
}

function mergeMetrics(current: VideoMetrics, incoming: VideoMetrics): VideoMetrics {
  return Object.fromEntries(
    Object.entries(current).map(([key, value]) => [
      key,
      incoming[key as keyof VideoMetrics] ?? value,
    ]),
  ) as unknown as VideoMetrics;
}

function mergeDuplicateMetrics(current: VideoMetrics, incoming: VideoMetrics): VideoMetrics {
  return mergeMetrics(current, incoming);
}

function canonicalTitle(value: string): string {
  if (!value || /个人主页|的主页/.test(value)) return "";
  return value.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "").slice(0, 80);
}

function coverIdentity(value: string): string {
  if (!value) return "";
  try {
    const pathname = new URL(value).pathname;
    return pathname.split("/").filter(Boolean).at(-1)?.replace(/![^/]+$/, "") ?? "";
  } catch {
    return value.split("?")[0].split("/").at(-1) ?? "";
  }
}

function isActualWorkUrl(value: string): boolean {
  return /\/(?:explore|discovery\/item|video)\//.test(value);
}

function isRefreshableSocialWork(video: Video): boolean {
  if (video.platform !== "xiaohongshu") return false;
  const match = video.url.match(/\/(?:explore|discovery\/item)\/([0-9a-f]+)/i);
  return Boolean(match?.[1] && match[1].length === 24);
}

function sameWork(left: Video, right: Video): boolean {
  if (left.platform !== right.platform) return false;
  if (left.id === right.id) return true;
  const leftCover = coverIdentity(left.cover);
  const rightCover = coverIdentity(right.cover);
  if (leftCover && rightCover && leftCover === rightCover) return true;
  const leftTitle = canonicalTitle(left.title);
  const rightTitle = canonicalTitle(right.title);
  return Boolean(leftTitle && rightTitle && leftTitle === rightTitle);
}

function preferredTitle(primary: string, fallback: string): string {
  return canonicalTitle(primary) ? primary : fallback;
}

function dedupePlatformVideos(videos: Video[], platform: Video["platform"]): Video[] {
  const others = videos.filter((video) => video.platform !== platform);
  const unique: Video[] = [];
  for (const video of videos.filter((item) => item.platform === platform)) {
    const existingIndex = unique.findIndex((item) => sameWork(item, video));
    if (existingIndex < 0) {
      unique.push(video);
      continue;
    }
    const existing = unique[existingIndex];
    unique[existingIndex] = {
      ...existing,
      title: preferredTitle(video.title, existing.title),
      description: video.description || existing.description,
      cover: video.cover || existing.cover,
      url: isActualWorkUrl(video.url) ? video.url : existing.url || video.url,
      metrics: mergeDuplicateMetrics(existing.metrics, video.metrics),
      visible: existing.visible || video.visible,
      pinned: existing.pinned || video.pinned,
      lastSyncedAt: video.lastSyncedAt || existing.lastSyncedAt,
    };
  }
  return [...others, ...unique];
}

function average(videos: Video[], key: "views" | "likes"): number | null {
  const values = videos
    .map((video) => video.metrics[key])
    .filter((value): value is number => typeof value === "number");
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function updateMetric(platform: Platform, label: string, value: number | null): Platform {
  if (value === null) return platform;
  return {
    ...platform,
    metrics: platform.metrics.map((metric) =>
      metric.label === label
        ? { ...metric, value: new Intl.NumberFormat("zh-CN").format(value) }
        : metric,
    ),
  };
}

export async function refreshPublicContent(
  content: SiteContent,
  force = false,
): Promise<SiteContent> {
  if (!force && isFresh(content.lastAutoRefresh)) return content;

  const socialVideos = content.videos.filter(
    (video) =>
      video.dataSource === "auto" &&
      video.platform === "xiaohongshu" &&
      isRefreshableSocialWork(video),
  );
  const socialPlatforms = content.platforms.filter(
    (platform) => platform.id === "xiaohongshu" && platform.autoUpdate && platform.url,
  );

  const [bilibiliResult, socialResults, profileResults, douyinResult] = await Promise.all([
    refreshBilibiliContent(content, force).catch(() => content),
    Promise.allSettled(
      socialVideos.map((video) =>
        fetchSocialVideo(video.platform as "xiaohongshu" | "douyin", video.url),
      ),
    ),
    Promise.allSettled(
      socialPlatforms.map((platform) =>
        fetchSocialProfile(
          platform.id as "xiaohongshu" | "douyin",
          platform.url,
        ),
      ),
    ),
    content.platforms.find((platform) => platform.id === "douyin")?.autoUpdate
      ? fetchAllDouyin().catch((error) => {
          console.warn("Douyin archive refresh failed:", error);
          return null;
        })
      : Promise.resolve(null),
  ]);

  const incoming = new Map<string, Video>();
  socialResults.forEach((result, index) => {
    if (result.status === "fulfilled") incoming.set(socialVideos[index].id, result.value);
  });
  let videos = bilibiliResult.videos.map((video) => {
    const refreshed = incoming.get(video.id);
    if (!refreshed) return video;
    return {
      ...video,
      title: refreshed.title || video.title,
      description: refreshed.description || video.description,
      cover: refreshed.cover || video.cover,
      url: refreshed.url || video.url,
      metrics: mergeMetrics(video.metrics, refreshed.metrics),
      lastSyncedAt: refreshed.lastSyncedAt,
    };
  });

  profileResults.forEach((result) => {
    if (result.status !== "fulfilled") return;
    for (const profileVideo of result.value.videos) {
      const existingIndex = videos.findIndex((video) => sameWork(video, profileVideo));
      if (existingIndex < 0) {
        videos.push(profileVideo);
        continue;
      }
      const existing = videos[existingIndex];
      videos[existingIndex] = {
        ...existing,
        title: preferredTitle(profileVideo.title, existing.title),
        cover: profileVideo.cover || existing.cover,
        url: isActualWorkUrl(existing.url) ? existing.url : profileVideo.url || existing.url,
        metrics: mergeMetrics(existing.metrics, profileVideo.metrics),
        pinned: existing.pinned || profileVideo.pinned,
        lastSyncedAt: profileVideo.lastSyncedAt,
      };
    }
  });

  videos = dedupePlatformVideos(videos, "xiaohongshu");

  if (douyinResult?.videos.length) {
    const existingDouyin = videos.filter((video) => video.platform === "douyin");
    const sortedIncoming = [...douyinResult.videos].sort(
      (left, right) => (right.metrics.views ?? -1) - (left.metrics.views ?? -1),
    );
    const merged = sortedIncoming.map((video, index) => {
      const existing = existingDouyin.find((item) => item.id === video.id || item.url === video.url);
      return {
        ...video,
        title: video.title || existing?.title || "",
        description: existing?.description || video.description,
        pinned: existing?.pinned ?? index < 3,
        visible: existing?.visible ?? index < 3,
      };
    });
    videos.splice(0, videos.length,
      ...videos.filter((video) => video.platform !== "douyin"),
      ...merged,
    );
  }

  const followers = new Map<string, number>();
  profileResults.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value.followers !== null) {
      followers.set(socialPlatforms[index].id, result.value.followers);
    }
  });
  const refreshedAt = new Date().toISOString();
  const platforms = bilibiliResult.platforms.map((platform) => {
    if (platform.id === "bilibili" || !platform.autoUpdate) return platform;
    const platformVideos = videos.filter((video) => video.platform === platform.id);
    let next = platform;
    if (platform.id === "douyin") {
      next = updateMetric(next, "粉丝数", douyinResult?.followers ?? null);
      next = updateMetric(next, "总获赞", douyinResult?.totalLikes ?? null);
      next = updateMetric(next, "作品数", douyinResult?.workCount ?? (platformVideos.length || null));
    } else {
      const snapshot = profileResults[0]?.status === "fulfilled" ? profileResults[0].value : null;
      next = updateMetric(next, "粉丝数", followers.get(platform.id) ?? null);
      next = updateMetric(next, "获赞与收藏", snapshot?.totalInteractions ?? null);
      next = updateMetric(next, "均获赞", average(platformVideos, "likes"));
    }
    return { ...next, lastSyncedAt: refreshedAt };
  });

  return {
    ...bilibiliResult,
    lastAutoRefresh: refreshedAt,
    platforms,
    videos,
  };
}
