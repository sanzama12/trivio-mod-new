/**
 * CONTROLLER LAYER (MVC Architecture) — QuizController
 * Điều phối trắc nghiệm sở thích RIASEC, trả về danh sách câu hỏi và tính toán ngành phù hợp.
 */
import { NextResponse } from "next/server";
import { riasecService, sanitizeRiasec, type QuizAnswers } from "../services";
import { jsonBody } from "../lib/http";

export class QuizController {
  /**
   * GET /api/quiz/questions — Lấy danh sách 54 câu hỏi trắc nghiệm RIASEC
   */
  static async getQuestions(): Promise<Response> {
    const questions = await riasecService.getQuestions();
    return NextResponse.json({ questions });
  }

  /**
   * POST /api/quiz/evaluate — Chấm điểm bài làm và tính chỉ số phân hóa
   */
  static async evaluateQuiz(req: Request): Promise<Response> {
    const { body, error } = await jsonBody<QuizAnswers>(req, 16 * 1024);
    if (error) return error;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    const result = await riasecService.evaluate(body);
    return NextResponse.json({ result });
  }

  /**
   * POST /api/quiz/recommend — Gợi ý ngành dựa trên kết quả RIASEC
   */
  static async recommendMajors(req: Request): Promise<Response> {
    const { body, error } = await jsonBody(req, 8 * 1024);
    if (error) return error;
    const riasec = sanitizeRiasec(body);
    if (!riasec) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    const majors = await riasecService.recommendMajors(riasec);
    return NextResponse.json({ majors });
  }
}
