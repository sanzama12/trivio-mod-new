"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LuArrowRight } from "react-icons/lu";
import { ButtonLink } from "@/components/ui/button";
import { readRiasecDraft, readRiasecResult } from "./quiz-storage";

export function QuizEntry() {
  const [draft, setDraft] = useState(false);
  const [result, setResult] = useState(false);
  useEffect(() => {
    setDraft(Object.keys(readRiasecDraft()).length > 0);
    setResult(!!readRiasecResult());
  }, []);
  return (
    <div className="flex flex-wrap items-center gap-4">
      <ButtonLink href="/trac-nghiem/lam-bai" size="lg">
        {draft ? "Làm tiếp" : "Bắt đầu làm bài"}<LuArrowRight className="size-4" aria-hidden />
      </ButtonLink>
      {result && <Link href="/trac-nghiem/ket-qua" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-700 underline underline-offset-4">Xem kết quả trước</Link>}
    </div>
  );
}
