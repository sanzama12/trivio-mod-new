import { jsonBody } from "@/lib/http";
import { apiError, apiOk, withApiErrors } from "@/lib/api-response";
import { sanitizeRiasecResult } from "@/services/riasec.service";
import { getRiasecMajorSuggestions } from "@/services/riasec-major-suggestion.service";

const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  return withApiErrors(async () => {
    const { body, error } = await jsonBody<{ result?: unknown }>(request, 8 * 1024);
    if (error) return error;
    const result = sanitizeRiasecResult(body?.result);
    if (!result) {
      const response = apiError(400, "VALIDATION_ERROR", "Kết quả trắc nghiệm không hợp lệ.");
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
    return apiOk(await getRiasecMajorSuggestions(result), { headers });
  });
}
