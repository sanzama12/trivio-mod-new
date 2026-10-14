import { AuthController } from "@/controllers";

export async function POST() {
  return AuthController.logout();
}

