import { AuthController } from "@/controllers";

export async function POST(req: Request) {
  return AuthController.login(req);
}

