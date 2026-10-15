"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LuBadgeCheck, LuDatabase, LuHistory, LuKeyRound, LuLogOut, LuSettings, LuSlidersHorizontal, LuSparkles, LuUserRound } from "react-icons/lu";
import { RIASEC_INFO } from "@/domain/riasec";
import type { PublicUser } from "@/domain/types";
import { REGION_LABELS, TUITION_RANGES } from "@/services/program.filters";
import { ADMISSION_METHODS, formatMethodScore, PRIORITY_REGION_LABELS, profileMethod, profileScore } from "@/services/scoring.service";
import { formatDateVi } from "@/lib/format";
import { ROLE_LABELS } from "@/domain/provinces";
import { useTrovio } from "@/stores/trovio-store";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { RadarChart } from "@/components/riasec/radar-chart";
import { RiasecPill } from "@/components/riasec/riasec-pill";
import { StylePills } from "@/components/work-style/style-bits";
import { Avatar } from "@/components/ui/avatar";
import { FieldError, Input, Label } from "@/components/ui/field";
import { ProfileFields, type ProfileFormValue } from "@/components/account/profile-fields";
import { LoginMethods } from "@/components/account/login-methods";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const NAV = [
  { href: "#tong-quan", label: "Tổng quan", icon: LuUserRound },
  { href: "#dang-nhap", label: "Phương thức đăng nhập", icon: LuKeyRound },
  { href: "#trac-nghiem", label: "Kết quả trắc nghiệm", icon: LuSparkles },
  { href: "#dieu-kien", label: "Điều kiện tìm kiếm", icon: LuSlidersHorizontal },
  { href: "#hoat-dong", label: "Hoạt động", icon: LuHistory },
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

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={user.name} src={user.avatarUrl} className="size-14 text-lg sm:size-16" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">Hồ sơ cá nhân</h1>
            <p className="truncate font-semibold text-slate-900">{user.name}</p>
            <p className="truncate text-sm text-slate-500">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {user.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-700">
                  <LuBadgeCheck className="size-3.5" aria-hidden /> Đã xác thực email
                </span>
              )}
              {user.role && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{ROLE_LABELS[user.role]}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!editing && (
              <Button size="sm" onClick={() => setEditing(true)}>
                Chỉnh sửa
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={logout}>
              <LuLogOut className="size-4" aria-hidden /> Đăng xuất
            </Button>
          </div>
        </div>
        <nav aria-label="Mục hồ sơ" className="mt-4 flex gap-2 overflow-x-auto border-t border-slate-100 pt-3">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-primary-50 hover:text-primary-700">
              <n.icon className="size-3.5" aria-hidden /> {n.label}
            </a>
          ))}
          {(user.admin || user.moderator) && (
            <Link href={user.admin ? "/quan-tri" : "/quan-tri/cam-nhan"} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-[13px] font-semibold text-primary-700">
              <LuDatabase className="size-3.5" aria-hidden /> {user.admin ? "Quản trị" : "Kiểm duyệt"}
            </Link>
          )}
          {user.schoolStaff?.status === "approved" && (
            <Link href="/cong-truong" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-[13px] font-semibold text-primary-700">
              <LuDatabase className="size-3.5" aria-hidden /> Cổng trường
            </Link>
          )}
        </nav>
      </section>

      <Card id="tong-quan" className="scroll-mt-24 p-5 sm:p-6">
        <h2 className="text-lg font-bold">Thông tin cơ bản</h2>
        {editing ? (
          <div className="mt-4 space-y-5">
            <div>
              <Label htmlFor="pf-name">Họ và tên</Label>
              <Input id="pf-name" value={name} onChange={(e) => (setName(e.target.value), setNameError(null))} autoComplete="name" invalid={!!nameError} />
              <FieldError>{nameError}</FieldError>
            </div>
            <div>
              <Label htmlFor="pf-email">Email</Label>
              <Input id="pf-email" value={user.email} disabled readOnly />
              <p className="mt-1 text-xs text-slate-500">Email không đổi tại đây. Đăng nhập Google và mật khẩu dùng chung địa chỉ này.</p>
            </div>
            <ProfileFields value={fields} onChange={(v) => (setFields(v), setFormError(null))} error={formError} />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => (dirty ? setAskDiscard(true) : setEditing(false))} disabled={saving}>
                Huỷ
              </Button>
              <Button size="sm" onClick={saveProfile} disabled={saving || !dirty}>
                {saving ? "Đang lưu…" : "Lưu thay đổi"}
              </Button>
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
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {facts.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="mt-0.5 truncate font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
            {missing.length > 0 && (
              <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Chưa có {missing.join(", ")}. Bấm Chỉnh sửa để bổ sung — để trống nghĩa là chưa có, không phải giá trị mặc định.
              </p>
            )}
            {user.under16 && (
              <p className="mt-3 text-sm text-slate-600">Đã ghi nhận dưới 16 tuổi{user.parentConsent ? ", có đồng ý của cha mẹ hoặc người giám hộ" : ""}.</p>
            )}
          </>
        )}
      </Card>

      <div className="space-y-4">
        <LoginMethods user={user} googleConfigured={googleConfigured} error={notice?.error} />

        <Card id="dieu-kien" className="scroll-mt-24 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Điều kiện tìm kiếm đã lưu</h2>
            <Link href="/diem-cua-toi" className={buttonClass({ size: "sm" })}>
              {store.profile ? "Cập nhật" : "Nhập điểm"}
            </Link>
          </div>
          {store.hydrated && store.profile ? (
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Phương thức{store.profile.combo ? " · tổ hợp" : ""}</dt>
                <dd className="mt-0.5 font-semibold">
                  {ADMISSION_METHODS[profileMethod(store.profile)].short}
                  {store.profile.combo ? ` · ${store.profile.combo}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Điểm xét tuyển</dt>
                <dd className="mt-0.5 font-semibold">
                  {formatMethodScore(profileScore(store.profile).total, profileMethod(store.profile))} điểm{" "}
                  <span className="font-normal text-slate-500">({PRIORITY_REGION_LABELS[store.profile.priorityRegion]})</span>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Khu vực mong muốn</dt>
                <dd className="mt-0.5 font-semibold">{store.profile.regions.map((r) => REGION_LABELS[r]).join(", ") || "Mọi khu vực"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Ngân sách học phí</dt>
                <dd className="mt-0.5 font-semibold">{budgetLabel(store.profile.budgetMax)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Chưa có điều kiện. Nhập điểm để nhận gợi ý An toàn / Vừa sức / Thử sức.</p>
          )}
        </Card>

        <Card id="trac-nghiem" className="scroll-mt-24 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Kết quả trắc nghiệm RIASEC</h2>
            {store.quiz && <span className="text-[13px] text-slate-500">Thực hiện ngày {formatDateVi(store.quiz.result.completedAt)}</span>}
          </div>
          {store.hydrated && store.quiz ? (
            <div className="mt-4 grid items-center gap-6 md:grid-cols-[1fr_260px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  {store.quiz.result.code.map((t) => (
                    <RiasecPill key={t} type={t} />
                  ))}
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Mã định hướng nghề nghiệp <strong>{store.quiz.result.code.join(" – ")}</strong>: xu hướng {store.quiz.result.code.map((t) => RIASEC_INFO[t].label.toLowerCase()).join(", ")}.
                </p>
                <div className="mt-4 flex gap-4 text-sm font-semibold">
                  <Link href="/trac-nghiem/ket-qua" className="text-primary-600 hover:underline">
                    Xem chi tiết
                  </Link>
                  <Link href="/trac-nghiem/lam-bai" className="text-slate-600 hover:underline">
                    Làm lại
                  </Link>
                </div>
              </div>
              <RadarChart percents={store.quiz.result.percents} size={240} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Chưa có kết quả.{" "}
              <Link href="/trac-nghiem" className="font-semibold text-primary-600 hover:underline">
                Làm trắc nghiệm ngay
              </Link>
            </p>
          )}
          {store.hydrated && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Phong cách làm việc & MBTI</h3>
                <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-bold text-accent-700">tham khảo · không tính điểm</span>
              </div>
              {store.workStyle ? (
                <StylePills scores={store.workStyle.scores} className="mt-2" />
              ) : (
                <p className="mt-1 text-[13px] text-slate-500">Chưa làm mini-test phong cách (12 tình huống, khoảng 2 phút).</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="text-[13px] text-slate-500">MBTI: {store.mbti ? <strong className="text-slate-700">{store.mbti.code}</strong> : "chưa nhập"}</span>
                <Link href="/trac-nghiem/phong-cach" className="font-semibold text-primary-600 hover:underline">
                  {store.workStyle ? "Xem chi tiết" : "Làm mini-test"}
                </Link>
                {!store.mbti && (
                  <Link href="/trac-nghiem/phong-cach#mbti" className="font-semibold text-slate-600 hover:underline">
                    Nhập mã MBTI
                  </Link>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card id="hoat-dong" className="scroll-mt-24 p-6">
          <h2 className="text-lg font-bold">Thống kê hoạt động</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: store.saved.length, l: "Chương trình đã lưu", href: "/da-luu" },
              { n: store.wishlist.length, l: "Nguyện vọng dự kiến", href: "/da-luu" },
              { n: store.compare.length, l: "Đang so sánh", href: "/so-sanh" },
              { n: store.reminders.length, l: "Mốc đang nhắc", href: "/moc-tuyen-sinh" },
            ].map((s) => (
              <Link key={s.l} href={s.href} className="rounded-xl border border-slate-200 p-4 hover:border-primary-200">
                <p className="text-2xl font-extrabold text-primary-600">{store.hydrated ? s.n : "–"}</p>
                <p className="text-[13px] text-slate-600">{s.l}</p>
              </Link>
            ))}
          </div>
        </Card>

        {user.surveyOptIn && <SurveyOptIn />}

        <Card id="cai-dat" className="scroll-mt-24 border-danger-100 p-6">
          <h2 className="text-lg font-bold text-danger-700">Xoá tài khoản</h2>
          <p className="mt-1 text-sm text-slate-600">Xoá vĩnh viễn tài khoản, hồ sơ, danh sách đã lưu, nguyện vọng và kết quả trắc nghiệm. Hành động này không thể hoàn tác.</p>
          <Button variant="danger" size="sm" className="mt-3" onClick={() => setConfirmDelete(true)} disabled={deleting}>
            Xoá tài khoản
          </Button>
          <ConfirmDialog
            open={confirmDelete}
            tone="danger"
            title="Xoá tài khoản"
            confirmLabel={deleting ? "Đang xoá…" : "Xác nhận xoá"}
            onCancel={() => {
              if (!deleting) setConfirmDelete(false);
            }}
            onConfirm={() => void deleteAccount()}
          >
            Xoá vĩnh viễn tài khoản {user.email}, hồ sơ, danh sách đã lưu, nguyện vọng và kết quả trắc nghiệm. Không hoàn tác được.
          </ConfirmDialog>
        </Card>
      </div>
    </div>
  );
}

/** Tắt lời mời khảo sát sau 1 năm (chỉ hiện khi người dùng đã bật ở trang Phản hồi ngành). */
function SurveyOptIn() {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-6">
      <div>
        <h2 className="text-lg font-bold">Lời mời khảo sát sau 1 năm</h2>
        <p className="mt-1 text-sm text-slate-600">Đang bật: Trovio sẽ mời bạn trả lời lại 3 câu về ngành đang học sau 12 tháng.</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ surveyOptIn: false }) }).catch(() => null);
          setBusy(false);
          if (!res?.ok) return toast("Không lưu được, thử lại sau.", "warning");
          toast("Đã tắt lời mời khảo sát.", "success");
          router.refresh();
        }}
      >
        Tắt lời mời
      </Button>
    </Card>
  );
}
