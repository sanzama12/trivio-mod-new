import { ChatbotController } from "@/controllers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/chat accepts JSON text or multipart message + image.
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
