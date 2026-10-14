"use client";

/** A08 — danh sách người dùng: lọc vai trò/trạng thái/ngày đăng ký, xem chi tiết, khoá/mở khoá, xoá (gõ lại email), thêm người dùng. */
import { useMemo, useState } from "react";
import { LuEye, LuLock, LuLockOpen, LuPlus, LuSearch, LuTrash2 } from "react-icons/lu";
import type { AdminUserRow } from "@/services/user-admin.service";
import { ROLE_LABELS } from "@/domain/provinces";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { normalizeVi } from "@/lib/text";
import { cn } from "@/lib/cn";
import { Dialog, Drawer, Pager, paginate } from "./overlay";
import { useAdminPost } from "./use-admin-post";
import { ago, fmtDate, inputCls, Panel, selectCls, td, th } from "./ui";

type Detail = { user: { id: string; email: string; verified: boolean; hasPassword: boolean; hasGoogle: boolean; gradYear: number | null; province: string | null; under16: boolean }; usage: { saved: number; wishlist: number; quizDone: boolean; hasScores: boolean; reminders: number } };

const STATUS: Record<AdminUserRow["status"], { label: string; tone: BadgeTone }> = {
  active: { label: "Hoạt động", tone: "success" },
  unverified: { label: "Chưa xác thực", tone: "accent" },
  locked: { label: "Bị khóa", tone: "danger" },
};

function roleBadge(r: AdminUserRow): { label: string; tone: BadgeTone } {
  if (r.admin) return { label: "Admin", tone: "danger" };
  if (r.moderator) return { label: "Kiểm duyệt viên", tone: "accent" };
  if (r.schoolStaff?.status === "approved") return { label: "Cán bộ tuyển sinh", tone: "teal" };
  return { label: r.role ? ROLE_LABELS[r.role] : "Chưa chọn", tone: r.role ? "primary" : "slate" };
}

export function UserManager({ rows, meId, initialStatus }: { rows: AdminUserRow[]; meId: string; initialStatus: string }) {
  const { post, busy } = useAdminPost();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [since, setSince] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<AdminUserRow | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [lockTarget, setLockTarget] = useState<AdminUserRow | null>(null);
  const [delTarget, setDelTarget] = useState<AdminUserRow | null>(null);
  const [delConfirm, setDelConfirm] = useState("");
  const [delErr, setDelErr] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "student", moderator: false });
  const [formErr, setFormErr] = useState<{ field?: string; message?: string } | null>(null);
  const [now] = useState(() => Date.now());

  const filtered = useMemo(() => {
    const nq = normalizeVi(q.trim());
    const minDate = since === "7" ? now - 7 * 864e5 : since === "30" ? now - 30 * 864e5 : since === "month" ? Date.parse(new Date(now).toISOString().slice(0, 7) + "-01") : 0;
    return rows.filter((r) => {
      if (nq && !normalizeVi(`${r.name} ${r.email}`).includes(nq)) return false;
      if (role === "admin" && !r.admin) return false;
      if (role === "moderator" && !r.moderator) return false;
      if (role === "school" && r.schoolStaff?.status !== "approved") return false;
      if (["student", "parent", "teacher"].includes(role) && r.role !== role) return false;
      if (role === "none" && r.role) return false;
      if (status === "staff" && r.schoolStaff?.status !== "pending") return false;
      if (status && status !== "staff" && r.status !== status) return false;
      if (minDate && Date.parse(r.createdAt) < minDate) return false;
      return true;
    });
  }, [rows, q, role, status, since, now]);
  const pg = paginate(filtered, page, 10);

  const openView = async (r: AdminUserRow) => {
    setView(r);
    setDetail(null);
    const res = await fetch(`/api/admin/users/${encodeURIComponent(r.id)}`, { cache: "no-store" });
    if (res.ok) setDetail((await res.json()) as Detail);
  };
  const act = async (r: AdminUserRow, body: Record<string, unknown>, success: string) => {
    const res = await post(`/api/admin/users/${encodeURIComponent(r.id)}`, body, { success });
    return res;
  };

  return (
    <>
      <Panel className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Tìm theo tên, email</span>
          <LuSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input type="search" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} placeholder="Tìm theo tên, email…" className={`${inputCls} pl-9`} />
        </label>
        <select aria-label="Vai trò" className={selectCls} value={role} onChange={(e) => (setRole(e.target.value), setPage(1))}>
          <option value="">Vai trò: Tất cả</option>
          <option value="student">Học sinh</option>
          <option value="parent">Phụ huynh</option>
          <option value="teacher">Giáo viên</option>
          <option value="school">Cán bộ tuyển sinh</option>
          <option value="moderator">Kiểm duyệt viên</option>
          <option value="admin">Admin</option>
          <option value="none">Chưa chọn vai trò</option>
        </select>
        <select aria-label="Trạng thái" className={selectCls} value={status} onChange={(e) => (setStatus(e.target.value), setPage(1))}>
          <option value="">Trạng thái: Tất cả</option>
          <option value="active">Hoạt động</option>
          <option value="unverified">Chưa xác thực</option>
          <option value="locked">Bị khóa</option>
          <option value="staff">Chờ duyệt cán bộ tuyển sinh</option>
        </select>
        <select aria-label="Ngày đăng ký" className={selectCls} value={since} onChange={(e) => (setSince(e.target.value), setPage(1))}>
          <option value="">Ngày đăng ký: Tất cả</option>
          <option value="7">7 ngày qua</option>
          <option value="30">30 ngày qua</option>
          <option value="month">Tháng này</option>
        </select>
        <Button onClick={() => (setFormErr(null), setForm({ name: "", email: "", role: "student", moderator: false }), setCreateOpen(true))}>
          <LuPlus className="size-4" aria-hidden /> Thêm người dùng
        </Button>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>Tên người dùng</th>
                <th className={th}>Email</th>
                <th className={th}>Vai trò</th>
                <th className={th}>Ngày đăng ký</th>
                <th className={th}>Truy cập cuối</th>
                <th className={th}>Trạng thái</th>
                <th className={`${th} text-right`}>Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pg.slice.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    Không có người dùng nào khớp bộ lọc.
                  </td>
                </tr>
              )}
              {pg.slice.map((r) => {
                const rb = roleBadge(r);
                return (
                  <tr key={r.id}>
                    <td className={td}>
                      <span className="flex items-center gap-3">
                        <Avatar name={r.name} className="size-8 text-xs" />
                        <span className="font-semibold text-slate-900">{r.name}</span>
                        {r.id === meId && <span className="text-xs text-slate-400">(bạn)</span>}
                      </span>
                    </td>
                    <td className={`${td} max-w-[200px] truncate text-slate-500`} title={r.email}>
                      {r.email}
                    </td>
                    <td className={td}>
                      <Badge tone={rb.tone}>{rb.label}</Badge>
                      {r.schoolStaff?.status === "pending" && (
                        <Badge tone="accent" className="ml-1">
                          Chờ duyệt cán bộ
                        </Badge>
                      )}
                    </td>
                    <td className={`${td} text-slate-500 tabular-nums`}>{fmtDate(r.createdAt)}</td>
                    <td className={`${td} text-slate-500`}>{ago(r.lastLoginAt, now)}</td>
                    <td className={td}>
                      <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                    </td>
                    <td className={`${td} text-right whitespace-nowrap`}>
                      <button type="button" onClick={() => openView(r)} className="rounded-md p-1.5 text-primary-600 hover:bg-primary-50" aria-label={`Xem ${r.name}`}>
                        <LuEye className="size-4" aria-hidden />
                      </button>
                      <button type="button" disabled={r.id === meId || r.admin} onClick={() => setLockTarget(r)} className="rounded-md p-1.5 text-accent-700 hover:bg-accent-50 disabled:opacity-30" aria-label={r.status === "locked" ? `Mở khoá ${r.name}` : `Khoá ${r.name}`}>
                        {r.status === "locked" ? <LuLockOpen className="size-4" aria-hidden /> : <LuLock className="size-4" aria-hidden />}
                      </button>
                      <button type="button" disabled={r.id === meId || r.admin} onClick={() => (setDelTarget(r), setDelConfirm(""), setDelErr(null))} className="rounded-md p-1.5 text-danger-600 hover:bg-danger-50 disabled:opacity-30" aria-label={`Xoá ${r.name}`}>
                        <LuTrash2 className="size-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pager page={pg.page} pageCount={pg.pageCount} onChange={setPage} total={filtered.length} from={pg.from} to={pg.to} unit="người dùng" />
      </Panel>

      <Drawer open={!!view} onClose={() => setView(null)} title={view?.name ?? ""} subtitle={view?.email}>
        {view && (
          <div className="space-y-5 text-sm">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt className="text-xs text-slate-500">Vai trò</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{roleBadge(view).label}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Trạng thái</dt>
                <dd className="mt-0.5">
                  <Badge tone={STATUS[view.status].tone}>{STATUS[view.status].label}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Ngày đăng ký</dt>
                <dd className="mt-0.5 text-slate-900">{fmtDate(view.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Truy cập cuối</dt>
                <dd className="mt-0.5 text-slate-900">{ago(view.lastLoginAt, now)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Đăng nhập bằng</dt>
                <dd className="mt-0.5 text-slate-900">{detail ? [detail.user.hasPassword && "Mật khẩu", detail.user.hasGoogle && "Google"].filter(Boolean).join(" + ") || "Chưa đặt mật khẩu" : "…"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Tỉnh/thành · Năm tốt nghiệp</dt>
                <dd className="mt-0.5 text-slate-900">{detail ? `${detail.user.province ?? "—"} · ${detail.user.gradYear ?? "—"}` : "…"}</dd>
              </div>
            </dl>
            {detail && (
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Mức sử dụng (không hiện dữ liệu cá nhân chi tiết)</p>
                <p className="mt-2 text-slate-700">
                  {detail.usage.saved} chương trình đã lưu · {detail.usage.wishlist} nguyện vọng · {detail.usage.quizDone ? "đã" : "chưa"} làm trắc nghiệm · {detail.usage.hasScores ? "đã" : "chưa"} nhập điểm · {detail.usage.reminders} nhắc hạn
                </p>
              </div>
            )}
            {view.schoolStaff && (
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">Cán bộ tuyển sinh · {view.schoolName}</p>
                <p className="mt-1 text-[13px] text-slate-600">
                  Trạng thái: {view.schoolStaff.status === "pending" ? "Chờ duyệt" : view.schoolStaff.status === "approved" ? "Đã duyệt" : "Đã từ chối"} · Gửi {fmtDate(view.schoolStaff.requestedAt)}. Email đã xác thực và khớp tên miền website trường; hãy kiểm tra thêm (gọi điện/ công văn) trước khi duyệt.
                </p>
                {view.schoolStaff.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" disabled={busy} onClick={async () => (await act(view, { action: "staff-approve" }, "Đã duyệt cán bộ tuyển sinh.")).ok && setView(null)}>
                      Duyệt
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={async () => (await act(view, { action: "staff-reject" }, "Đã từ chối yêu cầu.")).ok && setView(null)}>
                      Từ chối
                    </Button>
                  </div>
                )}
              </div>
            )}
            {!view.admin && (
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                <input type="checkbox" className="mt-0.5 size-4 accent-primary-600" checked={view.moderator} disabled={busy} onChange={async (e) => (await act(view, { action: "moderator", value: e.target.checked }, e.target.checked ? "Đã cấp quyền kiểm duyệt viên." : "Đã thu quyền kiểm duyệt viên.")).ok && setView({ ...view, moderator: !view.moderator })} />
                <span>
                  <span className="font-semibold text-slate-900">Kiểm duyệt viên</span>
                  <span className="block text-[13px] text-slate-500">Được duyệt cảm nhận, hỏi đáp sinh viên và xử lý báo lỗi dữ liệu. Không sửa được số liệu tuyển sinh.</span>
                </span>
              </label>
            )}
            <Button variant="outline" size="sm" disabled={busy} onClick={() => act(view, { action: "invite" }, "Đã gửi email đặt lại mật khẩu.")}>
              Gửi link đặt lại mật khẩu
            </Button>
          </div>
        )}
      </Drawer>

      <Dialog
        open={!!lockTarget}
        onClose={() => setLockTarget(null)}
        title={lockTarget?.status === "locked" ? "Mở khoá tài khoản?" : "Khoá tài khoản?"}
        subtitle={lockTarget?.email}
        footer={
          <>
            <Button variant="outline" onClick={() => setLockTarget(null)}>
              Hủy
            </Button>
            <Button
              variant={lockTarget?.status === "locked" ? "primary" : "danger"}
              disabled={busy}
              onClick={async () => {
                const r = lockTarget;
                setLockTarget(null);
                if (r) await act(r, { action: r.status === "locked" ? "unlock" : "lock" }, r.status === "locked" ? "Đã mở khoá tài khoản." : "Đã khoá tài khoản và đăng xuất mọi thiết bị.");
              }}
            >
              {lockTarget?.status === "locked" ? "Mở khoá" : "Khoá tài khoản"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {lockTarget?.status === "locked" ? "Người dùng đăng nhập lại được ngay (bộ đếm sai mật khẩu được đặt lại)." : "Người dùng bị đăng xuất khỏi mọi thiết bị và không đăng nhập được (kể cả bằng Google) cho tới khi mở khoá. Dữ liệu được giữ nguyên."}
        </p>
      </Dialog>

      <Dialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        title="Xác nhận xoá tài khoản"
        subtitle={delTarget?.email}
        footer={
          <>
            <Button variant="outline" onClick={() => setDelTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              disabled={busy || delConfirm.trim().toLowerCase() !== delTarget?.email.toLowerCase()}
              onClick={async () => {
                if (!delTarget) return;
                const res = await act(delTarget, { action: "delete", confirm: delConfirm }, "Đã xoá tài khoản.");
                if (res.ok) setDelTarget(null);
                else setDelErr(res.message ?? "Không xoá được.");
              }}
            >
              Xoá vĩnh viễn
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Xoá vĩnh viễn tài khoản cùng danh sách đã lưu, nguyện vọng, cảm nhận, thông báo. Không thể hoàn tác.</p>
        <label htmlFor="del-confirm" className="mt-4 block text-sm font-semibold text-slate-800">
          Nhập lại email để xác nhận
        </label>
        <input id="del-confirm" data-autofocus className={cn(inputCls, "mt-1.5")} value={delConfirm} onChange={(e) => setDelConfirm(e.target.value)} placeholder={delTarget?.email} autoComplete="off" />
        {delErr && <p className="mt-1 text-xs text-danger-700">{delErr}</p>}
      </Dialog>

      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Thêm người dùng"
        subtitle="Người dùng nhận email để tự đặt mật khẩu (link có hạn 30 phút)"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                const res = await post("/api/admin/users", form, { success: "Đã tạo tài khoản và gửi email đặt mật khẩu." });
                if (res.ok) setCreateOpen(false);
                else setFormErr({ field: res.field, message: res.message });
              }}
            >
              Tạo tài khoản
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formErr && !formErr.field && <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{formErr.message}</p>}
          <div>
            <label htmlFor="u-name" className="text-sm font-semibold text-slate-800">
              Họ tên <span className="text-danger-600">*</span>
            </label>
            <input id="u-name" data-autofocus maxLength={60} className={cn(inputCls, "mt-1.5", formErr?.field === "name" && "!border-danger-500")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {formErr?.field === "name" && <p className="mt-1 text-xs text-danger-700">{formErr.message}</p>}
          </div>
          <div>
            <label htmlFor="u-email" className="text-sm font-semibold text-slate-800">
              Email <span className="text-danger-600">*</span>
            </label>
            <input id="u-email" type="email" maxLength={120} className={cn(inputCls, "mt-1.5", formErr?.field === "email" && "!border-danger-500")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {formErr?.field === "email" && <p className="mt-1 text-xs text-danger-700">{formErr.message}</p>}
          </div>
          <div>
            <label htmlFor="u-role" className="text-sm font-semibold text-slate-800">
              Vai trò
            </label>
            <select id="u-role" className={cn(selectCls, "mt-1.5 w-full")} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="student">Học sinh</option>
              <option value="parent">Phụ huynh</option>
              <option value="teacher">Giáo viên</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="size-4 accent-primary-600" checked={form.moderator} onChange={(e) => setForm({ ...form, moderator: e.target.checked })} /> Cấp quyền kiểm duyệt viên
          </label>
          <p className="text-[13px] text-slate-500">Cán bộ tuyển sinh tự đăng ký trên Cổng trường bằng email công vụ của trường, sau đó bạn duyệt ở đây.</p>
        </div>
      </Drawer>
    </>
  );
}
