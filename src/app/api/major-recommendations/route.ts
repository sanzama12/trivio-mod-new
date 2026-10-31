import { RecommendationController } from '@/controllers/recommendation.controller';

export async function POST(req: Request) {
  return RecommendationController.getMajorRecommendations(req);
}
