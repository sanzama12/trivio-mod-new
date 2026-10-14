import type { ReactNode } from "react";
import { timelineService } from "@/services";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CompareBar } from "@/components/program/program-actions";
import { ReminderBanner } from "@/components/timeline/reminder-banner";
import { LazyWidgets } from "@/components/layout/lazy-widgets";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const { events } = await timelineService.list();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <ReminderBanner events={events} />
      <main id="noi-dung" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
      <CompareBar />
      <LazyWidgets />
    </div>
  );
}
