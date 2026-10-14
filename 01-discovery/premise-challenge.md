# Premise challenge — Trovio

> Ngày: 13/10/2026  
> Scope mode: Selective Expansion

## Kết quả mong muốn thật

Người dùng không chỉ cần một website có nhiều tính năng. Họ cần ra quyết định chọn ngành/trường dựa trên dữ liệu đúng mùa, kiểm tra được nguồn và biết rõ phần nào còn thiếu. Vì vậy, chất lượng dữ liệu và khả năng giải trình quan trọng hơn số lượng màn hình.

## Premise validation

### Premise 1

PREMISE: Cần xây thêm tính năng để dự án khả thi.  
STATUS: CHALLENGED  
EVIDENCE: Dự án đã có tra cứu, tính điểm, RIASEC, gợi ý, wishlist, timeline, cộng đồng, lớp học, cổng trường và quản trị.  
RISK IF WRONG: Tiếp tục thêm tính năng sẽ tăng bề mặt lỗi nhưng không giải quyết độ tin cậy dữ liệu.

### Premise 2

PREMISE: Catalog hiện tại đủ để chạy production.  
STATUS: CHALLENGED  
EVIDENCE: Thiếu `fields_of_study.csv`; 327/327 trường trống ownership; 5.570/5.570 chương trình trống quota; pipeline chủ động dừng.  
RISK IF WRONG: Tư vấn từ dữ liệu thiếu hoặc giả định có thể làm học sinh chọn sai.

### Premise 3

PREMISE: Chuyển sang PostgreSQL đồng nghĩa dữ liệu đã có toàn vẹn quan hệ.  
STATUS: CHALLENGED  
EVIDENCE: Review, QA, share, class, notification, survey vẫn lưu trong `app_documents` JSONB không có FK.  
RISK IF WRONG: Dữ liệu mồ côi, mất cập nhật đồng thời, xóa tài khoản không đầy đủ.

### Premise 4

PREMISE: Quy tắc tuyển sinh 2026 hard-code hiện tại có thể dùng lâu dài.  
STATUS: NEEDS_VERIFICATION  
EVIDENCE: Một số quy tắc chính đúng với Thông tư 06/2026, nhưng season/date mặc định cố định và ngưỡng học bạ 16 được áp chung.  
RISK IF WRONG: Áp policy sai mùa hoặc sai nhóm ngành nhưng vẫn trả kết quả “hợp lệ”.

### Premise 5

PREMISE: Email xác thực hoặc email trùng domain trường chứng minh quan hệ sinh viên/cán bộ.  
STATUS: CHALLENGED  
EVIDENCE: Review chỉ yêu cầu email tài khoản xác thực; QA/cổng trường chủ yếu khớp domain website.  
RISK IF WRONG: Nội dung cộng đồng và huy hiệu xác minh tạo niềm tin sai.

### Premise 6

PREMISE: Điểm gần điểm chuẩn có thể được gọi là xác suất hoặc mức an toàn.  
STATUS: NEEDS_VERIFICATION  
EVIDENCE: Nhãn hiện dùng ngưỡng cố định trên điểm gần nhất, chưa hiệu chỉnh bằng quota, phân phối điểm hoặc thay đổi phương thức.  
RISK IF WRONG: Học sinh hiểu heuristic như cam kết trúng tuyển.

## Nếu không làm gì

- Dự án vẫn có thể demo UI, nhưng catalog thật không publish được.
- Dữ liệu người dùng và cộng đồng tích lũy càng nhiều thì chi phí migration và rủi ro riêng tư càng lớn.
- Bước sang mùa 2027, fallback policy 2026 có thể tạo quyết định sai.
- Thêm người dùng không làm tăng giá trị nếu độ tin cậy dữ liệu không tăng theo.

## Các giả định cần xác minh trước khi triển khai sửa

- Có quyền sử dụng và tái phân phối các nguồn dữ liệu tuyển sinh đã crawl.
- Có người chịu trách nhiệm duyệt mapping ngành và ownership.
- Có database staging/test độc lập.
- Có chuyên gia tuyển sinh duyệt golden test cases.
- Có quyết định retention/anonymization cho từng loại dữ liệu khi xóa tài khoản.

## NOT in scope

- Không kết luận pháp lý cuối cùng cho từng trường.
- Không thay framework hoặc viết lại frontend.
- Không thêm tính năng feature-first trước khi dữ liệu nền đạt chuẩn.
