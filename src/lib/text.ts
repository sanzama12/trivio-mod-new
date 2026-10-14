/** Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu. */
export function normalizeVi(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function matchesQuery(query: string, ...fields: (string | undefined | string[])[]): boolean {
  const q = normalizeVi(query);
  if (!q) return true;
  const flat = fields.flatMap((f) => (Array.isArray(f) ? f : [f])).filter(Boolean);
  const hay = normalizeVi(flat.join(" "));
  return q.split(/\s+/).every((token) => hay.includes(token));
}

/** Chữ cái đầu tiên theo bảng chữ cái tiếng Việt (giữ Đ). */
export function firstLetterVi(input: string): string {
  const ch = input.trim().charAt(0).toUpperCase();
  if (ch === "Đ") return "Đ";
  return ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function initials(name: string): string {
  // Họ + tên (VD: Nguyễn Văn An → NA), theo cách hiển thị trong thiết kế.
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const picked = parts.length >= 2 ? [parts[0], parts[parts.length - 1]] : parts;
  return picked.map((p) => p.charAt(0).toUpperCase()).join("");
}
