import { ChatbotController } from "@/controllers";

export const dynamic = "force-dynamic";

export async function GET() {
  return ChatbotController.quota();
}
