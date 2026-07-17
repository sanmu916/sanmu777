import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

test("contains the redesigned creator media kit content", async () => {
  const [page, content, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/site-content.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const source = `${page}\n${content}`;

  assert.match(source, /森有三木/);
  assert.match(source, /PLATFORM MATRIX/);
  assert.match(source, /商单案例/);
  assert.match(source, /platformOrder/);
  assert.match(styles, /case-card--xiaohongshu/);
  assert.match(source, /case-metrics--primary/);
  assert.match(source, /单品定制/);
  assert.match(source, /¥15,000/);
  assert.match(content, /2,841/);
  assert.match(styles, /backdrop-filter/);
  assert.doesNotMatch(page, /后台可|数据已同步|手动数据|最近更新/);
});

test("ships editable data, protected import routes, and persistent hosting config", async () => {
  const [page, editor, biliRoute, socialRoute, refreshRoute, mediaRoute, hosting] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/AdminEditor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/bilibili/video/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/social/video/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/content/refresh/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/media-proxy/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /getPlatformCases/);
  assert.match(page, /<MobileNav \/>/);
  assert.match(editor, /同步全部平台/);
  assert.match(editor, /内容工作台/);
  assert.match(editor, /editor-drawer/);
  assert.match(editor, /自动导入/);
  assert.match(editor, /重新同步/);
  assert.match(editor, /保存并更新网站/);
  assert.match(biliRoute, /getChatGPTUser/);
  assert.match(socialRoute, /getChatGPTUser/);
  assert.match(refreshRoute, /refreshPublicContent/);
  assert.match(mediaRoute, /allowedImageHosts/);
  assert.equal(JSON.parse(hosting).d1, "DB");
  assert.equal(JSON.parse(hosting).r2, null);

  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/covers/action-camera.jpg", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview", templateRoot)));
});
