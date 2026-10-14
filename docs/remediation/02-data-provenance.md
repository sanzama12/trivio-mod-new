# BÁO CÁO NGUỒN GỐC DỮ LIỆU & QUẢN TRỊ MINH BẠCH (DATA PROVENANCE & GOVERNANCE)

> **Mã tài liệu**: `docs/remediation/02-data-provenance.md`  
> **Thời điểm nghiệp vụ**: 2026-10-11  
> **Trách nhiệm**: Data Governance Lead & Security Reviewer  

---

## 1. HIỆN TRẠNG DỮ LIỆU TRƯỚC KHI KHẮC PHỤC

Khảo sát toàn bộ cơ sở dữ liệu danh mục đào tạo (~247 chương trình) đã phát hiện các rủi ro quản trị nghiêm trọng:
1. **Nguồn chung chung / Vô căn cứ**: Hàng trăm bản ghi chỉ mang chuỗi text `source: "Dữ liệu tổng hợp 2025/2026"`, không có liên kết nguồn gốc (`sourceUrl: null`), không thể kiểm chứng tính xác thực.
2. **Ngộ nhận trạng thái Verified**: Chỉ cần trường `source` có nội dung bất kỳ, hệ thống đã xem là "có nguồn". Thao tác `bulkVerify` trước đây cho phép duyệt toàn bộ bản ghi mà không kiểm tra URL nguồn hợp lệ.
3. **Fallback giao diện gây hiểu lầm nghiêm trọng**:
   - Khi một chương trình chưa công bố hoặc thiếu dữ liệu điểm chuẩn (null), các màn hình [`nhe/page.tsx`](file:///C:/Users/Admin/Videos/trovio-web/trovio-web/src/app/nhe/page.tsx), [`program-card.tsx`](file:///C:/Users/Admin/Videos/trovio-web/trovio-web/src/components/program/program-card.tsx), [`saved-view.tsx`](file:///C:/Users/Admin/Videos/trovio-web/trovio-web/src/components/program/saved-view.tsx), trang chi tiết chương trình [`chuong-trinh/[slug]/page.tsx`](file:///C:/Users/Admin/Videos/trovio-web/trovio-web/src/app/(site)/chuong-trinh/[slug]/page.tsx) và chatbot đã tự động gán nhãn: **"Xét học bạ"** hoặc **"Xét học bạ / IELTS"**.
   - Hậu quả: Thí sinh và phụ huynh hiểu lầm rằng ngành đó xét tuyển bằng học bạ, trong khi thực tế trường chỉ xét điểm thi THPT hoặc chưa công bố đề án.
4. **Điểm phương thức thay thế phần lớn là ước tính**: Điểm ĐGNL/ĐGTD phần lớn suy diễn thô từ điểm THPT kèm cờ `estimated: true` nhưng khi gợi ý lại đối xử như điểm công bố chính thức.
5. **Dữ liệu TSA (Đánh giá tư duy Bách Khoa) bị thiếu hụt**: Thiếu xuyên suốt từ type, model đến giao diện người dùng.

---

## 2. THIẾT KẾ DATA PROVENANCE THEO TRƯỜNG DỮ LIỆU

Hệ thống đã triển khai cấu trúc nguồn gốc dữ liệu hạt nhân (Field-level Data Provenance) cho mọi trường dữ liệu nhạy cảm:

```typescript
export interface FieldProvenance<T> {
  value: T;
  sourceType: "official" | "secondary" | "estimated" | "demo" | "user_provided";
  sourceUrl: string | null;
  documentTitle: string | null;
  issuer: string | null;
  publishedAt: string | null;
  accessedAt: string | null;
  effectiveSeason: number;
  verificationStatus: "unverified" | "pending" | "verified" | "rejected" | "expired";
  verifiedAt: string | null;
  verifiedBy: string | null;
  validUntil: string | null;
  evidenceNote: string | null;
  methodology?: string; // Bắt buộc giải trình thuật toán nếu là giá trị ước tính
}
```

### Các nguyên tắc quản trị bắt buộc:
1. **Chuỗi `source` không cấu thành bằng chứng**: Không được dựa vào trường text tự do để xác nhận tính chính thức.
2. **Quy định ngặt nghèo cho `bulkVerify`**:
   - Phải có `sourceUrl` bắt đầu bằng giao thức an toàn `https://`, HOẶC
   - Có chứng thực số từ cổng thông tin cán bộ tuyển sinh của trường (`schoolVerifiedAt`), HOẶC
   - Nguồn văn bản là đề án tuyển sinh chính thức (`Đề án tuyển sinh...`).
   - Nếu thiếu các điều kiện trên, hệ thống đếm vào `skipped` và từ chối nâng cấp trạng thái.
3. **Gỡ bỏ hoàn toàn Fallback sai lệch trên UI**:
   - Mọi vị trí biến `cutoff == null` thành "Xét học bạ" đã được thay thế bằng nhãn trung thực: **`"Chưa có dữ liệu chính thức"`**.
   - Chatbot không tự suy diễn phương thức học bạ khi thiếu điểm chuẩn.

---

## 3. PHÂN BIỆT RÕ RÀNG TRẠNG THÁI DỮ LIỆU TRÊN GIAO DIỆN

| Trạng thái | Điều kiện kỹ thuật | Hiển thị người dùng | Tác động đến thuật toán gợi ý |
| :--- | :--- | :--- | :--- |
| **Chính thức (Official)** | Có văn bản/URL chính thức của trường hoặc Bộ, đã được kiểm duyệt (`verified`). | Huy hiệu xanh lá: *"Dữ liệu chính thức (Đề án 2026)"* + link mở văn bản gốc. | Tính toán độ tin cậy cao (`confidence: high`), cho phép kết luận mức cạnh tranh tham khảo. |
| **Ước tính (Estimated)** | Dữ liệu quy đổi tương đương hoặc tính toán suy diễn từ mùa trước (`estimated: true`). | Huy hiệu vàng cảnh báo: *"Dữ liệu ước tính tham khảo"* + ghi rõ phương pháp tính. | Giảm mạnh điểm tin cậy (`confidence` giảm tối thiểu 30 điểm). **Tuyệt đối không cấp nhãn "An toàn" chắc chắn**. |
| **Chưa xác minh (Unverified)** | Dữ liệu do nguồn thứ cấp tổng hợp, chưa đối soát văn bản gốc. | Huy hiệu xám: *"Chưa xác minh nguồn chính thức"*. | Không dùng cho các khuyến nghị mạnh; yêu cầu thí sinh tra cứu trực tiếp đề án trường. |
| **Chưa có dữ liệu (Missing)** | Điểm chuẩn hoặc phương thức chưa được công bố (`null`). | Hiển thị: *"Chưa có dữ liệu chính thức"*. | Loại khỏi danh sách tính điểm; không được biến thành "Xét học bạ". |

---

## 4. DỮ LIỆU CÒN THIẾU NGUỒN HOẶC CHƯA XÁC MINH

Thống kê hiện trạng đối soát tại ngày 2026-10-11:
- **Số chương trình đã xác minh chính thức**: 1 chương trình mẫu (`neu-marketing` - ĐH Kinh tế Quốc dân) và các trường có đề án kết nối.
- **Số chương trình ở trạng thái Chờ duyệt / Chưa xác minh**: 246 chương trình.
- **Biện pháp xử lý**: Toàn bộ 246 chương trình này được bảo lưu để phục vụ tra cứu thông tin cơ bản, nhưng được gắn cờ rõ ràng trên UI và **bị hạ mức tin cậy (low confidence)** trong công cụ tính điểm / gợi ý nguyện vọng, bảo đảm nguyên tắc **Fail-closed** theo đúng yêu cầu nghiệp vụ.
