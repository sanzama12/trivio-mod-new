/**
 * Chọn môn lớp 10 (chương trình GDPT 2018) ↔ ngành mở / khoá.
 * Học sinh học các môn bắt buộc và chọn 4 môn lựa chọn; tổ hợp xét tuyển chỉ dùng được khi đã học đủ các môn trong tổ hợp.
 * Hàm thuần, dùng chung client + kiểm thử.
 */
import type { Combo } from "../domain/types";
import type { LiteProgram } from "./lite";

export interface G10Subject {
  id: string;
  name: string;
}

/** Môn bắt buộc có mặt trong các tổ hợp xét tuyển. */
export const CORE_SUBJECTS: G10Subject[] = [
  { id: "toan", name: "Toán" },
  { id: "van", name: "Ngữ văn" },
  { id: "anh", name: "Tiếng Anh" },
  { id: "su", name: "Lịch sử" },
];

/** Môn lựa chọn (chọn 4). id trùng với id môn trong tổ hợp khi có. */
export const ELECTIVE_SUBJECTS: G10Subject[] = [
  { id: "ly", name: "Vật lí" },
  { id: "hoa", name: "Hoá học" },
  { id: "sinh", name: "Sinh học" },
  { id: "dia", name: "Địa lí" },
  { id: "ktpl", name: "GD kinh tế & pháp luật" },
  { id: "tin", name: "Tin học" },
  { id: "cn", name: "Công nghệ" },
  { id: "amnhac", name: "Âm nhạc" },
  { id: "mythuat", name: "Mỹ thuật" },
];

export const ELECTIVE_COUNT = 4;
/** Môn năng khiếu thi riêng, không phụ thuộc môn lựa chọn ở lớp 10. */
export const APTITUDE_SUBJECTS: Record<string, string> = { ve: "Vẽ mỹ thuật (thi năng khiếu)" };

const CORE_IDS = new Set(CORE_SUBJECTS.map((s) => s.id));
export const subjectName = (id: string) => CORE_SUBJECTS.find((s) => s.id === id)?.name ?? ELECTIVE_SUBJECTS.find((s) => s.id === id)?.name ?? APTITUDE_SUBJECTS[id] ?? id;

export const sanitizeElectives = (ids: unknown): string[] =>
  Array.isArray(ids) ? Array.from(new Set(ids.filter((x): x is string => typeof x === "string" && ELECTIVE_SUBJECTS.some((s) => s.id === x)))).slice(0, ELECTIVE_COUNT) : [];

/** Môn lựa chọn còn thiếu để dùng được tổ hợp (rỗng = dùng được). */
export function missingFor(combo: Combo, electives: string[]): string[] {
  return combo.subjects.filter((s) => !CORE_IDS.has(s) && !(s in APTITUDE_SUBJECTS) && !electives.includes(s));
}

export interface ComboState {
  code: string;
  subjects: string[];
  ok: boolean;
  missing: string[];
  aptitude: boolean;
}

export function comboStates(combos: Combo[], electives: string[]): ComboState[] {
  return combos.map((c) => {
    const missing = missingFor(c, electives);
    return { code: c.code, subjects: c.subjects, ok: missing.length === 0, missing, aptitude: c.subjects.some((s) => s in APTITUDE_SUBJECTS) };
  });
}

export interface ProgramState {
  program: LiteProgram;
  status: "open" | "locked" | "other";
  /** Tổ hợp dùng được (khi mở). */
  via: string[];
  /** Khi khoá: tổ hợp gần nhất và môn còn thiếu. */
  need: { combo: string; missing: string[] } | null;
  aptitude: boolean;
}

export function programStates(programs: LiteProgram[], combos: Combo[], electives: string[]): ProgramState[] {
  const byCode = new Map(combos.map((c) => [c.code, c]));
  return programs.map((p) => {
    const known = p.combos.map((c) => byCode.get(c)).filter((c): c is Combo => !!c);
    if (known.length === 0) return { program: p, status: "other", via: [], need: null, aptitude: false };
    const via = known.filter((c) => missingFor(c, electives).length === 0);
    const aptitude = via.length > 0 && via.every((c) => c.subjects.some((s) => s in APTITUDE_SUBJECTS));
    if (via.length) return { program: p, status: "open", via: via.map((c) => c.code), need: null, aptitude };
    const best = [...known].sort((a, b) => missingFor(a, electives).length - missingFor(b, electives).length)[0];
    return { program: p, status: "locked", via: [], need: { combo: best.code, missing: missingFor(best, electives) }, aptitude: false };
  });
}

/** Tóm tắt theo ngành: ngành mở nếu ít nhất 1 chương trình mở. */
export function majorStates(states: ProgramState[]): { majorId: string; open: number; locked: number; need: ProgramState["need"]; via: string[] }[] {
  const map = new Map<string, { majorId: string; open: number; locked: number; need: ProgramState["need"]; via: Set<string> }>();
  for (const s of states) {
    if (s.status === "other") continue;
    const m = map.get(s.program.majorId) ?? { majorId: s.program.majorId, open: 0, locked: 0, need: null, via: new Set<string>() };
    if (s.status === "open") {
      m.open++;
      s.via.forEach((v) => m.via.add(v));
    } else {
      m.locked++;
      if (!m.need || (s.need && s.need.missing.length < m.need.missing.length)) m.need = s.need;
    }
    map.set(s.program.majorId, m);
  }
  return [...map.values()].map((m) => ({ ...m, via: [...m.via].sort() }));
}

const countOpen = (programs: LiteProgram[], combos: Combo[], electives: string[]) => programStates(programs, combos, electives).filter((s) => s.status === "open").length;

/** Đổi 1 môn để mở thêm nhiều chương trình nhất (null nếu không có lựa chọn nào tốt hơn). */
export function bestSwap(programs: LiteProgram[], combos: Combo[], electives: string[]): { out: string; in: string; gain: number; unlocked: string[]; lost: string[] } | null {
  if (electives.length < ELECTIVE_COUNT) return null;
  const base = programStates(programs, combos, electives);
  const baseOpen = new Set(base.filter((s) => s.status === "open").map((s) => s.program.id));
  let best: { out: string; in: string; gain: number; unlocked: string[]; lost: string[] } | null = null;
  for (const out of electives) {
    for (const cand of ELECTIVE_SUBJECTS.map((s) => s.id)) {
      if (electives.includes(cand)) continue;
      const next = electives.map((e) => (e === out ? cand : e));
      const st = programStates(programs, combos, next);
      const open = new Set(st.filter((s) => s.status === "open").map((s) => s.program.id));
      const unlockedIds = [...open].filter((id) => !baseOpen.has(id));
      const lostIds = [...baseOpen].filter((id) => !open.has(id));
      const gain = unlockedIds.length - lostIds.length;
      if (gain > 0 && (!best || gain > best.gain)) {
        const nameOf = (id: string) => programs.find((p) => p.id === id)!.majorId;
        best = { out, in: cand, gain, unlocked: Array.from(new Set(unlockedIds.map(nameOf))), lost: Array.from(new Set(lostIds.map(nameOf))) };
      }
    }
  }
  return best;
}

function* subsets<T>(arr: T[], k: number, start = 0, acc: T[] = []): Generator<T[]> {
  if (acc.length === k) {
    yield acc;
    return;
  }
  for (let i = start; i < arr.length; i++) yield* subsets(arr, k, i + 1, [...acc, arr[i]]);
}

export interface TargetPlan {
  electives: string[];
  /** Mỗi ngành mục tiêu: mở được không, qua tổ hợp nào, môn lựa chọn bắt buộc phải có. */
  targets: { majorId: string; open: boolean; via: string[]; required: string[] }[];
  openCount: number;
}

/** Môn lựa chọn bắt buộc cho một ngành: có mặt trong MỌI tổ hợp mà các chương trình của ngành dùng. */
export function requiredFor(majorId: string, programs: LiteProgram[], combos: Combo[]): string[] {
  const byCode = new Map(combos.map((c) => [c.code, c]));
  const used = new Set<string>();
  for (const p of programs) if (p.majorId === majorId) p.combos.forEach((c) => used.add(c));
  const sets = [...used].map((c) => byCode.get(c)).filter((c): c is Combo => !!c).map((c) => c.subjects.filter((s) => !CORE_IDS.has(s) && !(s in APTITUDE_SUBJECTS)));
  if (!sets.length) return [];
  return sets.reduce((acc, s) => acc.filter((x) => s.includes(x)));
}

/** Chiều ngược lại: từ ngành mục tiêu → bộ 4 môn lựa chọn mở được nhiều ngành mục tiêu nhất, rồi nhiều chương trình nhất. */
export function planForTargets(targetMajorIds: string[], programs: LiteProgram[], combos: Combo[], keep: string[] = []): TargetPlan {
  const ids = ELECTIVE_SUBJECTS.map((s) => s.id);
  let best: TargetPlan | null = null;
  let bestKey = [-1, -1, -1];
  for (const set of subsets(ids, ELECTIVE_COUNT)) {
    const st = programStates(programs, combos, set);
    const ms = majorStates(st);
    const targets = targetMajorIds.map((id) => {
      const m = ms.find((x) => x.majorId === id);
      return { majorId: id, open: !!m && m.open > 0, via: m?.via ?? [], required: requiredFor(id, programs, combos) };
    });
    const openCount = st.filter((s) => s.status === "open").length;
    const kept = keep.filter((k) => set.includes(k)).length;
    const key = [targets.filter((t) => t.open).length, openCount, kept];
    if (key[0] > bestKey[0] || (key[0] === bestKey[0] && (key[1] > bestKey[1] || (key[1] === bestKey[1] && key[2] > bestKey[2])))) {
      bestKey = key;
      best = { electives: set, targets, openCount };
    }
  }
  return best!;
}
