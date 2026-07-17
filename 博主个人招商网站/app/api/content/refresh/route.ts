import { getChatGPTUser } from "@/app/chatgpt-auth";
import { readSiteContent, writeSiteContent } from "@/db/content";
import { refreshPublicContent } from "@/lib/content-refresh";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getChatGPTUser();
  if (!user && process.env.NODE_ENV !== "development") {
    return Response.json({ error: "请先登录管理后台。" }, { status: 401 });
  }
  try {
    const current = await readSiteContent();
    const refreshed = await refreshPublicContent(current, true);
    const saved = await writeSiteContent(
      refreshed,
      user?.email ?? "local-preview@example.com",
    );
    return Response.json(saved);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "同步失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
