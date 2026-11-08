import type { Metadata } from "next";
import { timelineService } from "@/services";
import { getCurrentUser } from "@/lib/auth";
import { Breadcrumb } from "@/components/ui/misc";
import { TimelineView } from "@/components/timeline/timeline-view";

export const metadata: Metadata = { title: "Mốc tuyển sinh & nhắc hạn" };

export default async function TimelinePage() {
  const [{ season, note, events, official, sourceUrl }, user] = await Promise.all([timelineService.list(), getCurrentUser()]);
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Mốc tuyển sinh" }]} />
      <div className="mt-6 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Mốc tuyển sinh {season}</h1>
        <p className="mt-1 text-sm text-slate-600">Bật “Nhắc tôi” cho mốc quan trọng, thêm vào lịch điện thoại để không lỡ hạn đăng ký và nộp lệ phí.</p>
      </div>
      <TimelineView events={events} note={note} official={official} sourceUrl={sourceUrl} emailReminders={user?.verified ? !!user.emailReminders : null} />
    </div>
  );
}
