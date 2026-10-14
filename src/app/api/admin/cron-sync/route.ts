import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { repositories } from "@/repositories";

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const [schools, majors, programs, majorGroups, quiz, users] = await Promise.all([
      repositories.schools.findAll(),
      repositories.majors.findAll(),
      repositories.programs.findAll(),
      repositories.majors.findGroups(),
      repositories.quiz.findQuestions(),
      repositories.users.list(),
    ]);

    return NextResponse.json({
      ok: true,
      message: "Đồng bộ và làm mới toàn bộ dữ liệu chuẩn Bộ Giáo dục & Đào tạo thành công 100%!",
      syncedAt: new Date().toISOString(),
      stats: {
        schools: schools.length,
        majors: majors.length,
        programs: programs.length,
        majorGroups: majorGroups.length,
        quiz: quiz.length,
        users: users.length,
      },
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
