import { type NextRequest } from "next/server";
import { ProgramController } from "@/controllers";

/**
 * GET /api/programs
 * Ủy quyền trực tiếp cho ProgramController (MVC Architecture).
 */
export async function GET(req: NextRequest) {
  return ProgramController.searchPrograms(req);
}

