export type PlatformKey = "bilibili" | "xiaohongshu" | "douyin";

export type PlatformMetric = {
  label: string;
  value: string;
};

export type Platform = {
  id: PlatformKey;
  name: string;
  role: string;
  handle: string;
  url: string;
  note: string;
  metrics: PlatformMetric[];
  autoUpdate: boolean;
  lastSyncedAt: string;
};

export type VideoMetrics = {
  views: number | null;
  likes: number | null;
  coins: number | null;
  favorites: number | null;
  shares: number | null;
  comments: number | null;
  danmaku: number | null;
};

export type Video = {
  id: string;
  platform: PlatformKey;
  bvid: string;
  title: string;
  description: string;
  cover: string;
  url: string;
  duration: string;
  publishedAt: string;
  metrics: VideoMetrics;
  visible: boolean;
  pinned: boolean;
  dataSource: "auto" | "manual";
  lastSyncedAt: string;
};

export type PriceItem = {
  id: string;
  name: string;
  price: string;
  description: string;
  featured?: boolean;
};

export type SiteContent = {
  schemaVersion: number;
  creatorName: string;
  creatorTagline: string;
  creatorBio: string;
  creatorAvatar: string;
  location: string;
  email: string;
  wechat: string;
  availability: string;
  lastUpdated: string;
  lastAutoRefresh: string;
  platforms: Platform[];
  videos: Video[];
  prices: PriceItem[];
};

const blankMetrics = (): VideoMetrics => ({
  views: null,
  likes: null,
  coins: null,
  favorites: null,
  shares: null,
  comments: null,
  danmaku: null,
});

const bilibiliMetrics = (
  views: number,
  likes: number,
  coins: number,
  favorites: number,
  shares: number,
  comments: number,
  danmaku: number,
): VideoMetrics => ({
  views,
  likes,
  coins,
  favorites,
  shares,
  comments,
  danmaku,
});

export const defaultContent: SiteContent = {
  schemaVersion: 2,
  creatorName: "森有三木",
  creatorTagline: "把复杂产品，讲成值得看完的内容。",
  creatorBio:
    "数码科技与消费电子内容创作者。用真实体验、清晰观点和多产品横向测评，帮观众把复杂参数变成可靠的购买决定。",
  creatorAvatar:
    "https://i2.hdslb.com/bfs/face/1460b13c8227033674fee7fea2795b2ecd56ed09.jpg",
  location: "中国 · 可全国合作",
  email: "未公开（请优先微信联系）",
  wechat: "seny_sanmu",
  availability: "2026 年 8 月档期开放中",
  lastUpdated: "2026-07-17",
  lastAutoRefresh: "",
  platforms: [
    {
      id: "bilibili",
      name: "B 站",
      role: "主阵地 · 深度内容",
      handle: "_森有三木 · UID 1176332153",
      url: "https://space.bilibili.com/1176332153?spm_id_from=333.1007.0.0",
      note: "中长视频首发，用完整测试和观点承载品牌信息。",
      metrics: [
        { label: "粉丝数", value: "34,869" },
        { label: "总播放", value: "297.6万" },
        { label: "总获赞", value: "10.5万" },
      ],
      autoUpdate: true,
      lastSyncedAt: "2026-07-17T00:00:00.000Z",
    },
    {
      id: "xiaohongshu",
      name: "小红书",
      role: "内容分发 · 搜索种草",
      handle: "森有三木 · 小红书号 seny_sanmu",
      url: "https://www.xiaohongshu.com/user/profile/66849b2b0000000003030a45?xsec_token=ABSx_98ZnaDq73MZzbkQjpW_ON7mMkmzIrS4Pg_tCws3M%3D&xsec_source=pc_search",
      note: "按种草逻辑重组内容，补充图文与搜索长尾曝光。",
      metrics: [
        { label: "粉丝数", value: "2,841" },
        { label: "获赞与收藏", value: "8,739" },
        { label: "均获赞", value: "485" },
      ],
      autoUpdate: true,
      lastSyncedAt: "",
    },
    {
      id: "douyin",
      name: "抖音",
      role: "内容分发 · 短视频触达",
      handle: "森有三木",
      url: "https://www.douyin.com/user/MS4wLjABAAAAUECOgC8ja5BuBOZYm5ty6DY6SUndRuf3SybTTTJmtEcTkI4MtqdW7td3yHZfjaGy?from_tab_name=main",
      note: "提炼核心观点与产品亮点，覆盖短视频消费场景。",
      metrics: [
        { label: "粉丝数", value: "1,162" },
        { label: "总获赞", value: "7,374" },
        { label: "作品数", value: "32" },
      ],
      autoUpdate: true,
      lastSyncedAt: "",
    },
  ],
  videos: [
    {
      id: "BV1LFCHYvEd7",
      platform: "bilibili",
      bvid: "BV1LFCHYvEd7",
      title: "有必要买运动相机吗？Action 4 和 Action 5 Pro 深度横测",
      description: "从真实拍摄需求出发，用完整对比帮助观众在两代运动相机之间做选择。",
      cover: "/covers/action-camera.jpg",
      url: "https://www.bilibili.com/video/BV1LFCHYvEd7",
      duration: "08:38",
      publishedAt: "2024-12-27",
      metrics: bilibiliMetrics(238908, 7230, 514, 661, 167, 705, 307),
      visible: true,
      pinned: true,
      dataSource: "auto",
      lastSyncedAt: "2026-07-17T00:00:00.000Z",
    },
    {
      id: "BV1zorrBSEAe",
      platform: "bilibili",
      bvid: "BV1zorrBSEAe",
      title: "2026 年还有必要买 Pocket 3 吗？去了趟阿勒泰后…",
      description: "把产品带进旅行场景，比较手机与口袋相机在 Vlog 创作中的真实取舍。",
      cover: "/covers/pocket3.jpg",
      url: "https://www.bilibili.com/video/BV1zorrBSEAe",
      duration: "06:21",
      publishedAt: "2026-01-16",
      metrics: bilibiliMetrics(216522, 5805, 561, 1438, 76, 160, 276),
      visible: true,
      pinned: true,
      dataSource: "auto",
      lastSyncedAt: "2026-07-17T00:00:00.000Z",
    },
    {
      id: "BV15M9CBLEtu",
      platform: "bilibili",
      bvid: "BV15M9CBLEtu",
      title: "千元人体工学椅怎么选？三款热门型号深度横测",
      description: "建立明确测试标准，对比支撑、调节、坐感与做工，给出具体选购建议。",
      cover: "/covers/ergonomic-chair.jpg",
      url: "https://www.bilibili.com/video/BV15M9CBLEtu",
      duration: "10:50",
      publishedAt: "2026-04-28",
      metrics: bilibiliMetrics(145121, 3400, 235, 215, 114, 118, 117),
      visible: true,
      pinned: true,
      dataSource: "auto",
      lastSyncedAt: "2026-07-17T00:00:00.000Z",
    },
    {
      id: "BV15QAUzXEft",
      platform: "bilibili",
      bvid: "BV15QAUzXEft",
      title: "花小钱办大事！这 10 个提升幸福感的数码好物",
      description: "从桌面改造、出行充电到拍摄工具，用真实使用感受筛选不吃灰的实用产品。",
      cover: "/covers/digital-gadgets.jpg",
      url: "https://www.bilibili.com/video/BV15QAUzXEft",
      duration: "04:45",
      publishedAt: "2026-02-27",
      metrics: bilibiliMetrics(136446, 3241, 437, 732, 86, 103, 184),
      visible: true,
      pinned: true,
      dataSource: "auto",
      lastSyncedAt: "2026-07-17T00:00:00.000Z",
    },
    {
      id: "BV1fr84zPESJ",
      platform: "bilibili",
      bvid: "BV1fr84zPESJ",
      title: "雷电 4 数据线只要四块？商家到底靠什么赚钱？",
      description: "围绕低价数据线的真实性展开验证，拆解 40Gbps、240W 和 E-Marker 等卖点。",
      cover: "/covers/thunderbolt-cable.jpg",
      url: "https://www.bilibili.com/video/BV1fr84zPESJ",
      duration: "04:17",
      publishedAt: "2025-07-26",
      metrics: bilibiliMetrics(128323, 4318, 335, 540, 89, 316, 197),
      visible: true,
      pinned: true,
      dataSource: "auto",
      lastSyncedAt: "2026-07-17T00:00:00.000Z",
    },
    {
      id: "BV1TGXhBcEAU",
      platform: "bilibili",
      bvid: "BV1TGXhBcEAU",
      title: "全景相机的后来者，大疆能否撼动影石？",
      description: "大疆 Osmo 360 与 Insta360 X5 横向对比，聚焦画质、操作与实际创作体验。",
      cover: "/covers/360-camera.jpg",
      url: "https://www.bilibili.com/video/BV1TGXhBcEAU",
      duration: "06:05",
      publishedAt: "2026-03-30",
      metrics: bilibiliMetrics(122779, 2411, 189, 603, 17, 105, 141),
      visible: true,
      pinned: true,
      dataSource: "auto",
      lastSyncedAt: "2026-07-17T00:00:00.000Z",
    },
    {
      id: "xiaohongshu-e1db9c04ac8840dc855b19c0896faf84",
      platform: "xiaohongshu",
      bvid: "",
      title: "2026年还值得买 Pocket 3 吗？",
      description: "",
      cover: "https://sns-na-i1.xhscdn.com/af6ec642-cd47-a317-2f15-1edeca067f3f?imageView2%2F2%2Fw%2F1080%2Fformat%2Fjpg&sign=43aa69ba5bc9423b1e052eaf59dbd6da&t=6a599e79",
      url: "https://www.xiaohongshu.com/user/profile/66849b2b0000000003030a45",
      duration: "",
      publishedAt: "",
      metrics: { ...blankMetrics(), likes: 613, favorites: 242, comments: 77 },
      visible: true,
      pinned: true,
      dataSource: "auto",
      lastSyncedAt: "2026-07-17T00:00:00.000Z",
    },
    {
      id: "xiaohongshu-2463c7abc70f45a197fb310926d2b5f8",
      platform: "xiaohongshu",
      bvid: "",
      title: "买 Action 4 还是 Action 5 Pro？",
      description: "",
      cover: "https://sns-na-i1.xhscdn.com/bf28e515-aeb1-f38e-7436-2d365bdd715b?imageView2%2F2%2Fw%2F1080%2Fformat%2Fjpg&sign=2a9394e6828cbc29a0fa19ae89e2a228&t=6a599e79",
      url: "https://www.xiaohongshu.com/user/profile/66849b2b0000000003030a45",
      duration: "",
      publishedAt: "",
      metrics: { ...blankMetrics(), likes: 3145, favorites: 1491, comments: 571 },
      visible: true,
      pinned: true,
      dataSource: "auto",
      lastSyncedAt: "2026-07-17T00:00:00.000Z",
    },
    {
      id: "xiaohongshu-7da719b316a34244a60df4c13aaba867",
      platform: "xiaohongshu",
      bvid: "",
      title: "耳夹式耳机戴得舒服就够了吗？",
      description: "",
      cover: "https://sns-na-i1.xhscdn.com/7ab13c71-2273-3662-462a-5e51cd942e04?imageView2%2F2%2Fw%2F1080%2Fformat%2Fjpg&sign=32235139ebffbff6329de490b815369a&t=6a599e79",
      url: "https://www.xiaohongshu.com/user/profile/66849b2b0000000003030a45",
      duration: "",
      publishedAt: "",
      metrics: { ...blankMetrics(), likes: 23, favorites: 8, comments: 2 },
      visible: true,
      pinned: false,
      dataSource: "auto",
      lastSyncedAt: "2026-07-17T00:00:00.000Z",
    },
    {
      id: "douyin-public-ear-clip",
      platform: "douyin",
      bvid: "",
      title: "耳夹式耳机戴得舒服就够了吗？",
      description: "从佩戴稳定性、漏音与长时间舒适度出发，给出更适合通勤使用的选择建议。",
      cover: "https://sns-na-i1.xhscdn.com/7ab13c71-2273-3662-462a-5e51cd942e04",
      url: "https://www.douyin.com/user/MS4wLjABAAAAUECOgC8ja5BuBOZYm5ty6DY6SUndRuf3SybTTTJmtEcTkI4MtqdW7td3yHZfjaGy",
      duration: "",
      publishedAt: "",
      metrics: { ...blankMetrics(), views: 155 },
      visible: true,
      pinned: false,
      dataSource: "auto",
      lastSyncedAt: "2026-07-17T00:00:00.000Z",
    },
    {
      id: "douyin-public-mic-mini",
      platform: "douyin",
      bvid: "",
      title: "麦克风这么卷？大疆 Mic Mini 2S 首发深度测评",
      description: "用真实收音场景验证降噪、音质与操作效率，帮助创作者快速判断升级价值。",
      cover: "https://sns-na-i4.xhscdn.com/725d6644-1f8c-5dff-d7d1-1d5b0905c83f",
      url: "https://www.douyin.com/user/MS4wLjABAAAAUECOgC8ja5BuBOZYm5ty6DY6SUndRuf3SybTTTJmtEcTkI4MtqdW7td3yHZfjaGy",
      duration: "",
      publishedAt: "",
      metrics: { ...blankMetrics(), views: 1749 },
      visible: true,
      pinned: false,
      dataSource: "auto",
      lastSyncedAt: "2026-07-17T00:00:00.000Z",
    },
    {
      id: "douyin-public-ai-earphone",
      platform: "douyin",
      bvid: "",
      title: "我以为它是耳机，结果是个 AI 打工人？",
      description: "从 AI 功能是否真正节省时间出发，拆解产品在日常工作流里的实际价值。",
      cover: "https://sns-na-i4.xhscdn.com/9b2f1e45-5afe-4707-9e84-90aff8566483",
      url: "https://www.douyin.com/user/MS4wLjABAAAAUECOgC8ja5BuBOZYm5ty6DY6SUndRuf3SybTTTJmtEcTkI4MtqdW7td3yHZfjaGy",
      duration: "",
      publishedAt: "",
      metrics: { ...blankMetrics(), views: 835 },
      visible: true,
      pinned: false,
      dataSource: "auto",
      lastSyncedAt: "2026-07-17T00:00:00.000Z",
    },
  ],
  prices: [
    {
      id: "price-1",
      name: "单品定制",
      price: "¥15,000",
      description: "B 站中长视频一期，含选题沟通、脚本、拍摄、剪辑及一轮合理修改。",
      featured: true,
    },
    {
      id: "price-2",
      name: "多品横测",
      price: "另议",
      description: "根据产品数量、测试周期、样品与内容复杂度单独评估。",
    },
    {
      id: "price-3",
      name: "短视频分发",
      price: "随案附赠",
      description: "按平台语境剪辑小红书与抖音版本，与主案同期发布。",
    },
    {
      id: "price-4",
      name: "其他需求",
      price: "欢迎沟通",
      description: "线下活动、长期年框、新品体验、素材授权与竞品排他可按需组合。",
    },
  ],
};

type LegacyPlatform = Partial<Platform> & {
  followers?: string;
  likes?: string;
  views?: string;
};

type LegacyVideo = Partial<Video> & {
  views?: number;
  viewsLabel?: string;
  likesLabel?: string;
  featured?: boolean;
};

function parseLegacyNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normal = value.replaceAll(",", "").trim();
  const amount = Number.parseFloat(normal);
  if (!Number.isFinite(amount)) return null;
  return normal.includes("万") ? Math.round(amount * 10000) : Math.round(amount);
}

function normalisePlatform(raw: LegacyPlatform | undefined, fallback: Platform): Platform {
  const metrics = Array.isArray(raw?.metrics)
    ? raw.metrics.slice(0, 3).map((item, index) => ({
        label: fallback.metrics[index]?.label ?? (typeof item?.label === "string" ? item.label : "数据"),
        value: typeof item?.value === "string" ? item.value : fallback.metrics[index]?.value ?? "—",
      }))
    : fallback.metrics.map((metric, index) => ({
        ...metric,
        value:
          index === 0 && typeof raw?.followers === "string"
            ? raw.followers
            : metric.value,
      }));

  const next = {
    ...fallback,
    ...raw,
    id: fallback.id,
    metrics,
    autoUpdate: typeof raw?.autoUpdate === "boolean" ? raw.autoUpdate : fallback.autoUpdate,
    lastSyncedAt: typeof raw?.lastSyncedAt === "string" ? raw.lastSyncedAt : fallback.lastSyncedAt,
  };
  if (next.id === "xiaohongshu" && next.metrics[0]?.value === "1,000+") {
    next.metrics[0] = { ...next.metrics[0], value: "2,841" };
  }
  next.metrics = next.metrics.map((metric, index) => ({
    ...metric,
    value: !metric.value || metric.value === "—"
      ? fallback.metrics[index]?.value ?? "—"
      : metric.value,
  }));
  return next;
}

function normaliseVideo(raw: LegacyVideo, index: number): Video {
  const platform: PlatformKey =
    raw.platform === "xiaohongshu" || raw.platform === "douyin"
      ? raw.platform
      : "bilibili";
  const bvid =
    typeof raw.bvid === "string" && raw.bvid
      ? raw.bvid
      : `${raw.url ?? raw.id ?? ""}`.match(/BV[0-9A-Za-z]{10}/)?.[0] ?? "";
  const legacyViews = parseLegacyNumber(raw.views ?? raw.viewsLabel);
  const legacyLikes = parseLegacyNumber(raw.likesLabel);
  const metrics = raw.metrics && typeof raw.metrics === "object"
    ? { ...blankMetrics(), ...raw.metrics }
    : { ...blankMetrics(), views: legacyViews, likes: legacyLikes };

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : bvid || `case-${index + 1}`,
    platform,
    bvid,
    title: typeof raw.title === "string" ? raw.title : "",
    description: typeof raw.description === "string" ? raw.description : "",
    cover: typeof raw.cover === "string" ? raw.cover : "",
    url: typeof raw.url === "string" ? raw.url : "",
    duration: typeof raw.duration === "string" ? raw.duration : "",
    publishedAt: typeof raw.publishedAt === "string" ? raw.publishedAt : "",
    metrics,
    visible: typeof raw.visible === "boolean" ? raw.visible : true,
    pinned: typeof raw.pinned === "boolean" ? raw.pinned : Boolean(raw.featured),
    dataSource: raw.dataSource === "auto" ? "auto" : "manual",
    lastSyncedAt: typeof raw.lastSyncedAt === "string" ? raw.lastSyncedAt : "",
  };
}

function migrateKnownXiaohongshuMetrics(video: Video): Video {
  if (video.platform !== "xiaohongshu") return video;
  const title = video.title.replace(/\s+/g, "").toLowerCase();
  const snapshots: Array<[string, Partial<VideoMetrics>]> = [
    ["pocket3", { likes: 613, favorites: 242, shares: 155, comments: 77 }],
    ["action4", { likes: 3145, favorites: 1491, comments: 571 }],
    ["耳夹式耳机", { likes: 23, favorites: 8, comments: 2 }],
    ["麦克风这么卷", { likes: 18, favorites: 5, comments: 7 }],
    ["ai打工人", { likes: 6, favorites: 4, comments: 0 }],
    ["安卓手机", { likes: 67, favorites: 11, comments: 1 }],
    ["搬家", { likes: 3, favorites: 1, comments: 0 }],
    ["移动升降桌", { likes: 4, favorites: 1, comments: 0 }],
  ];
  const snapshot = snapshots.find(([key]) => title.includes(key))?.[1];
  return snapshot ? { ...video, metrics: { ...video.metrics, ...snapshot } } : video;
}

export function normaliseContent(value: unknown): SiteContent {
  if (!value || typeof value !== "object") return defaultContent;
  const next = value as Partial<SiteContent> & { cases?: unknown[] };
  const rawPlatforms = Array.isArray(next.platforms) ? next.platforms : [];
  const rawVideos = Array.isArray(next.videos) ? next.videos : [];
  let migratedVideos = rawVideos.length
    ? rawVideos.map((item, index) => normaliseVideo(item as LegacyVideo, index))
    : defaultContent.videos;
  if (next.schemaVersion !== 2) {
    migratedVideos = migratedVideos.map(migrateKnownXiaohongshuMetrics);
    for (const platform of platformOrder) {
      if (migratedVideos.some((video) => video.platform === platform)) continue;
      migratedVideos.push(...defaultContent.videos.filter((video) => video.platform === platform));
    }
  }

  return {
    ...defaultContent,
    ...next,
    schemaVersion: 2,
    creatorAvatar:
      typeof next.creatorAvatar === "string" ? next.creatorAvatar : defaultContent.creatorAvatar,
    lastAutoRefresh:
      typeof next.lastAutoRefresh === "string" ? next.lastAutoRefresh : "",
    platforms: defaultContent.platforms.map((fallback) =>
      normalisePlatform(
        rawPlatforms.find((item) => item?.id === fallback.id) as LegacyPlatform | undefined,
        fallback,
      ),
    ),
    videos: migratedVideos,
    prices: Array.isArray(next.prices) ? next.prices : defaultContent.prices,
  };
}

export const platformOrder: PlatformKey[] = ["bilibili", "xiaohongshu", "douyin"];

export const platformCaseLimits: Record<PlatformKey, number> = {
  bilibili: 6,
  xiaohongshu: 3,
  douyin: 3,
};

export function getPlatformCases(content: SiteContent, platform: PlatformKey): Video[] {
  return content.videos
    .filter((video) => video.platform === platform && video.visible)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const score = (video: Video) => video.metrics.views ?? video.metrics.likes ?? -1;
      return score(b) - score(a);
    })
    .slice(0, platformCaseLimits[platform]);
}

export function createBlankVideo(platform: PlatformKey): Video {
  return {
    id: `case-${platform}-${Date.now()}`,
    platform,
    bvid: "",
    title: "",
    description: "",
    cover: "",
    url: "",
    duration: "",
    publishedAt: "",
    metrics: blankMetrics(),
    visible: true,
    pinned: false,
    dataSource: "manual",
    lastSyncedAt: "",
  };
}

export function formatCount(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("zh-CN").format(value);
}
