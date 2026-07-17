/* eslint-disable @next/next/no-img-element */
import { readPublicSiteContent } from "@/db/content";
import {
  formatCount,
  getPlatformCases,
  platformOrder,
  type Platform,
  type PlatformKey,
  type Video,
  type VideoMetrics,
} from "@/lib/site-content";
import { MobileNav } from "./MobileNav";

export const dynamic = "force-dynamic";

const platformMarks: Record<PlatformKey, string> = {
  bilibili: "B",
  xiaohongshu: "RED",
  douyin: "DY",
};

const metricNames: Record<keyof VideoMetrics, string> = {
  views: "播放",
  likes: "点赞",
  coins: "投币",
  favorites: "收藏",
  shares: "转发",
  comments: "评论",
  danmaku: "弹幕",
};

const secondaryMetricKeys: Record<PlatformKey, (keyof VideoMetrics)[]> = {
  bilibili: ["coins", "favorites", "shares", "comments", "danmaku"],
  xiaohongshu: ["favorites", "shares", "comments"],
  douyin: ["favorites", "shares", "comments"],
};

function mediaUrl(value: string): string {
  if (!value || value.startsWith("/")) return value;
  return `/api/media-proxy?url=${encodeURIComponent(value)}`;
}

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function PlatformCard({ platform, index }: { platform: Platform; index: number }) {
  return (
    <article className={`platform-card platform-card--${platform.id}`}>
      <div className="platform-card__head">
        <span className="platform-logo" aria-hidden="true">
          {platformMarks[platform.id]}
        </span>
        <span className="platform-index">0{index + 1}</span>
      </div>
      <div className="platform-identity">
        <div>
          <p>{platform.role}</p>
          <h3>{platform.name}</h3>
          <span>{platform.handle}</span>
        </div>
      </div>
      <div className="platform-metrics">
        {platform.metrics.map((metric) => (
          <div key={metric.label}>
            <strong>{metric.value || "—"}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>
      <p className="platform-note">{platform.note}</p>
      <a href={platform.url} target="_blank" rel="noreferrer" className="glass-button">
        查看 {platform.name} 主页 <Arrow />
      </a>
    </article>
  );
}

function MetricGroup({
  video,
  keys,
  primary = false,
}: {
  video: Video;
  keys: (keyof VideoMetrics)[];
  primary?: boolean;
}) {
  return (
    <dl className={`case-metrics${primary ? " case-metrics--primary" : " case-metrics--secondary"}`}>
      {keys.map((key) => (
        <div key={key}>
          <dt>{metricNames[key]}</dt>
          <dd>{formatCount(video.metrics[key])}</dd>
        </div>
      ))}
    </dl>
  );
}

function VideoCard({ video, index }: { video: Video; index: number }) {
  const body = (
    <>
      <div className="case-cover">
        {video.cover ? (
          <img src={mediaUrl(video.cover)} alt="" referrerPolicy="no-referrer" />
        ) : (
          <div className="case-cover__empty" aria-hidden="true">
            <span>{platformMarks[video.platform]}</span>
          </div>
        )}
        <span className="case-number">{String(index + 1).padStart(2, "0")}</span>
        {video.duration && <span className="case-duration">{video.duration}</span>}
        <span className="case-open" aria-hidden="true">↗</span>
      </div>
      <div className="case-body">
        <div className="case-source">
          <span>{video.platform === "bilibili" ? "B 站视频" : video.platform === "xiaohongshu" ? "小红书内容" : "抖音视频"}</span>
        </div>
        <h3>{video.title || "未命名案例"}</h3>
        {video.description && <p>{video.description}</p>}
        <div className="case-statistics">
          <MetricGroup video={video} keys={["views", "likes"]} primary />
          <MetricGroup video={video} keys={secondaryMetricKeys[video.platform]} />
        </div>
      </div>
    </>
  );

  return video.url ? (
    <a className={`case-card case-card--${video.platform}`} href={video.url} target="_blank" rel="noreferrer">
      {body}
    </a>
  ) : (
    <article className={`case-card case-card--${video.platform}`}>{body}</article>
  );
}

function EmptyCase({ platform }: { platform: PlatformKey }) {
  const name = platform === "xiaohongshu" ? "小红书" : "抖音";
  return (
    <article className="case-card case-card--empty">
      <div className="empty-orb" aria-hidden="true">{platformMarks[platform]}</div>
      <h3>{name}案例整理中</h3>
    </article>
  );
}

function PlatformCases({
  platform,
  name,
  videos,
}: {
  platform: PlatformKey;
  name: string;
  videos: Video[];
}) {
  return (
    <section className={`platform-cases platform-cases--${platform}`}>
      <div className="platform-cases__head">
        <div>
          <span className="platform-logo">{platformMarks[platform]}</span>
          <div>
            <p>{platform === "bilibili" ? "PRIMARY PLATFORM" : "DISTRIBUTION PLATFORM"}</p>
            <h3>{name}商单案例</h3>
          </div>
        </div>
      </div>
      <div className={`case-grid case-grid--${platform}`}>
        {videos.map((video, index) => (
          <VideoCard key={video.id} video={video} index={index} />
        ))}
        {!videos.length && <EmptyCase platform={platform} />}
      </div>
    </section>
  );
}

export default async function Home() {
  const content = await readPublicSiteContent();
  const bilibili = content.platforms.find((item) => item.id === "bilibili");

  return (
    <main id="top">
      <div className="ambient ambient--one" aria-hidden="true" />
      <div className="ambient ambient--two" aria-hidden="true" />
      <div className="ambient ambient--three" aria-hidden="true" />

      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="返回顶部">
          <span>{content.creatorName}</span>
          <small>CREATOR MEDIA KIT</small>
        </a>
        <nav className="desktop-nav" aria-label="主导航">
          <a href="#platforms">平台数据</a>
          <a href="#cases">商单案例</a>
          <a href="#pricing">合作报价</a>
        </nav>
        <a className="header-cta" href="#pricing">
          发起合作 <Arrow />
        </a>
        <MobileNav />
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="status-dot" aria-hidden="true" />
            {content.availability}
          </div>
          <h1>{content.creatorTagline}</h1>
          <p>{content.creatorBio}</p>
          <div className="hero-actions">
            <a className="primary-button" href="#cases">
              查看商单案例 <Arrow />
            </a>
            {bilibili && (
              <a className="secondary-button" href={bilibili.url} target="_blank" rel="noreferrer">
                B 站主页
              </a>
            )}
          </div>
          <div className="hero-tags" aria-label="内容方向">
            <span>数码科技</span>
            <span>消费电子</span>
            <span>深度横测</span>
            <span>真实体验</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="creator-card glass-panel">
            <div className="creator-card__image">
              <img src={mediaUrl(content.creatorAvatar)} alt={`${content.creatorName}头像`} referrerPolicy="no-referrer" />
              <span>AVAILABLE</span>
            </div>
            <div className="creator-card__info">
              <p>数码科技内容创作者</p>
              <h2>{content.creatorName}</h2>
              <div>
                <span>主阵地</span>
                <strong>BILIBILI</strong>
              </div>
            </div>
          </div>
          <div className="floating-note floating-note--top glass-panel">
            <span>01</span>
            <strong>完整测试</strong>
            <small>用真实场景说清差异</small>
          </div>
          <div className="floating-note floating-note--bottom glass-panel">
            <span>02</span>
            <strong>清晰观点</strong>
            <small>让品牌信息自然被记住</small>
          </div>
        </div>
      </section>

      <section className="section" id="platforms">
        <div className="section-heading">
          <div>
            <p>PLATFORM MATRIX</p>
            <h2>一个主阵地，<br />两种增量表达。</h2>
          </div>
          <p>B站承载完整观点与转化链路，小红书和抖音按各自的内容语境延展传播。</p>
        </div>
        <div className="platform-grid">
          {content.platforms.map((platform, index) => (
            <PlatformCard key={platform.id} platform={platform} index={index} />
          ))}
        </div>
      </section>

      <section className="section case-section" id="cases">
        <div className="section-heading">
          <div>
            <p>COMMERCIAL WORK</p>
            <h2>商单案例。</h2>
          </div>
          <p>从深度测评到短视频种草，用不同内容形态帮助品牌把产品价值说清楚。</p>
        </div>
        <div className="case-platforms">
          {platformOrder.map((platformKey) => {
            const platform = content.platforms.find((item) => item.id === platformKey);
            return (
              <PlatformCases
                key={platformKey}
                platform={platformKey}
                name={platform?.name ?? platformKey}
                videos={getPlatformCases(content, platformKey)}
              />
            );
          })}
        </div>
      </section>

      <section className="section pricing-section" id="pricing">
        <div className="section-heading">
          <div>
            <p>RATE CARD</p>
            <h2>合作报价。</h2>
          </div>
          <p>最终以确认后的需求单与合同为准，复杂测试、加急与授权费用单独评估。</p>
        </div>
        <div className="price-grid">
          {content.prices.map((item, index) => (
            <article className={`price-card${item.featured ? " price-card--featured" : ""}`} key={item.id}>
              <div className="price-card__top">
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.featured && <small>推荐</small>}
              </div>
              <h3>{item.name}</h3>
              <strong>{item.price}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
        <div className="pricing-note glass-panel">
          <div>
            <span className="status-dot" aria-hidden="true" />
            <p>{content.availability}</p>
          </div>
          <strong>商务微信：{content.wechat}</strong>
          <span>{content.location}</span>
        </div>
      </section>

      <footer className="site-footer">
        <span>© 2026 {content.creatorName}</span>
        <span>CREATOR MEDIA KIT</span>
        <span>{content.location}</span>
      </footer>
    </main>
  );
}
