import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

import { adminService } from '@/services/admin.service';

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const stats = await adminService.getCatalogSyncStats();

    return NextResponse.json({
      ok: true,
      message: "Đồng bộ và làm mới toàn bộ dữ liệu chuẩn Bộ Giáo dục & Đào tạo thành công 100%!",
      syncedAt: new Date().toISOString(),
      stats,
    });
  } catch (err: any) {
    console.error("Lỗi khi chạy Cron Sync MOET:", err);
    return NextResponse.json(
      {
        ok: false,
        message: `Lỗi khi đồng bộ dữ liệu: ${err?.message || "Lỗi không xác định"}`,
      },
      { status: 500 }
    );
  }
}
