/** Format whole VND amounts while keeping the input as decimal digits. */
export function formatVndInput(value: string): string {
  if (value.includes(",")) return value.replace(/[^\d.,]/g, "");
  const digits = value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function parseVndInput(value: string): number {
  const grouped = value.replace(/\.+$/, "");
  if (!/^(?:\d{1,3}(?:\.\d{3})*|\d+)$/.test(grouped)) return NaN;
  return Number(grouped.replaceAll(".", ""));
}
