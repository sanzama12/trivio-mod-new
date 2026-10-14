"use client";

/**
 * UNIFIED ENTRY HUB — Chức năng nhập liệu tuyển sinh tích hợp tinh gọn:
 * Gom Trường & Cơ sở + Ngành đào tạo + Điểm chuẩn + Học phí vào 1 nơi duy nhất.
 * - Cho phép thiếu thông tin (điểm, học phí) vẫn lưu được bình thường.
 * - Hỗ trợ lọc các mục còn thiếu để bổ sung/sửa lại sau.
 * - Hỗ trợ nhập nhanh 1 bản ghi, import Excel/CSV dễ nhất, hoặc sửa trực tiếp.
 */
import { useMemo, useState } from "react";
import {
  LuBookOpen,
  LuCheck,
  LuCircleAlert,
  LuCloudUpload,
  LuDownload,
  LuFileSpreadsheet,
  LuFileText,
  LuFilter,
  LuLandmark,
  LuPencil,
  LuPlus,
  LuSearch,
  LuSparkles,
  LuTrash2,
  LuTriangleAlert,
  LuX,
} from "react-icons/lu";
import type { School, Major, SchoolType } from "@/domain/types";
import { PROVINCES } from "@/domain/provinces";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { normalizeVi } from "@/lib/text";
import { Dialog, Drawer, Pager, paginate } from "./overlay";
import { useAdminPost } from "./use-admin-post";
import { inputCls, Panel, selectCls, td, th } from "./ui";
import type { UnifiedRowItem } from "@/services/unified-entry.service";
import type { ImportPreview, ImportRowData } from "@/services/import.service";

interface Props {
  userName: string;
  schools: School[];
  majors: Major[];
  initialRows: UnifiedRowItem[];
}

const MAX_BYTES = 2 * 1024 * 1024;
const fileSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function readFile(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("read"));
    if (/\.xlsx$/i.test(f.name)) {
      r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
      r.readAsDataURL(f);
    } else {
      // Tự động phát hiện bảng mã UTF-16 LE/BE khi xuất file từ Excel trên Windows
      const sliceReader = new FileReader();
      sliceReader.onload = () => {
        const arr = new Uint8Array(sliceReader.result as ArrayBuffer);
        let encoding = "utf-8";
        if (arr.length >= 2) {
          if (arr[0] === 0xff && arr[1] === 0xfe) encoding = "utf-16le";
          else if (arr[0] === 0xfe && arr[1] === 0xff) encoding = "utf-16be";
        }
        r.onload = () => resolve(String(r.result));
        r.readAsText(f, encoding);
      };
      sliceReader.onerror = () => {
        r.onload = () => resolve(String(r.result));
        r.readAsText(f, "utf-8");
      };
      sliceReader.readAsArrayBuffer(f.slice(0, 4));
    }
  });
}

export function UnifiedEntryHub({ userName, schools: initialSchools, majors: initialMajors, initialRows }: Props) {
  const { post, busy, toast } = useAdminPost();

  // Tab chính
  const [activeTab, setActiveTab] = useState<"quick" | "import" | "list">("quick");

  // Dữ liệu danh sách
  const [rows, setRows] = useState<UnifiedRowItem[]>(initialRows);
  const [schools, setSchools] = useState<School[]>(initialSchools);
  const [majors, setMajors] = useState<Major[]>(initialMajors);

  // Form nhập nhanh 1 bản ghi
  const [isNewSchoolMode, setIsNewSchoolMode] = useState(initialSchools.length === 0);
  const [form, setForm] = useState({
    id: "",
    schoolCode: "",
    schoolName: "",
    schoolType: "cong-lap" as SchoolType,
    city: "Thành phố Hà Nội",
    campus: "",
    majorName: "",
    majorCode: "",
    admissionCode: "",
    score: "",
    tuitionMin: "",
    tuitionMax: "",
    combos: "",
    quota: "",
    source: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Drawer sửa chi tiết
  const [drawerOpen, setDrawerOpen] = useState(false);

  // State cho Tab Import file
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [drag, setDrag] = useState(false);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);

  // Thông báo cập nhật bản ghi trùng hoặc thêm mới
  const [updateNotice, setUpdateNotice] = useState<{
    type: "update" | "create";
    title: string;
    message: string;
    details?: string[];
  } | null>(null);

  // Phát hiện trùng ngành theo thời gian thực (Real-time duplicate detection)
  const duplicateMajor = useMemo(() => {
    if (!form.schoolCode.trim() || !form.majorName.trim() || form.id) return null;
    const sCode = form.schoolCode.trim().toUpperCase();
    const normMName = normalizeVi(form.majorName.trim()).toLowerCase();
    const aCode = form.admissionCode.trim().toUpperCase();

    return rows.find((r) => {
      if (r.schoolCode.toUpperCase() !== sCode) return false;
      if (normalizeVi(r.majorName).toLowerCase() === normMName) return true;
      if (aCode && r.admissionCode.toUpperCase() === aCode) return true;
      return false;
    });
  }, [form.schoolCode, form.majorName, form.admissionCode, form.id, rows]);

  // Bộ lọc cho Tab Danh sách
  const [filterStatus, setFilterStatus] = useState<"all" | "missing_score" | "missing_tuition" | "complete">("all");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = rows.length;
    const missingScore = rows.filter((r) => r.missingScore).length;
    const missingTuition = rows.filter((r) => r.missingTuition).length;
    const complete = rows.filter((r) => r.isComplete).length;
    return { total, missingScore, missingTuition, complete };
  }, [rows]);

  // Danh sách hiển thị sau khi lọc
  const filteredRows = useMemo(() => {
    let res = rows;
    if (filterStatus === "missing_score") res = res.filter((r) => r.missingScore);
    else if (filterStatus === "missing_tuition") res = res.filter((r) => r.missingTuition);
    else if (filterStatus === "complete") res = res.filter((r) => r.isComplete);

    if (searchQ.trim()) {
      const q = normalizeVi(searchQ.trim().toLowerCase());
      res = res.filter((r) =>
        normalizeVi(`${r.schoolCode} ${r.schoolName} ${r.majorName} ${r.admissionCode} ${r.campus}`).toLowerCase().includes(q),
      );
    }
    return res;
  }, [rows, filterStatus, searchQ]);

  const paged = paginate(filteredRows, page, 10);

  // Tải lại danh sách từ server
  const reloadData = async () => {
    try {
      const res = await fetch("/api/admin/unified-entry");
      const data = await res.json();
      if (data.ok && Array.isArray(data.rows)) {
        setRows(data.rows);
      }
    } catch {
      // ignore
    }
  };

  // Reset form nhập nhanh
  const resetForm = () => {
    setForm({
      id: "",
      schoolCode: "",
      schoolName: "",
      schoolType: "cong-lap",
      city: "Thành phố Hà Nội",
      campus: "",
      majorName: "",
      majorCode: "",
      admissionCode: "",
      score: "",
      tuitionMin: "",
      tuitionMax: "",
      combos: "",
      quota: "",
      source: "",
    });
    setFormErrors({});
    setIsNewSchoolMode(false);
  };

  // Lưu bản ghi từ form
  const handleSaveForm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!form.schoolCode.trim()) errors.schoolCode = "Vui lòng nhập hoặc chọn mã trường.";
    if (!form.majorName.trim()) errors.majorName = "Vui lòng nhập tên ngành đào tạo.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      id: form.id || undefined,
      schoolCode: form.schoolCode.trim().toUpperCase(),
      schoolName: form.schoolName.trim() || undefined,
      schoolType: form.schoolType,
      city: form.city,
      campus: form.campus.trim() || undefined,
      majorName: form.majorName.trim(),
      majorCode: form.majorCode.trim() || undefined,
      admissionCode: form.admissionCode.trim() || undefined,
      score: form.score.trim() ? Number(form.score.replace(",", ".")) : null,
      tuitionMin: form.tuitionMin.trim() ? Number(form.tuitionMin.replace(",", ".")) : null,
      tuitionMax: form.tuitionMax.trim() ? Number(form.tuitionMax.replace(",", ".")) : null,
      combos: form.combos.trim() ? form.combos.split(/[\s,;/]+/).filter(Boolean) : undefined,
      quota: form.quota.trim() ? Number(form.quota) : null,
      source: form.source.trim() || undefined,
    };

    try {
      const res = await fetch("/api/admin/unified-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        toast(data.message || "Lỗi khi lưu dữ liệu.", "error");
        if (data.field) setFormErrors({ [data.field]: data.message });
        return;
      }

      // Thông báo cập nhật bản ghi trùng hoặc thêm mới
      if (data.isDuplicate || data.action === "updated") {
        toast(data.message || "Đã cập nhật thành công ngành trùng của trường!", "info");
        setUpdateNotice({
          type: "update",
          title: "Thông báo cập nhật ngành trùng",
          message: data.message || `Đã cập nhật thành công điểm chuẩn và thông tin cho ngành "${payload.majorName}" của trường ${payload.schoolCode}!`,
        });
      } else {
        toast(data.message || "Đã lưu thành công!", "success");
        setUpdateNotice({
          type: "create",
          title: "Thêm mới thành công",
          message: data.message || `Đã thêm mới ngành "${payload.majorName}" vào trường ${payload.schoolCode}.`,
        });
      }

      resetForm();
      setDrawerOpen(false);
      await reloadData();
      setActiveTab("list");
    } catch {
      toast("Lỗi kết nối máy chủ.", "error");
    }
  };

  // Sửa nhanh một giá trị (Điểm hoặc Học phí) ngay trên bảng
  const handleQuickInPlaceSave = async (
    rowId: string,
    field: "score" | "tuition",
    val: string,
  ) => {
    try {
      const body: Record<string, unknown> = { id: rowId };
      if (field === "score") {
        body.score = val.trim() === "" ? null : Number(val.replace(",", "."));
      } else {
        const num = val.trim() === "" ? 0 : Number(val.replace(",", "."));
        body.tuitionMin = num;
        body.tuitionMax = num;
      }

      const res = await fetch("/api/admin/unified-entry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        toast("Cập nhật thành công!", "success");
        await reloadData();
        return true;
      } else {
        toast(data.message || "Giá trị không hợp lệ.", "error");
        return false;
      }
    } catch {
      toast("Lỗi mạng.", "error");
      return false;
    }
  };

  // Mở Drawer sửa chi tiết từ 1 dòng trong bảng
  const openEditDrawer = (r: UnifiedRowItem) => {
    setForm({
      id: r.id,
      schoolCode: r.schoolCode,
      schoolName: r.schoolName,
      schoolType: "cong-lap",
      city: r.schoolCity,
      campus: r.campus === "—" ? "" : r.campus,
      majorName: r.majorName,
      majorCode: r.majorCode === "—" ? "" : r.majorCode,
      admissionCode: r.admissionCode === "—" ? "" : r.admissionCode,
      score: r.latestScore != null ? String(r.latestScore) : "",
      tuitionMin: r.tuitionMin > 0 ? String(r.tuitionMin) : "",
      tuitionMax: r.tuitionMax > 0 ? String(r.tuitionMax) : "",
      combos: r.combos.join(" "),
      quota: r.quota > 0 ? String(r.quota) : "",
      source: "",
    });
    setFormErrors({});
    setIsNewSchoolMode(false);
    setDrawerOpen(true);
  };

  // Chọn file Excel / CSV
  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    setFileErr(null);
    setPreview(null);
    if (/\.xls$/i.test(f.name)) {
      return setFileErr("Tệp .xls (Excel 97-2003 cũ) không được hỗ trợ trực tiếp. Vui lòng mở tệp trong Excel và chọn 'Save As' dạng .xlsx hoặc .csv rồi tải lại.");
    }
    if (!/\.(csv|xlsx|tsv|txt)$/i.test(f.name)) return setFileErr("Chỉ hỗ trợ tệp Excel (.xlsx) hoặc CSV (.csv / .tsv / .txt).");
    if (f.size > MAX_BYTES) return setFileErr("Tệp lớn hơn 2 MB.");

    let content: string;
    try {
      content = await readFile(f);
    } catch {
      return setFileErr("Không đọc được tệp.");
    }

    const res = await post("/api/admin/import", { step: "preview", fileName: f.name, content }, { refresh: false });
    if (!res.ok) return setFileErr(res.message ?? "Tệp không hợp lệ.");
    setFile({ name: f.name, size: f.size });
    setPreview(res.preview as ImportPreview);
  };

  // Công bố file
  const handlePublishFile = async () => {
    if (!preview) return;
    const res = await post(
      "/api/admin/import",
      { step: "publish", fileName: preview.fileName, rows: preview.rows.map((r) => r.data) },
      { refresh: true },
    );
    setConfirmPublish(false);
    if (res.ok) {
      const updatedCount = Number(res.updated) || 0;
      const createdCount = Number(res.created) || 0;
      const updatedPrograms = (res.updatedPrograms as string[]) || [];

      if (updatedCount > 0) {
        toast(`🔔 ĐÃ CẬP NHẬT: ${updatedCount} ngành trùng của trường đã được cập nhật thành công! (Tạo mới: ${createdCount})`, "info");
        setUpdateNotice({
          type: "update",
          title: "Thông báo cập nhật ngành trùng từ File",
          message: `Hệ thống đã tự động phát hiện và cập nhật dữ liệu điểm chuẩn/thông tin cho ${updatedCount} ngành trùng của các trường, đồng thời tạo mới ${createdCount} ngành.`,
          details: updatedPrograms,
        });
      } else {
        toast(`Công bố thành công: ${createdCount} chương trình mới.`, "success");
        setUpdateNotice({
          type: "create",
          title: "Công bố dữ liệu thành công",
          message: `Đã nạp thành công ${createdCount} chương trình đào tạo mới vào hệ thống.`,
        });
      }

      setFile(null);
      setPreview(null);
      await reloadData();
      setActiveTab("list");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Banner Thông báo Cập nhật ngành trùng / Thêm mới ─────────────── */}
      {updateNotice && (
        <div
          className={cn(
            "flex items-start justify-between gap-3 rounded-2xl p-4 shadow-sm border animate-fadeIn",
            updateNotice.type === "update"
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-emerald-300 bg-emerald-50 text-emerald-950",
          )}
        >
          <div className="flex items-start gap-3">
            {updateNotice.type === "update" ? (
              <LuTriangleAlert className="size-5 shrink-0 text-amber-600 mt-0.5" />
            ) : (
              <LuCheck className="size-5 shrink-0 text-emerald-600 mt-0.5" />
            )}
            <div>
              <p className="font-bold text-sm">{updateNotice.title}</p>
              <p className="mt-0.5 text-xs text-slate-700">{updateNotice.message}</p>
              {updateNotice.details && updateNotice.details.length > 0 && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-white/80 p-2.5 text-xs text-slate-800">
                  <span className="font-bold text-amber-900">Chi tiết ngành đã cập nhật ({updateNotice.details.length}):</span>
                  <ul className="mt-1 list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto font-mono text-[11px] text-slate-700">
                    {updateNotice.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUpdateNotice(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-black/5"
            aria-label="Đóng thông báo"
          >
            <LuX className="size-4" />
          </button>
        </div>
      )}

      {/* ── Thống kê tổng quan ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div
          onClick={() => {
            setFilterStatus("all");
            setActiveTab("list");
          }}
          className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-primary-400"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng CTĐT</span>
            <LuBookOpen className="size-5 text-primary-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums sm:text-3xl">{stats.total}</p>
          <p className="mt-1 text-xs text-slate-500">Nhấn để xem toàn bộ danh sách</p>
        </div>

        <div
          onClick={() => {
            setFilterStatus("missing_score");
            setActiveTab("list");
          }}
          className="cursor-pointer rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-card transition hover:border-amber-400"
        >
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Chờ điểm chuẩn</span>
            <LuCircleAlert className="size-5 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700 tabular-nums sm:text-3xl">{stats.missingScore}</p>
          <p className="mt-1 text-xs text-amber-600">Đã lưu, cần bổ sung điểm khi có</p>
        </div>

        <div
          onClick={() => {
            setFilterStatus("missing_tuition");
            setActiveTab("list");
          }}
          className="cursor-pointer rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-card transition hover:border-amber-400"
        >
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Chờ học phí</span>
            <LuCircleAlert className="size-5 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700 tabular-nums sm:text-3xl">{stats.missingTuition}</p>
          <p className="mt-1 text-xs text-amber-600">Đã lưu, cần bổ sung học phí</p>
        </div>

        <div
          onClick={() => {
            setFilterStatus("complete");
            setActiveTab("list");
          }}
          className="cursor-pointer rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-card transition hover:border-emerald-400"
        >
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase tracking-wider">Đầy đủ dữ liệu</span>
            <LuCheck className="size-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700 tabular-nums sm:text-3xl">{stats.complete}</p>
          <p className="mt-1 text-xs text-emerald-600">Có cả điểm & học phí chuẩn</p>
        </div>
      </div>

      {/* ── Thanh chuyển Tab chức năng ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("quick")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition",
              activeTab === "quick"
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            )}
          >
            <LuPlus className="size-4" /> ⚡ Nhập nhanh 1 bản ghi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("import")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition",
              activeTab === "import"
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            )}
          >
            <LuFileSpreadsheet className="size-4" /> 📁 Nhập danh sách Excel / CSV
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition",
              activeTab === "list"
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            )}
          >
            <LuFilter className="size-4" /> 📋 Danh sách & Bổ sung thông tin
          </button>
        </div>

        {activeTab === "import" && (
          <div className="flex items-center gap-2">
            <a
              href="/api/admin/import?type=simple"
              download
              className="flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-100"
            >
              <LuDownload className="size-3.5" /> Tải mẫu Excel siêu dễ (1 dòng)
            </a>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: NHẬP NHANH 1 BẢN GHI                                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "quick" && (
        <Panel className="p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Nhập liệu tích hợp: Trường · Cơ sở · Ngành · Điểm · Học phí
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Linh hoạt tối đa: Thông tin nào chưa có (ví dụ điểm chuẩn hoặc học phí) vẫn cho lưu, hệ thống sẽ đánh dấu để bạn sửa bổ sung sau.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Làm mới form
            </button>
          </div>

          <form onSubmit={handleSaveForm} className="space-y-6">
            {/* 1. Phần Trường & Cơ sở */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <LuLandmark className="size-4 text-primary-600" /> 1. Thông tin Trường & Cơ sở đào tạo
                </span>
                <button
                  type="button"
                  onClick={() => setIsNewSchoolMode(!isNewSchoolMode)}
                  className="text-xs font-bold text-primary-600 hover:underline"
                >
                  {isNewSchoolMode ? "← Chọn trường có sẵn trong hệ thống" : "+ Thêm trường hoàn toàn mới"}
                </button>
              </div>

              {!isNewSchoolMode ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Chọn trường có sẵn <span className="text-danger-600">*</span>
                    </label>
                    <select
                      className={selectCls}
                      value={form.schoolCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        const s = schools.find((x) => x.code === code);
                        setForm((prev) => ({
                          ...prev,
                          schoolCode: code,
                          schoolName: s ? s.name : "",
                          city: s ? s.city : prev.city,
                          campus: s?.campuses?.[0] || "",
                        }));
                      }}
                    >
                      <option value="">-- Chọn trường đại học / cao đẳng --</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.code}>
                          {s.code} – {s.name} ({s.city})
                        </option>
                      ))}
                    </select>
                    {formErrors.schoolCode && (
                      <p className="mt-1 text-xs text-danger-600">{formErrors.schoolCode}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Cơ sở đào tạo (hoặc địa chỉ phân hiệu)
                    </label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="VD: Cơ sở 1 Đại Cồ Việt, Phân hiệu Gia Lai..."
                      value={form.campus}
                      onChange={(e) => setForm((prev) => ({ ...prev, campus: e.target.value }))}
                    />
                    <p className="mt-1 text-[11px] text-slate-400">Để trống sẽ tự động lấy cơ sở chính hoặc tỉnh thành của trường.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Mã trường mới <span className="text-danger-600">*</span>
                    </label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="VD: BKA, NEU, FPT..."
                      value={form.schoolCode}
                      onChange={(e) => setForm((prev) => ({ ...prev, schoolCode: e.target.value.toUpperCase() }))}
                    />
                    {formErrors.schoolCode && (
                      <p className="mt-1 text-xs text-danger-600">{formErrors.schoolCode}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">Tên trường đầy đủ</label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="VD: Trường Đại học FPT"
                      value={form.schoolName}
                      onChange={(e) => setForm((prev) => ({ ...prev, schoolName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">Tỉnh / Thành phố chính</label>
                    <select
                      className={selectCls}
                      value={form.city}
                      onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                    >
                      {PROVINCES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Phần Ngành & Mã xét tuyển */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
              <span className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
                <LuBookOpen className="size-4 text-primary-600" /> 2. Thông tin Ngành & Chương trình đào tạo
              </span>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Tên ngành / Chương trình đào tạo <span className="text-danger-600">*</span>
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="VD: Công nghệ thông tin, Khoa học dữ liệu, Marketing..."
                    value={form.majorName}
                    onChange={(e) => setForm((prev) => ({ ...prev, majorName: e.target.value }))}
                  />
                  {formErrors.majorName && (
                    <p className="mt-1 text-xs text-danger-600">{formErrors.majorName}</p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-400">Nếu ngành chưa có trong hệ thống, Trovio sẽ tự động tạo ngành mới.</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Mã xét tuyển / Mã ngành
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="VD: IT1, 7480201..."
                    value={form.admissionCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, admissionCode: e.target.value.toUpperCase() }))}
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Để trống hệ thống sẽ tự sinh mã.</p>
                </div>
              </div>

              {/* Báo trùng ngành của trường nếu phát hiện */}
              {duplicateMajor && !form.id && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950 shadow-sm">
                  <LuTriangleAlert className="size-5 shrink-0 text-amber-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-900">
                      ⚠️ BÁO TRÙNG NGÀNH: Trường {duplicateMajor.schoolName || duplicateMajor.schoolCode} đã có ngành "{duplicateMajor.majorName}"!
                    </p>
                    <p className="text-amber-800">
                      • Mã xét tuyển hiện tại: <span className="font-mono font-bold text-amber-950">{duplicateMajor.admissionCode}</span>
                      {" · "}
                      • Điểm chuẩn hiện tại: <span className="font-bold text-amber-950">{duplicateMajor.latestScore != null ? duplicateMajor.latestScore : "Chưa có"}</span>
                      {" · "}
                      • Cơ sở: <span>{duplicateMajor.campus || duplicateMajor.schoolCity}</span>
                    </p>
                    <p className="font-medium text-amber-800/90">
                      👉 <strong>Cơ chế cập nhật:</strong> Khi bạn bấm <strong>Cập nhật ngành trùng này</strong>, hệ thống sẽ <strong>tự động CẬP NHẬT</strong> điểm chuẩn ({form.score.trim() || "giữ nguyên"}) và các thông tin mới cho ngành này, đồng thời hiện thông báo xác nhận cập nhật thành công (không tạo bản ghi dư thừa).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Phần Điểm chuẩn & Học phí */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <LuSparkles className="size-4 text-amber-600" /> 3. Điểm chuẩn & Học phí chuẩn (Tùy chọn)
                </span>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  Chưa có thông tin vẫn cho lưu
                </span>
              </div>
              <p className="mb-4 text-xs text-slate-500">
                Nếu trường chưa công bố điểm hoặc chưa có đề án học phí, bạn có thể để trống. Sau này khi có thông tin, bạn chỉ cần lọc ra và điền bổ sung.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Điểm chuẩn (Thang 30)
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="VD: 27.5 (Để trống nếu chưa có)"
                    value={form.score}
                    onChange={(e) => setForm((prev) => ({ ...prev, score: e.target.value }))}
                  />
                  {formErrors.score && <p className="mt-1 text-xs text-danger-600">{formErrors.score}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Học phí tối thiểu (Tr/năm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    className={inputCls}
                    placeholder="VD: 25"
                    value={form.tuitionMin}
                    onChange={(e) => setForm((prev) => ({ ...prev, tuitionMin: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Học phí tối đa (Tr/năm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    className={inputCls}
                    placeholder="VD: 35"
                    value={form.tuitionMax}
                    onChange={(e) => setForm((prev) => ({ ...prev, tuitionMax: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Tổ hợp xét tuyển
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="VD: A00 A01 D01"
                    value={form.combos}
                    onChange={(e) => setForm((prev) => ({ ...prev, combos: e.target.value.toUpperCase() }))}
                  />
                </div>
              </div>
            </div>

            {/* Nút submit */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Hủy bỏ
              </Button>
              <Button type="submit" disabled={busy} className="px-6 py-2.5 font-bold">
                {busy
                  ? "Đang lưu..."
                  : duplicateMajor && !form.id
                    ? "Cập nhật ngành trùng này ✓"
                    : "Lưu dữ liệu vào hệ thống ✓"}
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: NHẬP DANH SÁCH EXCEL / CSV                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "import" && (
        <div className="space-y-6">
          <Panel className="p-6">
            <h2 className="text-lg font-bold text-slate-900">Nhập danh sách từ Excel (.xlsx) hoặc CSV</h2>
            <p className="mt-1 text-sm text-slate-500">
              Cách dễ nhất: Bạn chỉ cần điền 1 bảng Excel 6 cột đơn giản. Nếu dòng nào chưa có điểm chuẩn, cứ để trống, hệ thống vẫn nạp thành công!
            </p>

            {/* Hướng dẫn cấu trúc 6 cột chuẩn */}
            <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary-900">
                  Cơ chế 6 cột chuẩn siêu dễ (Excel hoặc CSV):
                </span>
                <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-[11px] font-semibold text-primary-800">
                  Tự động tạo trường & ngành mới
                </span>
              </div>
              <div className="mt-3 overflow-x-auto rounded-lg border border-primary-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-primary-100/70 text-primary-900 font-bold">
                    <tr>
                      <th className="px-3 py-2">mã trường mới</th>
                      <th className="px-3 py-2">tên trường</th>
                      <th className="px-3 py-2">tỉnh</th>
                      <th className="px-3 py-2">tên ngành</th>
                      <th className="px-3 py-2">mã xét tuyển</th>
                      <th className="px-3 py-2">điểm chuẩn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="px-3 py-1.5 font-mono font-bold text-primary-700">BKA</td>
                      <td className="px-3 py-1.5">Đại học Bách khoa Hà Nội</td>
                      <td className="px-3 py-1.5">Hà Nội</td>
                      <td className="px-3 py-1.5 font-medium">Công nghệ thông tin</td>
                      <td className="px-3 py-1.5 font-mono">IT1</td>
                      <td className="px-3 py-1.5 font-bold text-success-700">28.5</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 font-mono font-bold text-primary-700">NEU</td>
                      <td className="px-3 py-1.5">Đại học Kinh tế Quốc dân</td>
                      <td className="px-3 py-1.5">Hà Nội</td>
                      <td className="px-3 py-1.5 font-medium">Marketing</td>
                      <td className="px-3 py-1.5 font-mono">MKT01</td>
                      <td className="px-3 py-1.5 font-bold text-success-700">27.5</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 font-mono font-bold text-primary-700">FPT</td>
                      <td className="px-3 py-1.5">Trường Đại học FPT</td>
                      <td className="px-3 py-1.5">Hà Nội</td>
                      <td className="px-3 py-1.5 font-medium">Kỹ thuật phần mềm</td>
                      <td className="px-3 py-1.5 font-mono">SE01</td>
                      <td className="px-3 py-1.5 italic text-slate-400">(để trống chờ công bố)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <ul className="mt-2.5 space-y-1 text-xs text-slate-600">
                <li>• <strong>Mã trường mới:</strong> Nếu trường chưa có trên hệ thống, Trovio sẽ tự động tạo trường mới theo tên và tỉnh bạn điền.</li>
                <li>• <strong>Tên ngành:</strong> Tự động tạo ngành mới nếu chưa có trong danh mục.</li>
                <li>• <strong>Điểm chuẩn:</strong> Thang 30. Nếu trường chưa công bố, bạn <strong>được để trống</strong>, hệ thống vẫn nạp thành công để cập nhật sau!</li>
              </ul>
            </div>

            <div
              onDragOver={(e) => (e.preventDefault(), setDrag(true))}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                pickFile(e.dataTransfer.files[0]);
              }}
              className={cn(
                "mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
                drag ? "border-primary-600 bg-primary-50" : "border-primary-300 bg-primary-50/30",
              )}
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                <LuCloudUpload className="size-6" />
              </span>
              <p className="mt-3 text-base font-bold text-slate-900">Kéo thả tệp Excel/CSV vào đây hoặc bấm để chọn</p>
              <p className="mt-1 text-xs text-slate-500">Hỗ trợ .xlsx, .csv (tối đa 2.000 dòng)</p>
              <input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.tsv,.txt,text/csv,text/tab-separated-values,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
              <div className="mt-4 flex gap-3">
                <Button size="sm" onClick={() => document.getElementById("file-upload")?.click()} disabled={busy}>
                  Chọn file từ máy
                </Button>
                <a
                  href="/api/admin/import?type=simple"
                  download
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <LuDownload className="size-3.5" /> Tải file mẫu mẫu (.csv)
                </a>
              </div>
            </div>

            {fileErr && (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-danger-50 px-4 py-2.5 text-sm text-danger-700">
                <LuTriangleAlert className="size-4 shrink-0" /> {fileErr}
              </p>
            )}

            {file && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <LuFileSpreadsheet className="size-6 text-success-700" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500">{fileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="text-xs font-bold text-danger-600 hover:underline"
                >
                  Xóa file
                </button>
              </div>
            )}
          </Panel>

          {preview && (
            <Panel className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-bold text-slate-900">Kết quả xem trước ({preview.summary.total} dòng)</h3>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-md bg-success-50 px-2.5 py-1 text-success-700 border border-success-200">
                    {preview.summary.create} ngành mới ✨
                  </span>
                  {preview.summary.update > 0 && (
                    <span className="rounded-md bg-amber-100 px-2.5 py-1 text-amber-900 border border-amber-300">
                      ⚠️ {preview.summary.update} ngành trùng (sẽ cập nhật)
                    </span>
                  )}
                  {preview.summary.warnings > 0 && (
                    <span className="rounded-md bg-amber-50 px-2.5 py-1 text-amber-700 border border-amber-200">
                      {preview.summary.warnings} dòng chờ bổ sung
                    </span>
                  )}
                  {preview.summary.errors > 0 && (
                    <span className="rounded-md bg-danger-50 px-2.5 py-1 text-danger-700 border border-danger-200">
                      {preview.summary.errors} lỗi cần sửa ✗
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className={th}>Dòng</th>
                      <th className={th}>Trường</th>
                      <th className={th}>Ngành / Mã XT</th>
                      <th className={th}>Điểm chuẩn</th>
                      <th className={th}>Học phí</th>
                      <th className={th}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.rows.slice(0, 50).map((r, i) => {
                      const hasErr = r.errors.length > 0;
                      const isDupUpdate = r.action === "update";
                      return (
                        <tr
                          key={i}
                          className={cn(
                            hasErr
                              ? "bg-danger-50/40"
                              : isDupUpdate
                                ? "bg-amber-50/40 hover:bg-amber-50/70"
                                : "hover:bg-slate-50",
                          )}
                        >
                          <td className={td}>{r.line}</td>
                          <td className={td}>
                            <span className="font-bold text-slate-900">{r.data.ma_truong}</span>
                            {r.data.ten_truong && <span className="block text-[11px] text-slate-500">{r.data.ten_truong}</span>}
                          </td>
                          <td className={td}>
                            <span className="font-semibold text-slate-800">{r.data.ten_chuong_trinh || r.data.ma_xet_tuyen}</span>
                            <span className="block text-[11px] text-slate-400">Mã: {r.data.ma_xet_tuyen}</span>
                          </td>
                          <td className={td}>
                            {r.data.diem_chuan ? (
                              <span className="font-bold text-success-700">{r.data.diem_chuan}</span>
                            ) : (
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">Chờ điểm</span>
                            )}
                          </td>
                          <td className={td}>
                            {r.data.hoc_phi_min ? (
                              <span>{r.data.hoc_phi_min} tr</span>
                            ) : (
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">Chờ học phí</span>
                            )}
                          </td>
                          <td className={td}>
                            {hasErr ? (
                              <span className="font-semibold text-danger-700">{r.errors.map((e) => e.message).join(", ")}</span>
                            ) : isDupUpdate ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-300">
                                  <LuTriangleAlert className="size-3 text-amber-600" /> Báo trùng ngành (Sẽ cập nhật)
                                </span>
                                <span className="block text-[10px] text-amber-700">
                                  Đã có ở trường → Cập nhật điểm/thông tin
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-900 border border-emerald-300">
                                  <LuPlus className="size-3 text-emerald-600" /> Ngành mới
                                </span>
                                <span className="block text-[10px] text-emerald-700">
                                  Sẵn sàng tạo mới
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setPreview(null)}>
                  Hủy bỏ
                </Button>
                <Button
                  onClick={() => setConfirmPublish(true)}
                  disabled={preview.summary.valid === 0}
                  className="font-bold"
                >
                  Xác nhận công bố ({preview.summary.valid} dòng) ✓
                </Button>
              </div>
            </Panel>
          )}

          {/* Dialog xác nhận publish */}
          <Dialog
            open={confirmPublish}
            onClose={() => setConfirmPublish(false)}
            title="Xác nhận lưu & nạp dữ liệu vào hệ thống"
            subtitle="Hệ thống đã tự động kiểm tra và phân loại ngành mới / ngành trùng."
            footer={
              <>
                <Button variant="outline" onClick={() => setConfirmPublish(false)}>
                  Quay lại
                </Button>
                <Button onClick={handlePublishFile} disabled={busy} className="font-bold">
                  {busy ? "Đang xử lý..." : "Đồng ý nạp & cập nhật"}
                </Button>
              </>
            }
          >
            {preview && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <span className="font-bold text-emerald-800">✨ Ngành hoàn toàn mới:</span>
                    <p className="mt-1 text-2xl font-bold text-emerald-900">{preview.summary.create}</p>
                    <p className="text-emerald-700">Sẽ tạo mới chương trình đào tạo.</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <span className="font-bold text-amber-800">⚠️ Ngành trùng trường:</span>
                    <p className="mt-1 text-2xl font-bold text-amber-900">{preview.summary.update}</p>
                    <p className="text-amber-700">Sẽ cập nhật điểm chuẩn & thông tin.</p>
                  </div>
                </div>
                {preview.summary.update > 0 && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <LuTriangleAlert className="size-4 text-amber-600 shrink-0" />
                      Thông báo cập nhật bản ghi trùng:
                    </p>
                    <p className="mt-1">
                      Phát hiện <strong>{preview.summary.update}</strong> ngành trùng với các ngành đã có trong trường. Khi bạn đồng ý, hệ thống sẽ <strong>cập nhật điểm chuẩn và thông tin mới</strong> cho các ngành này (không tạo trùng lặp).
                    </p>
                  </div>
                )}
              </div>
            )}
          </Dialog>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: DANH SÁCH TỔNG HỢP & SỬA TRỰC TIẾP                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "list" && (
        <Panel className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Danh sách Chương trình & Trạng thái dữ liệu</h2>
              <p className="mt-1 text-xs text-slate-500">
                Bạn có thể sửa nhanh điểm và học phí trực tiếp bằng cách gõ vào ô và bấm Enter.
              </p>
            </div>
            <Button size="sm" onClick={() => setActiveTab("quick")} className="gap-1.5">
              <LuPlus className="size-4" /> Thêm bản ghi mới
            </Button>
          </div>

          {/* Bộ lọc và tìm kiếm */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                  filterStatus === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                Tất cả ({rows.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("missing_score")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                  filterStatus === "missing_score" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100",
                )}
              >
                ⚠️ Chờ điểm chuẩn ({stats.missingScore})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("missing_tuition")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                  filterStatus === "missing_tuition" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100",
                )}
              >
                ⚠️ Chờ học phí ({stats.missingTuition})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("complete")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                  filterStatus === "complete" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                )}
              >
                ✅ Đầy đủ ({stats.complete})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <LuSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã trường, ngành..."
                className={cn(inputCls, "pl-9 text-xs")}
                value={searchQ}
                onChange={(e) => (setSearchQ(e.target.value), setPage(1))}
              />
            </div>
          </div>

          {/* Bảng danh sách */}
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className={th}>Trường & Cơ sở</th>
                  <th className={th}>Ngành & Mã xét tuyển</th>
                  <th className={th}>Điểm chuẩn (Thang 30)</th>
                  <th className={th}>Học phí (Tr/năm)</th>
                  <th className={th}>Tổ hợp</th>
                  <th className={th}>Trạng thái</th>
                  <th className={`${th} text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paged.slice.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Không tìm thấy bản ghi nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  paged.slice.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className={td}>
                        <div className="font-bold text-slate-900">{r.schoolCode}</div>
                        <div className="truncate text-[11px] text-slate-500 max-w-[200px]" title={r.schoolName}>
                          {r.schoolName}
                        </div>
                        {r.campus && r.campus !== "—" && (
                          <div className="text-[10px] text-primary-600">📍 {r.campus}</div>
                        )}
                      </td>
                      <td className={td}>
                        <div className="font-semibold text-slate-800">{r.majorName}</div>
                        <div className="text-[11px] text-slate-400">Mã XT: {r.admissionCode}</div>
                      </td>
                      <td className={td}>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            defaultValue={r.latestScore != null ? String(r.latestScore) : ""}
                            placeholder="Chưa có"
                            onBlur={(e) => {
                              if (e.target.value !== (r.latestScore != null ? String(r.latestScore) : "")) {
                                handleQuickInPlaceSave(r.id, "score", e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                            className={cn(
                              "w-20 rounded border px-2 py-1 text-center font-bold text-xs focus:ring-1 focus:ring-primary-500",
                              r.latestScore != null
                                ? "border-slate-300 bg-white text-slate-900"
                                : "border-amber-300 bg-amber-50 text-amber-700",
                            )}
                          />
                          {r.missingScore && (
                            <span className="text-[10px] text-amber-600 font-semibold">Chờ điểm</span>
                          )}
                        </div>
                      </td>
                      <td className={td}>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.5"
                            defaultValue={r.tuitionMin > 0 ? String(r.tuitionMin) : ""}
                            placeholder="0"
                            onBlur={(e) => {
                              if (e.target.value !== (r.tuitionMin > 0 ? String(r.tuitionMin) : "")) {
                                handleQuickInPlaceSave(r.id, "tuition", e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                            className={cn(
                              "w-20 rounded border px-2 py-1 text-center font-semibold text-xs focus:ring-1 focus:ring-primary-500",
                              r.tuitionMin > 0
                                ? "border-slate-300 bg-white text-slate-900"
                                : "border-amber-300 bg-amber-50 text-amber-700",
                            )}
                          />
                          <span className="text-[11px] text-slate-500">tr</span>
                        </div>
                      </td>
                      <td className={td}>
                        <div className="flex flex-wrap gap-1">
                          {r.combos.map((c) => (
                            <span key={c} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className={td}>
                        {r.isComplete ? (
                          <Badge tone="success">Đầy đủ ✓</Badge>
                        ) : (
                          <Badge tone="accent">Chờ bổ sung</Badge>
                        )}
                      </td>
                      <td className={`${td} text-right`}>
                        <button
                          type="button"
                          onClick={() => openEditDrawer(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <LuPencil className="size-3" /> Sửa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Pager
              page={page}
              pageCount={paged.pageCount}
              onChange={setPage}
              total={filteredRows.length}
              from={paged.from}
              to={paged.to}
              unit="chương trình"
            />
          </div>
        </Panel>
      )}

      {/* ── Drawer chỉnh sửa chi tiết ────────────────────────────────────── */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Chỉnh sửa thông tin chương trình"
        subtitle={`Mã: ${form.admissionCode || "—"} · Trường: ${form.schoolCode}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveForm} disabled={busy} className="font-bold">
              {busy ? "Đang lưu..." : "Cập nhật thay đổi ✓"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="mb-1 block font-bold text-slate-700">Tên ngành / chương trình</label>
            <input
              type="text"
              className={inputCls}
              value={form.majorName}
              onChange={(e) => setForm((prev) => ({ ...prev, majorName: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block font-bold text-slate-700">Cơ sở đào tạo (hoặc địa chỉ phân hiệu)</label>
            <input
              type="text"
              className={inputCls}
              value={form.campus}
              onChange={(e) => setForm((prev) => ({ ...prev, campus: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-bold text-slate-700">Điểm chuẩn (Thang 30)</label>
              <input
                type="text"
                placeholder="Để trống nếu chưa có"
                className={inputCls}
                value={form.score}
                onChange={(e) => setForm((prev) => ({ ...prev, score: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block font-bold text-slate-700">Tổ hợp môn</label>
              <input
                type="text"
                placeholder="A00 A01..."
                className={inputCls}
                value={form.combos}
                onChange={(e) => setForm((prev) => ({ ...prev, combos: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-bold text-slate-700">Học phí tối thiểu (Tr/năm)</label>
              <input
                type="number"
                step="0.5"
                placeholder="0"
                className={inputCls}
                value={form.tuitionMin}
                onChange={(e) => setForm((prev) => ({ ...prev, tuitionMin: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block font-bold text-slate-700">Học phí tối đa (Tr/năm)</label>
              <input
                type="number"
                step="0.5"
                placeholder="0"
                className={inputCls}
                value={form.tuitionMax}
                onChange={(e) => setForm((prev) => ({ ...prev, tuitionMax: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-bold text-slate-700">Chỉ tiêu</label>
            <input
              type="number"
              placeholder="100"
              className={inputCls}
              value={form.quota}
              onChange={(e) => setForm((prev) => ({ ...prev, quota: e.target.value }))}
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
