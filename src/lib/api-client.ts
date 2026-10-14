export interface ApiEnvelope<T> {
  data: T;
  meta: { requestId: string; [key: string]: unknown };
}

export interface ApiFailure {
  error: {
    code: string;
    message: string;
    details: { field?: string; message: string }[];
    requestId: string;
  };
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/** Client HTTP duy nhất cho View/Client Component. */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(path, {
    ...init,
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | ApiFailure | null;
  if (!response.ok || !payload || "error" in payload) {
    const failure = payload && "error" in payload ? payload.error : null;
    throw new ApiClientError(response.status, failure?.code ?? "INVALID_RESPONSE", failure?.message ?? "API trả về dữ liệu không hợp lệ.", failure?.requestId);
  }
  return payload;
}
