-- TỰ ĐỘNG SINH bởi database/scripts/export-sql.ts từ database/seeds + src/domain + src/services. Không sửa tay — chạy lại script.
-- Sinh lúc: 2026-10-20T03:00:05.361Z
BEGIN;
SET search_path TO trovio, public;

-- ================================================================================================
-- 1. Danh mục tham chiếu
-- ================================================================================================
INSERT INTO regions (code, name) VALUES
  ('bac', 'Miền Bắc'),
  ('trung', 'Miền Trung'),
  ('nam', 'Miền Nam');

INSERT INTO priority_regions (code, name, points) VALUES
  ('KV1', 'KV1 (+0.75)', 0.75),
  ('KV2-NT', 'KV2-NT (+0.5)', 0.5),
  ('KV2', 'KV2 (+0.25)', 0.25),
  ('KV3', 'KV3 (+0)', 0);

INSERT INTO priority_groups (code, name, points) VALUES
  ('none', 'Không thuộc đối tượng ưu tiên', 0),
  ('UT1', 'Nhóm UT1 – đối tượng 01–03 (+2.0)', 2),
  ('UT2', 'Nhóm UT2 – đối tượng 04–06 (+1.0)', 1);

INSERT INTO admission_methods (code, name, short_name, max_score, factor, decimals, needs_combo) VALUES
  ('thpt', 'Điểm thi tốt nghiệp THPT', 'Điểm thi THPT', 30, 1, 2, true),
  ('hocba', 'Xét học bạ THPT', 'Học bạ', 30, 1, 2, true);

INSERT INTO subjects (id, name, short_name) VALUES
  ('toan', 'Toán', 'Toán'),
  ('ly', 'Vật lý', 'Lý'),
  ('hoa', 'Hóa học', 'Hóa'),
  ('sinh', 'Sinh học', 'Sinh'),
  ('van', 'Ngữ văn', 'Văn'),
  ('su', 'Lịch sử', 'Sử'),
  ('dia', 'Địa lý', 'Địa'),
  ('anh', 'Tiếng Anh', 'Anh'),
  ('ve', 'Vẽ mỹ thuật', 'Vẽ');

INSERT INTO combos (code) VALUES
  ('A00'),
  ('A01'),
  ('B00'),
  ('C00'),
  ('D01'),
  ('D07'),
  ('V00');

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
  ('V00', 3, 've');

INSERT INTO riasec_types (code, name_en, label, description, position) VALUES
  ('R', 'Thực tế (Realistic)', 'Thực tế', 'Thích làm việc tay chân, kỹ thuật.', 1),
  ('I', 'Nghiên cứu (Investigative)', 'Nghiên cứu', 'Thích tìm tòi, phân tích.', 2),
  ('A', 'Nghệ thuật (Artistic)', 'Nghệ thuật', 'Thích sáng tạo.', 3),
  ('S', 'Xã hội (Social)', 'Xã hội', 'Thích giúp đỡ, giảng dạy.', 4),
  ('E', 'Lãnh đạo (Enterprising)', 'Lãnh đạo', 'Thích kinh doanh, thuyết phục.', 5),
  ('C', 'Nghiệp vụ (Conventional)', 'Nghiệp vụ', 'Thích số liệu, quy trình.', 6);

INSERT INTO work_axes (code, left_label, right_label, position) VALUES
  ('social', 'Làm cùng mọi người', 'Làm độc lập', 1),
  ('stability', 'Ổn định', 'Thay đổi', 2),
  ('hands', 'Thực hành, hiện trường', 'Máy tính, tài liệu', 3),
  ('detail', 'Chi tiết, cẩn thận', 'Ý tưởng, sáng tạo', 4);

INSERT INTO system_roles (code, name, description) VALUES
  ('admin', 'Quản trị viên', 'Toàn quyền dữ liệu tuyển sinh, người dùng, quy tắc gợi ý (A01–A09)'),
  ('moderator', 'Kiểm duyệt viên', 'Chỉ quản lý hỏi đáp cộng đồng'),
  ('school_staff', 'Cán bộ tuyển sinh', 'Xác nhận số liệu / gửi bản sửa cho trường của mình ở Cổng trường');


-- ================================================================================================
-- 2. Nhóm ngành, trường, ngành
-- ================================================================================================
INSERT INTO major_groups (id, slug, name, icon, tone, description, position, featured) VALUES
  ('cntt', 'cong-nghe-cntt', 'Công nghệ & CNTT', 'code', 'primary', 'Phần mềm, dữ liệu, trí tuệ nhân tạo và các hệ thống số.', 1, true),
  ('kinh-te', 'kinh-te-quan-tri', 'Kinh tế & Quản trị', 'chart', 'accent', 'Kinh doanh, tài chính, marketing, quản trị và thương mại.', 2, true),
  ('y-duoc', 'y-duoc-suc-khoe', 'Y Dược & Sức khỏe', 'heart', 'danger', 'Chăm sóc sức khỏe, dược học, y khoa và khoa học sự sống.', 3, true),
  ('ky-thuat', 'ky-thuat-cong-nghe', 'Kỹ thuật & Công nghệ', 'gear', 'teal', 'Cơ khí, điện, tự động hóa, xây dựng và công nghệ sản xuất.', 4, true),
  ('xa-hoi', 'khoa-hoc-xa-hoi', 'Khoa học Xã hội', 'users', 'violet', 'Luật, truyền thông, ngôn ngữ, tâm lý và nghiên cứu xã hội.', 5, true),
  ('nghe-thuat', 'nghe-thuat-thiet-ke', 'Nghệ thuật & Thiết kế', 'pen', 'pink', 'Thiết kế, mỹ thuật, kiến trúc sáng tạo và nghệ thuật ứng dụng.', 6, true),
  ('giao-duc', 'giao-duc-su-pham', 'Giáo dục & Sư phạm', 'book', 'success', 'Giảng dạy, quản lý giáo dục và phát triển người học.', 7, true),
  ('nong-lam', 'nong-lam-moi-truong', 'Nông Lâm & Môi trường', 'leaf', 'slate', 'Nông nghiệp, lâm nghiệp, tài nguyên và phát triển bền vững.', 8, true);


-- ================================================================================================
-- 3. Chương trình đào tạo, tổ hợp, phương thức, điểm chuẩn
-- ================================================================================================

-- ================================================================================================
-- 4. Trắc nghiệm RIASEC, mini-test phong cách, hồ sơ phong cách ngành
-- ================================================================================================
INSERT INTO riasec_questions (id, riasec_code, text, position, hidden, is_custom) VALUES
  (1, 'R', 'Quạt ở nhà bị hỏng, bạn tự mở ra tìm chỗ hỏng để sửa', 1, false, false),
  (2, 'R', 'Làm việc ngoài trời như trồng cây, chăm sóc vườn', 2, false, false),
  (3, 'R', 'Dùng kìm, tua vít, máy khoan để tự làm một món đồ', 3, false, false),
  (4, 'R', 'Được tự vận hành máy in 3D hoặc máy cắt laser ở phòng thực hành', 4, false, false),
  (5, 'R', 'Tự tay làm mô hình, đồ thủ công', 5, false, false),
  (6, 'R', 'Tìm hiểu cách một chiếc xe hoặc động cơ hoạt động', 6, false, false),
  (7, 'R', 'Tham gia hoạt động thể thao, vận động thể chất', 7, false, false),
  (8, 'R', 'Lắp đặt hệ thống điện, nước trong nhà', 8, false, false),
  (9, 'R', 'Giờ Công nghệ, tự tay đấu mạch điện cho bóng đèn sáng', 9, false, false),
  (10, 'R', 'Xây dựng hoặc sửa chữa đồ đạc bằng gỗ', 10, false, false),
  (11, 'I', 'Lớp làm khảo sát, bạn tự tổng hợp số liệu để tìm ra điều thú vị', 1, false, false),
  (12, 'I', 'Tìm hiểu nguyên nhân của các hiện tượng tự nhiên', 2, false, false),
  (13, 'I', 'Giải các bài toán logic và câu đố phức tạp', 3, false, false),
  (14, 'I', 'Xem xong một video khoa học, bạn tìm đọc thêm để hiểu tận gốc', 4, false, false),
  (15, 'I', 'Thực hiện thí nghiệm trong phòng thí nghiệm', 5, false, false),
  (16, 'I', 'Tìm hiểu cách hoạt động của máy tính và phần mềm', 6, false, false),
  (17, 'I', 'Gặp một bài toán lạ, bạn kiên nhẫn thử nhiều cách đến khi ra', 7, false, false),
  (18, 'I', 'Theo dõi tin tức về công nghệ, vũ trụ, y học', 8, false, false),
  (19, 'I', 'Viết chương trình máy tính để giải quyết vấn đề', 9, false, false),
  (20, 'I', 'Đội bóng của lớp thua, bạn ngồi phân tích xem vì sao thua', 10, false, false),
  (21, 'A', 'Vẽ, thiết kế poster hoặc hình ảnh', 1, false, false),
  (22, 'A', 'Viết truyện, thơ hoặc kịch bản', 2, false, false),
  (23, 'A', 'Chơi nhạc cụ hoặc sáng tác âm nhạc', 3, false, false),
  (24, 'A', 'Quay và dựng một video kỷ niệm cho cả lớp', 4, false, false),
  (25, 'A', 'Lớp chuẩn bị cắm trại, bạn nhận phần trang trí, bày biện', 5, false, false),
  (26, 'A', 'Tham gia diễn kịch, biểu diễn trước đám đông', 6, false, false),
  (27, 'A', 'Thiết kế trang phục hoặc phụ kiện', 7, false, false),
  (28, 'A', 'Sáng tạo nội dung cho mạng xã hội', 8, false, false),
  (29, 'A', 'Được tự chọn cách trình bày bài thuyết trình theo phong cách riêng', 9, false, false),
  (30, 'A', 'Cuối tuần rủ bạn bè đi xem một triển lãm tranh, ảnh', 10, false, false),
  (31, 'S', 'Giảng bài, giải thích kiến thức cho bạn bè', 1, false, false),
  (32, 'S', 'Bạn thân đang buồn, bạn ngồi nghe và tìm cách động viên', 2, false, false),
  (33, 'S', 'Tham gia hoạt động tình nguyện, thiện nguyện', 3, false, false),
  (34, 'S', 'Chăm sóc người bệnh, người già hoặc trẻ nhỏ', 4, false, false),
  (35, 'S', 'Kéo các bạn ít nói cùng tham gia để cả nhóm vui hơn', 5, false, false),
  (36, 'S', 'Tổ chức hoạt động cho câu lạc bộ, lớp học', 6, false, false),
  (37, 'S', 'Có bạn mới chuyển lớp, bạn chủ động giúp bạn ấy làm quen', 7, false, false),
  (38, 'S', 'Tìm hiểu tâm lý và cảm xúc của con người', 8, false, false),
  (39, 'S', 'Hai bạn trong nhóm cãi nhau, bạn đứng ra giúp hai bên hiểu nhau', 9, false, false),
  (40, 'S', 'Tham gia các dự án phục vụ cộng đồng', 10, false, false),
  (41, 'E', 'Thuyết phục cả lớp chọn địa điểm đi chơi mà bạn đề xuất', 1, false, false),
  (42, 'E', 'Lãnh đạo một nhóm để đạt mục tiêu', 2, false, false),
  (43, 'E', 'Bán hàng hoặc kinh doanh nhỏ', 3, false, false),
  (44, 'E', 'Lên kế hoạch bán đồ tự làm để gây quỹ cho lớp', 4, false, false),
  (45, 'E', 'Đi mua đồ cho sự kiện của lớp, bạn trả giá để được giá tốt nhất', 5, false, false),
  (46, 'E', 'Phát biểu, thuyết trình trước đám đông', 6, false, false),
  (47, 'E', 'Tranh cử vào ban cán sự lớp, đoàn trường', 7, false, false),
  (48, 'E', 'Tìm hiểu vì sao một thương hiệu đồ uống bỗng nổi tiếng khắp nơi', 8, false, false),
  (49, 'E', 'Đặt mục tiêu cao và cạnh tranh để đạt được', 9, false, false),
  (50, 'E', 'Quản lý ngân sách cho một sự kiện', 10, false, false),
  (51, 'C', 'Sắp xếp góc học tập, sách vở theo từng môn cho gọn gàng', 1, false, false),
  (52, 'C', 'Nhập và kiểm tra dữ liệu trên bảng tính', 2, false, false),
  (53, 'C', 'Làm bài theo đúng từng bước thầy cô hướng dẫn, không bỏ bước nào', 3, false, false),
  (54, 'C', 'Theo dõi thu chi, lập sổ sách cá nhân', 4, false, false),
  (55, 'C', 'Lập thời gian biểu và kế hoạch chi tiết', 5, false, false),
  (56, 'C', 'Soát lỗi chính tả, số liệu cho bài báo cáo của nhóm', 6, false, false),
  (57, 'C', 'Quản lý kho đồ, danh sách vật dụng', 7, false, false),
  (58, 'C', 'Làm việc với các con số và báo cáo', 8, false, false),
  (59, 'C', 'Làm cờ đỏ, theo dõi nề nếp các lớp theo đúng quy định', 9, false, false),
  (60, 'C', 'Lưu trữ, phân loại ảnh và tệp trên máy tính', 10, false, false);

INSERT INTO riasec_type_weights (riasec_code, weight) VALUES
  ('R', 1),
  ('I', 1),
  ('A', 1),
  ('S', 1),
  ('E', 1),
  ('C', 1);

INSERT INTO work_style_questions (id, axis_code, prompt, option_a, option_b, flip, position) VALUES
  ('so1', 'social', 'Cô giao bài thuyết trình lớn, hạn 2 tuần. Bạn muốn…', 'Chia việc cho cả nhóm, họp bàn thường xuyên', 'Tự nhận một phần rõ ràng và làm riêng cho xong', false, 1),
  ('st1', 'stability', 'Lịch học thêm buổi tối, bạn thích kiểu nào hơn?', 'Lịch cố định — tuần nào cũng biết trước học gì, lúc nào', 'Mỗi tuần một kiểu, có thêm buổi mới thì càng thú vị', false, 2),
  ('ha1', 'hands', 'Làm dự án môn Khoa học, bạn muốn nhận phần…', 'Tự tay lắp ráp, đo đạc, làm thí nghiệm', 'Tìm tài liệu, xử lý số liệu, làm slide trên máy', false, 3),
  ('de1', 'detail', 'Trong bài tập nhóm, bạn thích nhận phần…', 'Kiểm tra lỗi, soát số liệu, hoàn thiện từng chi tiết', 'Nghĩ ý tưởng, đề xuất hướng đi cho cả nhóm', false, 4),
  ('so2', 'social', 'Gặp bài tập khó lúc ở nhà, bạn thường…', 'Nhắn bạn bè để cùng bàn cách giải', 'Tự mày mò, tra cứu đến khi hiểu', true, 5),
  ('st2', 'stability', 'Cuối tuần đi chơi với nhóm bạn, bạn thích…', 'Lên kế hoạch kỹ: đi đâu, mấy giờ, ăn gì', 'Đến đâu tính đến đó, gặp gì hay thì ghé', true, 6),
  ('ha2', 'hands', 'Bạn thấy hứng thú hơn khi được…', 'Ra ngoài, đến tận nơi xem và làm trực tiếp', 'Ngồi máy tính, tìm hiểu và xử lý thông tin', false, 7),
  ('de2', 'detail', 'Nhận một món đồ cần tự lắp, bạn sẽ…', 'Đọc kỹ hướng dẫn, làm đúng từng bước', 'Xem qua hình rồi tự tìm cách lắp', false, 8),
  ('so3', 'social', 'Một ngày làm việc lý tưởng sau này của bạn có…', 'Nhiều trò chuyện, gặp gỡ, phối hợp với người khác', 'Nhiều thời gian yên tĩnh để tập trung vào việc của mình', false, 9),
  ('st3', 'stability', 'Nghĩ về công việc sau này, bạn coi trọng điều gì hơn?', 'Ổn định, rõ ràng, ít rủi ro', 'Nhiều thử thách mới, được thay đổi thường xuyên', false, 10),
  ('ha3', 'hands', 'Sau một dự án, điều khiến bạn tự hào hơn là…', 'Một món đồ, công trình mình chạm vào được', 'Một bản thiết kế, file phân tích hay sản phẩm số', true, 11),
  ('de3', 'detail', 'Bạn muốn được khen vì điều gì hơn?', 'Cẩn thận, chính xác, hầu như không sai sót', 'Sáng tạo, hay nghĩ ra cách mới', true, 12);

INSERT INTO major_group_work_styles (group_id, axis_code, pole) VALUES
  ('cntt', 'hands', -1),
  ('cntt', 'detail', 1),
  ('kinh-te', 'social', 1),
  ('y-duoc', 'hands', 1),
  ('y-duoc', 'detail', 1),
  ('ky-thuat', 'hands', 1),
  ('ky-thuat', 'detail', 1),
  ('xa-hoi', 'social', 1),
  ('nghe-thuat', 'detail', -1),
  ('nghe-thuat', 'stability', -1),
  ('giao-duc', 'social', 1),
  ('giao-duc', 'stability', 1),
  ('nong-lam', 'hands', 1);


-- ================================================================================================
-- 5. Cấu hình gợi ý (A09)
-- ================================================================================================
INSERT INTO recommend_weights (id, interest, fit, place, group_match) VALUES
  (1, 0.45, 0.35, 0.1, 0.1);

INSERT INTO recommend_rules (id, kind, name, description, version, status, builtin, position, updated_at) VALUES
  ('r-budget', 'budget', 'Lọc theo ngân sách học phí', 'Loại các chương trình có học phí thấp nhất vượt ngân sách người dùng đặt quá mức cho phép.', 'v1.3', 'active', true, 1, '2026-08-10T00:00:00.000Z'),
  ('r-diversity', 'diversity', 'Đa dạng kết quả', 'Giới hạn số chương trình cùng ngành và cùng trường trong danh sách gợi ý.', 'v1.0', 'active', true, 2, '2026-09-15T00:00:00.000Z'),
  ('r-goal', 'goal-priority', 'Ưu tiên ngành mục tiêu', 'Chương trình thuộc ngành mục tiêu lên trước, rồi tới ngành cùng nhóm.', 'v1.0', 'active', true, 3, '2026-09-15T00:00:00.000Z'),
  ('r-min-years', 'min-years', 'Đủ năm điểm chuẩn mới gắn nhãn', 'Chỉ gắn An toàn / Vừa sức / Thử sức khi chương trình có đủ số năm điểm chuẩn tối thiểu.', 'v1.0', 'active', true, 4, '2026-09-15T00:00:00.000Z'),
  ('r-boost-cutoff', 'boost-cutoff', 'Boost trường top theo điểm chuẩn', 'Cộng điểm ưu tiên cho chương trình có điểm chuẩn năm ngoái sát điểm của học sinh.', 'v3.0-draft', 'draft', true, 5, '2026-09-23T00:00:00.000Z');

INSERT INTO recommend_rule_params (rule_id, key, value) VALUES
  ('r-budget', 'tolerance', '0'),
  ('r-diversity', 'perMajor', '2'),
  ('r-diversity', 'perSchool', '2'),
  ('r-diversity', 'goalMajor', '3'),
  ('r-min-years', 'years', '3'),
  ('r-boost-cutoff', 'gap', '0.5'),
  ('r-boost-cutoff', 'points', '5');


-- ================================================================================================
-- 7. Mốc tuyển sinh
-- ================================================================================================
INSERT INTO timeline_config (id, season, official, source_url, note) VALUES
  (1, '2026', false, NULL, 'Lịch mùa tuyển sinh 2026 theo hướng dẫn của Bộ GD&ĐT (Thông tư 06/2026/TT-BGDĐT).');

INSERT INTO timeline_events (id, title, start_date, end_date, category, description) VALUES
  ('2026-dgnl-hn-dot-1', 'Thi đánh giá năng lực ĐHQG Hà Nội (HSA) — đợt đầu', '2026-03-14', '2026-03-15', 'dgnl', 'Các đợt thi HSA thường bắt đầu từ tháng 3. Đăng ký trên cổng thi của ĐHQG Hà Nội trước ngày thi vài tuần.'),
  ('2026-dgnl-hcm-dot-1', 'Thi đánh giá năng lực ĐHQG TP.HCM — đợt 1', '2026-04-05', NULL, 'dgnl', 'Kỳ thi thang 1200 điểm, thường tổ chức 2 đợt vào tháng 4 và tháng 5–6.'),
  ('2026-dang-ky-thi-thpt', 'Đăng ký dự thi tốt nghiệp THPT', '2026-04-21', '2026-05-05', 'dang-ky', 'Học sinh lớp 12 đăng ký dự thi qua trường THPT hoặc trực tuyến trên hệ thống của Bộ.'),
  ('2026-thi-thpt', 'Kỳ thi tốt nghiệp THPT', '2026-06-25', '2026-06-26', 'thi', 'Hai ngày thi chính thức. Mang theo giấy báo dự thi và giấy tờ tuỳ thân.'),
  ('2026-cong-bo-diem', 'Công bố điểm thi tốt nghiệp THPT', '2026-07-16', NULL, 'ket-qua', 'Tra cứu điểm thi, sau đó cập nhật điểm vào Trovio để xem lại mức cạnh tranh tham khảo.'),
  ('2026-dang-ky-nguyen-vong', 'Đăng ký & điều chỉnh nguyện vọng xét tuyển', '2026-07-18', '2026-07-30', 'dang-ky', 'Đăng ký tối đa 15 nguyện vọng theo Quy chế tuyển sinh 2026 (Thông tư 06/2026/TT-BGDĐT), sắp xếp theo mức độ mong muốn thực tế. Dùng “Kiểm tra danh sách” ở trang Đã lưu trước khi nộp.'),
  ('2026-nop-le-phi', 'Nộp lệ phí xét tuyển trực tuyến', '2026-07-31', '2026-08-06', 'dang-ky', 'Nộp đúng số lượng nguyện vọng đã đăng ký. Nguyện vọng chưa nộp lệ phí sẽ không được xét.'),
  ('2026-ket-qua-dot-1', 'Công bố kết quả trúng tuyển đợt 1', '2026-08-20', NULL, 'ket-qua', 'Mỗi thí sinh chỉ trúng tuyển 1 nguyện vọng — nguyện vọng có thứ tự ưu tiên cao nhất mà bạn đủ điều kiện.'),
  ('2026-xac-nhan-nhap-hoc', 'Xác nhận nhập học trực tuyến', '2026-08-21', '2026-08-30', 'nhap-hoc', 'Xác nhận nhập học trên hệ thống của Bộ trước hạn, sau đó làm thủ tục theo hướng dẫn của trường.');


-- --production: bỏ tài khoản demo và nội dung cộng đồng minh hoạ (mục 8–9).
COMMIT;
