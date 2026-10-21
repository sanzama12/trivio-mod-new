-- Reference data only. Apply after npm run db:migrate on a new database.

-- Existing rows are preserved. No demo accounts or retired feature data.

BEGIN;

SET search_path TO trovio, public;

INSERT INTO regions (code, name) VALUES
  ('bac', 'Miền Bắc'),
  ('trung', 'Miền Trung'),
  ('nam', 'Miền Nam')
ON CONFLICT DO NOTHING;

INSERT INTO priority_regions (code, name, points) VALUES
  ('KV1', 'KV1 (+0.75)', 0.75),
  ('KV2-NT', 'KV2-NT (+0.5)', 0.5),
  ('KV2', 'KV2 (+0.25)', 0.25),
  ('KV3', 'KV3 (+0)', 0)
ON CONFLICT DO NOTHING;

INSERT INTO priority_groups (code, name, points) VALUES
  ('none', 'Không thuộc đối tượng ưu tiên', 0),
  ('UT1', 'Nhóm UT1 – đối tượng 01–03 (+2.0)', 2),
  ('UT2', 'Nhóm UT2 – đối tượng 04–06 (+1.0)', 1)
ON CONFLICT DO NOTHING;

INSERT INTO admission_methods (code, name, short_name, max_score, factor, decimals, needs_combo) VALUES
  ('thpt', 'Điểm thi tốt nghiệp THPT', 'Điểm thi THPT', 30, 1, 2, true),
  ('hocba', 'Xét học bạ THPT', 'Học bạ', 30, 1, 2, true)
ON CONFLICT DO NOTHING;

INSERT INTO subjects (id, name, short_name) VALUES
  ('toan', 'Toán', 'Toán'),
  ('ly', 'Vật lý', 'Lý'),
  ('hoa', 'Hóa học', 'Hóa'),
  ('sinh', 'Sinh học', 'Sinh'),
  ('van', 'Ngữ văn', 'Văn'),
  ('su', 'Lịch sử', 'Sử'),
  ('dia', 'Địa lý', 'Địa'),
  ('anh', 'Tiếng Anh', 'Anh'),
  ('ve', 'Vẽ mỹ thuật', 'Vẽ')
ON CONFLICT DO NOTHING;

INSERT INTO combos (code) VALUES
  ('A00'),
  ('A01'),
  ('B00'),
  ('C00'),
  ('D01'),
  ('D07'),
  ('V00')
ON CONFLICT DO NOTHING;

INSERT INTO combo_subjects (combo_code, position, subject_id) VALUES
  ('A00', 1, 'toan'),
  ('A00', 2, 'ly'),
  ('A00', 3, 'hoa'),
  ('A01', 1, 'toan'),
  ('A01', 2, 'ly'),
  ('A01', 3, 'anh'),
  ('B00', 1, 'toan'),
  ('B00', 2, 'hoa'),
  ('B00', 3, 'sinh'),
  ('C00', 1, 'van'),
  ('C00', 2, 'su'),
  ('C00', 3, 'dia'),
  ('D01', 1, 'toan'),
  ('D01', 2, 'van'),
  ('D01', 3, 'anh'),
  ('D07', 1, 'toan'),
  ('D07', 2, 'hoa'),
  ('D07', 3, 'anh'),
  ('V00', 1, 'toan'),
  ('V00', 2, 'ly'),
  ('V00', 3, 've')
ON CONFLICT DO NOTHING;


INSERT INTO major_groups (id, slug, name, icon, tone, description, position, featured) VALUES
  ('cntt', 'cong-nghe-cntt', 'Công nghệ & CNTT', 'code', 'primary', 'Phần mềm, dữ liệu, trí tuệ nhân tạo và các hệ thống số.', 1, true),
  ('kinh-te', 'kinh-te-quan-tri', 'Kinh tế & Quản trị', 'chart', 'accent', 'Kinh doanh, tài chính, marketing, quản trị và thương mại.', 2, true),
  ('y-duoc', 'y-duoc-suc-khoe', 'Y Dược & Sức khỏe', 'heart', 'danger', 'Chăm sóc sức khỏe, dược học, y khoa và khoa học sự sống.', 3, true),
  ('ky-thuat', 'ky-thuat-cong-nghe', 'Kỹ thuật & Công nghệ', 'gear', 'teal', 'Cơ khí, điện, tự động hóa, xây dựng và công nghệ sản xuất.', 4, true),
  ('xa-hoi', 'khoa-hoc-xa-hoi', 'Khoa học Xã hội', 'users', 'violet', 'Luật, truyền thông, ngôn ngữ, tâm lý và nghiên cứu xã hội.', 5, true),
  ('nghe-thuat', 'nghe-thuat-thiet-ke', 'Nghệ thuật & Thiết kế', 'pen', 'pink', 'Thiết kế, mỹ thuật, kiến trúc sáng tạo và nghệ thuật ứng dụng.', 6, true),
  ('giao-duc', 'giao-duc-su-pham', 'Giáo dục & Sư phạm', 'book', 'success', 'Giảng dạy, quản lý giáo dục và phát triển người học.', 7, true),
  ('nong-lam', 'nong-lam-moi-truong', 'Nông Lâm & Môi trường', 'leaf', 'slate', 'Nông nghiệp, lâm nghiệp, tài nguyên và phát triển bền vững.', 8, true)
ON CONFLICT DO NOTHING;


INSERT INTO recommend_weights (id, interest, fit, place, group_match) VALUES
  (1, 0.45, 0.35, 0.1, 0.1)
ON CONFLICT DO NOTHING;

INSERT INTO recommend_rules (id, kind, name, description, version, status, builtin, position, updated_at) VALUES
  ('r-budget', 'budget', 'Lọc theo ngân sách học phí', 'Loại các chương trình có học phí thấp nhất vượt ngân sách người dùng đặt quá mức cho phép.', 'v1.3', 'active', true, 1, '2026-08-10T00:00:00.000Z'),
  ('r-diversity', 'diversity', 'Đa dạng kết quả', 'Giới hạn số chương trình cùng ngành và cùng trường trong danh sách gợi ý.', 'v1.0', 'active', true, 2, '2026-09-15T00:00:00.000Z'),
  ('r-goal', 'goal-priority', 'Ưu tiên ngành mục tiêu', 'Chương trình thuộc ngành mục tiêu lên trước, rồi tới ngành cùng nhóm.', 'v1.0', 'active', true, 3, '2026-09-15T00:00:00.000Z'),
  ('r-min-years', 'min-years', 'Đủ năm điểm chuẩn mới gắn nhãn', 'Chỉ gắn An toàn / Vừa sức / Thử sức khi chương trình có đủ số năm điểm chuẩn tối thiểu.', 'v1.0', 'active', true, 4, '2026-09-15T00:00:00.000Z'),
  ('r-boost-cutoff', 'boost-cutoff', 'Boost trường top theo điểm chuẩn', 'Cộng điểm ưu tiên cho chương trình có điểm chuẩn năm ngoái sát điểm của học sinh.', 'v3.0-draft', 'draft', true, 5, '2026-09-23T00:00:00.000Z')
ON CONFLICT DO NOTHING;

INSERT INTO recommend_rule_params (rule_id, key, value) VALUES
  ('r-budget', 'tolerance', '0'),
  ('r-diversity', 'perMajor', '2'),
  ('r-diversity', 'perSchool', '2'),
  ('r-diversity', 'goalMajor', '3'),
  ('r-min-years', 'years', '3'),
  ('r-boost-cutoff', 'gap', '0.5'),
  ('r-boost-cutoff', 'points', '5')
ON CONFLICT DO NOTHING;

INSERT INTO timeline_config (id, season, official, source_url, note) VALUES
  (1, '2026', false, NULL, 'Lịch mùa tuyển sinh 2026 theo hướng dẫn của Bộ GD&ĐT (Thông tư 06/2026/TT-BGDĐT).')
ON CONFLICT DO NOTHING;

INSERT INTO timeline_events (id, title, start_date, end_date, category, description) VALUES
  ('2026-dgnl-hn-dot-1', 'Thi đánh giá năng lực ĐHQG Hà Nội (HSA) — đợt đầu', '2026-03-14', '2026-03-15', 'dgnl', 'Các đợt thi HSA thường bắt đầu từ tháng 3. Đăng ký trên cổng thi của ĐHQG Hà Nội trước ngày thi vài tuần.'),
  ('2026-dgnl-hcm-dot-1', 'Thi đánh giá năng lực ĐHQG TP.HCM — đợt 1', '2026-04-05', NULL, 'dgnl', 'Kỳ thi thang 1200 điểm, thường tổ chức 2 đợt vào tháng 4 và tháng 5–6.'),
  ('2026-dang-ky-thi-thpt', 'Đăng ký dự thi tốt nghiệp THPT', '2026-04-21', '2026-05-05', 'dang-ky', 'Học sinh lớp 12 đăng ký dự thi qua trường THPT hoặc trực tuyến trên hệ thống của Bộ.'),
  ('2026-thi-thpt', 'Kỳ thi tốt nghiệp THPT', '2026-06-25', '2026-06-26', 'thi', 'Hai ngày thi chính thức. Mang theo giấy báo dự thi và giấy tờ tuỳ thân.'),
  ('2026-cong-bo-diem', 'Công bố điểm thi tốt nghiệp THPT', '2026-07-16', NULL, 'ket-qua', 'Tra cứu điểm thi, sau đó cập nhật điểm vào Trovio để xem lại mức cạnh tranh tham khảo.'),
  ('2026-dang-ky-nguyen-vong', 'Đăng ký & điều chỉnh nguyện vọng xét tuyển', '2026-07-18', '2026-07-30', 'dang-ky', 'Đăng ký tối đa 15 nguyện vọng theo Quy chế tuyển sinh 2026 (Thông tư 06/2026/TT-BGDĐT), sắp xếp theo mức độ mong muốn thực tế. Dùng “Kiểm tra danh sách” ở trang Đã lưu trước khi nộp.'),
  ('2026-nop-le-phi', 'Nộp lệ phí xét tuyển trực tuyến', '2026-07-31', '2026-08-06', 'dang-ky', 'Nộp đúng số lượng nguyện vọng đã đăng ký. Nguyện vọng chưa nộp lệ phí sẽ không được xét.'),
  ('2026-ket-qua-dot-1', 'Công bố kết quả trúng tuyển đợt 1', '2026-08-20', NULL, 'ket-qua', 'Mỗi thí sinh chỉ trúng tuyển 1 nguyện vọng — nguyện vọng có thứ tự ưu tiên cao nhất mà bạn đủ điều kiện.'),
  ('2026-xac-nhan-nhap-hoc', 'Xác nhận nhập học trực tuyến', '2026-08-21', '2026-08-30', 'nhap-hoc', 'Xác nhận nhập học trên hệ thống của Bộ trước hạn, sau đó làm thủ tục theo hướng dẫn của trường.')
ON CONFLICT DO NOTHING;

COMMIT;
