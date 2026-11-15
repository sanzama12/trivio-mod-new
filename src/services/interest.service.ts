import "server-only";
import { randomUUID } from "node:crypto";
import { repositories } from "@database/repositories";
import type { Interest, MajorCareerInfo, PublicUser, SubjectMajorLink } from "@/domain/types";
import { normalizeVi } from "@/lib/text";

type Fail = { ok: false; field: string; message: string };

export const slugifyInterest = (name: string) => normalizeVi(name).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export interface InterestInput {
  id?: unknown;
  name?: unknown;
  kind?: unknown;
  description?: unknown;
  hidden?: unknown;
  position?: unknown;
  majorIds?: unknown;
}

/** Chuẩn hoá một sở thích / lĩnh vực nghề nghiệp do quản trị viên nhập. */
export function validateInterest(input: InterestInput): { ok: true; value: Omit<Interest, "majorIds">; majorIds: string[] } | Fail {
  const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return { ok: false, field: "name", message: "Tên cần từ 2 đến 80 ký tự." };
  if (input.kind !== "interest" && input.kind !== "field") return { ok: false, field: "kind", message: "Loại phải là sở thích hoặc lĩnh vực nghề nghiệp." };
  const id = String(input.id ?? "").trim() || slugifyInterest(name);
  if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(id)) return { ok: false, field: "name", message: "Không tạo được mã từ tên này; hãy đặt tên có chữ hoặc số." };
  const description = String(input.description ?? "").trim().slice(0, 300);
  const position = Number.isInteger(Number(input.position)) ? Math.max(0, Math.min(999, Number(input.position))) : 0;
  const majorIds = Array.isArray(input.majorIds)
    ? Array.from(new Set(input.majorIds.filter((m): m is string => typeof m === "string" && /^[a-z0-9][a-z0-9-]{0,99}$/.test(m)))).slice(0, 200)
    : [];
  return { ok: true, value: { id, name, kind: input.kind, description, hidden: input.hidden === true, position }, majorIds };
}

export function validateCareerInfo(majorId: string, input: Record<string, unknown>): { ok: true; value: MajorCareerInfo } | Fail {
  const knowledge = String(input.knowledge ?? "").trim();
  const careerOrientation = String(input.careerOrientation ?? "").trim();
  if (knowledge.length > 2000) return { ok: false, field: "knowledge", message: "Kiến thức đào tạo tối đa 2000 ký tự." };
  if (careerOrientation.length > 1000) return { ok: false, field: "careerOrientation", message: "Định hướng nghề nghiệp tối đa 1000 ký tự." };
  const rawCareers = Array.isArray(input.careers) ? input.careers : String(input.careers ?? "").split("\n");
  const careers = Array.from(new Set(rawCareers.map((c) => String(c).trim()).filter(Boolean)));
  if (careers.length > 12) return { ok: false, field: "careers", message: "Tối đa 12 vị trí nghề nghiệp." };
  if (careers.some((c) => c.length > 80)) return { ok: false, field: "careers", message: "Mỗi vị trí nghề nghiệp tối đa 80 ký tự." };
  return { ok: true, value: { majorId, knowledge, careerOrientation, careers } };
}

async function audit(actor: PublicUser, targetId: string, action: "create" | "update" | "delete", field: string, before: string, after: string) {
  await repositories.audit.append({
    id: randomUUID(),
    at: new Date().toISOString(),
    actorId: actor.id,
    actorEmail: actor.email,
    programId: targetId,
    targetType: "major",
    action,
    changes: [{ field, before, after }],
  });
}

export const interestService = {
  /** Danh sách cho học sinh chọn (không gồm mục đang ẩn). */
  async listPublic(): Promise<Omit<Interest, "majorIds">[]> {
    return (await repositories.interests.list(false)).map(({ majorIds: _ignored, ...rest }) => rest);
  },
  listAdmin: () => repositories.interests.list(true),
  listSubjectLinks: (): Promise<SubjectMajorLink[]> => repositories.interests.listSubjectLinks(),
  getCareerInfo: (majorId: string) => repositories.majorCareers.get(majorId),

  /** Thông tin nghề nghiệp và các sở thích gắn với một ngành, dùng cho trang chi tiết ngành. */
  async forMajor(majorId: string): Promise<{ career: MajorCareerInfo | null; interests: { id: string; name: string; kind: Interest["kind"] }[] }> {
    const [career, all] = await Promise.all([repositories.majorCareers.get(majorId), repositories.interests.list(false)]);
    return { career, interests: all.filter((i) => i.majorIds.includes(majorId)).map(({ id, name, kind }) => ({ id, name, kind })) };
  },

  async save(actor: PublicUser, input: InterestInput): Promise<{ ok: true; id: string } | Fail> {
    const parsed = validateInterest(input);
    if (!parsed.ok) return parsed;
    const all = await repositories.interests.list(true);
    const existing = all.find((i) => i.id === parsed.value.id);
    const editing = typeof input.id === "string" && input.id.trim() !== "";
    const isCreate = !editing;
    if (editing && !existing) return { ok: false, field: "id", message: "Không tìm thấy mục cần sửa." };
    if (isCreate && (existing || all.some((i) => i.kind === parsed.value.kind && normalizeVi(i.name) === normalizeVi(parsed.value.name)))) {
      return { ok: false, field: "name", message: "Đã có mục cùng tên." };
    }
    await repositories.interests.upsert(parsed.value, parsed.majorIds);
    await audit(actor, parsed.value.id, isCreate ? "create" : "update", "Sở thích / lĩnh vực", existing ? `${existing.name} (${existing.majorIds.length} ngành)` : "chưa có", `${parsed.value.name} (${parsed.majorIds.length} ngành)`);
    return { ok: true, id: parsed.value.id };
  },

  async remove(actor: PublicUser, id: string): Promise<boolean> {
    const existing = (await repositories.interests.list(true)).find((i) => i.id === id);
    if (!existing || !(await repositories.interests.remove(id))) return false;
    await audit(actor, id, "delete", "Sở thích / lĩnh vực", existing.name, "đã xoá");
    return true;
  },

  async saveSubjectLinks(actor: PublicUser, subjectId: unknown, majorIds: unknown): Promise<{ ok: true } | Fail> {
    if (typeof subjectId !== "string" || !/^[a-z0-9][a-z0-9-]{0,40}$/.test(subjectId)) return { ok: false, field: "subjectId", message: "Môn học không hợp lệ." };
    const subjects = await repositories.catalog.findSubjects();
    if (!subjects.some((s) => s.id === subjectId)) return { ok: false, field: "subjectId", message: "Không tìm thấy môn học." };
    const ids = Array.isArray(majorIds) ? Array.from(new Set(majorIds.filter((m): m is string => typeof m === "string" && /^[a-z0-9][a-z0-9-]{0,99}$/.test(m)))).slice(0, 200) : [];
    const before = (await repositories.interests.listSubjectLinks()).find((l) => l.subjectId === subjectId)?.majorIds.length ?? 0;
    await repositories.interests.setSubjectLinks(subjectId, ids);
    await audit(actor, subjectId, "update", "Ngành liên quan môn thế mạnh", `${before} ngành`, `${ids.length} ngành`);
    return { ok: true };
  },

  async saveCareerInfo(actor: PublicUser, majorId: unknown, input: Record<string, unknown>): Promise<{ ok: true } | Fail> {
    if (typeof majorId !== "string" || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(majorId)) return { ok: false, field: "majorId", message: "Ngành không hợp lệ." };
    const majors = await repositories.catalogAdmin.listMajors();
    if (!majors.some((m) => m.id === majorId)) return { ok: false, field: "majorId", message: "Không tìm thấy ngành." };
    const parsed = validateCareerInfo(majorId, input);
    if (!parsed.ok) return parsed;
    const before = await repositories.majorCareers.get(majorId);
    await repositories.majorCareers.upsert(parsed.value);
    await audit(actor, majorId, "update", "Thông tin nghề nghiệp", before ? `${before.careers.length} vị trí` : "chưa có", `${parsed.value.careers.length} vị trí`);
    return { ok: true };
  },
};
