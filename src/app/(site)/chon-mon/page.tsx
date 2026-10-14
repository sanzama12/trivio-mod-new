import type { Metadata } from "next";
import { programService, catalogService } from "@/services";
import { repositories } from "@/repositories";
import { toLiteMajor, toLiteProgram } from "@/services/lite";
import { Breadcrumb } from "@/components/ui/misc";
import { Grade10Planner } from "@/components/grade10/grade10-planner";

export const metadata: Metadata = {
  title: "Chọn môn lớp 10 – ngành nào còn mở?",
  description: "Chọn 4 môn lựa chọn lớp 10 (GDPT 2018) và xem ngay ngành nào còn mở, ngành nào đã khoá — hoặc đi ngược lại từ ngành mơ ước.",
};

export default async function Grade10Page({ searchParams }: { searchParams: Promise<{ huong?: string }> }) {
  const { huong } = await searchParams;
  const [views, majors, combos] = await Promise.all([programService.listAll(), repositories.majors.findAll(), catalogService.getCombos()]);
  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Chọn môn lớp 10" }]} />
      <Grade10Planner
        initialDirection={huong === "nganh-mon" ? "major-to-subject" : "subject-to-major"}
        majors={majors.map(toLiteMajor)}
        programs={views.map(toLiteProgram)}
        combos={combos}
      />
    </div>
  );
}
