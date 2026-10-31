import { ChatbotController } from "@/controllers";

/**
 * POST /api/chat { message, context: { majorId?, schoolId?, riasec? } }
 * Ủy quyền trực tiếp cho ChatbotController (MVC Architecture).
 */
export async function POST(req: Request) {
  return ChatbotController.handleChat(req);
}

export async function GET() {
  return ChatbotController.history();
}

export async function DELETE(req: Request) {
  return ChatbotController.deleteHistory(req);
}
