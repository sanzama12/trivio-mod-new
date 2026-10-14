"use client";

import { useCallback, useEffect, useState } from "react";
import { LuLogOut, LuUsers } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

interface Joined {
  id: string;
  name: string;
  school: string;
  teacher: string;
}

/** Học sinh nhập mã lớp (đồng ý chia sẻ tiến độ) và xem / rời các lớp đã tham gia. */
export function JoinClass({ initialCode = "" }: { initialCode?: string }) {
  const toast = useToast();
  const [code, setCode] = useState(initialCode);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<Joined[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/classes", { cache: "no-store" }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setJoined(json?.ok ? json.joined : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length !== 6) return setError("Mã lớp gồm 6 ký tự.");
    if (!agree) return setError("Đánh dấu đồng ý chia sẻ tiến độ để tham gia.");
    setBusy(true);
    setError(null);
    const res = await fetch("/api/classes/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(json?.message ?? "Không tham gia được lớp.");
    toast(`Đã tham gia lớp ${json.cls.name}`, "success");
    setCode("");
    setAgree(false);
    void load();
  }

  async function leave(id: string) {
    const res = await fetch(`/api/classes/${encodeURIComponent(id)}?leave=1`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return toast("Không rời lớp được, thử lại sau", "warning");
    toast("Đã rời lớp", "info");
    void load();
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-bold">Nhập mã lớp</h2>
        <form onSubmit={join} className="mt-4" noValidate>
          <Label htmlFor="class-code">Mã lớp (6 ký tự)</Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="class-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder="VD: K7M2QX"
              autoComplete="off"
              className="font-mono text-base tracking-[0.3em] uppercase sm:max-w-56"
              invalid={!!error}
              aria-describedby={error ? "class-err" : undefined}
            />
            <Button type="submit" disabled={busy}>
              {busy ? "Đang tham gia…" : "Tham gia lớp"}
            </Button>
          </div>
          <label className="mt-3 flex items-start gap-2 text-[13px] text-slate-600">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 accent-primary-600" />
            Tôi đồng ý cho giáo viên chủ nhiệm xem tiến độ chọn ngành của tôi (không gồm điểm số và trường đã chọn).
          </label>
          <FieldError id="class-err">{error}</FieldError>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <LuUsers className="size-5 text-primary-600" aria-hidden /> Lớp đã tham gia
        </h2>
        {joined === null ? (
          <p className="mt-3 text-sm text-slate-500">Đang tải…</p>
        ) : joined.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Bạn chưa tham gia lớp nào.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {joined.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{c.name}</p>
                  <p className="text-[13px] text-slate-500">
                    {c.school || "—"} · GVCN {c.teacher}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => leave(c.id)}>
                  <LuLogOut className="size-4" aria-hidden /> Rời lớp
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
