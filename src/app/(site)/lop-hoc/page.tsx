import type { Metadata } from "next";
import { LuSchool, LuShieldCheck } from "react-icons/lu";
import { getCurrentUser } from "@/lib/auth";
import { Breadcrumb } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { TeacherDashboard } from "@/components/class/teacher-dashboard";
import { JoinClass } from "@/components/class/join-class";

export const metadata: Metadata = { title: "Lớp học – kênh giáo viên chủ nhiệm", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ ma?: string }> };

const SHARED = ["Đã làm trắc nghiệm sở thích chưa (và mã RIASEC)", "Đã nhập điểm chưa", "Số nguyện vọng dự kiến", "Có nguyện vọng “An toàn” chưa"];
const HIDDEN = ["Điểm số cụ thể", "Tên trường, ngành bạn chọn", "Ghi chú cá nhân"];

export default async function ClassPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const { ma } = await searchParams;
  const code = (ma ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const next = `/lop-hoc${code ? `?ma=${code}` : ""}`;

  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Lớp học" }]} />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold tracking-wider text-primary-600 uppercase">
            <LuSchool className="size-4" aria-hidden /> Kênh giáo viên chủ nhiệm
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-[28px]">
            {user?.role === "teacher" ? "Lớp của tôi" : "Tham gia lớp của thầy cô"}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            {user?.role === "teacher"
              ? "Theo dõi tiến độ chọn ngành của cả lớp, biết em nào chưa có nguyện vọng và nhắc cả lớp chỉ với một nút bấm."
              : "Nhập mã lớp thầy cô gửi để thầy cô theo dõi tiến độ và nhắc bạn trước các mốc quan trọng."}
          </p>
        </div>
      </div>

      {!user ? (
        <Card className="mt-6 grid gap-6 p-6 md:grid-cols-[1fr_320px] md:p-8">
          <div>
            <h2 className="text-lg font-bold">Đăng nhập để tham gia hoặc tạo lớp</h2>
            <p className="mt-1.5 text-sm text-slate-600">Giáo viên chọn vai trò “Giáo viên” khi đăng ký. Học sinh dùng mã lớp 6 ký tự thầy cô gửi.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink href={`/dang-nhap?next=${encodeURIComponent(next)}`}>Đăng nhập</ButtonLink>
              <ButtonLink href="/dang-ky" variant="outline">
                Tạo tài khoản
              </ButtonLink>
            </div>
          </div>
          <PrivacyBox />
        </Card>
      ) : user.role === "teacher" ? (
        <TeacherDashboard />
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <JoinClass initialCode={code} />
          <PrivacyBox />
        </div>
      )}
    </div>
  );
}

function PrivacyBox() {
  return (
    <Card className="h-fit border-l-4 border-l-success-500 p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <LuShieldCheck className="size-4 text-success-700" aria-hidden /> Thầy cô thấy gì?
      </p>
      <ul className="mt-3 space-y-1.5 text-[13px] text-slate-600">
        {SHARED.map((s) => (
          <li key={s} className="flex gap-2">
            <span className="text-success-700" aria-hidden>
              ✓
            </span>
            {s}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Không chia sẻ</p>
      <ul className="mt-1.5 space-y-1.5 text-[13px] text-slate-500">
        {HIDDEN.map((s) => (
          <li key={s} className="flex gap-2 line-through decoration-slate-400">
            {s}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">Bạn có thể rời lớp bất cứ lúc nào.</p>
    </Card>
  );
}
