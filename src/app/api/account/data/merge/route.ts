import { AccountController } from "@/controllers/account.controller";

/** POST /api/account/data/merge — uỷ quyền AccountController */
export async function POST(req: Request) {
  return AccountController.mergeData(req);
}
