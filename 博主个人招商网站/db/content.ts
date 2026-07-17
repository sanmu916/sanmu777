import {
  defaultContent,
  normaliseContent,
  type SiteContent,
} from "@/lib/site-content";
import { refreshPublicContent } from "@/lib/content-refresh";

let publicMemoryCache: SiteContent | null = null;
let localPreviewContent: SiteContent = defaultContent;

export async function readSiteContent(): Promise<SiteContent> {
  return localPreviewContent;
}

export async function readPublicSiteContent(): Promise<SiteContent> {
  // The public Vercel release is exported once during the build.  Avoid
  // contacting third-party platforms while rendering that static snapshot:
  // their anti-bot protections can otherwise make an otherwise valid build
  // fail. Runtime/local previews still use the normal daily refresh below.
  if (process.env.STATIC_EXPORT === "true") {
    return localPreviewContent;
  }

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
  _updatedBy: string,
): Promise<SiteContent> {
  const next = normaliseContent(content);
  next.lastUpdated = new Date().toISOString().slice(0, 10);
  // Vercel serverless functions have no built-in database binding. This keeps
  // edits available within a warm instance; durable storage can be added later
  // with Vercel KV/Blob without changing the front-end data format.
  localPreviewContent = next;
  publicMemoryCache = null;
  return next;
}
