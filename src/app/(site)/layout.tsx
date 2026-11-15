import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CompareBar } from "@/components/program/program-actions";
import { LazyWidgets } from "@/components/layout/lazy-widgets";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="noi-dung" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
      <CompareBar />
      <LazyWidgets />
    </div>
  );
}
