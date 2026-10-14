import type { Metadata } from "next";
import { timelineService } from "@/services";
import { toLiteMajor, toLiteProgram } from "@/services/lite";
import { vnDay } from "@/services/analytics.service";
import { isDemoMode } from "@/lib/env";
import { Breadcrumb } from "@/components/ui/misc";
import { PlanBView } from "@/components/plan-b/plan-b-view";

export const metadata: Metadata = {
  title: "Mùa công bố điểm & kế hoạch B",
  description: "Chấm lại nguyện vọng với điểm thật, gợi ý kế hoạch B và theo dõi các đợt xét tuyển bổ sung phù hợp với điểm của bạn.",
};

const DATE_RE = /^20\d{2}-\d{2}-\d{2}$/;

export default async function PlanBPage({ searchParams }: { searchParams: Promise<{ ngay?: string }> }) {
  const { ngay } = await searchParams;
  const simulated = typeof ngay === "string" && DATE_RE.test(ngay) && !Number.isNaN(Date.parse(ngay)) ? ngay : null;
  const { views, majors, timeline, supplementaryRounds } = await timelineService.getPlanBData();
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Mốc tuyển sinh", href: "/moc-tuyen-sinh" }, { label: "Mùa công bố điểm" }]} />
      <PlanBView
        today={simulated ?? vnDay()}
        simulated={!!simulated}
        demoDate={supplementaryRounds[0]?.opens ?? vnDay()}
        demoMode={isDemoMode()}
        season={timeline.season}
        events={timeline.events}
        rounds={supplementaryRounds}
        programs={views.map(toLiteProgram)}
        majors={majors.map(toLiteMajor)}
      />
    </div>
  );
}
