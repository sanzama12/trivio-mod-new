import type { OutcomeSurvey, QaQuestion, TeacherClass } from "../domain/types";

/**
 * DỮ LIỆU MINH HOẠ cho "Hỏi sinh viên thật" và "Khảo sát sau 1 năm" (chỉ tạo khi bật chế độ demo).
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

const mk = (programId: string, rows: [OutcomeSurvey["satisfaction"], OutcomeSurvey["chooseAgain"], OutcomeSurvey["trovioRight"], number][]): OutcomeSurvey[] =>
  rows.flatMap(([satisfaction, chooseAgain, trovioRight, n], i) =>
    Array.from({ length: n }, (_, k) => ({
      id: `os-demo-${programId}-${i}-${k}`,
      programId,
      userId: null,
      satisfaction,
      chooseAgain,
      trovioRight,
      wish: i === 0 && k === 0 ? "Năm nhất nhiều môn đại cương, chưa học chuyên ngành ngay." : "",
      cohort: 2025,
      createdAt: "2026-09-15T00:00:00.000Z",
      demo: true,
    })),
  );

export const seedOutcomeSurveys: OutcomeSurvey[] = [
  // 56 phản hồi: 82% hài lòng, 77% chọn lại ngành, 68% thấy gợi ý đúng (khớp khung Figma C4).
  ...mk("neu-marketing", [
    [5, "yes", "yes", 14],
    [4, "yes", "yes", 20],
    [4, "yes", "unsure", 9],
    [4, "unsure", "yes", 3],
    [3, "unsure", "yes", 1],
    [3, "no", "no", 5],
    [2, "no", "no", 4],
  ]),
  ...mk("hust-cong-nghe-thong-tin", [
    [5, "yes", "yes", 9],
    [4, "yes", "unsure", 8],
    [3, "unsure", "unsure", 4],
    [2, "no", "no", 2],
  ]),
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
