import { getChatGPTUser } from "@/app/chatgpt-auth";
import { fetchBilibiliVideo } from "@/lib/bilibili";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user && process.env.NODE_ENV !== "development") {
    return Response.json({ error: "请先登录管理后台。" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as { value?: unknown };
    if (typeof payload.value !== "string") {
      return Response.json({ error: "请粘贴 B 站视频链接或 BV 号。" }, { status: 400 });
    }
    const video = await fetchBilibiliVideo(payload.value);
    return Response.json(video);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "自动获取失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
