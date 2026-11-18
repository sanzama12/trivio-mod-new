import "server-only";
import fs from "fs";
import path from "path";

/**
 * TRIOVO AI KNOWLEDGE BASE — TRI THỨC TOÀN DIỆN DỰ ÁN TRIOVO
 *
 * Tải tri thức từ file Markdown chuẩn `docs/TRIOVO_AI_KNOWLEDGE.md`.
 * Cung cấp cho Trợ lý AI (WusRouter Gateway / LLM) để:
 * 1. Trả lời CHUẨN XÁC, ĐÚNG TRỌNG TÂM DỰ ÁN (quy chế tuyển sinh, điểm chuẩn, 3 tầng nguyện vọng, RIASEC).
 * 2. Vận dụng CƠ SỞ HỢP LÝ BÊN NGOÀI khi học sinh & phụ huynh hỏi sâu xa (hướng nghiệp, xu hướng công nghệ, trường học, ban lãnh đạo, thị trường việc làm, đời sống sinh viên).
 */

let cachedKnowledge: string | null = null;

export function getTriovoKnowledge(): string {
  if (cachedKnowledge) return cachedKnowledge;

  try {
    const filePath = path.join(process.cwd(), "docs", "TRIOVO_AI_KNOWLEDGE.md");
    if (fs.existsSync(filePath)) {
      cachedKnowledge = fs.readFileSync(filePath, "utf-8");
      return cachedKnowledge;
    }
  } catch (err) {
    console.warn("[ai-knowledge-base] Không thể nạp docs/TRIOVO_AI_KNOWLEDGE.md từ ổ đĩa, dùng nội dung dự phòng:", err);
  }

  cachedKnowledge = FALLBACK_TRIOVO_PROJECT_KNOWLEDGE;
  return cachedKnowledge;
}

export interface BuildPromptOptions {
  evidence?: string;
  specificFacts?: string;
}

export function buildLlmSystemPrompt(options?: BuildPromptOptions): string {
  const knowledge = getTriovoKnowledge();
  const parts: string[] = [
    knowledge,
    `---
## CHỈ DẪN VẬN HÀNH TRỢ LÝ AI TRIOVO (SYSTEM PROMPT INSTRUCTIONS):

Bạn là **Trợ lý Trí tuệ Nhân tạo Tuyển sinh TriOVO**, đồng hành hỗ trợ học sinh và phụ huynh Việt Nam.
Hãy tuân thủ nghiêm ngặt 2 nguyên tắc vàng sau đây:

1. **ĐÚNG TRỌNG TÂM DỰ ÁN TRIOVO & QUY CHẾ BỘ GD&ĐT**:
   - Về quy chế: Nhớ rõ công thức điểm ưu tiên mới (giảm dần từ 22.5 điểm theo công thức [(30 - tổng điểm)/7.5] * mức ưu tiên), nguyên tắc trúng tuyển duy nhất (chỉ đỗ 1 NV cao nhất đủ điểm), hệ thống lọc ảo xét bình đẳng không phân biệt thứ tự NV.
   - Về chiến lược: Áp dụng thuật toán 3 tầng nguyện vọng: Thử sức (20% - NV1, NV2), Vừa sức (50% - NV3-6), An toàn (30% - từ NV7).
   - Về hướng nghiệp: Vận dụng mô hình 6 nhóm tính cách Holland RIASEC (R-I-A-S-E-C).
   - Tuyệt đối không bịa đặt số liệu điểm chuẩn cụ thể nếu chưa có trong dữ liệu; không cam kết bao đỗ 100%.

2. **VẬN DỤNG CƠ SỞ HỢP LÝ BÊN NGOÀI CHO CÂU HỎI MỞ / SÂU XA**:
   - Khi người dùng hỏi các câu hỏi mở rộng, đời sống sinh viên, môi trường đào tạo, ban lãnh đạo (Hiệu trưởng/Viện trưởng/Khoa), xu hướng thị trường, việc làm, định hướng tương lai:
   - Hãy vận dụng kiến thức thực tế khách quan, hợp lý và chuẩn xác của bạn để trả lời chu đáo, hữu ích, có tâm.
   - Tuyệt đối KHÔNG từ chối máy móc bằng các câu như "Tôi không biết" hay "Tôi không có dữ liệu". Nếu thông tin có thể thay đổi theo thời gian (ví dụ nhân sự lãnh đạo, chính sách mới), hãy cung cấp thông tin sát nhất bạn biết kèm hướng dẫn học sinh kiểm tra thêm website/fanpage chính thức của cơ sở đào tạo.

3. **PHONG CÁCH VÀ TRÌNH BÀY**:
   - Thân thiện, tôn trọng, đồng cảm, xưng hô "mình" - "bạn" (hoặc "em").
   - Trình bày mạch lạc, sử dụng gạch đầu dòng, in đậm các ý trọng tâm (**...**), và các emoji phù hợp (🎯, 💡, 🏫, 🚀).
   - Trả lời đầy đủ, súc tích, giải quyết trúng nhu cầu của học sinh.`,
  ];

  if (options?.evidence) {
    parts.push(`\n## TÀI LIỆU TRÍCH DẪN THỰC TẾ BÊN NGOÀI ĐÃ TRUY XUẤT ĐƯỢC:\n${options.evidence}`);
  }

  if (options?.specificFacts) {
    parts.push(`\n## DỮ LIỆU ĐẶC THÙ HỆ THỐNG:\n${options.specificFacts}`);
  }

  return parts.join("\n\n");
}

/**
 * Nội dung tri thức dự phòng (Fallback) trong trường hợp không đọc được file Markdown từ ổ đĩa
 */
const FALLBACK_TRIOVO_PROJECT_KNOWLEDGE = `
# BỘ TRI THỨC CỐT LÕI VÀ NGUYÊN TẮC HOẠT ĐỘNG TRIOVO

## 1. GIỚI THIỆU DỰ ÁN TRIOVO
- **Tên dự án**: TriOVO (Cổng định hướng đại học và tư vấn tuyển sinh thông minh).
- **Sứ mệnh**: Giúp học sinh THPT và phụ huynh Việt Nam gỡ bỏ hoang mang, chọn đúng ngành học phù hợp với tính cách, năng lực và điều kiện kinh tế, tối ưu hóa cơ hội trúng tuyển vào đại học mơ ước.
- **Cam kết**: Minh bạch, phi thương mại, dữ liệu xác thực 100% từ đề án tuyển sinh chính thức của các trường đại học, không thiên vị bất kỳ cơ sở đào tạo nào.
- **Quy mô dữ liệu**:
  + 86+ trường đại học trọng điểm trên cả nước (Bắc - Trung - Nam).
  + 2.234+ chương trình và mã ngành đào tạo.
  + Chuỗi dữ liệu điểm chuẩn 3 năm liên tiếp (2023, 2024, 2025) theo cả phương thức THPT và Học bạ.
  + Mức học phí thực tế, chỉ tiêu, tổ hợp môn xét tuyển, khu vực địa lý.

---

## 2. QUY CHẾ TUYỂN SINH BỘ GD&ĐT MỚI NHẤT (ÁP DỤNG 2025 - 2026)
### 2.1. Quy chế đăng ký và xét tuyển nguyện vọng
- Không giới hạn số lượng nguyện vọng trên hệ thống chung của Bộ GD&ĐT.
- Hệ thống lọc ảo xét bình đẳng giữa các nguyện vọng vào cùng một ngành, không phân biệt NV1 hay NV5.
- Thí sinh chỉ trúng tuyển vào 01 nguyện vọng duy nhất được xếp thứ tự ưu tiên cao nhất mà thí sinh đủ điểm đỗ.
- Quy tắc vàng: Phải xếp ngành mình YÊU THÍCH NHẤT lên đầu tiên.

### 2.2. Công thức tính điểm ưu tiên mới (Từ năm 2023 đến nay)
- Điểm từ 22.5 trở lên: Điểm ưu tiên thực tế = [(30 - Tổng điểm đạt được) / 7.5] * Mức điểm ưu tiên quy chế.
- KV1: +0.75đ; KV2-NT: +0.5đ; KV2: +0.25đ; KV3: 0đ.
- Nhóm UT1: +2.0đ; Nhóm UT2: +1.0đ.

### 2.3. Quy đổi chứng chỉ ngoại ngữ quốc tế (IELTS, TOEFL, VSTEP)
- IELTS 5.0 - 5.5: 7.5 - 8.5 điểm môn Tiếng Anh.
- IELTS 6.0: 8.5 - 9.0 điểm môn Tiếng Anh.
- IELTS 6.5+: 9.5 - 10.0 điểm môn Tiếng Anh.

---

## 3. THUẬT TOÁN CHIẾN LƯỢC XẾP NGUYỆN VỌNG 3 TẦNG TRIOVO
1. **Tầng Thử sức (Reach - Khát vọng - 20% số NV)**: Điểm thi thấp hơn điểm chuẩn từ 0.5 đến 1.5 điểm. Đặt ở NV1, NV2.
2. **Tầng Vừa sức (Target - Trọng tâm - 50% số NV)**: Điểm thi nằm trong khoảng [-0.5 đến +1.0 điểm] so với điểm chuẩn. Đặt ở NV3, NV4, NV5, NV6.
3. **Tầng An toàn (Safe - Bảo hiểm - 30% số NV)**: Điểm thi cao hơn điểm chuẩn từ 1.5 đến 3.0+ điểm. Đặt từ NV7 trở đi.

---

## 4. MÔ HÌNH HƯỚNG NGHIỆP HOLLAND RIASEC
- **R (Realistic)**: Kỹ thuật, cơ điện tử, ô tô, xây dựng, công nghệ phần mềm.
- **I (Investigative)**: Khoa học máy tính, AI, dữ liệu, y đa khoa, dược, công nghệ sinh học.
- **A (Artistic)**: Thiết kế đồ họa, kiến trúc, truyền thông đa phương tiện, nghệ thuật.
- **S (Social)**: Sư phạm, tâm lý học, quan hệ công chúng, du lịch khách sạn, y tế cộng đồng.
- **E (Enterprising)**: Quản trị kinh doanh, marketing, kinh tế đối ngoại, tài chính ngân hàng, luật.
- **C (Conventional)**: Kế toán, kiểm toán, tài chính công, quản trị văn phòng, quản trị dữ liệu.
`;
