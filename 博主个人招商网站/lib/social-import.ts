import type { PlatformKey, Video, VideoMetrics } from "@/lib/site-content";

type SocialPlatform = Exclude<PlatformKey, "bilibili">;
type JsonObject = Record<string, unknown>;

export type SocialProfileSnapshot = {
  followers: number | null;
  totalInteractions: number | null;
  workCount: number | null;
  videos: Video[];
};

const allowedHosts: Record<SocialPlatform, string[]> = {
  xiaohongshu: ["xiaohongshu.com", "www.xiaohongshu.com", "xhslink.com", "www.xhslink.com"],
  douyin: ["douyin.com", "www.douyin.com", "v.douyin.com", "iesdouyin.com", "www.iesdouyin.com"],
};

async function fetchWithDeadline(input: URL, init: RequestInit): Promise<Response> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetch(input, init),
      new Promise<Response>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("平台响应超时，请稍后重试或先手动录入。")),
          9000,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function withHttps(value: string): string {
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("http://")) return `https://${value.slice(7)}`;
  return value;
}

function metaValue(html: string, key: string): string {
  const tags = html.match(/<meta\s+[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const property = tag.match(/(?:property|name)=["']([^"']+)["']/i)?.[1];
    if (property !== key) continue;
    return decodeHtml(tag.match(/content=["']([^"']*)["']/i)?.[1] ?? "");
  }
  return "";
}

function parseCompactNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return null;
  const normal = value.replaceAll(",", "").trim().toLowerCase();
  const number = Number.parseFloat(normal);
  if (!Number.isFinite(number)) return null;
  if (normal.includes("万") || normal.endsWith("w")) return Math.round(number * 10000);
  if (normal.includes("亿")) return Math.round(number * 100000000);
  return Math.round(number);
}

function findNumber(html: string, keys: string[]): number | null {
  for (const key of keys) {
    const patterns = [
      new RegExp(`["']${key}["']\\s*:\\s*["']?([0-9.,万亿wW]+)`, "i"),
      new RegExp(`\\\\["']${key}\\\\["']\\s*:\\s*\\\\?["']?([0-9.,万亿wW]+)`, "i"),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return parseCompactNumber(match[1]);
    }
  }
  return null;
}

function safeUrl(value: string, platform: SocialPlatform): URL {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`请粘贴完整的${platform === "xiaohongshu" ? "小红书" : "抖音"}作品链接。`);
  }
  const permitted = allowedHosts[platform].some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
  );
  if (!permitted || url.protocol !== "https:") {
    throw new Error("链接域名不正确，请从对应平台复制作品链接。");
  }
  return url;
}

function stableId(platform: PlatformKey, url: URL): string {
  const raw = url.pathname.split("/").filter(Boolean).at(-1) || `${Date.now()}`;
  return `${platform}-${raw.replace(/[^0-9A-Za-z_-]/g, "").slice(0, 80)}`;
}

function parseJson(value: string): unknown {
  const normal = value.trim().replace(/;\s*$/, "").replace(/\bundefined\b/g, "null");
  try {
    return JSON.parse(normal);
  } catch {
    return null;
  }
}

function embeddedStates(html: string): unknown[] {
  const states: unknown[] = [];
  const assignmentPatterns = [
    /window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)<\/script>/gi,
    /window\.__SETUP_SERVER_STATE__\s*=\s*([\s\S]*?)<\/script>/gi,
    /window\._ROUTER_DATA\s*=\s*([\s\S]*?)<\/script>/gi,
  ];
  for (const pattern of assignmentPatterns) {
    for (const match of html.matchAll(pattern)) {
      const parsed = parseJson(match[1]);
      if (parsed) states.push(parsed);
    }
  }

  for (const id of ["RENDER_DATA", "__UNIVERSAL_DATA_FOR_REHYDRATION__", "__NEXT_DATA__"]) {
    const match = html.match(new RegExp(`<script[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`, "i"));
    if (!match?.[1]) continue;
    let source = match[1].trim();
    try {
      source = decodeURIComponent(source);
    } catch {
      // Some pages already return plain JSON.
    }
    const parsed = parseJson(source);
    if (parsed) states.push(parsed);
  }
  return states;
}

function findObject(root: unknown, predicate: (value: JsonObject) => boolean): JsonObject | null {
  const queue: unknown[] = [root];
  let visited = 0;
  while (queue.length && visited < 25000) {
    const value = queue.shift();
    visited += 1;
    if (!value || typeof value !== "object") continue;
    if (Array.isArray(value)) {
      queue.push(...value.slice(0, 200));
      continue;
    }
    const object = value as JsonObject;
    if (predicate(object)) return object;
    queue.push(...Object.values(object).slice(0, 200));
  }
  return null;
}

function objectAt(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function firstText(...values: unknown[]): string {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
}

function xiaohongshuMetrics(object: JsonObject): VideoMetrics {
  const interact = objectAt(object.interactInfo) ?? object;
  return {
    views: parseCompactNumber(interact.viewCount ?? interact.playCount ?? object.viewCount),
    likes: parseCompactNumber(interact.likedCount ?? interact.likeCount ?? object.likes),
    coins: null,
    favorites: parseCompactNumber(interact.collectedCount ?? interact.collectCount ?? object.collects),
    shares: parseCompactNumber(interact.shareCount ?? object.shares),
    comments: parseCompactNumber(interact.commentCount ?? object.comments),
    danmaku: null,
  };
}

function douyinMetrics(object: JsonObject): VideoMetrics {
  const statistics = objectAt(object.statistics) ?? objectAt(object.stats) ?? object;
  return {
    views: parseCompactNumber(statistics.play_count ?? statistics.playCount),
    likes: parseCompactNumber(statistics.digg_count ?? statistics.diggCount ?? statistics.like_count),
    coins: null,
    favorites: parseCompactNumber(statistics.collect_count ?? statistics.collectCount),
    shares: parseCompactNumber(statistics.share_count ?? statistics.shareCount),
    comments: parseCompactNumber(statistics.comment_count ?? statistics.commentCount),
    danmaku: null,
  };
}

function imageFromObject(object: JsonObject): string {
  const cover = objectAt(object.cover);
  const video = objectAt(object.video);
  const videoCover = objectAt(video?.cover ?? video?.origin_cover ?? video?.dynamic_cover);
  const imageList = Array.isArray(object.imageList) ? object.imageList : [];
  const firstImage = objectAt(imageList[0]);
  const urlList = Array.isArray(videoCover?.url_list) ? videoCover.url_list : [];
  return withHttps(firstText(
    firstImage?.urlDefault,
    firstImage?.url,
    cover?.url,
    cover?.urlDefault,
    urlList[0],
  ));
}

function videoFromState(
  platform: SocialPlatform,
  state: unknown,
  fallbackUrl: URL,
): Video | null {
  const object = findObject(state, (candidate) =>
    platform === "xiaohongshu"
      ? Boolean(candidate.interactInfo || (candidate.noteId && (candidate.imageList || candidate.cover)))
      : Boolean(candidate.aweme_id && candidate.statistics),
  );
  if (!object) return null;

  const metrics = platform === "xiaohongshu"
    ? xiaohongshuMetrics(object)
    : douyinMetrics(object);
  const id = firstText(object.noteId, object.note_id, object.aweme_id, object.id);
  const title = firstText(object.title, object.desc, object.noteTitle);
  const description = firstText(object.desc, object.description);
  const cover = imageFromObject(object);
  if (!cover && !title && !Object.values(metrics).some((value) => typeof value === "number")) return null;

  return {
    id: id ? `${platform}-${id}` : stableId(platform, fallbackUrl),
    platform,
    bvid: "",
    title,
    description,
    cover,
    url: fallbackUrl.href,
    duration: "",
    publishedAt: "",
    metrics,
    visible: true,
    pinned: false,
    dataSource: "auto",
    lastSyncedAt: new Date().toISOString(),
  };
}

function xiaohongshuProfile(state: unknown): SocialProfileSnapshot | null {
  const profile = findObject(state, (object) =>
    Boolean(object.userInfo && Array.isArray(object.noteData)),
  );
  if (!profile) return null;
  const userInfo = objectAt(profile.userInfo);
  const noteData = Array.isArray(profile.noteData) ? profile.noteData : [];
  const now = new Date().toISOString();
  const videos = noteData.flatMap((raw): Video[] => {
    const note = objectAt(raw);
    if (!note) return [];
    const id = firstText(note.noteId, note.id);
    const cover = imageFromObject(note);
    const title = firstText(note.title, note.desc);
    if (!id || (!cover && !title)) return [];
    return [{
      id: `xiaohongshu-${id}`,
      platform: "xiaohongshu",
      bvid: "",
      title,
      description: "",
      cover,
      url: `https://www.xiaohongshu.com/explore/${encodeURIComponent(id)}`,
      duration: "",
      publishedAt: "",
      metrics: xiaohongshuMetrics(note),
      visible: false,
      pinned: Boolean(note.sticky),
      dataSource: "auto",
      lastSyncedAt: now,
    }];
  });
  return {
    followers: parseCompactNumber(userInfo?.fans ?? userInfo?.fansCount),
    totalInteractions: parseCompactNumber(userInfo?.likeAndCollect ?? userInfo?.interaction),
    workCount: null,
    videos,
  };
}

function genericProfile(
  platform: SocialPlatform,
  state: unknown,
): SocialProfileSnapshot | null {
  const user = findObject(state, (object) =>
    Boolean(object.follower_count ?? object.followerCount ?? object.mplatform_followers_count),
  );
  if (!user) return null;
  return {
    followers: parseCompactNumber(
      user.follower_count ?? user.followerCount ?? user.mplatform_followers_count ?? user.fansCount,
    ),
    totalInteractions: parseCompactNumber(
      user.total_favorited ?? user.totalFavorited ?? user.likeAndCollect,
    ),
    workCount: parseCompactNumber(user.aweme_count ?? user.awemeCount ?? user.noteCount),
    videos: [],
  };
}

async function fetchPlatformPage(
  platform: SocialPlatform,
  value: string,
): Promise<{ html: string; url: URL }> {
  const inputUrl = safeUrl(value, platform);
  const response = await fetchWithDeadline(inputUrl, {
    redirect: "follow",
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.7",
      "user-agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1",
    },
  });
  if (!response.ok) throw new Error("平台暂时拒绝读取这个链接，请稍后重试或先手动录入。");
  return {
    html: (await response.text()).slice(0, 10_000_000),
    url: safeUrl(response.url || inputUrl.href, platform),
  };
}

export async function fetchSocialProfile(
  platform: SocialPlatform,
  value: string,
): Promise<SocialProfileSnapshot> {
  const { html } = await fetchPlatformPage(platform, value);
  const states = embeddedStates(html);
  for (const state of states) {
    const snapshot = platform === "xiaohongshu"
      ? xiaohongshuProfile(state)
      : genericProfile(platform, state);
    if (snapshot && (snapshot.followers !== null || snapshot.videos.length)) return snapshot;
  }
  const followers = findNumber(
    html,
    platform === "xiaohongshu"
      ? ["fans", "fansCount", "followerCount", "followers"]
      : ["followerCount", "follower_count", "mplatformFollowersCount", "fansCount"],
  );
  if (followers !== null) return { followers, totalInteractions: null, workCount: null, videos: [] };
  throw new Error("平台本次没有公开返回账号数据，已保留原有数值。");
}

export async function fetchSocialProfileFollowers(
  platform: SocialPlatform,
  value: string,
): Promise<number | null> {
  return (await fetchSocialProfile(platform, value)).followers;
}

function regexMetrics(platform: SocialPlatform, html: string): VideoMetrics {
  return {
    views: findNumber(html, ["viewCount", "playCount", "play_count", "view_count"]),
    likes: findNumber(
      html,
      platform === "douyin"
        ? ["diggCount", "digg_count", "likeCount"]
        : ["likedCount", "likeCount", "liked_count", "likes"],
    ),
    coins: null,
    favorites: findNumber(html, ["collectCount", "collectedCount", "collect_count", "collected_count"]),
    shares: findNumber(html, ["shareCount", "share_count", "repostCount"]),
    comments: findNumber(html, ["commentCount", "commentsCount", "comment_count"]),
    danmaku: null,
  };
}

export async function fetchSocialVideo(
  platform: SocialPlatform,
  value: string,
): Promise<Video> {
  const { html, url: finalUrl } = await fetchPlatformPage(platform, value);
  if (/captcha|login|verify/i.test(finalUrl.pathname)) {
    throw new Error("平台触发了访问验证，本次没有读取到作品数据；请稍后重试或手动补充。");
  }
  for (const state of embeddedStates(html)) {
    const video = videoFromState(platform, state, finalUrl);
    if (video) return video;
  }

  const title =
    metaValue(html, "og:title") ||
    metaValue(html, "twitter:title") ||
    html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ||
    "";
  const cover = withHttps(metaValue(html, "og:image") || metaValue(html, "twitter:image"));
  const description = metaValue(html, "og:description") || metaValue(html, "description");
  const metrics = regexMetrics(platform, html);
  if (!cover && !title && !description && !Object.values(metrics).some((item) => typeof item === "number")) {
    throw new Error("平台没有向未登录页面公开这条作品的数据；可稍后重试或先手动录入。");
  }

  return {
    id: stableId(platform, finalUrl),
    platform,
    bvid: "",
    title: decodeHtml(title).replace(/\s*[-_|].*?(小红书|抖音).*$/i, "").trim(),
    description: decodeHtml(description).trim(),
    cover,
    url: finalUrl.href,
    duration: "",
    publishedAt: "",
    metrics,
    visible: true,
    pinned: false,
    dataSource: "auto",
    lastSyncedAt: new Date().toISOString(),
  };
}
