import { getChatGPTUser } from "@/app/chatgpt-auth";
import { readSiteContent, writeSiteContent } from "@/db/content";
import { normaliseContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export async function GET() {
  const content = await readSiteContent();
  return Response.json(content);
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user && process.env.NODE_ENV !== "development") {
    return Response.json({ error: "请先登录管理后台。" }, { status: 401 });
  }

  try {
    const payload = normaliseContent(await request.json());
    const content = await writeSiteContent(
      payload,
      user?.email ?? "local-preview@example.com",
    );
    return Response.json(content);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "保存失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
