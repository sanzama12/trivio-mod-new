import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonBody } from "@/lib/http";
import { rulesService } from "@/services/rules.service";

/** { kind: "weights", weights } | { kind: "rule", action, ruleKind (khi tạo), ... } | { kind: "simulate", weights, code, score, combo, budget, region, includeDrafts } */
export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const parsed = await jsonBody<Record<string, unknown>>(req, 8 * 1024);
  if (parsed.error) return parsed.error;
  const b = parsed.body ?? {};
  if (b.kind === "simulate") return NextResponse.json({ ok: true, ...(await rulesService.simulate(b)) });
  const res = b.kind === "weights" ? await rulesService.saveWeights(user, b.weights) : b.kind === "rule" ? await rulesService.ruleAction(user, { ...b, kind: b.ruleKind }) : ({ ok: false, status: 400, message: "Thao tác không hợp lệ." } as const);
  return NextResponse.json(res, { status: res.ok ? 200 : res.status });
}
