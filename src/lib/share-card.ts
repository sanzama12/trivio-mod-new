/**
 * Vẽ thẻ chia sẻ 1080×1350 (tỉ lệ 4:5 cho Zalo / Facebook / Instagram) bằng Canvas 2D — chạy trên trình duyệt,
 * không gửi dữ liệu đi đâu. Nội dung chỉ gồm những gì người dùng bật trong hộp thoại.
 */
import type { RiasecType } from "@/domain/types";

export const CARD_W = 1080;
export const CARD_H = 1350;

const C = {
  navy: "#1e1b4b",
  primary: "#4f46e5",
  primary200: "#c7d2fe",
  primary50: "#eef2ff",
  accent: "#f97316",
  accent50: "#fff7ed",
  accent700: "#c2410c",
  success50: "#ecfdf5",
  success700: "#047857",
  slate900: "#0f172a",
  slate500: "#64748b",
  slate100: "#f1f5f9",
  white: "#ffffff",
};

export interface RiasecCardData {
  name: string | null;
  code: RiasecType[];
  labels: string[];
  percents: { type: RiasecType; label: string; value: number }[];
  topMajors: string[] | null;
  url: string;
}

export interface WishlistCardData {
  name: string | null;
  season: string;
  method: string | null;
  items: { nv: number; program: string; school: string; fit: { label: string; tone: "an-toan" | "vua-suc" | "thu-suc" } | null }[];
  url: string;
}

function fontFamily(): string {
  if (typeof document === "undefined") return "sans-serif";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-be-vietnam").trim();
  return `${v || "'Be Vietnam Pro'"}, system-ui, sans-serif`;
}

export async function ensureFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const f = fontFamily();
  await Promise.all(["400", "600", "700", "800"].map((w) => document.fonts.load(`${w} 40px ${f}`).catch(() => undefined)));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Xuống dòng theo bề rộng; trả về y sau dòng cuối. */
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, maxLines = 3): number {
  const words = text.split(/\s+/);
  let line = "";
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      lines++;
      if (lines === maxLines) {
        ctx.fillText(`${line}…`, x, y);
        return y + lineH;
      }
      ctx.fillText(line, x, y);
      y += lineH;
      line = words[i];
    } else line = test;
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineH;
  }
  return y;
}

function logo(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, f: string) {
  // Biểu tượng 2026: sách mở chữ V + sao Bắc Đẩu (cùng path với components/layout/logo.tsx), khung 24 → 48px.
  ctx.save();
  ctx.translate(x - 2, y - 4);
  ctx.scale(2, 2);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.stroke(new Path2D("M12 13C9.4 10.4 6.4 9 3 8.6V18.6C6.4 19 9.4 20.2 12 22C14.6 20.2 17.6 19 21 18.6V8.6C17.6 9 14.6 10.4 12 13ZM12 13V22"));
  ctx.strokeStyle = C.accent;
  ctx.stroke(new Path2D("M12 1C12.6 3.7 13.3 4.4 16 5C13.3 5.6 12.6 6.3 12 9C11.4 6.3 10.7 5.6 8 5C10.7 4.4 11.4 3.7 12 1Z"));
  ctx.restore();
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `800 40px ${f}`;
  ctx.textBaseline = "middle";
  ctx.fillText("Trovio", x + 58, y + 24);
  ctx.restore();
}

/** Mã giả dạng ô vuông để gợi ý "quét/nhập link" — chỉ trang trí, không phải QR thật. */
function linkBadge(ctx: CanvasRenderingContext2D, x: number, y: number, url: string, f: string, dark: boolean) {
  ctx.save();
  ctx.fillStyle = dark ? "rgba(255,255,255,0.12)" : C.primary50;
  roundRect(ctx, x, y, 420, 76, 20);
  ctx.fill();
  ctx.fillStyle = dark ? C.white : C.primary;
  ctx.font = `700 30px ${f}`;
  ctx.textBaseline = "middle";
  ctx.fillText(url, x + 28, y + 39);
  ctx.restore();
}

export function drawRiasecCard(canvas: HTMLCanvasElement, d: RiasecCardData) {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;
  const f = fontFamily();
  ctx.fillStyle = C.navy;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  // trang trí
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = C.primary;
  ctx.beginPath();
  ctx.arc(900, 120, 380, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(80, 1300, 240, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  logo(ctx, 80, 80, C.white, f);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.primary200;
  ctx.font = `500 34px ${f}`;
  ctx.fillText(d.name ? `Mã sở thích của ${d.name}` : "Mã sở thích nghề nghiệp của mình", 80, 240);
  ctx.fillStyle = C.white;
  ctx.font = `800 150px ${f}`;
  ctx.fillText(d.code.join(" · "), 76, 400);
  ctx.fillStyle = C.accent;
  ctx.font = `700 38px ${f}`;
  ctx.fillText(d.labels.join(" · "), 80, 465);

  // thanh %
  let y = 560;
  for (const p of d.percents) {
    const top = d.code.includes(p.type);
    ctx.fillStyle = C.white;
    ctx.font = `800 32px ${f}`;
    ctx.fillText(p.type, 80, y + 10);
    ctx.fillStyle = C.primary200;
    ctx.font = `400 28px ${f}`;
    ctx.fillText(p.label, 124, y + 10);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    roundRect(ctx, 330, y - 10, 560, 22, 11);
    ctx.fill();
    ctx.fillStyle = top ? C.accent : C.primary200;
    roundRect(ctx, 330, y - 10, Math.max(22, (560 * p.value) / 100), 22, 11);
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.font = `700 28px ${f}`;
    ctx.fillText(`${p.value}%`, 912, y + 10);
    y += 62;
  }

  if (d.topMajors?.length) {
    ctx.fillStyle = C.primary200;
    ctx.font = `500 30px ${f}`;
    ctx.fillText("Ngành hợp nhất với mình", 80, y + 40);
    ctx.fillStyle = C.white;
    ctx.font = `700 40px ${f}`;
    wrap(ctx, d.topMajors.join(" · "), 80, y + 96, 920, 54, 2);
  }

  ctx.fillStyle = C.white;
  ctx.font = `700 38px ${f}`;
  ctx.fillText("Bạn hợp ngành gì?", 80, 1180);
  ctx.fillStyle = C.primary200;
  ctx.font = `400 28px ${f}`;
  ctx.fillText("Trắc nghiệm RIASEC miễn phí · không hỏi ngày sinh hay cung hoàng đạo", 80, 1226);
  linkBadge(ctx, 80, 1250, d.url, f, true);
}

const FIT_COLORS = {
  "an-toan": [C.success50, C.success700],
  "vua-suc": [C.primary50, C.primary],
  "thu-suc": [C.accent50, C.accent700],
} as const;

export function drawWishlistCard(canvas: HTMLCanvasElement, d: WishlistCardData) {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;
  const f = fontFamily();
  ctx.fillStyle = C.white;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = C.primary;
  ctx.fillRect(0, 0, CARD_W, 16);
  logo(ctx, 80, 72, C.primary, f);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.slate900;
  ctx.font = `800 56px ${f}`;
  ctx.fillText(d.name ? `Nguyện vọng dự kiến của ${d.name}` : "Nguyện vọng dự kiến của mình", 80, 230);
  ctx.fillStyle = C.slate500;
  ctx.font = `400 30px ${f}`;
  ctx.fillText(`${d.season}${d.method ? ` · ${d.method}` : ""}`, 80, 280);

  let y = 330;
  const shown = d.items.slice(0, 8);
  const rowH = shown.length > 6 ? 98 : 112;
  for (const it of shown) {
    ctx.fillStyle = "#f8fafc";
    roundRect(ctx, 80, y, 920, rowH - 14, 22);
    ctx.fill();
    ctx.fillStyle = C.primary;
    roundRect(ctx, 104, y + (rowH - 14) / 2 - 24, 86, 48, 12);
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.font = `800 26px ${f}`;
    ctx.textAlign = "center";
    ctx.fillText(`NV${it.nv}`, 147, y + (rowH - 14) / 2 + 9);
    ctx.textAlign = "left";
    ctx.fillStyle = C.slate900;
    ctx.font = `700 32px ${f}`;
    const maxW = it.fit ? 520 : 740;
    let title = it.program;
    while (ctx.measureText(title).width > maxW && title.length > 4) title = `${title.slice(0, -2)}…`;
    ctx.fillText(title, 214, y + (rowH - 14) / 2 - 6);
    ctx.fillStyle = C.slate500;
    ctx.font = `400 25px ${f}`;
    let sch = it.school;
    while (ctx.measureText(sch).width > maxW && sch.length > 4) sch = `${sch.slice(0, -2)}…`;
    ctx.fillText(sch, 214, y + (rowH - 14) / 2 + 30);
    if (it.fit) {
      const [bg, fg] = FIT_COLORS[it.fit.tone];
      ctx.font = `700 26px ${f}`;
      const w = ctx.measureText(it.fit.label).width + 40;
      ctx.fillStyle = bg;
      roundRect(ctx, 976 - w, y + (rowH - 14) / 2 - 24, w, 48, 24);
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.fillText(it.fit.label, 996 - w, y + (rowH - 14) / 2 + 9);
    }
    y += rowH;
  }
  if (d.items.length > shown.length) {
    ctx.fillStyle = C.slate500;
    ctx.font = `500 28px ${f}`;
    ctx.fillText(`+ ${d.items.length - shown.length} nguyện vọng khác`, 80, y + 20);
  }

  ctx.fillStyle = C.accent50;
  roundRect(ctx, 80, 1150, 920, 76, 20);
  ctx.fill();
  ctx.fillStyle = C.accent700;
  ctx.font = `600 27px ${f}`;
  ctx.fillText("Kế hoạch cá nhân, chưa phải đăng ký chính thức · dữ liệu minh hoạ", 108, 1198);
  linkBadge(ctx, 80, 1244, d.url, f, false);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}
