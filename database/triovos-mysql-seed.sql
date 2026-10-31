-- =====================================================================================================
-- TRIOVOS — Dữ liệu mẫu & danh mục khởi tạo (MySQL 8.x)
-- =====================================================================================================

USE triovos;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Tỉnh thành
INSERT INTO tinh_thanh (ma_tinh, ten_tinh, mien, trang_thai) VALUES
('HN', 'Hà Nội', 'bac', 1),
('HCM', 'TP. Hồ Chí Minh', 'nam', 1),
('DN', 'Đà Nẵng', 'trung', 1),
('HP', 'Hải Phòng', 'bac', 1),
('CT', 'Cần Thơ', 'nam', 1),
('BD', 'Bình Dương', 'nam', 1),
('DNA', 'Đồng Nai', 'nam', 1),
('TTH', 'Thừa Thiên Huế', 'trung', 1)
ON DUPLICATE KEY UPDATE ten_tinh = VALUES(ten_tinh);

-- 2. Môn học
INSERT INTO mon_hoc (ma_mon, ten_mon, trang_thai) VALUES
('toan', 'Toán', 1),
('ly', 'Vật lý', 1),
('hoa', 'Hóa học', 1),
('sinh', 'Sinh học', 1),
('van', 'Ngữ văn', 1),
('su', 'Lịch sử', 1),
('dia', 'Địa lý', 1),
('anh', 'Tiếng Anh', 1),
('gdcd', 'Giáo dục công dân', 1),
('tin', 'Tin học', 1)
ON DUPLICATE KEY UPDATE ten_mon = VALUES(ten_mon);

-- 3. Sở thích / Lĩnh vực
INSERT INTO so_thich (ten_so_thich, mo_ta, trang_thai) VALUES
('Công nghệ & Phần mềm', 'Lập trình, phát triển ứng dụng, thuật toán, bảo mật mạng', 1),
('Kinh doanh & Khởi nghiệp', 'Quản lý, phân tích thị trường, bán hàng, đầu tư', 1),
('Tài chính & Kế toán', 'Số liệu tài chính, kiểm toán, ngân hàng, chứng khoán', 1),
('Thiết kế & Sáng tạo', 'Thiết kế đồ họa, UI/UX, mỹ thuật số, biên tập video', 1),
('Nghiên cứu khoa học', 'Tìm hiểu quy luật tự nhiên, thí nghiệm lý - hóa - sinh', 1),
('Truyền thông & Báo chí', 'Viết lách, quan hệ công chúng (PR), tổ chức sự kiện', 1),
('Y tế & Chăm sóc sức khỏe', 'Khám chữa bệnh, dược phẩm, điều dưỡng, sức khỏe cộng đồng', 1),
('Giáo dục & Đào tạo', 'Giảng dạy, cố vấn, truyền đạt kiến thức và kỹ năng', 1)
ON DUPLICATE KEY UPDATE mo_ta = VALUES(mo_ta);

-- 4. Phương thức xét tuyển
INSERT INTO phuong_thuc_xet_tuyen (ma_phuong_thuc, ten_phuong_thuc, mo_ta, trang_thai) VALUES
('PT100', 'Xét kết quả thi tốt nghiệp THPT', 'Sử dụng điểm thi tốt nghiệp THPT theo các tổ hợp môn', 1),
('PT200', 'Xét học bạ THPT', 'Sử dụng điểm trung bình học tập THPT các học kỳ/năm học', 1),
('PT402', 'Xét kết quả ĐGNL ĐHQG Hà Nội (HSA)', 'Sử dụng kết quả bài thi Đánh giá năng lực của ĐHQG HN (thang 150)', 1),
('PT401', 'Xét kết quả ĐGNL ĐHQG TP.HCM', 'Sử dụng kết quả bài thi Đánh giá năng lực của ĐHQG TP.HCM (thang 1200)', 1),
('PT405', 'Xét kết quả thi Đánh giá tư duy ĐHBK Hà Nội (TSA)', 'Sử dụng bài thi Đánh giá tư duy ĐHBKHN (thang 100)', 1)
ON DUPLICATE KEY UPDATE ten_phuong_thuc = VALUES(ten_phuong_thuc);

-- 5. Tổ hợp xét tuyển
INSERT INTO to_hop_xet_tuyen (ma_to_hop, ten_to_hop, trang_thai) VALUES
('A00', 'Toán, Vật lý, Hóa học', 1),
('A01', 'Toán, Vật lý, Tiếng Anh', 1),
('B00', 'Toán, Hóa học, Sinh học', 1),
('C00', 'Ngữ văn, Lịch sử, Địa lý', 1),
('D01', 'Ngữ văn, Toán, Tiếng Anh', 1),
('D07', 'Toán, Hóa học, Tiếng Anh', 1)
ON DUPLICATE KEY UPDATE ten_to_hop = VALUES(ten_to_hop);

-- 6. Năm tuyển sinh
INSERT INTO nam_tuyen_sinh (nam, trang_thai, ghi_chu) VALUES
(2024, 'luu_tru', 'Dữ liệu lịch sử tuyển sinh năm 2024'),
(2025, 'cong_bo', 'Dữ liệu tuyển sinh chính thức năm 2025'),
(2026, 'nhap_lieu', 'Dữ liệu tuyển sinh dự kiến năm 2026')
ON DUPLICATE KEY UPDATE trang_thai = VALUES(trang_thai);

-- 7. Môn học cấu thành tổ hợp
-- A00: Toán, Lý, Hóa
INSERT IGNORE INTO to_hop_mon_hoc (to_hop_id, mon_hoc_id)
SELECT th.id, mh.id FROM to_hop_xet_tuyen th, mon_hoc mh WHERE th.ma_to_hop = 'A00' AND mh.ma_mon IN ('toan', 'ly', 'hoa');

-- A01: Toán, Lý, Anh
INSERT IGNORE INTO to_hop_mon_hoc (to_hop_id, mon_hoc_id)
SELECT th.id, mh.id FROM to_hop_xet_tuyen th, mon_hoc mh WHERE th.ma_to_hop = 'A01' AND mh.ma_mon IN ('toan', 'ly', 'anh');

-- B00: Toán, Hóa, Sinh
INSERT IGNORE INTO to_hop_mon_hoc (to_hop_id, mon_hoc_id)
SELECT th.id, mh.id FROM to_hop_xet_tuyen th, mon_hoc mh WHERE th.ma_to_hop = 'B00' AND mh.ma_mon IN ('toan', 'hoa', 'sinh');

-- C00: Văn, Sử, Địa
INSERT IGNORE INTO to_hop_mon_hoc (to_hop_id, mon_hoc_id)
SELECT th.id, mh.id FROM to_hop_xet_tuyen th, mon_hoc mh WHERE th.ma_to_hop = 'C00' AND mh.ma_mon IN ('van', 'su', 'dia');

-- D01: Toán, Văn, Anh
INSERT IGNORE INTO to_hop_mon_hoc (to_hop_id, mon_hoc_id)
SELECT th.id, mh.id FROM to_hop_xet_tuyen th, mon_hoc mh WHERE th.ma_to_hop = 'D01' AND mh.ma_mon IN ('toan', 'van', 'anh');

-- D07: Toán, Hóa, Anh
INSERT IGNORE INTO to_hop_mon_hoc (to_hop_id, mon_hoc_id)
SELECT th.id, mh.id FROM to_hop_xet_tuyen th, mon_hoc mh WHERE th.ma_to_hop = 'D07' AND mh.ma_mon IN ('toan', 'hoa', 'anh');

SET FOREIGN_KEY_CHECKS = 1;
