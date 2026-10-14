"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LuBellRing, LuCheck, LuCopy, LuPlus, LuShieldCheck, LuTrash2, LuUsers } from "react-icons/lu";
import type { RiasecType } from "@/domain/types";
import { RIASEC_INFO, RIASEC_ORDER } from "@/domain/riasec";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

interface PublicClass {
  id: string;
  name: string;
  school: string;
  code: string;
  createdAt: string;
  lastRemindAt: string | null;
  memberCount: number;
}
interface Member {
  key?: string;
  remindedAt?: string | null;
  name: string;
  quizDone: boolean;
  riasec: RiasecType[] | null;
  hasScore: boolean;
  wishlistCount: number;
  hasSafe: boolean | null;
}
interface Dashboard {
  cls: PublicClass;
  members: Member[];
  summary: { total: number; quiz: number; score: number; wishlist: number; noSafe: number; riasecTop: Record<RiasecType, number> };
}

const REMIND_HOURS = 6;

/** Bảng điều khiển giáo viên chủ nhiệm: tạo lớp, mã mời, tổng quan RIASEC, ai chưa có NV, nhắc cả lớp. */
export function TeacherDashboard() {
  const toast = useToast();
  const [classes, setClasses] = useState<PublicClass[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [form, setForm] = useState({ name: "", school: "" });
  const [formErr, setFormErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadClasses = useCallback(async (selectId?: string) => {
    const res = await fetch("/api/classes", { cache: "no-store" }).catch(() => null);
    const json = await res?.json().catch(() => null);
    const list: PublicClass[] = json?.ok ? json.mine : [];
    setClasses(list);
    setActiveId((cur) => selectId ?? (cur && list.some((c) => c.id === cur) ? cur : (list[0]?.id ?? null)));
  }, []);

  const loadDash = useCallback(async (id: string) => {
    setDash(null);
    const res = await fetch(`/api/classes/${encodeURIComponent(id)}`, { cache: "no-store" }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (json?.ok) setDash({ cls: json.cls, members: json.members, summary: json.summary });
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);
  useEffect(() => {
    if (activeId) void loadDash(activeId);
  }, [activeId, loadDash]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (form.name.trim().length < 2) return setFormErr("Nhập tên lớp, VD 12A1.");
    setBusy(true);
    const res = await fetch("/api/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setFormErr(json?.message ?? "Không tạo được lớp.");
    setFormErr(null);
    setForm({ name: "", school: form.school });
    toast(`Đã tạo lớp ${json.cls.name} · mã ${json.cls.code}`, "success");
    void loadClasses(json.cls.id);
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="order-2 space-y-4 lg:order-1">
        <Card className="p-5">
          <p className="text-sm font-bold text-slate-900">Lớp chủ nhiệm</p>
          {classes === null ? (
            <p className="mt-3 text-sm text-slate-500">Đang tải…</p>
          ) : classes.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Chưa có lớp nào. Tạo lớp đầu tiên bên dưới.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {classes.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    aria-current={c.id === activeId || undefined}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition",
                      c.id === activeId ? "bg-primary-50 font-semibold text-primary-700" : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <span className="min-w-0 truncate">{c.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">{c.memberCount} HS</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <form onSubmit={create} noValidate>
            <p className="text-sm font-bold text-slate-900">Tạo lớp mới</p>
            <Label htmlFor="cls-name" className="mt-3">
              Tên lớp
            </Label>
            <Input id="cls-name" value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: 12A1" invalid={!!formErr} />
            <Label htmlFor="cls-school" className="mt-3">
              Trường (không bắt buộc)
            </Label>
            <Input id="cls-school" value={form.school} maxLength={80} onChange={(e) => setForm({ ...form, school: e.target.value })} placeholder="VD: THPT Chu Văn An" />
            <FieldError>{formErr}</FieldError>
            <Button type="submit" size="sm" className="mt-3" disabled={busy}>
              <LuPlus className="size-4" aria-hidden /> Tạo lớp
            </Button>
          </form>
        </Card>
      </aside>

      <div className="order-1 min-w-0 lg:order-2">
        {activeId && !dash && <Card className="p-6 text-sm text-slate-500">Đang tải tiến độ lớp…</Card>}
        {dash && <ClassView dash={dash} onChanged={() => loadDash(dash.cls.id)} onRemoved={() => (setDash(null), loadClasses())} />}
        {classes?.length === 0 && (
          <Card className="p-8 text-center">
            <LuUsers className="mx-auto size-10 text-primary-600" aria-hidden />
            <p className="mt-3 font-semibold text-slate-900">Tạo lớp để nhận mã mời 6 ký tự</p>
            <p className="mt-1 text-sm text-slate-500">Gửi mã cho học sinh qua nhóm lớp. Học sinh tự nhập mã và đồng ý chia sẻ tiến độ.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function ClassView({ dash, onChanged, onRemoved }: { dash: Dashboard; onChanged: () => void; onRemoved: () => void }) {
  const toast = useToast();
  const { cls, members, summary } = dash;
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [copied, setCopied] = useState(false);

  const [shownAt] = useState(() => Date.now());
  const nextRemind = cls.lastRemindAt ? Date.parse(cls.lastRemindAt) + REMIND_HOURS * 3600_000 : 0;
  const cooling = nextRemind > shownAt;
  const noWish = members.filter((m) => m.wishlistCount === 0);
  const noQuiz = members.filter((m) => !m.quizDone);
  const maxType = useMemo(() => Math.max(1, ...RIASEC_ORDER.map((t) => summary.riasecTop[t])), [summary]);

  async function copyInvite() {
    const link = `${window.location.origin}/lop-hoc?ma=${cls.code}`;
    try {
      await navigator.clipboard.writeText(`Mã lớp ${cls.name} trên Trovio: ${cls.code} — vào ${link} để tham gia.`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(`Mã lớp: ${cls.code}`, "info");
    }
  }

  async function remind() {
    setBusy(true);
    const res = await fetch(`/api/classes/${encodeURIComponent(cls.id)}/remind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return toast(json?.message ?? "Không gửi được lời nhắc", "warning");
    toast(`Đã nhắc ${json.sent} học sinh`, "success");
    setMsg("");
    onChanged();
  }

  async function remove() {
    const res = await fetch(`/api/classes/${encodeURIComponent(cls.id)}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return toast("Không xoá được lớp", "warning");
    toast("Đã xoá lớp", "info");
    onRemoved();
  }

  const tiles = [
    { label: "đã làm trắc nghiệm", value: summary.quiz, cls: "text-primary-700" },
    { label: "đã lập nguyện vọng", value: summary.wishlist, cls: "text-primary-700" },
    { label: "chưa có NV An toàn", value: summary.noSafe, cls: "text-accent-700" },
  ];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-6 pb-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900">
              Lớp {cls.name}
              {cls.school ? ` · ${cls.school}` : ""}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {summary.total} học sinh đã tham gia và đồng ý chia sẻ tiến độ · mã lớp{" "}
              <strong className="font-mono tracking-widest text-primary-700" aria-label={`Mã lớp ${cls.code}`}>
                {cls.code}
              </strong>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={copyInvite}>
            {copied ? <LuCheck className="size-4" aria-hidden /> : <LuCopy className="size-4" aria-hidden />} {copied ? "Đã chép lời mời" : "Mã mời lớp"}
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3 px-6">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-xl bg-slate-50 p-4">
              <p className={cn("text-2xl font-bold", t.cls)}>{t.value}</p>
              <p className="mt-0.5 text-[13px] text-slate-600">{t.label}</p>
            </div>
          ))}
        </div>
        {members.length === 0 ? (
          <p className="px-6 py-5 text-sm text-slate-500">Chưa có học sinh tham gia. Gửi mã {cls.code} cho cả lớp nhé.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 px-6">
            {members.map((m, i) => {
              const st = memberStatus(m);
              return (
                <li key={m.key ?? `${m.name}-${i}`} className="grid grid-cols-[minmax(80px,140px)_1fr_auto_auto] items-center gap-3 py-3 text-sm">
                  <span className="truncate font-semibold text-slate-900">{m.name}</span>
                  <span className={st.cls}>{st.text}</span>
                  {m.riasec ? <Badge tone="primary" title="Mã sở thích RIASEC">{m.riasec.join("")}</Badge> : <span />}
                  <RemindOne classId={cls.id} member={m} onDone={onChanged} />
                </li>
              );
            })}
          </ul>
        )}
        <p className="flex items-center gap-1.5 border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
          <LuShieldCheck className="size-3.5 shrink-0 text-success-700" aria-hidden /> Giáo viên chỉ thấy trạng thái, không thấy điểm số hay danh sách trường học sinh chọn.
        </p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-bold text-slate-900">Tổng quan sở thích (RIASEC) của lớp</h3>
          <p className="mt-1 text-[13px] text-slate-500">Theo nhóm nổi bật nhất của mỗi học sinh đã làm trắc nghiệm.</p>
          <ul className="mt-4 space-y-2.5">
            {RIASEC_ORDER.map((t) => (
              <li key={t} className="grid grid-cols-[110px_1fr_28px] items-center gap-3 text-sm">
                <span className="truncate text-slate-700">
                  <strong className="text-primary-700">{t}</strong> · {RIASEC_INFO[t].label}
                </span>
                <span className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full rounded-full bg-primary-600" style={{ width: `${(summary.riasecTop[t] / maxType) * 100}%` }} />
                </span>
                <span className="text-right font-semibold text-slate-700">{summary.riasecTop[t]}</span>
              </li>
            ))}
          </ul>
          {summary.quiz === 0 && <p className="mt-3 text-[13px] text-slate-500">Chưa học sinh nào làm trắc nghiệm.</p>}
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-slate-900">Cần quan tâm</h3>
          <div className="mt-3 space-y-3 text-sm">
            <NeedList label="Chưa có nguyện vọng nào" tone="danger" people={noWish.map((m) => m.name)} />
            <NeedList label="Chưa làm trắc nghiệm sở thích" tone="accent" people={noQuiz.map((m) => m.name)} />
            <p className="text-[13px] text-slate-500">
              <strong className="text-slate-700">{summary.noSafe}</strong> em có nguyện vọng nhưng chưa có NV “An toàn” hoặc chưa nhập điểm để kiểm tra.
            </p>
          </div>
          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <label htmlFor="remind-msg" className="text-sm font-semibold text-slate-800">
              Nhắc cả lớp (thông báo trên Trovio)
            </label>
            <textarea
              id="remind-msg"
              value={msg}
              maxLength={200}
              rows={2}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Để trống = “Nhớ hoàn thành trắc nghiệm sở thích và lập danh sách nguyện vọng trước hạn đăng ký nhé.”"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                {cooling ? `Đã nhắc lúc ${new Date(cls.lastRemindAt!).toLocaleString("vi-VN")} · nhắc lại sau ${REMIND_HOURS} giờ` : `Mỗi lớp nhắc tối đa 1 lần / ${REMIND_HOURS} giờ.`}
              </span>
              <Button size="sm" onClick={remind} disabled={busy || cooling || summary.total === 0}>
                <LuBellRing className="size-4" aria-hidden /> Nhắc cả lớp
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        {confirmDel ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Xoá lớp {cls.name}? Học sinh sẽ rời lớp.</span>
            <Button variant="danger" size="sm" onClick={remove}>
              Xoá lớp
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDel(false)}>
              Huỷ
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="text-danger-700" onClick={() => setConfirmDel(true)}>
            <LuTrash2 className="size-4" aria-hidden /> Xoá lớp
          </Button>
        )}
      </div>
    </div>
  );
}

function NeedList({ label, tone, people }: { label: string; tone: "danger" | "accent"; people: string[] }) {
  return (
    <div>
      <p className="flex items-center gap-2 font-semibold text-slate-800">
        {label} <Badge tone={people.length ? tone : "success"}>{people.length}</Badge>
      </p>
      {people.length > 0 && <p className="mt-1 text-[13px] text-slate-500">{people.slice(0, 12).join(", ")}{people.length > 12 ? ` và ${people.length - 12} em khác` : ""}</p>}
    </div>
  );
}

const MEMBER_REMIND_HOURS = 24;

/** "Gửi nhắc" riêng một học sinh (giới hạn 1 lần / 24 giờ). */
function RemindOne({ classId, member, onDone }: { classId: string; member: Member; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());
  if (!member.key) return <span />;
  const recent = !!member.remindedAt && now - Date.parse(member.remindedAt) < MEMBER_REMIND_HOURS * 3600_000;
  if (recent) return <span className="text-xs text-slate-400">Đã nhắc</span>;
  return (
    <button
      type="button"
      disabled={busy}
      className="text-sm font-semibold text-primary-600 hover:underline disabled:opacity-50"
      onClick={async () => {
        setBusy(true);
        const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/remind`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberKey: member.key }) }).catch(() => null);
        const json = await res?.json().catch(() => null);
        setBusy(false);
        if (!res?.ok) return toast(json?.message ?? "Không gửi được lời nhắc", "warning");
        toast(`Đã nhắc ${member.name}`, "success");
        onDone();
      }}
      aria-label={`Gửi nhắc ${member.name}`}
    >
      Gửi nhắc
    </button>
  );
}

function memberStatus(m: Member): { text: string; cls: string } {
  if (m.wishlistCount === 0) return m.quizDone ? { text: "Chưa lập nguyện vọng", cls: "text-accent-700" } : { text: "Chưa làm trắc nghiệm", cls: "text-slate-500" };
  if (m.hasSafe === true) return { text: `Đã lập ${m.wishlistCount} NV · có An toàn`, cls: "text-success-700" };
  if (m.hasSafe === false) return { text: `${m.wishlistCount} NV · chưa có NV An toàn`, cls: "text-accent-700" };
  return { text: `Đã lập ${m.wishlistCount} NV · chưa nhập điểm để kiểm tra`, cls: "text-slate-600" };
}
