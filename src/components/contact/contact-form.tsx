"use client";

import { useState } from "react";
import { LuClock, LuSend } from "react-icons/lu";
import styles from "./contact-animations.module.css";
import { cn } from "@/lib/cn";

/* Port từ mona.media/lien-he (.form-cus + .form-tab):
 * — tab chọn đối tượng (Doanh nghiệp / Học sinh & Phụ huynh) đổi field-set,
 *   panel mới chạy zoomIn .4s.
 * — input chỉ có border-bottom, label absolute trượt lên khi focus/filled.
 * Giữ luồng dữ liệu cũ của Trovio (submit demo local). */

const ROLES = [
  { value: "enterprise", label: "Doanh nghiệp & Đối tác" },
  { value: "student", label: "Học sinh & Phụ huynh" },
] as const;

const ENTERPRISE_TYPES = [
  { value: "HopTacDeAn", label: "Hợp tác số hóa đề án & dữ liệu tuyển sinh" },
  { value: "TichHopAPI", label: "Tích hợp API điểm chuẩn & chỉ tiêu tuyển sinh" },
  { value: "DongToChuc", label: "Phối hợp tổ chức ngày hội hướng nghiệp & tư vấn" },
  { value: "BaoTroTruyenThong", label: "Bảo trợ truyền thông & Tài trợ tiếp sức mùa thi" },
  { value: "NghienCuuDuLieu", label: "Hợp tác nghiên cứu & báo cáo phân tích giáo dục" },
  { value: "Khac", label: "Liên hệ công tác khác" },
];

const STUDENT_TYPES = [
  { value: "TuVanChonNganh", label: "Tư vấn chọn ngành & trắc nghiệm RIASEC" },
  { value: "DiemChuan", label: "Thắc mắc điểm chuẩn & cách tính điểm" },
  { value: "NgonNgu", label: "Góp ý nội dung, dữ liệu chương trình" },
  { value: "HoTroKyThuat", label: "Hỗ trợ kỹ thuật & tài khoản" },
  { value: "Khac", label: "Câu hỏi khác" },
];

const EMPTY = {
  fullName: "",
  jobTitle: "",
  organization: "",
  workEmail: "",
  phoneNumber: "",
  requestType: "HopTacDeAn",
  message: "",
};

export function EnterpriseContactForm() {
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("enterprise");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(EMPTY);

  const types = role === "enterprise" ? ENTERPRISE_TYPES : STUDENT_TYPES;
  const isEnterprise = role === "enterprise";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  const switchRole = (value: (typeof ROLES)[number]["value"]) => {
    setRole(value);
    setFormData((prev) => ({ ...prev, requestType: value === "enterprise" ? "HopTacDeAn" : "TuVanChonNganh" }));
  };

  if (submitted) {
    return (
      <div className="rounded-3xl bg-paper-50 p-8 text-center sm:p-10">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-primary-700 shadow-md">
          <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <span className="mt-4 inline-flex items-center rounded-full bg-primary-100 px-3.5 py-1 text-xs font-bold text-primary-900">Tiếp nhận yêu cầu thành công</span>
        <h3 className="mt-3 text-xl font-extrabold text-slate-900 sm:text-2xl">Cảm ơn bạn đã liên hệ với Trovio</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
          Phiếu yêu cầu từ <span className="font-bold text-slate-900">{formData.organization || formData.fullName}</span> đã được chuyển tới bộ phận chuyên trách. Trovio cam kết phản hồi qua email <span className="font-bold text-primary-700">{formData.workEmail}</span> trong vòng 4 – 8 giờ làm việc.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setFormData(EMPTY);
            }}
            className="cursor-pointer text-sm font-bold text-primary-700 hover:underline"
          >
            ← Gửi phiếu yêu cầu khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* form-tab — tab pill nền pastel, active nền teal chữ trắng (gốc: #ebd1ff / #7c0fd1) */}
      <div className="mb-8 flex w-fit flex-wrap gap-2 rounded-xl bg-primary-50 p-2" role="tablist" aria-label="Chọn đối tượng liên hệ">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            role="tab"
            aria-selected={role === r.value}
            onClick={() => switchRole(r.value)}
            className={cn(
              "cursor-pointer rounded-lg px-4 py-2 text-sm font-bold transition",
              role === r.value ? "bg-primary-700 text-white" : "text-primary-800 hover:bg-primary-100",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <form key={role} onSubmit={handleSubmit} className={styles.tabPanel}>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className={styles.field}>
            <input id="fullName" required type="text" placeholder=" " autoComplete="name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className={styles.fieldInput} />
            <label htmlFor="fullName" className={styles.fieldLabel}>Họ và tên <span className="req">*</span></label>
          </div>

          <div className={styles.field}>
            <input id="workEmail" required type="email" placeholder=" " autoComplete="email" value={formData.workEmail} onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })} className={styles.fieldInput} />
            <label htmlFor="workEmail" className={styles.fieldLabel}>Email <span className="req">*</span></label>
          </div>

          <div className={styles.field}>
            <input id="phoneNumber" required type="tel" placeholder=" " autoComplete="tel" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} className={styles.fieldInput} />
            <label htmlFor="phoneNumber" className={styles.fieldLabel}>Số điện thoại <span className="req">*</span></label>
          </div>

          {isEnterprise ? (
            <>
              <div className={styles.field}>
                <input id="organization" required type="text" placeholder=" " value={formData.organization} onChange={(e) => setFormData({ ...formData, organization: e.target.value })} className={styles.fieldInput} />
                <label htmlFor="organization" className={styles.fieldLabel}>Trường / Đơn vị công tác <span className="req">*</span></label>
              </div>
              <div className={styles.field}>
                <input id="jobTitle" type="text" placeholder=" " value={formData.jobTitle} onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })} className={styles.fieldInput} />
                <label htmlFor="jobTitle" className={styles.fieldLabel}>Chức vụ / Vị trí</label>
              </div>
            </>
          ) : (
            <div className={styles.field}>
              <input id="schoolName" type="text" placeholder=" " value={formData.organization} onChange={(e) => setFormData({ ...formData, organization: e.target.value })} className={styles.fieldInput} />
              <label htmlFor="schoolName" className={styles.fieldLabel}>Trường / Lớp hiện tại</label>
            </div>
          )}
        </div>

        {/* select riêng — không port floating-label cho select (gốc dùng select2 riêng) */}
        <div className="mt-6">
          <label htmlFor="requestType" className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
            {isEnterprise ? "Lĩnh vực hợp tác" : "Nội dung cần hỗ trợ"} <span className="text-danger-600">*</span>
          </label>
          <select id="requestType" value={formData.requestType} onChange={(e) => setFormData({ ...formData, requestType: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary-600 focus:ring-1 focus:outline-none">
            {types.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className={cn("mt-6", styles.field)}>
          <textarea id="message" required rows={4} placeholder=" " value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className={styles.fieldTextarea} />
          <label htmlFor="message" className={styles.fieldLabel}>{isEnterprise ? "Nội dung trao đổi & đề xuất hợp tác" : "Câu hỏi / nội dung cần hỗ trợ"} <span className="req">*</span></label>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <LuClock className="size-4 shrink-0 text-primary-700" aria-hidden />
            <span>Phản hồi trong vòng <strong className="font-semibold text-slate-900">4 – 8 giờ</strong> làm việc</span>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-700 px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-800 disabled:opacity-60"
          >
            <LuSend className="size-4" aria-hidden />
            {loading ? "Đang gửi..." : isEnterprise ? "Gửi phiếu đề xuất hợp tác" : "Gửi câu hỏi"}
          </button>
        </div>
      </form>
    </div>
  );
}

export { EnterpriseContactForm as ContactForm };
