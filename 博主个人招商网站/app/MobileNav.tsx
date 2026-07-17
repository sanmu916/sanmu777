"use client";

import { useState } from "react";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <details
      className="mobile-nav"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary aria-label="打开菜单">菜单</summary>
      <nav>
        <a href="#platforms" onClick={() => setOpen(false)}>
          平台数据
        </a>
        <a href="#cases" onClick={() => setOpen(false)}>
          商单案例
        </a>
        <a href="#pricing" onClick={() => setOpen(false)}>
          合作报价
        </a>
      </nav>
    </details>
  );
}
