import { requireChatGPTUser, chatGPTSignOutPath } from "@/app/chatgpt-auth";
import { readSiteContent } from "@/db/content";
import Link from "next/link";
import { AdminEditor } from "./AdminEditor";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  const content = await readSiteContent();

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="admin-brand" href="/">
          <strong>森有三木</strong>
          <span>MEDIA KIT / ADMIN</span>
        </Link>
        <div className="admin-account">
          <span>{user.displayName}</span>
          <Link href="/" target="_blank" rel="noreferrer">
            查看网站 ↗
          </Link>
          <a href={chatGPTSignOutPath("/")}>退出</a>
        </div>
      </header>
      <AdminEditor initialContent={content} />
    </main>
  );
}
