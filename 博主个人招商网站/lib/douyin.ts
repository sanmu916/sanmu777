import { md5 } from "@/lib/md5";
import type { Video, VideoMetrics } from "@/lib/site-content";

const API_HOST = "https://www.douyin.com";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const TOKEN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const SIGN_ALPHABET = "Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe=";
const SEC_UID = "MS4wLjABAAAAUECOgC8ja5BuBOZYm5ty6DY6SUndRuf3SybTTTJmtEcTkI4MtqdW7td3yHZfjaGy";

type JsonObject = Record<string, unknown>;

export type DouyinProfile = {
  followers: number | null;
  totalLikes: number | null;
  workCount: number | null;
  videos: Video[];
};

function bytesFromHex(value: string): number[] {
  return value.match(/.{2}/g)?.map((part) => Number.parseInt(part, 16)) ?? [];
}

function doubleMd5Bytes(value: string): number[] {
  return bytesFromHex(md5(md5(value)));
}

function rc4(key: number[], data: number[]): number[] {
  const state = Array.from({ length: 256 }, (_, index) => index);
  let j = 0;
  for (let i = 0; i < 256; i += 1) {
    j = (j + state[i] + key[i % key.length]) % 256;
    [state[i], state[j]] = [state[j], state[i]];
  }
  const output: number[] = [];
  let i = 0;
  j = 0;
  for (const byte of data) {
    i = (i + 1) % 256;
    j = (j + state[i]) % 256;
    [state[i], state[j]] = [state[j], state[i]];
    output.push(byte ^ state[(state[i] + state[j]) % 256]);
  }
  return output;
}

function standardBase64(bytes: number[]): string {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function customBase64(bytes: number[]): string {
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const remaining = bytes.length - index;
    const number = (bytes[index] << 16) |
      ((remaining > 1 ? bytes[index + 1] : 0) << 8) |
      (remaining > 2 ? bytes[index + 2] : 0);
    const count = remaining >= 3 ? 4 : remaining + 1;
    for (let slot = 0; slot < count; slot += 1) {
      output += SIGN_ALPHABET[(number >>> (18 - slot * 6)) & 63];
    }
  }
  return output;
}

function xBogus(query: string, nowSeconds: number): string {
  const queryBytes = doubleMd5Bytes(query);
  const uaBytes = Array.from(new TextEncoder().encode(USER_AGENT));
  const encryptedUa = rc4([0, 1, 14], uaBytes);
  const uaDigest = doubleMd5Bytes(standardBase64(encryptedUa));
  const canvas = 536919696;
  const array = [
    64, 0, 1, 12,
    queryBytes[14], queryBytes[15], uaDigest[14], uaDigest[15],
    (nowSeconds >>> 24) & 255, (nowSeconds >>> 16) & 255,
    (nowSeconds >>> 8) & 255, nowSeconds & 255,
    (canvas >>> 24) & 255, (canvas >>> 16) & 255,
    (canvas >>> 8) & 255, canvas & 255,
  ];
  array.push(array.reduce((checksum, value) => checksum ^ value, 0));
  const order = [
    array[0], array[8], array[1], array[9], array[2], array[10], array[3], array[11],
    array[4], array[12], array[5], array[13], array[6], array[14], array[7], array[15], array[16],
  ];
  return customBase64([2, 255, ...rc4([255], order)]);
}

function randomToken(length = 128): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length]).join("");
}

function commonParams(): URLSearchParams {
  return new URLSearchParams({
    device_platform: "webapp",
    aid: "6383",
    channel: "channel_pc_web",
    pc_client_type: "1",
    version_code: "290100",
    version_name: "29.1.0",
    cookie_enabled: "true",
    screen_width: "1920",
    screen_height: "1080",
    browser_language: "zh-CN",
    browser_platform: "MacIntel",
    browser_name: "Chrome",
    browser_version: "124.0.0.0",
    browser_online: "true",
    engine_name: "Blink",
    engine_version: "124.0.0.0",
    os_name: "Mac OS",
    os_version: "10.15.7",
    platform: "PC",
    downlink: "10",
    effective_type: "4g",
    round_trip_time: "50",
  });
}

function canonicalQuery(params: URLSearchParams): string {
  return Array.from(params.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value).replaceAll("%20", "+")}`)
    .join("&");
}

async function signedGet(path: string, params: URLSearchParams): Promise<JsonObject> {
  const query = `${canonicalQuery(params)}&msToken=${randomToken()}`;
  const signature = xBogus(query, Math.floor(Date.now() / 1000));
  const response = await fetch(`${API_HOST}${path}?${query}&X-Bogus=${encodeURIComponent(signature)}`, {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
      origin: API_HOST,
      referer: `${API_HOST}/`,
      "user-agent": USER_AGENT,
      "x-bogus": signature,
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`抖音接口返回 ${response.status}`);
  const text = await response.text();
  if (!text.trim()) throw new Error("抖音本次返回了风控空响应");
  return JSON.parse(text) as JsonObject;
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function asNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function firstUrl(value: unknown): string {
  const object = asObject(value);
  const list = Array.isArray(object.url_list) ? object.url_list : [];
  return typeof list[0] === "string" ? list[0] : "";
}

function formatDuration(milliseconds: number | null): string {
  if (milliseconds === null) return "";
  const seconds = Math.round(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function videoFromAweme(raw: unknown): Video | null {
  const item = asObject(raw);
  const id = typeof item.aweme_id === "string" ? item.aweme_id : "";
  if (!id) return null;
  const statistics = asObject(item.statistics);
  const media = asObject(item.video);
  const metrics: VideoMetrics = {
    views: asNumber(statistics.play_count),
    likes: asNumber(statistics.digg_count),
    coins: null,
    favorites: asNumber(statistics.collect_count),
    shares: asNumber(statistics.share_count),
    comments: asNumber(statistics.comment_count),
    danmaku: null,
  };
  const created = asNumber(item.create_time);
  return {
    id: `douyin-${id}`,
    platform: "douyin",
    bvid: "",
    title: typeof item.desc === "string" ? item.desc : "",
    description: "",
    cover: firstUrl(asObject(media.cover)),
    url: `${API_HOST}/video/${id}`,
    duration: formatDuration(asNumber(media.duration) ?? asNumber(item.duration)),
    publishedAt: created ? new Date(created * 1000).toISOString().slice(0, 10) : "",
    metrics,
    visible: false,
    pinned: false,
    dataSource: "auto",
    lastSyncedAt: new Date().toISOString(),
  };
}

function findObjects(root: unknown, predicate: (value: JsonObject) => boolean): JsonObject[] {
  const found: JsonObject[] = [];
  const queue: unknown[] = [root];
  let visited = 0;
  while (queue.length && visited < 30000) {
    const value = queue.shift();
    visited += 1;
    if (!value || typeof value !== "object") continue;
    if (Array.isArray(value)) {
      queue.push(...value.slice(0, 300));
      continue;
    }
    const object = value as JsonObject;
    if (predicate(object)) found.push(object);
    queue.push(...Object.values(object).slice(0, 300));
  }
  return found;
}

function videosFromPayload(payload: JsonObject): Video[] {
  const collections = findObjects(payload, (object) =>
    Array.isArray(object.aweme_list) || Array.isArray(object.awemeList),
  );
  const videos = collections.flatMap((collection) => {
    const list = Array.isArray(collection.aweme_list)
      ? collection.aweme_list
      : Array.isArray(collection.awemeList) ? collection.awemeList : [];
    return list.flatMap((item) => {
      const video = videoFromAweme(item);
      return video ? [video] : [];
    });
  });
  return [...new Map(videos.map((video) => [video.id, video])).values()];
}

function profileFromPayload(payload: JsonObject): Omit<DouyinProfile, "videos"> {
  const user = findObjects(payload, (object) =>
    object.follower_count !== undefined &&
    (object.aweme_count !== undefined || object.total_favorited !== undefined),
  )[0] ?? {};
  return {
    followers: asNumber(user.follower_count),
    totalLikes: asNumber(user.total_favorited),
    workCount: asNumber(user.aweme_count),
  };
}

async function fetchSignedDouyin(): Promise<DouyinProfile> {
  const profileParams = commonParams();
  profileParams.set("sec_user_id", SEC_UID);
  const profilePromise = signedGet("/aweme/v1/web/user/profile/other/", profileParams);

  const videos: Video[] = [];
  let cursor = "0";
  for (let page = 0; page < 10; page += 1) {
    const params = commonParams();
    params.set("sec_user_id", SEC_UID);
    params.set("max_cursor", cursor);
    params.set("count", "20");
    const payload = await signedGet("/aweme/v1/web/aweme/post/", params);
    const list = Array.isArray(payload.aweme_list) ? payload.aweme_list : [];
    videos.push(...list.flatMap((item) => {
      const video = videoFromAweme(item);
      return video ? [video] : [];
    }));
    if (!asNumber(payload.has_more) || !list.length) break;
    cursor = String(payload.max_cursor ?? "0");
  }

  const profile = await profilePromise;
  const user = asObject(profile.user);
  return {
    followers: asNumber(user.follower_count),
    totalLikes: asNumber(user.total_favorited),
    workCount: asNumber(user.aweme_count) ?? videos.length,
    videos,
  };
}

async function fetchDouyinSharePage(): Promise<DouyinProfile> {
  const shareUrl = `https://www.iesdouyin.com/share/user/${SEC_UID}`;
  const headers = {
    accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    "accept-language": "zh-CN,zh;q=0.9",
    referer: shareUrl,
    "user-agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  };
  const response = await fetch(shareUrl, {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`抖音移动公开页返回 ${response.status}`);
  const html = await response.text();
  const stateSource = html.match(/<script[^>]+id=["']RENDER_DATA["'][^>]*>([\s\S]*?)<\/script>/i)?.[1]
    ?? html.match(/window\._ROUTER_DATA\s*=\s*([\s\S]*?)<\/script>/i)?.[1];
  let state: JsonObject = {};
  if (stateSource) {
    try {
      state = JSON.parse(decodeURIComponent(stateSource.trim().replace(/;\s*$/, ""))) as JsonObject;
    } catch {
      try {
        state = JSON.parse(stateSource.trim().replace(/;\s*$/, "")) as JsonObject;
      } catch {
        state = {};
      }
    }
  }

  const videos = videosFromPayload(state);
  let cursor = "0";
  for (let page = 0; page < 5; page += 1) {
    const params = new URLSearchParams({
      sec_uid: SEC_UID,
      count: "21",
      max_cursor: cursor,
      aid: "1128",
    });
    try {
      const pageResponse = await fetch(
        `https://www.iesdouyin.com/web/api/v2/aweme/post/?${params}`,
        { headers: { ...headers, accept: "application/json, text/plain, */*" }, signal: AbortSignal.timeout(12000) },
      );
      if (!pageResponse.ok) break;
      const text = await pageResponse.text();
      if (!text.trim().startsWith("{")) break;
      const payload = JSON.parse(text) as JsonObject;
      const incoming = videosFromPayload(payload);
      if (!incoming.length) break;
      videos.push(...incoming.filter((video) => !videos.some((item) => item.id === video.id)));
      if (!asNumber(payload.has_more)) break;
      cursor = String(payload.max_cursor ?? "0");
    } catch {
      break;
    }
  }

  const profile = profileFromPayload(state);
  if (!videos.length && profile.followers === null) {
    throw new Error("抖音公开分享页本次没有返回账号数据");
  }
  return {
    ...profile,
    workCount: profile.workCount ?? videos.length,
    videos,
  };
}

export async function fetchAllDouyin(): Promise<DouyinProfile> {
  try {
    return await fetchSignedDouyin();
  } catch {
    return fetchDouyinSharePage();
  }
}
