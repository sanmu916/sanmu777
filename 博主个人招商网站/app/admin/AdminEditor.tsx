"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import {
  createBlankVideo,
  formatCount,
  platformCaseLimits,
  platformOrder,
  type Platform,
  type PlatformKey,
  type PriceItem,
  type SiteContent,
  type Video,
  type VideoMetrics,
} from "@/lib/site-content";

type Panel = "overview" | "profile" | "platforms" | "cases" | "pricing";
type Status = { kind: "idle" | "saving" | "success" | "error"; text: string };
type LookupStatus = { kind: "idle" | "loading" | "success" | "error"; text: string };
type Drawer = { type: "video"; id: string } | { type: "price"; index: number } | null;
type CaseSort = "performance" | "newest";

const CASES_PER_PAGE = 12;

const panelMeta: Record<Panel, { label: string; eyebrow: string; description: string }> = {
  overview: { label: "总览", eyebrow: "DASHBOARD", description: "先看网站现状，再决定要改哪一块。" },
  profile: { label: "首页", eyebrow: "PROFILE", description: "创作者定位、头像、商务入口与档期。" },
  platforms: { label: "平台数据", eyebrow: "PLATFORMS", description: "三平台账号资料与核心数据一页核对。" },
  cases: { label: "商单案例", eyebrow: "WORK", description: "卡片式管理作品，点击卡片再编辑详细信息。" },
  pricing: { label: "合作报价", eyebrow: "RATE CARD", description: "管理报价项目、推荐状态与合作说明。" },
};

const metricLabels: Record<keyof VideoMetrics, string> = {
  views: "播放",
  likes: "点赞",
  coins: "投币",
  favorites: "收藏",
  shares: "转发",
  comments: "评论",
  danmaku: "弹幕",
};

const platformMetricKeys: Record<PlatformKey, (keyof VideoMetrics)[]> = {
  bilibili: ["views", "likes", "coins", "favorites", "shares", "comments", "danmaku"],
  xiaohongshu: ["views", "likes", "favorites", "shares", "comments"],
  douyin: ["views", "likes", "favorites", "shares", "comments"],
};

const platformMarks: Record<PlatformKey, string> = {
  bilibili: "B",
  xiaohongshu: "RED",
  douyin: "DY",
};

function platformName(platform: PlatformKey): string {
  if (platform === "bilibili") return "B站";
  if (platform === "xiaohongshu") return "小红书";
  return "抖音";
}

function mediaUrl(value: string): string {
  if (!value || value.startsWith("/")) return value;
  return `/api/media-proxy?url=${encodeURIComponent(value)}`;
}

const blankPrice = (): PriceItem => ({
  id: `price-${Date.now()}`,
  name: "",
  price: "",
  description: "",
  featured: false,
});

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  type = "text",
  wide,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
  wide?: boolean;
}) {
  return (
    <label className={`admin-field${multiline || wide ? " admin-field--wide" : ""}`}>
      <span>{label}</span>
      {multiline ? (
        <textarea rows={4} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function VideoMetricsPreview({ video }: { video: Video }) {
  const keys = video.platform === "bilibili"
    ? (["views", "likes", "favorites", "comments"] as const)
    : (["views", "likes", "favorites", "comments"] as const);
  return (
    <dl className="video-card__metrics">
      {keys.map((key) => (
        <div key={key}>
          <dt>{metricLabels[key]}</dt>
          <dd>{formatCount(video.metrics[key])}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AdminEditor({ initialContent }: { initialContent: SiteContent }) {
  const [content, setContent] = useState<SiteContent>(initialContent);
  const [activePanel, setActivePanel] = useState<Panel>("overview");
  const [activePlatform, setActivePlatform] = useState<PlatformKey>("bilibili");
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [caseSearch, setCaseSearch] = useState("");
  const [caseSort, setCaseSort] = useState<CaseSort>("performance");
  const [caseOnlySelected, setCaseOnlySelected] = useState(false);
  const [casePage, setCasePage] = useState(1);
  const [status, setStatus] = useState<Status>({ kind: "idle", text: "没有未保存的修改" });
  const [syncStatus, setSyncStatus] = useState<LookupStatus>({ kind: "idle", text: "" });
  const [imports, setImports] = useState<Record<PlatformKey, string>>({ bilibili: "", xiaohongshu: "", douyin: "" });
  const [importStatuses, setImportStatuses] = useState<Record<PlatformKey, LookupStatus>>({
    bilibili: { kind: "idle", text: "" },
    xiaohongshu: { kind: "idle", text: "" },
    douyin: { kind: "idle", text: "" },
  });

  const selectedVideo = drawer?.type === "video"
    ? content.videos.find((video) => video.id === drawer.id) ?? null
    : null;
  const selectedPrice = drawer?.type === "price" ? content.prices[drawer.index] ?? null : null;
  const visibleCounts = useMemo(() => Object.fromEntries(
    platformOrder.map((platform) => [platform, content.videos.filter((video) => video.platform === platform && video.visible).length]),
  ) as Record<PlatformKey, number>, [content.videos]);

  const markDirty = () => setStatus({ kind: "idle", text: "有未保存的修改" });

  const updateRoot = (
    key: "creatorName" | "creatorTagline" | "creatorBio" | "creatorAvatar" | "location" | "email" | "wechat" | "availability",
    value: string,
  ) => {
    setContent((current) => ({ ...current, [key]: value }));
    markDirty();
  };

  const updatePlatform = (index: number, patch: Partial<Platform>) => {
    setContent((current) => ({
      ...current,
      platforms: current.platforms.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
    markDirty();
  };

  const updateVideo = (videoId: string, patch: Partial<Video>) => {
    setContent((current) => ({
      ...current,
      videos: current.videos.map((item) => item.id === videoId ? { ...item, ...patch } : item),
    }));
    markDirty();
  };

  const updateVideoMetric = (video: Video, key: keyof VideoMetrics, value: string) => {
    updateVideo(video.id, {
      metrics: { ...video.metrics, [key]: value.trim() === "" ? null : Number(value) || 0 },
      dataSource: video.platform === "bilibili" ? video.dataSource : "manual",
    });
  };

  const updatePrice = (index: number, patch: Partial<PriceItem>) => {
    setContent((current) => ({
      ...current,
      prices: current.prices.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
    markDirty();
  };

  const save = async () => {
    setStatus({ kind: "saving", text: "正在保存…" });
    try {
      const response = await fetch("/api/content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(content),
      });
      const result = (await response.json()) as SiteContent & { error?: string };
      if (!response.ok) throw new Error(result.error || "保存失败");
      setContent(result);
      setStatus({ kind: "success", text: "已保存，前台内容已更新" });
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "保存失败" });
    }
  };

  const syncAll = async () => {
    setSyncStatus({ kind: "loading", text: "正在检查三个平台的公开数据…" });
    try {
      const response = await fetch("/api/content/refresh", { method: "POST" });
      const result = (await response.json()) as SiteContent & { error?: string };
      if (!response.ok) throw new Error(result.error || "同步失败");
      setContent(result);
      setSyncStatus({ kind: "success", text: "同步完成。平台未公开的项目已保留原值。" });
      setStatus({ kind: "success", text: "最新数据已同步并保存" });
    } catch (error) {
      setSyncStatus({ kind: "error", text: error instanceof Error ? error.message : "同步失败" });
    }
  };

  const mergeImportedVideo = (result: Video, existing?: Video) => {
    setContent((current) => {
      const target = existing ?? current.videos.find((item) => item.id === result.id || item.url === result.url);
      if (!target) return { ...current, videos: [...current.videos, result] };
      return {
        ...current,
        videos: current.videos.map((item) => {
          if (item.id !== target.id) return item;
          const metrics = Object.fromEntries(Object.entries(item.metrics).map(([key, value]) => [
            key,
            result.metrics[key as keyof VideoMetrics] ?? value,
          ])) as unknown as VideoMetrics;
          return {
            ...item,
            ...result,
            id: item.id,
            title: result.title || item.title,
            description: result.description || item.description,
            cover: result.cover || item.cover,
            metrics,
            pinned: item.pinned,
            visible: item.visible,
          };
        }),
      };
    });
    markDirty();
  };

  const importVideo = async (platform: PlatformKey, value: string, existing?: Video) => {
    if (!value.trim()) {
      setImportStatuses((current) => ({ ...current, [platform]: { kind: "error", text: "请先粘贴作品链接。" } }));
      return;
    }
    setImportStatuses((current) => ({ ...current, [platform]: { kind: "loading", text: "正在读取公开数据…" } }));
    try {
      const response = await fetch(platform === "bilibili" ? "/api/bilibili/video" : "/api/social/video", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(platform === "bilibili" ? { value } : { platform, value }),
      });
      const result = (await response.json()) as Video & { error?: string };
      if (!response.ok) throw new Error(result.error || "自动导入失败");
      mergeImportedVideo(result, existing);
      setImports((current) => ({ ...current, [platform]: "" }));
      setImportStatuses((current) => ({
        ...current,
        [platform]: { kind: "success", text: "标题、封面与可公开互动数据已导入。" },
      }));
    } catch (error) {
      setImportStatuses((current) => ({
        ...current,
        [platform]: { kind: "error", text: error instanceof Error ? error.message : "自动导入失败" },
      }));
    }
  };

  const addVideo = (platform: PlatformKey) => {
    const video = createBlankVideo(platform);
    setContent((current) => ({ ...current, videos: [...current.videos, video] }));
    setDrawer({ type: "video", id: video.id });
    markDirty();
  };

  const removeVideo = (videoId: string) => {
    setContent((current) => ({ ...current, videos: current.videos.filter((item) => item.id !== videoId) }));
    setDrawer(null);
    markDirty();
  };

  const renderOverview = () => (
    <div className="dashboard-grid">
      <section className="dashboard-hero">
        <div>
          <span>内容工作台</span>
          <h2>先看全局，<br />再动手修改。</h2>
          <p>网站共有 {content.videos.length} 条作品、{content.prices.length} 个报价项目。三平台顺序已固定。</p>
        </div>
        <button type="button" onClick={syncAll} disabled={syncStatus.kind === "loading"}>
          {syncStatus.kind === "loading" ? "同步中…" : "同步全部平台"}
        </button>
        {syncStatus.text && <p className={`lookup-status lookup-status--${syncStatus.kind}`}>{syncStatus.text}</p>}
      </section>
      <section className="dashboard-platforms">
        {content.platforms.map((platform) => (
          <button type="button" className={`dashboard-platform dashboard-platform--${platform.id}`} key={platform.id} onClick={() => setActivePanel("platforms")}>
            <span>{platformMarks[platform.id]}</span>
            <strong>{platform.name}</strong>
            <div>
              {platform.metrics.map((metric) => (
                <p key={metric.label}><b>{metric.value || "—"}</b><small>{metric.label}</small></p>
              ))}
            </div>
          </button>
        ))}
      </section>
      <section className="dashboard-preview">
        <div>
          <span>实时预览</span>
          <a href="/" target="_blank" rel="noreferrer">新窗口打开 ↗</a>
        </div>
        <iframe src="/" title="网站实时预览" loading="lazy" />
      </section>
      <section className="dashboard-counts">
        {platformOrder.map((platform) => (
          <button type="button" key={platform} onClick={() => { setActivePlatform(platform); setActivePanel("cases"); }}>
            <span>{platformName(platform)}</span>
            <strong>{visibleCounts[platform]}</strong>
            <small>条可见案例</small>
          </button>
        ))}
      </section>
    </div>
  );

  const renderProfile = () => (
    <section className="form-panel">
      <div className="form-panel__avatar">
        <img src={mediaUrl(content.creatorAvatar)} alt="头像预览" referrerPolicy="no-referrer" />
        <div><span>头像预览</span><strong>{content.creatorName}</strong></div>
      </div>
      <div className="field-grid">
        <Field label="创作者名称" value={content.creatorName} onChange={(value) => updateRoot("creatorName", value)} />
        <Field label="当前档期" value={content.availability} onChange={(value) => updateRoot("availability", value)} />
        <Field label="首页主标题" value={content.creatorTagline} onChange={(value) => updateRoot("creatorTagline", value)} multiline />
        <Field label="个人介绍" value={content.creatorBio} onChange={(value) => updateRoot("creatorBio", value)} multiline />
        <Field label="头像图片链接" value={content.creatorAvatar} onChange={(value) => updateRoot("creatorAvatar", value)} wide />
        <Field label="商务微信" value={content.wechat} onChange={(value) => updateRoot("wechat", value)} />
        <Field label="商务邮箱" value={content.email} onChange={(value) => updateRoot("email", value)} />
        <Field label="合作地区" value={content.location} onChange={(value) => updateRoot("location", value)} />
      </div>
    </section>
  );

  const renderPlatforms = () => (
    <div className="platform-settings-grid">
      {content.platforms.map((platform, index) => (
        <section className={`platform-setting platform-setting--${platform.id}`} key={platform.id}>
          <header><span>{platformMarks[platform.id]}</span><div><small>0{index + 1}</small><h3>{platform.name}</h3></div></header>
          <div className="platform-setting__metrics">
            {platform.metrics.map((metric, metricIndex) => (
              <label key={metric.label}>
                <span>{metric.label}</span>
                <input value={metric.value} onChange={(event) => updatePlatform(index, {
                  metrics: platform.metrics.map((item, itemIndex) => itemIndex === metricIndex ? { ...item, value: event.target.value } : item),
                })} />
              </label>
            ))}
          </div>
          <div className="field-grid field-grid--single">
            <Field label="账号名 / ID" value={platform.handle} onChange={(value) => updatePlatform(index, { handle: value })} />
            <Field label="主页链接" value={platform.url} onChange={(value) => updatePlatform(index, { url: value })} />
            <Field label="平台定位" value={platform.role} onChange={(value) => updatePlatform(index, { role: value })} />
            <Field label="平台说明" value={platform.note} onChange={(value) => updatePlatform(index, { note: value })} multiline />
          </div>
          <label className="admin-check">
            <input type="checkbox" checked={platform.autoUpdate} onChange={(event) => updatePlatform(index, { autoUpdate: event.target.checked })} />
            <span>每天自动检查公开数据</span>
          </label>
        </section>
      ))}
    </div>
  );

  const renderCases = () => {
    const search = caseSearch.trim().toLowerCase();
    const score = (video: Video) => video.metrics.views ?? video.metrics.likes ?? -1;
    const videos = content.videos
      .filter((video) => video.platform === activePlatform)
      .filter((video) => !caseOnlySelected || video.visible)
      .filter((video) => !search || `${video.title} ${video.description}`.toLowerCase().includes(search))
      .sort((left, right) => {
        if (caseSort === "newest") {
          return (Date.parse(right.publishedAt) || 0) - (Date.parse(left.publishedAt) || 0);
        }
        return score(right) - score(left);
      });
    const pageCount = Math.max(1, Math.ceil(videos.length / CASES_PER_PAGE));
    const currentPage = Math.min(casePage, pageCount);
    const pageVideos = videos.slice((currentPage - 1) * CASES_PER_PAGE, currentPage * CASES_PER_PAGE);
    const importStatus = importStatuses[activePlatform];
    return (
      <div>
        <div className="case-tabs">
          {platformOrder.map((platform) => (
            <button type="button" className={activePlatform === platform ? "is-active" : ""} key={platform} onClick={() => { setActivePlatform(platform); setCasePage(1); setCaseSearch(""); setCaseOnlySelected(false); }}>
              <span>{platformMarks[platform]}</span>{platformName(platform)}<small>{content.videos.filter((video) => video.platform === platform).length}</small>
            </button>
          ))}
        </div>
        <section className="case-toolbar">
          <div>
            <strong>{platformName(activePlatform)}完整作品库</strong>
            <span>共 {content.videos.filter((video) => video.platform === activePlatform).length} 条 · 已选择 {visibleCounts[activePlatform]} 条 · 前台取成绩最高的 {platformCaseLimits[activePlatform]} 条</span>
          </div>
          <div className="case-toolbar__actions">
            <input value={imports[activePlatform]} onChange={(event) => setImports((current) => ({ ...current, [activePlatform]: event.target.value }))} placeholder={activePlatform === "bilibili" ? "粘贴 B 站链接或 BV 号" : `粘贴${platformName(activePlatform)}作品链接`} />
            <button type="button" onClick={() => importVideo(activePlatform, imports[activePlatform])} disabled={importStatus.kind === "loading"}>{importStatus.kind === "loading" ? "导入中…" : "自动导入"}</button>
            <button type="button" className="button-secondary" onClick={() => addVideo(activePlatform)}>手动添加</button>
          </div>
          {importStatus.text && <p className={`lookup-status lookup-status--${importStatus.kind}`}>{importStatus.text}</p>}
        </section>
        <section className="case-library-tools" aria-label="作品库筛选">
          <label>
            <span>搜索作品</span>
            <input value={caseSearch} onChange={(event) => { setCaseSearch(event.target.value); setCasePage(1); }} placeholder="输入标题关键词" />
          </label>
          <label>
            <span>默认排序</span>
            <select value={caseSort} onChange={(event) => { setCaseSort(event.target.value as CaseSort); setCasePage(1); }}>
              <option value="performance">成绩从高到低</option>
              <option value="newest">发布时间从新到旧</option>
            </select>
          </label>
          <label className="case-selected-filter">
            <input type="checkbox" checked={caseOnlySelected} onChange={(event) => { setCaseOnlySelected(event.target.checked); setCasePage(1); }} />
            <span>只看前台已选</span>
          </label>
        </section>
        <div className={`video-management-grid video-management-grid--${activePlatform}`}>
          {pageVideos.map((video, index) => (
            <article className={`video-card video-card--${video.platform}`} key={video.id}>
              <div className="video-card__cover">
                {video.cover ? <img src={mediaUrl(video.cover)} alt="" referrerPolicy="no-referrer" /> : <span>{platformMarks[video.platform]}</span>}
                <small>{String((currentPage - 1) * CASES_PER_PAGE + index + 1).padStart(2, "0")}</small>
                {!video.visible && <b>已隐藏</b>}
              </div>
              <div className="video-card__body">
                <div><span>{video.dataSource === "auto" ? "自动数据" : "手动数据"}</span>{video.pinned && <small>优先</small>}</div>
                <h3>{video.title || "未命名案例"}</h3>
                <VideoMetricsPreview video={video} />
                <label className="video-card__visibility">
                  <input type="checkbox" checked={video.visible} onChange={(event) => updateVideo(video.id, { visible: event.target.checked })} />
                  <span>{video.visible ? "已选择前台展示" : "选择到前台"}</span>
                </label>
                <div className="video-card__actions">
                  <button type="button" onClick={() => setDrawer({ type: "video", id: video.id })}>编辑</button>
                  {video.url && <button type="button" onClick={() => importVideo(video.platform, video.bvid || video.url, video)}>重新同步</button>}
                </div>
              </div>
            </article>
          ))}
          {!videos.length && <div className="admin-empty">还没有{platformName(activePlatform)}案例。可粘贴链接自动导入，也可以手动添加。</div>}
        </div>
        {pageCount > 1 && (
          <nav className="case-pagination" aria-label="作品库分页">
            <button type="button" disabled={currentPage <= 1} onClick={() => setCasePage((page) => Math.max(1, page - 1))}>上一页</button>
            <span>第 {currentPage} / {pageCount} 页</span>
            <button type="button" disabled={currentPage >= pageCount} onClick={() => setCasePage((page) => Math.min(pageCount, page + 1))}>下一页</button>
          </nav>
        )}
      </div>
    );
  };

  const renderPricing = () => (
    <div>
      <div className="price-management-grid">
        {content.prices.map((item, index) => (
          <button type="button" className={`price-management-card${item.featured ? " is-featured" : ""}`} key={item.id} onClick={() => setDrawer({ type: "price", index })}>
            <span>{String(index + 1).padStart(2, "0")}{item.featured && <small>推荐</small>}</span>
            <h3>{item.name || `报价项 ${index + 1}`}</h3>
            <strong>{item.price || "待填写"}</strong>
            <p>{item.description || "点击编辑服务说明"}</p>
            <b>编辑 ↗</b>
          </button>
        ))}
      </div>
      <button type="button" className="add-button" onClick={() => {
        const index = content.prices.length;
        setContent((current) => ({ ...current, prices: [...current.prices, blankPrice()] }));
        setDrawer({ type: "price", index });
        markDirty();
      }}>+ 添加报价项目</button>
    </div>
  );

  return (
    <>
      <div className="admin-workspace">
        <aside className="admin-sidebar">
          <div><span>工作区</span><strong>{content.creatorName}</strong></div>
          <nav aria-label="后台栏目">
            {(Object.keys(panelMeta) as Panel[]).map((panel, index) => (
              <button type="button" className={activePanel === panel ? "is-active" : ""} key={panel} onClick={() => setActivePanel(panel)}>
                <small>{String(index + 1).padStart(2, "0")}</small><span>{panelMeta[panel].label}</span><b>›</b>
              </button>
            ))}
          </nav>
          <div className="sidebar-status"><i />每日公开数据检查已开启</div>
        </aside>
        <div className="admin-main">
          <header className="admin-pagebar">
            <div><span>{panelMeta[activePanel].eyebrow}</span><h1>{panelMeta[activePanel].label}</h1><p>{panelMeta[activePanel].description}</p></div>
            <div className="admin-pagebar__actions">
              <button type="button" className="button-secondary" onClick={() => window.open("/", "_blank")}>查看前台 ↗</button>
              <button type="button" onClick={save} disabled={status.kind === "saving"}>{status.kind === "saving" ? "保存中…" : "保存更新"}</button>
            </div>
          </header>
          <div className="admin-content">
            {activePanel === "overview" && renderOverview()}
            {activePanel === "profile" && renderProfile()}
            {activePanel === "platforms" && renderPlatforms()}
            {activePanel === "cases" && renderCases()}
            {activePanel === "pricing" && renderPricing()}
          </div>
        </div>
      </div>

      {drawer && (
        <div className="editor-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawer(null); }}>
          <section className="editor-drawer" role="dialog" aria-modal="true" aria-label={drawer.type === "video" ? "编辑案例" : "编辑报价"}>
            <header><div><span>DETAIL EDITOR</span><h2>{drawer.type === "video" ? "编辑案例" : "编辑报价"}</h2></div><button type="button" onClick={() => setDrawer(null)} aria-label="关闭">×</button></header>
            {selectedVideo && (
              <div className="drawer-content">
                <div className={`drawer-cover drawer-cover--${selectedVideo.platform}`}>
                  {selectedVideo.cover ? <img src={mediaUrl(selectedVideo.cover)} alt="封面预览" referrerPolicy="no-referrer" /> : <span>暂无封面</span>}
                </div>
                <div className="field-grid">
                  <Field label="作品标题" value={selectedVideo.title} onChange={(value) => updateVideo(selectedVideo.id, { title: value })} multiline />
                  <Field label="作品说明" value={selectedVideo.description} onChange={(value) => updateVideo(selectedVideo.id, { description: value })} multiline />
                  <Field label="作品链接" value={selectedVideo.url} onChange={(value) => updateVideo(selectedVideo.id, { url: value })} wide />
                  <Field label="封面图片链接" value={selectedVideo.cover} onChange={(value) => updateVideo(selectedVideo.id, { cover: value })} wide />
                  <Field label="视频时长" value={selectedVideo.duration} onChange={(value) => updateVideo(selectedVideo.id, { duration: value })} placeholder="例：08:38" />
                  <Field label="发布日期" value={selectedVideo.publishedAt} onChange={(value) => updateVideo(selectedVideo.id, { publishedAt: value })} type="date" />
                  {selectedVideo.platform === "bilibili" && <Field label="BV 号" value={selectedVideo.bvid} onChange={(value) => updateVideo(selectedVideo.id, { bvid: value })} wide />}
                  <div className="metric-inputs admin-field--wide">
                    {platformMetricKeys[selectedVideo.platform].map((key) => (
                      <Field key={key} label={metricLabels[key]} value={selectedVideo.metrics[key] ?? ""} onChange={(value) => updateVideoMetric(selectedVideo, key, value)} type="number" />
                    ))}
                  </div>
                  <label className="admin-check"><input type="checkbox" checked={selectedVideo.visible} onChange={(event) => updateVideo(selectedVideo.id, { visible: event.target.checked })} /><span>在前台显示</span></label>
                  <label className="admin-check"><input type="checkbox" checked={selectedVideo.pinned} onChange={(event) => updateVideo(selectedVideo.id, { pinned: event.target.checked })} /><span>优先展示</span></label>
                </div>
                <div className="drawer-footer"><button type="button" className="danger-button" onClick={() => removeVideo(selectedVideo.id)}>删除案例</button><button type="button" onClick={() => setDrawer(null)}>完成</button></div>
              </div>
            )}
            {selectedPrice && drawer.type === "price" && (
              <div className="drawer-content">
                <div className="field-grid">
                  <Field label="服务名称" value={selectedPrice.name} onChange={(value) => updatePrice(drawer.index, { name: value })} />
                  <Field label="价格" value={selectedPrice.price} onChange={(value) => updatePrice(drawer.index, { price: value })} />
                  <Field label="服务说明" value={selectedPrice.description} onChange={(value) => updatePrice(drawer.index, { description: value })} multiline />
                  <label className="admin-check"><input type="checkbox" checked={Boolean(selectedPrice.featured)} onChange={(event) => updatePrice(drawer.index, { featured: event.target.checked })} /><span>设为推荐项目</span></label>
                </div>
                <div className="drawer-footer">
                  <button type="button" className="danger-button" onClick={() => { setContent((current) => ({ ...current, prices: current.prices.filter((_, index) => index !== drawer.index) })); setDrawer(null); markDirty(); }}>删除报价</button>
                  <button type="button" onClick={() => setDrawer(null)}>完成</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      <div className="admin-savebar">
        <span className={`save-status save-status--${status.kind}`}>{status.text}</span>
        <button type="button" onClick={save} disabled={status.kind === "saving"}>{status.kind === "saving" ? "保存中…" : "保存并更新网站"}</button>
      </div>
    </>
  );
}
