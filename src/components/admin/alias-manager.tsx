"use client";

/** Quản lý từ khoá/cách gọi khác để chatbot nhận ra ngành hoặc trường. */
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

type Opt = { id: string; name: string };
type Alias = { id: string; label: string; kind: "major" | "school"; targetId: string; targetName: string };

export function AliasManager({ aliases, majors, schools }: { aliases: Alias[]; majors: Opt[]; schools: Opt[] }) {
  const router = useRouter();
  const toast = useToast();
  const [alias, setAlias] = useState("");
  const [kind, setKind] = useState<"major" | "school">("major");
  const [targetId, setTargetId] = useState(majors[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const opts = kind === "major" ? majors : schools;

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/chat-aliases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alias, kind, targetId }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !d.ok) return setError(d.message ?? "Không thêm được.");
    setError(null);
    setAlias("");
    toast("Đã thêm từ khoá — chatbot dùng ngay cho câu hỏi tiếp theo", "success");
    router.refresh();
  };

  const remove = async (a: Alias) => {
    const res = await fetch(`/api/admin/chat-aliases/${encodeURIComponent(a.id)}`, { method: "DELETE" });
    toast(res.ok ? `Đã xoá “${a.label}”` : "Không xoá được", res.ok ? "info" : "warning");
    router.refresh();
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-bold">Từ khoá chatbot</h2>
      <p className="mt-1 text-sm text-slate-500">
        Thêm cách gọi khác (viết tắt, tên thường gọi) khi thấy câu hỏi “chưa có dữ liệu” vì chatbot không nhận ra ngành/trường. VD: “IT” → Công nghệ thông tin, “Bách khoa” → ĐH Bách khoa Hà Nội.
      </p>
      <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-[1fr_130px_1fr_auto] sm:items-end" noValidate>
        <div>
          <Label htmlFor="al-text">Từ khoá</Label>
          <Input id="al-text" value={alias} maxLength={60} onChange={(e) => setAlias(e.target.value)} placeholder="VD: ngành xây dựng dân dụng" invalid={!!error} />
        </div>
        <div>
          <Label htmlFor="al-kind">Loại</Label>
          <select
            id="al-kind"
            value={kind}
            onChange={(e) => {
              const k = e.target.value as "major" | "school";
              setKind(k);
              setTargetId((k === "major" ? majors : schools)[0]?.id ?? "");
            }}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="major">Ngành</option>
            <option value="school">Trường</option>
          </select>
        </div>
        <div>
          <Label htmlFor="al-target">Trỏ tới</Label>
          <select id="al-target" value={targetId} onChange={(e) => setTargetId(e.target.value)} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm">
            {opts.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={busy || alias.trim().length < 2}>
          <LuPlus className="size-4" aria-hidden /> Thêm
        </Button>
      </form>
      <FieldError>{error}</FieldError>
      {aliases.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Chưa có từ khoá bổ sung.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {aliases.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0">
                <strong className="text-slate-900">“{a.label}”</strong> → {a.targetName}{" "}
                <span className="text-xs text-slate-500">({a.kind === "major" ? "ngành" : "trường"})</span>
              </span>
              <button type="button" onClick={() => remove(a)} aria-label={`Xoá từ khoá ${a.label}`} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-danger-50 hover:text-danger-700">
                <LuTrash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
