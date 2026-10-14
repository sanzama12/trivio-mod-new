import type { Metadata } from "next";
import Link from "next/link";
import { LuArrowLeft, LuCompass, LuHeart, LuSearch } from "react-icons/lu";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OnboardingForm } from "@/components/account/onboarding-form";

export const metadata: Metadata = { title: "Chào mừng" };

const features = [
  { icon: LuSearch, title: "Tìm chương trình phù hợp", desc: "So sánh điểm chuẩn, học phí và vị trí các trường." },
  { icon: LuCompass, title: "Khám phá sở thích", desc: "Làm bài trắc nghiệm RIASEC miễn phí để tìm ngành phù hợp." },
  { icon: LuHeart, title: "Lưu & lập nguyện vọng", desc: "Lưu chương trình yêu thích và sắp xếp thứ tự nguyện vọng dự kiến." },
];

type Props = { searchParams: Promise<{ next?: string }> };

export default async function WelcomePage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const next = safeNext((await searchParams).next, "/");

  if (user && !user.onboarded) {
    return (
      <div className="container-page py-12">
        <OnboardingForm user={user} />
      </div>
    );
  }

  const first = user?.name.split(" ").slice(-1)[0];
  return (
    <div className="container-page py-12">
      <Card className="mx-auto max-w-4xl p-6 md:p-12">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_260px]">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Chào mừng{first ? ` ${first}` : ""} đến với Trovio!</h1>
            <p className="mt-3 leading-relaxed text-slate-600">
              Tài khoản của bạn đã sẵn sàng. Trovio giúp bạn tìm trường, hiểu ngành và lập kế hoạch tuyển sinh trong vài phút.
            </p>
            {next !== "/" && (
              <Link href={next} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline">
                <LuArrowLeft className="size-4" aria-hidden /> Quay lại trang bạn đang xem
              </Link>
            )}
          </div>
          <div className="hidden h-44 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 md:flex">
            <LuCompass className="size-20 text-primary-600" aria-hidden />
          </div>
        </div>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <li key={f.title} className="rounded-xl border border-slate-200 p-4">
              <f.icon className="size-6 text-primary-600" aria-hidden />
              <p className="mt-3 font-semibold text-slate-900">{f.title}</p>
              <p className="mt-1 text-[13px] text-slate-500">{f.desc}</p>
            </li>
          ))}
        </ul>
        <div className="mt-10 text-center">
          <p className="font-semibold text-slate-900">Bạn muốn bắt đầu từ đâu?</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/diem-cua-toi" className={buttonClass({ size: "lg" })}>
              Nhập điểm & tìm chương trình
            </Link>
            <Link href="/trac-nghiem" className={buttonClass({ variant: "outline", size: "lg" })}>
              Làm trắc nghiệm
            </Link>
          </div>
          <Link href={next} className="mt-5 inline-block text-sm text-slate-500 underline-offset-4 hover:underline">
            Bỏ qua, tôi sẽ tự khám phá
          </Link>
        </div>
      </Card>
    </div>
  );
}
