"use client";

import { useState } from "react";

/**
 * Nhắc qua Zalo (bản gọn): chia sẻ danh sách mốc bằng bảng chia sẻ của điện thoại (chọn Zalo → "Cloud của tôi"
 * hoặc nhóm lớp). Máy không hỗ trợ thì chép nội dung để dán vào Zalo.
 */
export function ZaloReminder({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function share() {
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Mốc tuyển sinh", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setState("error");
    }
  }

  return (
    <div className="mt-3 rounded-lg bg-primary-50 p-3 text-sm">
      <p className="font-semibold text-primary-800">Gửi lịch nhắc vào Zalo</p>
      <p className="mt-0.5 text-slate-600">Chọn Zalo → “Cloud của tôi” (hoặc nhóm lớp) để lưu các mốc ngay trong Zalo.</p>
      <button type="button" onClick={share} className="mt-2 rounded border border-primary-600 px-3 py-1.5 font-semibold text-primary-700">
        Chia sẻ sang Zalo
      </button>
      {state === "copied" && <p className="mt-1.5 text-success-700">Đã chép nội dung — mở Zalo và dán vào “Cloud của tôi”.</p>}
      {state === "error" && <p className="mt-1.5 text-danger-700">Không chia sẻ được. Hãy chụp màn hình danh sách mốc.</p>}
    </div>
  );
}
