import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export interface ApiMeta {
  requestId: string;
  [key: string]: unknown;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export function apiOk<T>(data: T, options?: { status?: number; meta?: Record<string, unknown>; requestId?: string }) {
  const requestId = options?.requestId ?? randomUUID();
  return NextResponse.json(
    { data, meta: { requestId, ...options?.meta } satisfies ApiMeta },
    { status: options?.status ?? 200, headers: { "X-Request-Id": requestId } },
  );
}

export function apiError(
  status: number,
  code: string,
  message: string,
  options?: { details?: ApiErrorDetail[]; requestId?: string },
) {
  const requestId = options?.requestId ?? randomUUID();
  return NextResponse.json(
    { error: { code, message, details: options?.details ?? [], requestId } },
    { status, headers: { "X-Request-Id": requestId } },
  );
}

export async function withApiErrors(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    console.error("[api] unhandled error", error);
    const databaseError = error instanceof Error && /DATABASE_URL|PostgreSQL|database|CSDL|ECONN/i.test(error.message);
    return databaseError
      ? apiError(503, "DATABASE_UNAVAILABLE", "Cơ sở dữ liệu tạm thời chưa sẵn sàng.")
      : apiError(500, "INTERNAL_ERROR", "Máy chủ gặp lỗi không dự kiến.");
  }
}
