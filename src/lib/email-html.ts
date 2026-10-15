const ALLOWED_TAGS = new Set([
  "a", "b", "blockquote", "br", "div", "em", "font", "h1", "h2", "h3", "hr", "i", "li", "ol", "p",
  "s", "span", "strike", "strong", "table", "tbody", "td", "th", "thead", "tr", "u", "ul",
]);

const VOID_TAGS = new Set(["br", "hr"]);
const SAFE_FONTS = new Map([
  ["arial", "Arial"],
  ["calibri", "Calibri"],
  ["georgia", "Georgia"],
  ["roboto", "Roboto"],
  ["tahoma", "Tahoma"],
  ["times new roman", "Times New Roman"],
  ["verdana", "Verdana"],
]);
const SAFE_COLORS = new Set(["black", "white", "red", "blue", "green", "navy", "gray", "grey", "orange", "purple", "yellow"]);

function attribute(source: string, name: string): string | undefined {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(source);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function safeColor(value: string): string | null {
  const color = value.trim().toLowerCase();
  if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/.test(color) || /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/.test(color) || SAFE_COLORS.has(color)) return color;
  return null;
}

function safeStyle(value: string): string {
  const output: string[] = [];
  for (const declaration of value.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 1) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const rawValue = declaration.slice(separator + 1).trim();
    if (!rawValue || /(?:url|expression|@import|javascript|data:|var\s*\()/i.test(rawValue)) continue;

    if (property === "font-family") {
      const firstFont = rawValue.split(",")[0].replace(/["']/g, "").trim().toLowerCase();
      const font = SAFE_FONTS.get(firstFont);
      if (font) output.push(`font-family:${font.includes(" ") ? `'${font}'` : font}`);
    } else if (property === "font-size" && /^(?:10|11|12|14|16|18|20|24|28|32|36)(?:px|pt)$/.test(rawValue)) {
      output.push(`font-size:${rawValue}`);
    } else if ((property === "color" || property === "background-color") && safeColor(rawValue)) {
      output.push(`${property}:${safeColor(rawValue)}`);
    } else if (property === "text-align" && /^(?:left|center|right|justify)$/.test(rawValue)) {
      output.push(`${property}:${rawValue}`);
    } else if (property === "font-weight" && /^(?:normal|bold|400|600|700)$/.test(rawValue)) {
      output.push(`${property}:${rawValue}`);
    } else if (property === "font-style" && /^(?:normal|italic)$/.test(rawValue)) {
      output.push(`${property}:${rawValue}`);
    } else if (property === "text-decoration" && /^(?:(?:none|underline|line-through)\s*){1,2}$/.test(rawValue)) {
      output.push(`${property}:${rawValue}`);
    } else if (property === "border-collapse" && rawValue === "collapse") {
      output.push("border-collapse:collapse");
    } else if (property === "width" && /^(?:100|[1-9]?\d)%$/.test(rawValue)) {
      output.push(`${property}:${rawValue}`);
    } else if (property === "border" && /^(?:1|2)px solid #[0-9a-f]{3,6}$/i.test(rawValue)) {
      output.push(`${property}:${rawValue.toLowerCase()}`);
    } else if (property === "padding" && /^(?:[0-9]|1[0-6])px$/.test(rawValue)) {
      output.push(`${property}:${rawValue}`);
    } else if (property === "vertical-align" && /^(?:top|middle|bottom)$/.test(rawValue)) {
      output.push(`${property}:${rawValue}`);
    }
  }
  return output.join(";");
}

function safeHref(value: string): string | null {
  const href = value.trim().replace(/[\u0000-\u001F\u007F\s]+/g, "");
  return /^(?:https?:\/\/|mailto:)/i.test(href) ? href.replace(/"/g, "%22") : null;
}

function safeText(value: string): string {
  return value
    .replace(/&(?!(?:amp|lt|gt|quot|#39|nbsp|#\d+|#x[0-9a-f]+);)/gi, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Làm sạch HTML do trình soạn email hoặc Word tạo ra theo danh sách cho phép nghiêm ngặt. */
export function sanitizeLeadEmailHtml(input: string): string {
  const withoutDangerousBlocks = String(input ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|style|iframe|object|embed|svg|math|form|button|textarea|select)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  const tokens = withoutDangerousBlocks.split(/(<[^>]*>)/g);
  return tokens.map((token) => {
    if (!token.startsWith("<")) return safeText(token);
    const parsed = /^<\s*(\/)?\s*([a-z0-9]+)\b([^>]*)>$/i.exec(token);
    if (!parsed) return safeText(token);
    const closing = Boolean(parsed[1]);
    const tag = parsed[2].toLowerCase();
    const attrs = parsed[3];
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (closing) return VOID_TAGS.has(tag) ? "" : `</${tag}>`;

    const safeAttrs: string[] = [];
    const style = safeStyle(attribute(attrs, "style") ?? "");
    if (style) safeAttrs.push(`style="${style}"`);

    if (["div", "h1", "h2", "h3", "p", "td", "th"].includes(tag)) {
      const align = attribute(attrs, "align")?.toLowerCase();
      if (align && /^(?:left|center|right|justify)$/.test(align)) safeAttrs.push(`align="${align}"`);
    }
    if (tag === "font") {
      const face = attribute(attrs, "face")?.replace(/["']/g, "").trim().toLowerCase();
      const font = face ? SAFE_FONTS.get(face) : undefined;
      const size = attribute(attrs, "size");
      const color = safeColor(attribute(attrs, "color") ?? "");
      if (font) safeAttrs.push(`face="${font}"`);
      if (size && /^[1-7]$/.test(size)) safeAttrs.push(`size="${size}"`);
      if (color) safeAttrs.push(`color="${color}"`);
    }
    if (tag === "a") {
      const href = safeHref(attribute(attrs, "href") ?? "");
      if (href) safeAttrs.push(`href="${href}"`, 'target="_blank"', 'rel="noopener noreferrer"');
    }
    if (tag === "td" || tag === "th") {
      for (const name of ["colspan", "rowspan"] as const) {
        const span = attribute(attrs, name);
        if (span && /^(?:[1-9]|1\d|20)$/.test(span)) safeAttrs.push(`${name}="${span}"`);
      }
    }

    return `<${tag}${safeAttrs.length ? ` ${safeAttrs.join(" ")}` : ""}>`;
  }).join("").trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Math.min(Number(code), 0x10ffff)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Math.min(Number.parseInt(code, 16), 0x10ffff)));
}

/** Tạo bản text dự phòng để email vẫn đọc được khi ứng dụng khách chặn HTML. */
export function leadEmailHtmlToText(input: string): string {
  return decodeEntities(sanitizeLeadEmailHtml(input)
    .replace(/<br\s*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<\/td>/gi, "\t")
    .replace(/<\/(?:blockquote|div|h1|h2|h3|p|tr|table|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
