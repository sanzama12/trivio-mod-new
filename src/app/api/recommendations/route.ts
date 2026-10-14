import { RecommendationController } from "@/controllers";

/**
 * POST /api/recommendations — gợi ý "Dành cho bạn".
 * Ủy quyền trực tiếp cho RecommendationController (MVC Architecture).
 */
export async function POST(req: Request) {
  return RecommendationController.getRecommendations(req);
}

