import { AccountController } from "@/controllers/account.controller";

/** GET /api/account — uỷ quyền AccountController */
export async function GET() {
  return AccountController.getProfile();
}

/** PATCH /api/account — uỷ quyền AccountController */
export async function PATCH(req: Request) {
  return AccountController.patchProfile(req);
}

/** DELETE /api/account — uỷ quyền AccountController */
export async function DELETE() {
  return AccountController.deleteAccount();
}
