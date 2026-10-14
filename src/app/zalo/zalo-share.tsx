"use client";

/** Chia sẻ vào nhóm lớp / nhóm gia đình: Web Share (mở được Zalo trên điện thoại) hoặc sao chép tin nhắn. */
import { useEffect, useState } from "react";
import { LuShare2 } from "react-icons/lu";
import { useToast } from "@/components/ui/toast";

const KEY = "trovio:v1";

export function ZaloShare({ code, name }: { code: string | null; name: string | null }) {
  const toast = useToast();
  const [mine, setMine] = useState<string | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const c = raw ? (JSON.parse(raw)?.quiz?.result?.code as unknown) : null;
      if (Array.isArray(c) && c.length === 3) setMine(c.join(""));
    } catch {
      /* bộ nhớ trình duyệt không dùng được */
    }
  }, []);
  const share = async () => {
    const own = mine ?? code;
    const url = new URL("/zalo", window.location.origin);
    if (own) url.searchParams.set("ma", own);
    const text = own ? `Mã sở thích của tớ là ${own.split("").join(" · ")} — rủ cả lớp làm trắc nghiệm chọn ngành nè!` : "Làm trắc nghiệm chọn ngành miễn phí, 7 phút nè!";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Trovio – chọn ngành hợp với bạn", text, url: url.toString() });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url.toString()}`);
      toast("Đã sao chép tin nhắn — dán vào nhóm lớp trên Zalo nhé.", "success");
    } catch {
      /* người dùng huỷ chia sẻ */
    }
  };
  return (
    <button type="button" onClick={share} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary-600 text-sm font-semibold text-primary-700 hover:bg-primary-50">
      <LuShare2 className="size-4" aria-hidden /> {mine || code ? "Chia sẻ kết quả vào nhóm lớp" : "Rủ nhóm lớp cùng làm"}
      {name && !mine ? <span className="sr-only"> (đang xem kết quả của {name})</span> : null}
    </button>
  );
}
