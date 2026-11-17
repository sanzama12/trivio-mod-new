"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Keep the shared footer clear of the fixed administration sidebar. */
export function FooterFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className={pathname.startsWith("/quan-tri") ? "lg:ml-60" : undefined}>{children}</div>;
}
