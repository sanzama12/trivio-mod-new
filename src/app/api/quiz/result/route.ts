import { NextResponse } from "next/server";
import { riasecService, type QuizAnswers } from "@/services";
import { jsonBody } from "@/lib/http";

/** POST /api/quiz/result { answers: { [questionId]: 1..5 } } */
export async function POST(req: Request) {
  const { body, error } = await jsonBody<{ answers?: unknown }>(req, 16 * 1024);
  if (error) return error;
  const raw = body?.answers;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  // Chỉ giữ cặp (id số, giá trị 1..5).
  const answers: QuizAnswers = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const id = Number(k);
    if (Number.isInteger(id) && typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5) answers[id] = v;
  }
  const result = await riasecService.evaluate(answers);
  if (result.answered < 60) {
    return NextResponse.json({ error: "incomplete", answered: result.answered }, { status: 422 });
  }
  const majors = await riasecService.recommendMajors(result);
  return NextResponse.json({ result, majors });
}
