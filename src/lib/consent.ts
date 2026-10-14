/** Đồng ý cookie thống kê (lưu trên trình duyệt). null = chưa chọn → chưa gửi sự kiện thống kê. */
export const CONSENT_KEY = "trovio:consent";

export function readConsent(): boolean | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { analytics?: unknown };
    return typeof v.analytics === "boolean" ? v.analytics : null;
  } catch {
    return null;
  }
}

export function writeConsent(analytics: boolean) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ analytics, at: new Date().toISOString() }));
  } catch {
    /* trình duyệt chặn bộ nhớ: coi như chưa đồng ý */
  }
}

export const hasAnalyticsConsent = () => readConsent() === true;
