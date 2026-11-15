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

COMMIT;
