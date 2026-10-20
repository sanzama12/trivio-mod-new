"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LuArrowUpRight,
  LuBadgeCheck,
  LuBell,
  LuBookOpen,
  LuChevronRight,
  LuDatabase,
  LuGitCompare,
  LuHeart,
  LuHistory,
  LuKeyRound,
  LuLogOut,
  LuPencil,
  LuSettings,
  LuShieldCheck,
  LuSlidersHorizontal,
  LuSparkles,
  LuUserRound,
} from "react-icons/lu";
import { StylePills } from "@/components/work-style/style-bits";
import { REGION_LABELS, TUITION_RANGES } from "@/services/program.filters";
import { ADMISSION_METHODS, formatMethodScore, PRIORITY_REGION_LABELS, profileMethod, profileScore } from "@/services/scoring.service";
import { formatDateVi } from "@/lib/format";
import { ROLE_LABELS } from "@/domain/provinces";
import { useTrovio } from "@/stores/trovio-store";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import type { PublicUser } from "@/domain/types";
import { Avatar } from "@/components/ui/avatar";
import { FieldError, Input, Label } from "@/components/ui/field";
import { ProfileFields, type ProfileFormValue } from "@/components/account/profile-fields";
import { LoginMethods } from "@/components/account/login-methods";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const NAV = [
  { href: "#tong-quan", label: "Tổng quan", icon: LuUserRound },
  { href: "#dieu-kien", label: "Hồ sơ học tập & xét tuyển", icon: LuSlidersHorizontal },
  { href: "#phong-cach", label: "Phong cách làm việc", icon: LuSparkles },
  { href: "#hoat-dong", label: "Hoạt động", icon: LuHistory },
  { href: "#dang-nhap", label: "Phương thức đăng nhập", icon: LuKeyRound },
  { href: "#cai-dat", label: "Cài đặt tài khoản", icon: LuSettings },
];

export function ProfileClient({ user, googleConfigured, notice }: { user: PublicUser; googleConfigured: boolean; notice?: { linked?: string; error?: string } }) {
  const router = useRouter();
  const toast = useToast();
  const store = useTrovio();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [fields, setFields] = useState<ProfileFormValue>({
    role: user.role,
    gradYear: user.gradYear,
    province: user.province,
    under16: user.under16,
    parentConsent: user.parentConsent,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);
  const initialFields = { role: user.role, gradYear: user.gradYear, province: user.province, under16: user.under16, parentConsent: user.parentConsent };
  const dirty = name.trim() !== user.name || JSON.stringify(fields) !== JSON.stringify(initialFields);
  const discard = () => {
    setName(user.name);
    setFields(initialFields);
    setFormError(null);
    setNameError(null);
    setEditing(false);
    setAskDiscard(false);
  };

  useEffect(() => {
    if (editing) return;
    setName(user.name);
    setFields({ role: user.role, gradYear: user.gradYear, province: user.province, under16: user.under16, parentConsent: user.parentConsent });
  }, [editing, user]);

  useEffect(() => {
    if (notice?.linked === "google") toast("Đã liên kết tài khoản Google", "success");
  }, [notice?.linked, toast]);

  // Rời trang khi đang sửa dở → trình duyệt hỏi lại.
  useEffect(() => {
    if (!editing || !dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editing, dirty]);

  const saveProfile = async () => {
    setSaving(true);
    setFormError(null);
    setNameError(null);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), ...fields }),
    }).catch(() => null);
    setSaving(false);
    if (!res) return setFormError("Không lưu được, thử lại sau.");
    const data = await res.json().catch(() => null);
    if (!data?.ok) {
      const message = typeof data?.message === "string" ? data.message : "Không lưu được hồ sơ.";
      if (data?.field === "name") setNameError(message);
      else setFormError(message);
      return;
    }
    setEditing(false);
    toast("Đã cập nhật hồ sơ", "success");
    router.refresh();
  };

  const deleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    const res = await fetch("/api/account", { method: "DELETE" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setDeleting(false);
    if (!res?.ok || data?.ok === false) {
      setConfirmDelete(false);
      return toast(typeof data?.message === "string" ? data.message : "Không xoá được tài khoản, vui lòng thử lại", "warning");
    }
    toast("Đã xoá tài khoản và toàn bộ dữ liệu", "info");
    router.push("/");
    router.refresh();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const budgetLabel = (max: number | null) =>
    max == null ? "Không giới hạn" : (Object.values(TUITION_RANGES).find((r) => r.max === max)?.label ?? `${max} triệu`);

  const missing = [
    !user.role && "vai trò",
    user.gradYear == null && (user.role === "parent" ? "năm con tốt nghiệp" : "năm tốt nghiệp THPT"),
    !user.province && "tỉnh/thành",
  ].filter((item): item is string => Boolean(item));

  const facts: [string, string][] = [
    ["Email", user.email],
    ...(user.role ? [["Vai trò", ROLE_LABELS[user.role]] as [string, string]] : []),
    ...(user.gradYear != null
      ? [[user.role === "parent" ? "Con tốt nghiệp THPT" : "Năm tốt nghiệp THPT", String(user.gradYear)] as [string, string]]
      : []),
    ...(user.province ? [["Tỉnh/thành", user.province] as [string, string]] : []),
    ["Ngày tạo", formatDateVi(user.createdAt)],
    ...(user.lastLoginAt ? [["Đăng nhập gần nhất", formatDateVi(user.lastLoginAt)] as [string, string]] : []),
  ];

  const profileCompletion = Math.round(((3 - missing.length) / 3) * 100);
  const activity = [
    { n: store.saved.length, label: "Đã lưu", detail: "Chương trình", href: "/da-luu", icon: LuHeart },
    { n: store.wishlist.length, label: "Nguyện vọng", detail: "Dự kiến", href: "/da-luu", icon: LuBookOpen },
    { n: store.compare.length, label: "So sánh", detail: "Đang xem", href: "/so-sanh", icon: LuGitCompare },
    { n: store.reminders.length, label: "Nhắc lịch", detail: "Mốc tuyển sinh", href: "/moc-tuyen-sinh", icon: LuBell },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <section className="relative overflow-hidden rounded-[1.75rem] border-2 border-slate-950 bg-primary-900 text-white shadow-[6px_6px_0_0_#ffd60a]">
        <span aria-hidden className="absolute -top-16 right-8 size-48 rounded-full border-[28px] border-white/5" />
        <span aria-hidden className="absolute right-44 bottom-0 h-2 w-28 bg-accent-500" />
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7 lg:p-8">
          <div className="rounded-2xl bg-white p-1.5 shadow-lg">
            <Avatar name={user.name} src={user.avatarUrl} className="size-20 rounded-xl text-2xl sm:size-24" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black tracking-[0.18em] text-accent-200 uppercase">Hồ sơ cá nhân</p>
            <h1 className="mt-1 truncate text-2xl font-black tracking-tight sm:text-3xl">{user.name}</h1>
            <p className="mt-1 truncate text-sm text-primary-100">{user.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {user.verified && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20">
                  <LuBadgeCheck className="size-4 text-accent-200" aria-hidden /> Email đã xác thực
                </span>
              )}
              {user.role && <span className="rounded-full bg-accent-500 px-3 py-1 text-xs font-black text-slate-950">{ROLE_LABELS[user.role]}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {!editing && (
              <Button size="sm" className="bg-accent-500 text-slate-950 hover:bg-accent-200" onClick={() => setEditing(true)}>
                <LuPencil className="size-4" aria-hidden /> Chỉnh sửa hồ sơ
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white" onClick={logout}>
              <LuLogOut className="size-4" aria-hidden /> Đăng xuất
            </Button>
          </div>
        </div>
      </section>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24">
          <nav aria-label="Mục hồ sơ" className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-card">
            {NAV.map((n, index) => (
              <a
                key={n.href}
                href={n.href}
                className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-primary-700">
                  <n.icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">{n.label}</span>
                {index === 0 && <LuChevronRight className="size-4 text-slate-300" aria-hidden />}
              </a>
            ))}
          </nav>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-900">Độ hoàn thiện</p>
              <span className="text-sm font-black text-primary-700">{profileCompletion}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-accent-500" style={{ width: `${profileCompletion}%` }} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              {missing.length ? `Bổ sung ${missing.join(", ")} để gợi ý sát hơn.` : "Thông tin cơ bản đã đầy đủ."}
            </p>
          </div>

          {(user.admin || user.moderator || user.schoolStaff?.status === "approved") && (
            <div className="rounded-2xl border border-primary-100 bg-primary-50 p-3">
              {(user.admin || user.moderator) && (
                <Link href={user.admin ? "/quan-tri" : "/quan-tri/hoi-dap"} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-primary-700 hover:bg-white">
                  <LuDatabase className="size-4" aria-hidden /> {user.admin ? "Mở trang quản trị" : "Mở trang kiểm duyệt"}
                </Link>
              )}
              {user.schoolStaff?.status === "approved" && (
                <Link href="/cong-truong" className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-primary-700 hover:bg-white">
                  <LuDatabase className="size-4" aria-hidden /> Mở cổng trường
                </Link>
              )}
            </div>
          )}
        </aside>

        <div className="min-w-0 space-y-6">
          <Card id="tong-quan" className="scroll-mt-24 overflow-hidden border-slate-300 shadow-none">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-black tracking-[0.14em] text-primary-700 uppercase">01 · Thông tin cá nhân</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Thông tin cơ bản</h2>
              </div>
              {!editing && (
                <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-700 hover:underline">
                  Chỉnh sửa <LuArrowUpRight className="size-4" aria-hidden />
                </button>
              )}
            </div>
            <div className="p-5 sm:p-6">
              {editing ? (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="pf-name">Họ và tên</Label>
                      <Input id="pf-name" value={name} onChange={(e) => (setName(e.target.value), setNameError(null))} autoComplete="name" invalid={!!nameError} />
                      <FieldError>{nameError}</FieldError>
                    </div>
                    <div>
                      <Label htmlFor="pf-email">Email</Label>
                      <Input id="pf-email" value={user.email} disabled readOnly />
                      <p className="mt-1 text-xs text-slate-500">Email được dùng chung cho mọi phương thức đăng nhập.</p>
                    </div>
                  </div>
                  <ProfileFields value={fields} onChange={(v) => (setFields(v), setFormError(null))} error={formError} />
                  <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
                    <Button variant="ghost" size="sm" onClick={() => (dirty ? setAskDiscard(true) : setEditing(false))} disabled={saving}>Huỷ</Button>
                    <Button size="sm" onClick={saveProfile} disabled={saving || !dirty}>{saving ? "Đang lưu…" : "Lưu thay đổi"}</Button>
                  </div>
                  <ConfirmDialog
                    open={askDiscard}
                    tone="warning"
                    title="Chưa lưu thay đổi"
                    confirmLabel="Lưu thay đổi"
                    cancelLabel="Huỷ"
                    secondary={{ label: "Không lưu", onClick: discard }}
                    onCancel={() => setAskDiscard(false)}
                    onConfirm={() => (setAskDiscard(false), void saveProfile())}
                  >
                    Bạn vừa thay đổi thông tin hồ sơ nhưng chưa lưu lại. Bạn có muốn lưu trước khi thoát?
                  </ConfirmDialog>
                </div>
              ) : (
                <>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {facts.map(([k, v], index) => (
                      <div key={k} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3.5">
                        <dt className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
                          <span className={index % 3 === 0 ? "size-2 bg-accent-500" : "size-2 bg-primary-300"} aria-hidden /> {k}
                        </dt>
                        <dd className="mt-1.5 truncate font-bold text-slate-900">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {missing.length > 0 && (
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-accent-200 bg-accent-50 p-4 text-sm text-slate-700">
                      <LuSparkles className="mt-0.5 size-5 shrink-0 text-accent-700" aria-hidden />
                      <p>Hồ sơ còn thiếu <strong>{missing.join(", ")}</strong>. Bổ sung để Trovio cá nhân hoá gợi ý tốt hơn.</p>
                    </div>
                  )}
                  {user.under16 && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-slate-600"><LuShieldCheck className="size-4 text-success-600" aria-hidden /> Đã ghi nhận dưới 16 tuổi{user.parentConsent ? ", có đồng ý của cha mẹ hoặc người giám hộ" : ""}.</p>
                  )}
                </>
              )}
            </div>
          </Card>

          <Card id="dieu-kien" className="scroll-mt-24 overflow-hidden border-slate-300 shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-black tracking-[0.14em] text-primary-700 uppercase">02 · Dữ liệu gợi ý</p>
                <h2 className="mt-1 text-xl font-black tracking-tight">Học tập & xét tuyển</h2>
              </div>
              <Link href="/diem-cua-toi" className={buttonClass({ size: "sm" })}>{store.profile ? "Cập nhật điểm" : "Tạo hồ sơ điểm"}</Link>
            </div>
            <div className="p-5 sm:p-6">
              {store.hydrated && store.profile ? (
                <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                  <div className="flex min-h-36 flex-col justify-between rounded-2xl bg-accent-500 p-5 text-slate-950">
                    <p className="text-xs font-black tracking-wider uppercase">Điểm xét tuyển</p>
                    <p className="text-4xl font-black tracking-tight">{formatMethodScore(profileScore(store.profile).total, profileMethod(store.profile))}</p>
                    <p className="text-xs font-bold">{PRIORITY_REGION_LABELS[store.profile.priorityRegion]}</p>
                  </div>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-primary-50 p-4">
                      <dt className="text-xs font-bold text-primary-700">Phương thức{store.profile.combo ? " · tổ hợp" : ""}</dt>
                      <dd className="mt-1 font-bold text-slate-900">{(store.profile.methods?.length ? store.profile.methods : [profileMethod(store.profile)]).map((k) => ADMISSION_METHODS[k].short).join(", ")}{store.profile.combo ? ` · ${store.profile.combo}` : ""}</dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <dt className="text-xs font-bold text-slate-500">Khu vực mong muốn</dt>
                      <dd className="mt-1 font-bold text-slate-900">{store.profile.regions.map((r) => REGION_LABELS[r]).join(", ") || "Mọi khu vực"}</dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                      <dt className="text-xs font-bold text-slate-500">Ngân sách học phí</dt>
                      <dd className="mt-1 font-bold text-slate-900">{budgetLabel(store.profile.budgetMax)}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 px-5 py-8 text-center">
                  <LuSlidersHorizontal className="mx-auto size-8 text-primary-600" aria-hidden />
                  <p className="mt-3 font-bold text-slate-900">Chưa có hồ sơ điểm</p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Nhập điểm và phương thức để nhận gợi ý An toàn, Vừa sức, Thử sức.</p>
                </div>
              )}
            </div>
          </Card>

          <Card id="phong-cach" className="scroll-mt-24 border-slate-300 p-5 shadow-none sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black tracking-[0.14em] text-primary-700 uppercase">03 · Hiểu bản thân</p>
                <h2 className="mt-1 text-xl font-black tracking-tight">Phong cách làm việc & MBTI</h2>
              </div>
              <span className="rounded-full bg-accent-50 px-3 py-1 text-[11px] font-bold text-accent-700">Tham khảo · không tính điểm</span>
            </div>
            {store.hydrated && store.workStyle ? <StylePills scores={store.workStyle.scores} className="mt-5" /> : <p className="mt-4 text-sm text-slate-500">Chưa làm mini-test phong cách gồm 12 tình huống, khoảng 2 phút.</p>}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
              <span className="text-slate-500">MBTI: {store.mbti ? <strong className="text-slate-900">{store.mbti.code}</strong> : "chưa nhập"}</span>
              <div className="flex flex-wrap gap-4">
                <Link href="/trac-nghiem/phong-cach" className="font-bold text-primary-700 hover:underline">{store.workStyle ? "Xem chi tiết" : "Làm mini-test"}</Link>
                {!store.mbti && <Link href="/trac-nghiem/phong-cach#mbti" className="font-bold text-slate-600 hover:underline">Nhập mã MBTI</Link>}
              </div>
            </div>
          </Card>

          <section id="hoat-dong" className="scroll-mt-24">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black tracking-[0.14em] text-primary-700 uppercase">04 · Hoạt động</p>
                <h2 className="mt-1 text-xl font-black tracking-tight">Không gian của bạn</h2>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {activity.map((item, index) => (
                <Link key={item.label} href={item.href} className="group rounded-2xl border-2 border-slate-900 bg-white p-4 transition-transform hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#0f172a]">
                  <div className="flex items-start justify-between gap-2">
                    <span className={index === 0 ? "flex size-9 items-center justify-center rounded-lg bg-accent-500" : "flex size-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700"}>
                      <item.icon className="size-4" aria-hidden />
                    </span>
                    <LuArrowUpRight className="size-4 text-slate-400 group-hover:text-slate-900" aria-hidden />
                  </div>
                  <p className="mt-5 text-3xl font-black tracking-tight text-slate-950">{store.hydrated ? item.n : "–"}</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.detail}</p>
                </Link>
              ))}
            </div>
          </section>

          <LoginMethods user={user} googleConfigured={googleConfigured} error={notice?.error} />

          <Card id="cai-dat" className="scroll-mt-24 border-danger-100 bg-danger-50/40 p-5 shadow-none sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-black tracking-[0.14em] text-danger-700 uppercase">Vùng nguy hiểm</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Xoá tài khoản</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">Xoá vĩnh viễn tài khoản và toàn bộ dữ liệu. Hành động này không thể hoàn tác.</p>
              </div>
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} disabled={deleting}>Xoá tài khoản</Button>
            </div>
            <ConfirmDialog
              open={confirmDelete}
              tone="danger"
              title="Xoá tài khoản"
              confirmLabel={deleting ? "Đang xoá…" : "Xác nhận xoá"}
              onCancel={() => { if (!deleting) setConfirmDelete(false); }}
              onConfirm={() => void deleteAccount()}
            >
              Xoá vĩnh viễn tài khoản {user.email}, hồ sơ, danh sách đã lưu, nguyện vọng và kết quả trắc nghiệm. Không hoàn tác được.
            </ConfirmDialog>
          </Card>
        </div>
      </div>
    </div>
  );
}
