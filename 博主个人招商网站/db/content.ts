import { env } from "cloudflare:workers";
import {
  defaultContent,
  normaliseContent,
  type SiteContent,
} from "@/lib/site-content";
import { refreshPublicContent } from "@/lib/content-refresh";

const createTableSql = `CREATE TABLE IF NOT EXISTS site_content (
  id INTEGER PRIMARY KEY,
  content TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
)`;

async function getBinding(): Promise<D1Database | null> {
  try {
    return env.DB ?? null;
  } catch {
    return null;
  }
}

let publicMemoryCache: SiteContent | null = null;
let localPreviewContent: SiteContent = defaultContent;

export async function readSiteContent(): Promise<SiteContent> {
  const db = await getBinding();
  if (!db) return localPreviewContent;

  try {
    await db.prepare(createTableSql).run();
    const row = await db
      .prepare("SELECT content FROM site_content WHERE id = 1")
      .first<{ content: string }>();
    if (!row) return defaultContent;
    return normaliseContent(JSON.parse(row.content));
  } catch {
    return defaultContent;
  }
}

export async function readPublicSiteContent(): Promise<SiteContent> {
  if (publicMemoryCache) {
    const refreshedAt = Date.parse(publicMemoryCache.lastAutoRefresh);
    if (Number.isFinite(refreshedAt) && Date.now() - refreshedAt < 24 * 60 * 60 * 1000) {
      return publicMemoryCache;
    }
  }

  const stored = await readSiteContent();
  const refreshed = await refreshPublicContent(stored);
  publicMemoryCache = refreshed;

  if (refreshed !== stored) {
    try {
      await writeSiteContent(refreshed, "system:bilibili-daily-refresh");
    } catch {
      // Local preview has no D1 binding; the in-memory result is still shown.
    }
  }

  return refreshed;
}

export async function writeSiteContent(
  content: SiteContent,
  updatedBy: string,
): Promise<SiteContent> {
  const db = await getBinding();
  if (!db) {
    if (process.env.NODE_ENV !== "development") {
      throw new Error("数据库尚未连接，请先发布网站。");
    }
    const preview = normaliseContent(content);
    preview.lastUpdated = new Date().toISOString().slice(0, 10);
    localPreviewContent = preview;
    publicMemoryCache = null;
    return preview;
  }

  const next = normaliseContent(content);
  next.lastUpdated = new Date().toISOString().slice(0, 10);

  await db.prepare(createTableSql).run();
  await db
    .prepare(
      `INSERT INTO site_content (id, content, updated_at, updated_by)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         content = excluded.content,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
    )
    .bind(JSON.stringify(next), new Date().toISOString(), updatedBy)
    .run();

  publicMemoryCache = null;

  return next;
}
