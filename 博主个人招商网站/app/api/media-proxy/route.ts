const allowedImageHosts = [
  "xhscdn.com",
  "xiaohongshu.com",
  "douyinpic.com",
  "byteimg.com",
  "hdslb.com",
  "bilibili.com",
];

function isAllowed(url: URL): boolean {
  return url.protocol === "https:" && allowedImageHosts.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
  );
}

async function fetchImage(start: URL): Promise<Response> {
  let current = start;
  for (let redirect = 0; redirect < 4; redirect += 1) {
    if (!isAllowed(current)) throw new Error("图片域名不在允许列表中。");
    const response = await fetch(current, {
      redirect: "manual",
      headers: {
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        referer: current.hostname.includes("xhscdn")
          ? "https://www.xiaohongshu.com/"
          : current.hostname.includes("hdslb")
            ? "https://www.bilibili.com/"
            : "https://www.douyin.com/",
        "user-agent": "Mozilla/5.0 AppleWebKit/537.36 Chrome/136 Safari/537.36",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("图片重定向缺少地址。");
      current = new URL(location, current);
      continue;
    }
    return response;
  }
  throw new Error("图片重定向次数过多。");
}

export async function GET(request: Request) {
  try {
    const source = new URL(request.url).searchParams.get("url");
    if (!source) return new Response("Missing image URL", { status: 400 });
    const url = new URL(source);
    if (!isAllowed(url)) return new Response("Image host is not allowed", { status: 403 });

    const upstream = await fetchImage(url);
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !contentType.startsWith("image/") || !upstream.body) {
      return new Response("Image unavailable", { status: 502 });
    }
    return new Response(upstream.body, {
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("Image unavailable", { status: 502 });
  }
}
