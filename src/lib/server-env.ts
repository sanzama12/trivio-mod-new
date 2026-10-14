import "server-only";

export interface ServerEnvironment {
  databaseUrl: string;
  appUrl: string;
}

let cached: ServerEnvironment | null = null;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`[config] Thiếu biến môi trường bắt buộc ${name}.`);
  return value;
}

/**
 * Đọc và kiểm tra cấu hình server tại thời điểm request đầu tiên.
 * Không chạy ở import-time để `next build` không cần kết nối database.
 */
export function serverEnvironment(): ServerEnvironment {
  if (cached) return cached;

  const databaseUrl = required("DATABASE_URL");
  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    throw new Error("[config] DATABASE_URL phải là PostgreSQL connection string.");
  }

  const appUrl = required("APP_URL");
  try {
    new URL(appUrl);
  } catch {
    throw new Error("[config] APP_URL không phải URL hợp lệ.");
  }

  cached = { databaseUrl, appUrl };
  return cached;
}

export function resetServerEnvironmentForTests(): void {
  cached = null;
}
