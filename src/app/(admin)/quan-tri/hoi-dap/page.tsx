import type { Metadata } from "next";
import { adminPage } from "@/lib/admin-page";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminBody } from "@/components/admin/ui";
import { qaService } from "@/services/community.service";
import { QaModeration } from "@/components/admin/qa-moderation";

export const metadata: Metadata = { title: "Kiểm duyệt hỏi đáp", robots: { index: false, follow: false } };

export default async function QaModerationPage() {
  await adminPage("/quan-tri/hoi-dap", { staff: true });
  const items = await qaService.pending();
  return (
    <>
      <AdminHeader title="Kiểm duyệt hỏi đáp sinh viên" crumb="Hỏi đáp sinh viên" />
      <AdminBody>
      <p className="max-w-3xl text-sm text-slate-500">
        Câu hỏi của học sinh và câu trả lời của sinh viên (đã xác thực email trường) chỉ hiện sau khi được duyệt. Email, số điện thoại và link đã được hệ thống tự che.
      </p>
      <QaModeration
        items={items.map((q) => ({
          id: q.id,
          programName: q.programName,
          text: q.text,
          status: q.status,
          createdAt: q.createdAt,
          flags: q.flags,
          answers: q.answers.filter((a) => a.status === "pending").map((a) => ({ id: a.id, displayName: a.displayName, schoolDomain: a.schoolDomain, text: a.text, createdAt: a.createdAt, flags: a.flags })),
        }))}
      />
      </AdminBody>
    </>
  );
}
