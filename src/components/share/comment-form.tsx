"use client";

import { useState, type FormEvent } from "react";
import { LuCircleCheck, LuSend } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";

/** Form góp ý cho người xem link chia sẻ (không cần tài khoản). */
export function ShareCommentForm({ shareId, programs }: { shareId: string; programs: { id: string; label: string }[] }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [programId, setProgramId] = useState("");
  const [website, setWebsite] = useState(""); // bẫy bot, người thật không thấy
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Vui lòng nhập tên hoặc cách xưng hô (VD: Mẹ, Bố).");
    if (message.trim().length < 2) return setError("Vui lòng nhập nội dung góp ý.");
    setBusy(true);
    const res = await fetch(`/api/share/${encodeURIComponent(shareId)}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, message, programId: programId || null, website }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.message ?? "Không gửi được góp ý, vui lòng thử lại.");
    setSent(true);
    setMessage("");
    setError(null);
  };

  return (
    <section aria-labelledby="comment-title" className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:p-6">
      <h2 id="comment-title" className="text-lg font-bold text-slate-900">
        Gửi góp ý
      </h2>
      <p className="mt-1 text-sm text-slate-500">Góp ý chỉ người chia sẻ đọc được.</p>
      {sent ? (
        <div role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-success-50 p-4 text-sm text-success-700">
          <LuCircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Đã gửi góp ý. Cảm ơn bạn!</p>
            <button type="button" onClick={() => setSent(false)} className="mt-1 font-semibold underline">
              Gửi thêm góp ý
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="c-name">Bạn là</Label>
              <Input id="c-name" maxLength={40} placeholder="VD: Mẹ, Bố, Cô chủ nhiệm" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="c-program">Về nguyện vọng (tuỳ chọn)</Label>
              <select
                id="c-program"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
              >
                <option value="">Cả danh sách</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="c-message">Nội dung</Label>
            <textarea
              id="c-message"
              rows={4}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="VD: Con cân nhắc thêm một nguyện vọng ở gần nhà nhé."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
            />
            <p className="mt-1 text-right text-xs text-slate-500">{message.length}/500</p>
          </div>
          <div className="hidden" aria-hidden>
            <label htmlFor="c-website">Website</label>
            <input id="c-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <FieldError>{error}</FieldError>
          <Button type="submit" disabled={busy}>
            <LuSend className="size-4" aria-hidden /> {busy ? "Đang gửi…" : "Gửi góp ý"}
          </Button>
        </form>
      )}
    </section>
  );
}
