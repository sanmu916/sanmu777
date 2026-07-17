import type { Platform, SiteContent, Video, VideoMetrics } from "@/lib/site-content";
import { md5 } from "@/lib/md5";

const BILIBILI_MID = "1176332153";
const DAY = 24 * 60 * 60 * 1000;

type BilibiliViewResponse = {
  code: number;
  message?: string;
  data?: {
    bvid: string;
    pic: string;
    title: string;
    desc: string;
    pubdate: number;
    duration: number;
    stat: {
      view: number;
      like: number;
      coin: number;
      favorite: number;
      share: number;
      reply: number;
      danmaku: number;
    };
  };
};

type BilibiliRelationResponse = {
  code: number;
  data?: { follower?: number };
};

type BilibiliUpstatResponse = {
  code: number;
  data?: {
    archive?: { view?: number };
    likes?: number;
  };
};

type BilibiliNavResponse = {
  data?: { wbi_img?: { img_url?: string; sub_url?: string } };
};

type BilibiliSpiResponse = {
  data?: { b_3?: string; b_4?: string };
};

type BilibiliTicketResponse = {
  data?: { ticket?: string };
};

type BilibiliArchiveResponse = {
  code: number;
  message?: string;
  data?: {
    page?: { count?: number; ps?: number };
    list?: { vlist?: Array<{ bvid?: string }> };
  };
};

const mixinKeyEncTab = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

function requestHeaders(): HeadersInit {
  return {
    accept: "application/json, text/plain, */*",
    referer: `https://space.bilibili.com/${BILIBILI_MID}/`,
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/136 Safari/537.36",
  };
}

function randomPrintable(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => String.fromCharCode(32 + (byte % 95))).join("");
}

function randomBase64(minLength: number, maxLength: number): string {
  const seed = new Uint8Array(1);
  crypto.getRandomValues(seed);
  const length = minLength + (seed[0] % (maxLength - minLength + 1));
  return btoa(randomPrintable(length))
    .replace(/=+$/, "");
}

function randomBelow(maximum: number): number {
  const seed = new Uint32Array(1);
  crypto.getRandomValues(seed);
  return seed[0] % maximum;
}

function dmInteraction(): string {
  const width = 1920;
  const height = 1080;
  const whSeed = randomBelow(114);
  const scrollTop = randomBelow(101);
  const offsetSeed = randomBelow(514);
  return JSON.stringify({
    ds: [],
    wh: [2 * width + 2 * height + 3 * whSeed, 4 * width - height + whSeed, whSeed],
    of: [3 * scrollTop + offsetSeed, 4 * scrollTop + 2 * offsetSeed, offsetSeed],
  });
}

function filenameKey(value: string | undefined): string {
  return value?.split("/").at(-1)?.split(".")[0] ?? "";
}

async function bilibiliSession(): Promise<{ cookie: string; mixinKey: string }> {
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("XgwSnGZ1p"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`ts${timestamp}`),
  );
  const hexsign = Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const [navResponse, spiResponse, ticketResponse] = await Promise.all([
    fetch("https://api.bilibili.com/x/web-interface/nav", {
      headers: requestHeaders(),
      signal: AbortSignal.timeout(12000),
    }),
    fetch("https://api.bilibili.com/x/frontend/finger/spi", {
      headers: requestHeaders(),
      signal: AbortSignal.timeout(12000),
    }),
    fetch(
      `https://api.bilibili.com/bapis/bilibili.api.ticket.v1.Ticket/GenWebTicket?key_id=ec02&hexsign=${hexsign}&context%5Bts%5D=${timestamp}&csrf=`,
      { headers: requestHeaders(), signal: AbortSignal.timeout(12000) },
    ),
  ]);
  const nav = navResponse.ok ? await navResponse.json() as BilibiliNavResponse : {};
  const spi = spiResponse.ok ? await spiResponse.json() as BilibiliSpiResponse : {};
  const ticket = ticketResponse.ok ? await ticketResponse.json() as BilibiliTicketResponse : {};
  const rawKey = filenameKey(nav.data?.wbi_img?.img_url) + filenameKey(nav.data?.wbi_img?.sub_url);
  const mixinKey = mixinKeyEncTab.map((index) => rawKey[index] ?? "").join("").slice(0, 32);
  if (!mixinKey) throw new Error("B 站本次没有返回作品列表签名密钥。");
  const cookies = [
    spi.data?.b_3 ? `buvid3=${spi.data.b_3}` : "",
    spi.data?.b_4 ? `buvid4=${spi.data.b_4}` : "",
    ticket.data?.ticket ? `bili_ticket=${ticket.data.ticket}` : "",
    `b_nut=${timestamp}`,
  ].filter(Boolean);
  return { cookie: cookies.join("; "), mixinKey };
}

function wbiQuery(params: Record<string, string>, mixinKey: string): string {
  const entries = Object.entries({ ...params, wts: String(Math.floor(Date.now() / 1000)) })
    .map(([key, value]) => [key, value.replace(/[!'()*]/g, "")] as const)
    .sort(([left], [right]) => left.localeCompare(right));
  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value).replaceAll("%20", "%20")}`)
    .join("&");
  return `${query}&w_rid=${md5(query + mixinKey)}`;
}

async function fetchAllBilibiliVideos(): Promise<Video[]> {
  const { cookie, mixinKey } = await bilibiliSession();
  const ids: string[] = [];
  let pageCount = 1;
  for (let page = 1; page <= pageCount && page <= 10; page += 1) {
    const query = wbiQuery({
      dm_cover_img_str: randomBase64(32, 128).slice(0, -2),
      dm_img_inter: dmInteraction(),
      dm_img_list: "[]",
      dm_img_str: randomBase64(16, 64).slice(0, -2),
      keyword: "",
      mid: BILIBILI_MID,
      order: "pubdate",
      order_avoided: "true",
      platform: "web",
      pn: String(page),
      ps: "30",
      tid: "0",
      web_location: "1550101",
    }, mixinKey);
    let response = await fetch(`https://api.bilibili.com/x/space/wbi/arc/search?${query}`, {
      headers: { ...requestHeaders(), cookie },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`B 站作品列表返回 ${response.status}`);
    let payload = await response.json() as BilibiliArchiveResponse;
    if (payload.code !== 0 && page === 1) {
      const fallback = new URLSearchParams({
        mid: BILIBILI_MID,
        pn: String(page),
        ps: "50",
        order: "pubdate",
        keyword: "",
        tid: "0",
      });
      response = await fetch(`https://api.bilibili.com/x/space/arc/search?${fallback}`, {
        headers: { ...requestHeaders(), cookie },
        signal: AbortSignal.timeout(15000),
      });
      if (response.ok) payload = await response.json() as BilibiliArchiveResponse;
    }
    if (payload.code !== 0 || !payload.data) {
      throw new Error(payload.message || "B 站没有返回作品列表。");
    }
    const pageSize = payload.data.page?.ps ?? 30;
    const total = payload.data.page?.count ?? 0;
    pageCount = Math.max(1, Math.ceil(total / pageSize));
    for (const item of payload.data.list?.vlist ?? []) {
      if (item.bvid) ids.push(item.bvid);
    }
  }

  const videos: Video[] = [];
  for (let offset = 0; offset < ids.length; offset += 6) {
    const batch = await Promise.allSettled(ids.slice(offset, offset + 6).map(fetchBilibiliVideo));
    for (const result of batch) {
      if (result.status === "fulfilled") videos.push(result.value);
    }
  }
  return videos;
}

function withHttps(value: string): string {
  if (value.startsWith("http://")) return `https://${value.slice(7)}`;
  if (value.startsWith("//")) return `https:${value}`;
  return value;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

export function extractBvid(value: string): string | null {
  return value.match(/BV[0-9A-Za-z]{10}/)?.[0] ?? null;
}

export async function fetchBilibiliVideo(value: string): Promise<Video> {
  const bvid = extractBvid(value.trim());
  if (!bvid) throw new Error("没有识别到有效的 B 站视频链接或 BV 号。");

  const response = await fetch(
    `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`,
    { headers: requestHeaders(), signal: AbortSignal.timeout(12000) },
  );
  if (!response.ok) throw new Error("B 站暂时没有返回视频数据，请稍后重试。");

  const payload = (await response.json()) as BilibiliViewResponse;
  if (payload.code !== 0 || !payload.data) {
    throw new Error(payload.message || "没有找到这条 B 站视频。");
  }

  const item = payload.data;
  const metrics: VideoMetrics = {
    views: item.stat.view,
    likes: item.stat.like,
    coins: item.stat.coin,
    favorites: item.stat.favorite,
    shares: item.stat.share,
    comments: item.stat.reply,
    danmaku: item.stat.danmaku,
  };
  const now = new Date().toISOString();

  return {
    id: item.bvid,
    platform: "bilibili",
    bvid: item.bvid,
    title: item.title,
    description: item.desc,
    cover: withHttps(item.pic),
    url: `https://www.bilibili.com/video/${item.bvid}`,
    duration: formatDuration(item.duration),
    publishedAt: formatDate(item.pubdate),
    metrics,
    visible: true,
    pinned: false,
    dataSource: "auto",
    lastSyncedAt: now,
  };
}

async function fetchBilibiliAccount(): Promise<{
  followers: number | null;
  totalViews: number | null;
  totalLikes: number | null;
}> {
  const [relationResult, upstatResult] = await Promise.allSettled([
    fetch(`https://api.bilibili.com/x/relation/stat?vmid=${BILIBILI_MID}`, {
      headers: requestHeaders(),
      signal: AbortSignal.timeout(12000),
    }),
    fetch(`https://api.bilibili.com/x/space/upstat?mid=${BILIBILI_MID}`, {
      headers: requestHeaders(),
      signal: AbortSignal.timeout(12000),
    }),
  ]);

  let followers: number | null = null;
  let totalViews: number | null = null;
  let totalLikes: number | null = null;

  if (relationResult.status === "fulfilled" && relationResult.value.ok) {
    const payload = (await relationResult.value.json()) as BilibiliRelationResponse;
    followers = payload.code === 0 && typeof payload.data?.follower === "number"
      ? payload.data.follower
      : null;
  }

  if (upstatResult.status === "fulfilled" && upstatResult.value.ok) {
    const payload = (await upstatResult.value.json()) as BilibiliUpstatResponse;
    if (payload.code === 0) {
      totalViews = typeof payload.data?.archive?.view === "number"
        ? payload.data.archive.view
        : null;
      totalLikes = typeof payload.data?.likes === "number" ? payload.data.likes : null;
    }
  }

  return { followers, totalViews, totalLikes };
}

function setMetric(platform: Platform, label: string, value: number | null): Platform {
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

function isFresh(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && Date.now() - timestamp < DAY;
}

export async function refreshBilibiliContent(
  content: SiteContent,
  force = false,
): Promise<SiteContent> {
  const platform = content.platforms.find((item) => item.id === "bilibili");
  if (!platform?.autoUpdate || (!force && isFresh(content.lastAutoRefresh))) return content;

  const existingVideos = content.videos.filter((video) => video.platform === "bilibili");
  const [accountResult, archiveResult] = await Promise.allSettled([
    fetchBilibiliAccount(),
    fetchAllBilibiliVideos(),
  ]);
  const refreshedAt = new Date().toISOString();
  let nextPlatform = platform;

  const archiveVideos = archiveResult.status === "fulfilled" ? archiveResult.value : [];
  if (archiveResult.status === "rejected") {
    console.warn("Bilibili archive refresh failed:", archiveResult.reason);
  }
  const totalViews = archiveVideos.length
    ? archiveVideos.reduce((sum, video) => sum + (video.metrics.views ?? 0), 0)
    : accountResult.status === "fulfilled" ? accountResult.value.totalViews : null;
  const totalLikes = archiveVideos.length
    ? archiveVideos.reduce((sum, video) => sum + (video.metrics.likes ?? 0), 0)
    : accountResult.status === "fulfilled" ? accountResult.value.totalLikes : null;
  if (accountResult.status === "fulfilled") {
    nextPlatform = setMetric(nextPlatform, "粉丝数", accountResult.value.followers);
  }
  nextPlatform = setMetric(nextPlatform, "总播放", totalViews);
  nextPlatform = setMetric(nextPlatform, "总获赞", totalLikes);
  nextPlatform = { ...nextPlatform, lastSyncedAt: refreshedAt };

  const refreshedVideos = new Map(archiveVideos.map((video) => [video.id, video]));
  const mergedBilibili = archiveVideos.length
    ? archiveVideos.map((video, index) => {
        const existing = existingVideos.find((item) => item.id === video.id || item.bvid === video.bvid);
        return {
          ...video,
          description: existing?.description || video.description,
          pinned: existing?.pinned ?? index < 6,
          visible: existing?.visible ?? index < 6,
        };
      })
    : existingVideos.map((video) => refreshedVideos.get(video.id) ?? video);

  return {
    ...content,
    lastAutoRefresh: refreshedAt,
    platforms: content.platforms.map((item) =>
      item.id === "bilibili" ? nextPlatform : item,
    ),
    videos: [
      ...mergedBilibili,
      ...content.videos.filter((video) => video.platform !== "bilibili"),
    ],
  };
}
