import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Vinext produces both browser files and an SSR handler.  Vercel's static
// hosting expects an actual index.html, so render the public landing page once
// and put it beside the client assets.
const clientDirectory = resolve("dist/client");
const handlerModule = await import(resolve("dist/server/ssr/index.js"));
const handler = handlerModule.default;

if (!handler?.fetch) {
  throw new Error("Vinext SSR handler was not generated.");
}

const response = await handler.fetch(new Request("https://senyousanmu.cn/"));
if (!response.ok) {
  throw new Error(`Could not render the public page (${response.status}).`);
}

const html = (await response.text()).replace(
  /\/api\/media-proxy\?url=([^"'\s<]+)/g,
  (_match, encodedUrl) => {
    try {
      // Static Vercel hosting has no API route for this small image proxy.
      // Use the original public image directly while preserving no-referrer
      // attributes emitted by the page component.
      return decodeURIComponent(encodedUrl);
    } catch {
      return _match;
    }
  },
);

await mkdir(clientDirectory, { recursive: true });
await writeFile(resolve(clientDirectory, "index.html"), html, "utf8");

// Keep a plain 404 page so direct navigation never falls back to a Vercel
// platform error page.
await writeFile(
  resolve(clientDirectory, "404.html"),
  "<!doctype html><html lang=\"zh-CN\"><meta charset=\"utf-8\"><title>页面未找到</title><body style=\"font-family:system-ui;padding:4rem\"><h1>页面未找到</h1><p><a href=\"/\">返回首页</a></p></body></html>",
  "utf8",
);

// The source public directory is normally already included by Vinext. This
// copy is intentionally defensive for cover images when deployment caches are
// involved.
await rm(resolve(clientDirectory, "covers"), { recursive: true, force: true });
await cp(resolve("public/covers"), resolve(clientDirectory, "covers"), { recursive: true });

console.log("Static media-kit homepage created in dist/client.");
