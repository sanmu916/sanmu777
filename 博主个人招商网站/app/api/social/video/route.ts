import { getChatGPTUser } from "@/app/chatgpt-auth";
import { fetchSocialVideo } from "@/lib/social-import";
import type { PlatformKey } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user && process.env.NODE_ENV !== "development") {
    return Response.json({ error: "请先登录管理后台。" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as { platform?: PlatformKey; value?: unknown };
    if (
      (payload.platform !== "xiaohongshu" && payload.platform !== "douyin") ||
      typeof payload.value !== "string"
    ) {
      return Response.json({ error: "请提供有效的平台和作品链接。" }, { status: 400 });
    }
    return Response.json(await fetchSocialVideo(payload.platform, payload.value));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "自动导入失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
