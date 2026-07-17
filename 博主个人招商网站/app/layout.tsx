import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: "森有三木 · 自媒体博主媒体包",
    description:
      "数码科技与消费电子内容创作者。查看平台数据、代表作、商单案例与合作报价。",
    openGraph: {
      title: "森有三木 · 创作者媒体包",
      description: "把复杂产品，讲成值得看完的内容。",
      type: "website",
      locale: "zh_CN",
      images: [{ url: "/og.png", width: 1731, height: 909, alt: "森有三木创作者媒体包" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "森有三木 · 创作者媒体包",
      description: "把复杂产品，讲成值得看完的内容。",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
