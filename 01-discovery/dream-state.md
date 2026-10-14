# Dream state — Trovio sau 12 tháng

```text
CURRENT STATE
Nhiều tính năng; catalog chưa publish được; policy hard-code;
hai mô hình lưu trữ; email/test vận hành chưa hoàn chỉnh.
        |
        v
THIS PLAN
Catalog có nguồn và version; bỏ dữ liệu tự đoán; normalize các aggregate
nhạy cảm; policy theo mùa; recommendation có confidence đúng; CI đầy đủ.
        |
        v
12-MONTH IDEAL
Mỗi dữ kiện công khai truy ngược được nguồn và phiên bản; trường xác nhận
thay đổi; học sinh biết rõ đủ/thiếu điều kiện; mọi cảnh báo có bằng chứng;
privacy và xóa tài khoản được kiểm thử; vận hành đa instance ổn định.
```

## Trải nghiệm lý tưởng

- Học sinh chọn mùa tuyển sinh và chỉ thấy dữ liệu có hiệu lực trong mùa đó.
- Mỗi điểm chuẩn, học phí, chỉ tiêu và tổ hợp có nguồn, ngày cập nhật, trạng thái xác minh.
- Kết quả kiểm tra điều kiện trả ba trạng thái: `đủ`, `thiếu`, `chưa xác định`; không đoán.
- Gợi ý giải thích trọng số, dữ liệu thiếu và độ tin cậy; không gọi heuristic là xác suất.
- Khi nguồn thay đổi, hệ thống hiển thị diff và báo đúng người đã lưu chương trình.
- Cán bộ trường và quản trị viên cùng tham gia quy trình duyệt hai bước.
- Review/outcome có mức xác minh rõ, không gộp tự khai với đã xác minh.
- Người dùng xem, xuất và xóa dữ liệu của mình; hệ thống chứng minh cleanup bằng audit.

## Chỉ số thành công

- 100% bản ghi public có source + season + freshness status.
- 0 giá trị nghiệp vụ tự sinh để thay dữ liệu thiếu.
- 99% publish thành công hoặc rollback nguyên tử.
- 100% P0/P1 có regression test.
- Dưới 1% record bị quarantine vì hỏng quan hệ.
- Email delivery có trạng thái và retry; không mất reminder im lặng.
- Tỷ lệ người dùng hiểu đúng disclaimer và độ tin cậy qua usability test đạt mục tiêu đã định.

## Hướng đi của kế hoạch

Kế hoạch đề xuất đi đúng hướng dream state vì ưu tiên data lineage, policy versioning và integrity trước expansion. Nó tránh khóa dự án vào JSONB hoặc heuristic khó kiểm toán.

## NOT in scope

- Trở thành cổng đăng ký xét tuyển chính thức của Bộ GDĐT.
- Thay thế chuyên gia tư vấn hoặc đưa cam kết trúng tuyển.
- Thu thập dữ liệu nhạy cảm không cần thiết để tăng “độ chính xác”.

