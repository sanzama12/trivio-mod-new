import { AccountController } from "@/controllers/account.controller";

/** GET /api/account/data — uỷ quyền AccountController */
export async function GET() {
  return AccountController.getData();
}

/** PUT /api/account/data — uỷ quyền AccountController */
export async function PUT(req: Request) {
  return AccountController.putData(req);
}
