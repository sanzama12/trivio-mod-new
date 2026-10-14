"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LuArrowRight, LuBookmark, LuCompass, LuInfo, LuLightbulb, LuRotateCcw, LuShare2 } from "react-icons/lu";
import { RIASEC_INFO } from "@/domain/riasec";
import type { Major, MajorGroup, RiasecType } from "@/domain/types";
import { formatDateVi } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useTrovio } from "@/stores/trovio-store";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { useLoginGate } from "@/components/auth/login-gate";
import { RadarChart } from "./radar-chart";
import { ShareCardDialog } from "@/components/share-card/share-card-dialog";
import { RIASEC_BG, RiasecLetter, RiasecPill } from "./riasec-pill";
import { MajorStyleNote, StyleEntryCard } from "@/components/work-style/style-bits";

type Rec = { major: Major; group: MajorGroup; match: number };

export function QuizResultView() {
  const { quiz, setQuiz, hydrated, user } = useTrovio();
  const [cardOpen, setCardOpen] = useState(false);
  const { requireLogin } = useLoginGate();
  const toast = useToast();
  const [recs, setRecs] = useState<Rec[] | null>(null);

  useEffect(() => {
    if (!quiz) return;
    fetch("/api/quiz/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ percents: quiz.result.percents, code: quiz.result.code }),
    })
      .then((r) => r.json())
      .then((d: { majors: Rec[] }) => setRecs(d.majors))
      .catch(() => setRecs([]));
  }, [quiz]);

  if (!hydrated) return <div role="status" className="container-page py-20 text-center text-slate-500">Đang tải kết quả…</div>;

  if (!quiz) {
    return (
      <div className="container-page py-16">
        <Card>
          <EmptyState headingAs="h1" icon={<LuCompass />} title="Bạn chưa có kết quả trắc nghiệm" description="Làm bài trắc nghiệm RIASEC (7–10 phút) để nhận gợi ý ngành học phù hợp.">
            <Link href="/trac-nghiem" className={buttonClass()}>
              Làm trắc nghiệm ngay
            </Link>
          </EmptyState>
        </Card>
      </div>
    );
  }

  const { result } = quiz;
  const [a, b, c] = result.code;
  const topMajors = recs?.slice(0, 3).map((r) => r.major.id) ?? [];

  const saveToProfile = () => {
    requireLogin(
      {
        title: "Đăng nhập để lưu kết quả",
        reason: "Lưu mã RIASEC vào hồ sơ để nhận gợi ý ngành, trường phù hợp mỗi lần quay lại — trên mọi thiết bị.",
        intent: { kind: "quiz" },
      },
      () => {
        setQuiz({ ...quiz, savedToProfile: true });
        toast("Đã lưu kết quả vào hồ sơ", "success");
      },
    );
  };

  return (
    <div className="container-page py-8">
      <div className="text-center">
        <p className="text-sm text-slate-500">
          <Link href="/trac-nghiem" className="hover:text-primary-700">
            Trắc nghiệm sở thích
          </Link>{" "}
          › Kết quả của bạn
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Kết quả trắc nghiệm sở thích nghề nghiệp</h1>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="font-semibold text-slate-700">Mã RIASEC của bạn:</span>
          {result.code.map((t) => (
            <RiasecPill key={t} type={t} />
          ))}
        </div>
        <p className="mt-2 text-[13px] text-slate-500">
          Hoàn thành ngày {formatDateVi(result.completedAt)} · đã trả lời {result.answered} câu
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-bold">Biểu đồ sở thích nghề nghiệp</h2>
            <div className="mt-4">
              <RadarChart percents={result.percents} />
            </div>
            <ul className="mt-6 space-y-3">
              {result.ranking.map((t: RiasecType, i) => (
                <li key={t} className={cn("rounded-xl border p-3", i < 3 ? "border-primary-200 bg-primary-50/50" : "border-slate-200")}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-semibold text-slate-800">
                      <RiasecLetter type={t} className="size-6 text-[11px]" />
                      {RIASEC_INFO[t].label} <span className="font-normal text-slate-500">({RIASEC_INFO[t].name})</span>
                    </span>
                    <span className="font-bold text-slate-900">{result.percents[t]}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className={cn("h-full rounded-full", RIASEC_BG[t])} style={{ width: `${result.percents[t]}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-accent-200 bg-accent-50/60 p-6">
            <h2 className="flex items-center gap-2 font-bold text-slate-900">
              <LuLightbulb className="size-5 text-accent-700" aria-hidden /> Giải thích tính cách nghề nghiệp
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Bạn có xu hướng mạnh về <strong>{RIASEC_INFO[a].label}</strong> ({RIASEC_INFO[a].desc.replace(/\.$/, "").toLowerCase()}), kết hợp với{" "}
              <strong>{RIASEC_INFO[b].label}</strong> và <strong>{RIASEC_INFO[c].label}</strong>. Những ngành cho phép bạn phát huy cả ba xu hướng này thường mang lại sự
              hứng thú lâu dài.
            </p>
            <p className="mt-4 flex gap-2 rounded-lg bg-white/70 p-3 text-xs text-slate-600">
              <LuInfo className="mt-0.5 size-4 shrink-0" aria-hidden />
              Kết quả mang tính tham khảo, giúp bạn khám phá thêm – không phải kết luận về năng lực hay tính cách.
            </p>
          </Card>

          <StyleEntryCard />
        </div>

        <div>
          <h2 className="text-xl font-bold">Ngành học đề xuất phù hợp nhất</h2>
          <p className="mt-1 text-sm text-slate-500">Dựa trên mã RIASEC {result.code.join(" – ")} của bạn</p>
          <div className="mt-5 space-y-4">
            {recs === null &&
              [0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}
            {recs?.map(({ major, group, match }) => (
              <Card key={major.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{major.name}</h3>
                    <p className="text-xs text-slate-500">{group.name}</p>
                  </div>
                  <Badge tone={match >= 80 ? "success" : match >= 65 ? "primary" : "slate"}>{match}% phù hợp</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{major.summary}</p>
                <MajorStyleNote major={major} code={result.code.join("")} />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-1.5" aria-label={`Mã Holland của ngành: ${major.riasec.join("-")}`}>
                    {major.riasec.map((t) => (
                      <RiasecLetter key={t} type={t} className="size-6 text-[11px]" />
                    ))}
                  </div>
                  <Link href={`/nganh/${major.slug}`} className="flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline">
                    Xem ngành & trường đào tạo <LuArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={saveToProfile} disabled={quiz.savedToProfile}>
                <LuBookmark className="size-4" aria-hidden /> {quiz.savedToProfile ? "Đã lưu vào hồ sơ" : "Lưu kết quả vào hồ sơ"}
              </Button>
              <Button variant="outline" onClick={() => setCardOpen(true)}>
                <LuShare2 className="size-4" aria-hidden /> Tạo thẻ chia sẻ
              </Button>
              <Link href="/trac-nghiem/lam-bai" className={buttonClass({ variant: "ghost" })}>
                <LuRotateCcw className="size-4" aria-hidden /> Làm lại bài test
              </Link>
            </div>
            <Link href={`/chuong-trinh?majors=${topMajors.join(",")}`} className={buttonClass()}>
              Tìm trường đào tạo ngành phù hợp <LuArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          {cardOpen && (
            <ShareCardDialog
              initial="riasec"
              onClose={() => setCardOpen(false)}
              data={{
                name: user?.name ? user.name.trim().split(/\s+/).pop() ?? null : null,
                riasec: { code: [...result.code], percents: result.percents, topMajors: (recs ?? []).slice(0, 3).map((r) => r.major.name) },
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
