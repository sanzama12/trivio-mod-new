import type { QaQuestion, TeacherClass } from "@/domain/types";

/**
 * DỮ LIỆU MINH HOẠ cho hỏi đáp sinh viên (chỉ tạo khi bật chế độ demo).
 * Giao diện gắn nhãn "Minh hoạ" — không phải ý kiến của người thật.
 */
export const seedQuestions: QaQuestion[] = [
  {
    id: "qa-demo-01",
    programId: "neu-marketing",
    userId: null,
    text: "Năm nhất có phải học nhiều Toán không ạ? Em học D01 hơi yếu Toán.",
    createdAt: "2026-09-20T08:00:00.000Z",
    status: "approved",
    demo: true,
    answers: [
      {
        id: "qa-demo-01-a1",
        userId: "u-004",
        displayName: "Linh L.",
        schoolDomain: "st.neu.edu.vn",
        text: "Có 2 môn Toán cao cấp và Xác suất thống kê ở năm 1, mức vừa phải. Thầy cô cho bài tập nhóm nhiều hơn là tính toán khó — bạn yên tâm nhé.",
        createdAt: "2026-09-21T10:00:00.000Z",
        status: "approved",
        helpful: 24,
      },
    ],
  },
  {
    id: "qa-demo-02",
    programId: "neu-marketing",
    userId: null,
    text: "Sinh viên Marketing có được đi thực tập từ năm mấy ạ?",
    createdAt: "2026-09-25T08:00:00.000Z",
    status: "approved",
    demo: true,
    answers: [
      {
        id: "qa-demo-02-a1",
        userId: "u-004",
        displayName: "Linh L.",
        schoolDomain: "st.neu.edu.vn",
        text: "Chính thức là kỳ thực tập năm 4, nhưng từ năm 2 nhiều bạn đã làm cộng tác viên ở agency. Câu lạc bộ của khoa hay giới thiệu chỗ.",
        createdAt: "2026-09-26T09:00:00.000Z",
        status: "approved",
        helpful: 11,
      },
    ],
  },
];

/** Chương trình có huy hiệu "Trường đã xác nhận" mẫu trong bản demo (id, ngày xác nhận). */
export const DEMO_SCHOOL_VERIFIED: [string, string][] = [
  ["neu-marketing", "2026-09-15"],
  ["hust-cong-nghe-thong-tin", "2026-08-28"],
];

/** Lớp mẫu của giáo viên demo (u-003), mã mời DEMO12 — học sinh demo u-001 đã tham gia. */
export const seedClasses: TeacherClass[] = [
  { id: "cls-demo-12a1", teacherId: "u-003", name: "12A1 (minh hoạ)", school: "THPT Trovio", code: "DEMO12", createdAt: "2026-09-05T08:00:00.000Z", memberIds: ["u-001"], lastRemindAt: null },
];
