import type { Program, VerifyField } from "@/domain/types";
import { hasTuitionData } from "@/lib/format";
import { verifiedStatus } from "./verification";

export type DataEvidenceStatus = "verified" | "reviewed" | "sourced" | "unsourced" | "missing";

export interface DataEvidence {
  status: DataEvidenceStatus;
  label: string;
  detail: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
  checkedAt: string | null;
}

const FIELD_LABELS: Record<VerifyField, string> = {
  cutoff: "điểm chuẩn",
  tuition: "học phí",
  quota: "chỉ tiêu",
  combos: "tổ hợp xét tuyển",
};

function httpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function resolvedSourceUrl(program: Pick<Program, "source" | "sourceUrl">): string | null {
  return httpUrl(program.sourceUrl) ?? httpUrl(program.source);
}

export function sourceLabel(program: Pick<Program, "source" | "sourceUrl">): string | null {
  const url = resolvedSourceUrl(program);
  if (url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {}
  }
  const text = program.source?.trim();
  return text && !/^https?:\/\//i.test(text) ? text : null;
}

export function isOfficialEducationSource(url: string | null): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith(".edu.vn") || host.endsWith(".gov.vn") || host === "moet.gov.vn";
  } catch {
    return false;
  }
}

export function hasFieldData(program: Program, field: VerifyField): boolean {
  switch (field) {
    case "cutoff":
      return program.cutoffs.some((item) => !item.estimated) || program.altCutoffs.some((item) => !item.estimated);
    case "tuition":
      return hasTuitionData(program.tuitionMin, program.tuitionMax);
    case "quota":
      return Number.isFinite(program.quota) && program.quota > 0;
    case "combos":
      return program.combos.length > 0;
  }
}

export function dataEvidenceFor(program: Program, field: VerifyField, now = new Date()): DataEvidence {
  const label = FIELD_LABELS[field];
  const url = resolvedSourceUrl(program);
  const source = sourceLabel(program);
  if (!hasFieldData(program, field)) {
    return {
      status: "missing",
      label: "Chưa có dữ liệu",
      detail: `Trovio chưa có dữ liệu ${label} đủ điều kiện để hiển thị.`,
      sourceUrl: url,
      sourceLabel: source,
      checkedAt: null,
    };
  }

  const fieldVerifiedAt = program.verifiedFields?.[field] ?? program.schoolVerifiedAt ?? null;
  const fieldVerification = verifiedStatus({ schoolVerifiedAt: fieldVerifiedAt }, now);
  if (fieldVerification.active) {
    return {
      status: "verified",
      label: "Trường đã xác nhận",
      detail: `Dữ liệu ${label} đã được trường xác nhận ngày ${fieldVerification.dateLabel}.`,
      sourceUrl: url,
      sourceLabel: source,
      checkedAt: fieldVerifiedAt,
    };
  }

  const reviewedAt = program.adminVerifiedAt ?? program.sourceCheckedAt ?? null;
  const review = verifiedStatus({ schoolVerifiedAt: reviewedAt }, now);
  if (review.active) {
    return {
      status: "reviewed",
      label: "Đã đối chiếu nguồn",
      detail: `Dữ liệu ${label} đã được quản trị viên đối chiếu ngày ${review.dateLabel}; chưa có xác nhận trực tiếp từ trường.`,
      sourceUrl: url,
      sourceLabel: source,
      checkedAt: reviewedAt,
    };
  }

  if (url) {
    const official = isOfficialEducationSource(url);
    return {
      status: "sourced",
      label: official ? "Có nguồn từ đơn vị giáo dục" : "Có nguồn tham khảo",
      detail: `Dữ liệu ${label} có đường dẫn nguồn nhưng chưa hoàn tất quy trình xác minh của Trovio.`,
      sourceUrl: url,
      sourceLabel: source,
      checkedAt: null,
    };
  }

  return {
    status: "unsourced",
    label: "Chưa có nguồn xác minh",
    detail: `Dữ liệu ${label} chưa có đường dẫn nguồn để đối chiếu.`,
    sourceUrl: null,
    sourceLabel: source,
    checkedAt: null,
  };
}