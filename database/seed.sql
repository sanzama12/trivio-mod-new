-- TỰ ĐỘNG SINH bởi scripts/export-sql.ts từ src/data + src/domain + src/services. Không sửa tay — chạy lại script.
-- Sinh lúc: 2026-10-13T08:02:58.678Z
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
  ('hocba', 'Xét học bạ THPT', 'Học bạ', 30, 1, 2, true),
  ('dgnl-hn', 'Đánh giá năng lực ĐHQG Hà Nội (HSA)', 'ĐGNL HN', 150, 5, 0, false),
  ('dgnl-hcm', 'Đánh giá năng lực ĐHQG TP.HCM', 'ĐGNL HCM', 1200, 40, 0, false),
  ('tsa', 'Đánh giá tư duy ĐH Bách Khoa Hà Nội (TSA)', 'ĐGTD TSA', 100, 3.3333333333333335, 2, false);

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
  ('R', 'Realistic', 'Thực tế', 'Thích làm việc với công cụ, máy móc, kỹ thuật cơ khí, tự nhiên ngoài trời.', 1),
  ('I', 'Investigative', 'Nghiên cứu', 'Thích quan sát, khám phá, phân tích dữ liệu, giải quyết các bài toán khó.', 2),
  ('A', 'Artistic', 'Nghệ thuật', 'Thích sáng tạo tự do, thiết kế, âm nhạc, văn học, không gò bó khuôn khổ.', 3),
  ('S', 'Social', 'Xã hội', 'Thích giúp đỡ, tư vấn, phát triển con người, tương tác chăm sóc cộng đồng.', 4),
  ('E', 'Enterprising', 'Doanh nhân', 'Thích lãnh đạo, thuyết phục, kinh doanh, tư duy chiến lược, đương đầu thử thách.', 5),
  ('C', 'Conventional', 'Quy củ', 'Thích tổ chức dữ liệu, quy trình, làm việc với các quy tắc rõ ràng.', 6);

INSERT INTO work_axes (code, left_label, right_label, position) VALUES
  ('social', 'Làm cùng mọi người', 'Làm độc lập', 1),
  ('stability', 'Ổn định', 'Thay đổi', 2),
  ('hands', 'Thực hành, hiện trường', 'Máy tính, tài liệu', 3),
  ('detail', 'Chi tiết, cẩn thận', 'Ý tưởng, sáng tạo', 4);

INSERT INTO system_roles (code, name, description) VALUES
  ('admin', 'Quản trị viên', 'Toàn quyền dữ liệu tuyển sinh, người dùng, quy tắc gợi ý (A01–A09)'),
  ('moderator', 'Kiểm duyệt viên', 'Chỉ duyệt cảm nhận và hỏi đáp'),
  ('school_staff', 'Cán bộ tuyển sinh', 'Xác nhận số liệu / gửi bản sửa cho trường của mình ở Cổng trường');


-- ================================================================================================
-- 2. Nhóm ngành, trường, ngành
-- ================================================================================================
INSERT INTO major_groups (id, slug, name, icon, tone, position) VALUES
  ('cntt', 'cong-nghe-cntt', 'Công nghệ & CNTT', 'code', 'primary', 1),
  ('kinh-te', 'kinh-te-quan-tri', 'Kinh tế & Quản trị', 'chart', 'accent', 2),
  ('y-duoc', 'y-duoc-suc-khoe', 'Y Dược & Sức khỏe', 'heart', 'danger', 3),
  ('ky-thuat', 'ky-thuat-cong-nghe', 'Kỹ thuật & Công nghệ', 'gear', 'teal', 4),
  ('xa-hoi', 'khoa-hoc-xa-hoi', 'Khoa học Xã hội', 'users', 'violet', 5),
  ('nghe-thuat', 'nghe-thuat-thiet-ke', 'Nghệ thuật & Thiết kế', 'pen', 'pink', 6),
  ('giao-duc', 'giao-duc-su-pham', 'Giáo dục & Sư phạm', 'book', 'success', 7),
  ('nong-lam', 'nong-lam-moi-truong', 'Nông Lâm & Môi trường', 'leaf', 'slate', 8);


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
  ('r-riasec', 'riasec-match', 'Ưu tiên ngành phù hợp RIASEC', 'Điểm sở thích = mức khớp mã Holland của học sinh với ngành, nhân trọng số nhóm cấu hình ở mục Bài test RIASEC.', 'v2.1', 'active', true, 1, '2026-09-15T00:00:00.000Z'),
  ('r-budget', 'budget', 'Lọc theo ngân sách học phí', 'Loại các chương trình có học phí thấp nhất vượt ngân sách người dùng đặt quá mức cho phép.', 'v1.3', 'active', true, 2, '2026-08-10T00:00:00.000Z'),
  ('r-diversity', 'diversity', 'Đa dạng kết quả', 'Giới hạn số chương trình cùng ngành và cùng trường trong danh sách gợi ý.', 'v1.0', 'active', true, 3, '2026-09-15T00:00:00.000Z'),
  ('r-goal', 'goal-priority', 'Ưu tiên ngành mục tiêu', 'Chương trình thuộc ngành mục tiêu lên trước, rồi tới ngành cùng nhóm.', 'v1.0', 'active', true, 4, '2026-09-15T00:00:00.000Z'),
  ('r-min-years', 'min-years', 'Đủ năm điểm chuẩn mới gắn nhãn', 'Chỉ gắn An toàn / Vừa sức / Thử sức khi chương trình có đủ số năm điểm chuẩn tối thiểu.', 'v1.0', 'active', true, 5, '2026-09-15T00:00:00.000Z'),
  ('r-boost-cutoff', 'boost-cutoff', 'Boost trường top theo điểm chuẩn', 'Cộng điểm ưu tiên cho chương trình có điểm chuẩn năm ngoái sát điểm của học sinh.', 'v3.0-draft', 'draft', true, 6, '2026-09-23T00:00:00.000Z');

INSERT INTO recommend_rule_params (rule_id, key, value) VALUES
  ('r-budget', 'tolerance', '0'),
  ('r-diversity', 'perMajor', '2'),
  ('r-diversity', 'perSchool', '2'),
  ('r-diversity', 'goalMajor', '3'),
  ('r-min-years', 'years', '3'),
  ('r-boost-cutoff', 'gap', '0.5'),
  ('r-boost-cutoff', 'points', '5');


-- ================================================================================================
-- 6. Nguồn dữ liệu, việc làm & thu nhập
-- ================================================================================================
INSERT INTO data_sources (id, title, publisher, year, url, kind, trust, note, accessed_at) VALUES
  ('nso-2025', 'Thông cáo báo chí về tình hình dân số, lao động, việc làm quý IV và năm 2025', 'Cục Thống kê – Bộ Tài chính', 2025, 'https://www.nso.gov.vn/tin-tuc-thong-ke/2026/01/thong-cao-bao-chi-ve-tinh-hinh-dan-so-lao-dong-viec-lam-quy-iv-va-nam-2025/', 'thong-ke', 'cao', 'Số liệu điều tra lao động – việc làm toàn quốc. Thu nhập bình quân tính cho toàn bộ lao động, không tách theo ngành học hay trình độ đào tạo — chỉ dùng làm mốc so sánh.', '2026-09-29'),
  ('tt-01-2024', 'Thông tư 01/2024/TT-BGDĐT ban hành Chuẩn cơ sở giáo dục đại học', 'Bộ Giáo dục và Đào tạo', 2024, 'https://thuvienphapluat.vn/van-ban/Giao-duc/Thong-tu-01-2024-TT-BGDDT-Chuan-co-so-giao-duc-dai-hoc-598459.aspx', 'van-ban', 'cao', 'Chuẩn yêu cầu tỷ lệ người tốt nghiệp có việc làm phù hợp với trình độ, tự tạo việc làm hoặc học tiếp trong 12 tháng không thấp hơn 70%; trường công bố kết quả thực hiện chuẩn hằng năm.', '2026-09-29'),
  ('tt-09-2024', 'Thông tư 09/2024/TT-BGDĐT quy định về công khai trong hoạt động của các cơ sở giáo dục', 'Bộ Giáo dục và Đào tạo', 2024, 'https://thuvienphapluat.vn/van-ban/Giao-duc/Thong-tu-09-2024-TT-BGDDT-cong-khai-trong-hoat-dong-co-so-giao-duc-quoc-dan-581008.aspx', 'van-ban', 'cao', 'Điều 13: cơ sở giáo dục đại học phải công khai tỷ lệ người học tốt nghiệp có việc làm phù hợp với trình độ đào tạo trong 12 tháng sau tốt nghiệp. Đây là nguồn chính thức nên dùng cho số liệu theo từng trường, ngành.', '2026-09-29'),
  ('tuoitre-2026-01-viec-lam', 'Trường đại học nào nhiều sinh viên sớm có việc làm, lương cao sau khi ra trường?', 'Báo Tuổi Trẻ (21/01/2026)', 2025, 'https://tuoitre.vn/truong-dai-hoc-nao-nhieu-sinh-vien-som-co-viec-lam-luong-cao-sau-khi-ra-truong-20260121180410959.htm', 'bao-chi', 'trung-binh', 'Báo chí tổng hợp kết quả khảo sát do chính các trường thực hiện với sinh viên tốt nghiệp năm 2025. Nên đối chiếu báo cáo gốc của trường; tỷ lệ phản hồi và cách định nghĩa "có việc làm" khác nhau giữa các trường.', '2026-09-29'),
  ('trovio-demo', 'Số liệu minh hoạ của bản demo Trovio', 'Trovio', 2025, NULL, 'minh-hoa', 'minh-hoa', 'Ước lượng chỉ để minh hoạ giao diện, KHÔNG phải số liệu thống kê. Cần thay bằng số liệu từ báo cáo khảo sát việc làm của các trường hoặc khảo sát có phương pháp công bố rõ ràng.', '2026-09-29');

INSERT INTO benchmarks (id, label, value, unit, year, source_id) VALUES
  ('income-2025', 'Thu nhập bình quân tháng của lao động cả nước', 8.4, 'triệu đồng/tháng', 2025, 'nso-2025'),
  ('youth-unemployment-2025', 'Tỷ lệ thất nghiệp thanh niên 15–24 tuổi', 8.64, '%', 2025, 'nso-2025'),
  ('standard-70', 'Ngưỡng tối thiểu người tốt nghiệp có việc làm phù hợp / học tiếp trong 12 tháng (Chuẩn cơ sở GDĐH)', 70, '%', 2024, 'tt-01-2024');


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


-- ================================================================================================
-- 8. Tài khoản demo (mật khẩu băm scrypt giống web) — CHỈ dùng cho môi trường demo
-- ================================================================================================
INSERT INTO users (id, email, name, avatar_url, password_hash, google_id, verified, locked, disabled, failed_attempts, user_role, grad_year, province, under16, parent_consent, onboarded, email_reminders, survey_opt_in, created_at) VALUES
  ('u-000', 'admin@trovio.vn', 'Quản trị Trovio', NULL, 'scrypt$16384$ap3-DiJ_zmDZJlJZCCIu8w$PtjdiFW8GgJtSXqVdw9M2cCy08iFTomr8mSjIYB07v6dnPh54Ca7jxVzZ_CuDJVWP23HyCDim-rTdhn5NuhyYg', NULL, true, false, false, 0, NULL, NULL, NULL, false, false, true, false, false, '2026-01-05'),
  ('u-001', 'an@trovio.vn', 'Nguyễn Văn An', NULL, 'scrypt$16384$S8uZ_ql-862vFZEQU2zXGQ$BrrDFycgKZMHa3FRk8RrtIrti2RESmvXXAA20PNab9lRo7qIGAVlyQsPEry3AF8MDYx7sX1W4OnOWdv_0ZbsOA', NULL, true, false, false, 0, 'student', 2027, 'Hà Nội', false, false, true, false, false, '2026-03-10'),
  ('u-002', 'binh.locked@trovio.vn', 'Trần Thị Bình', NULL, 'scrypt$16384$cagVIVhVbih2lSLpd2JfJw$qWmd7TETsgUx6Gn80zjIGjcVEEU2BpR4tibFzrZeaKZrrJHeIGp0WXK_Dk5xDGaUxEiaXEiGpPONl6B5DOaFRw', NULL, true, true, false, 5, 'student', 2026, 'Đà Nẵng', false, false, true, false, false, '2026-05-02'),
  ('u-003', 'gv@trovio.vn', 'Phạm Thu Hạnh', NULL, 'scrypt$16384$D0ZI_6ya0rCJ6rdDCfsB4w$eaS7GyMVTKZmO-A9vam96CBrrk0vQ40B9P2Ap6DYmsLMZW4VV5KFzATVbDA7zZxONkpQRMASA3LEQAngKaK3WA', NULL, true, false, false, 0, 'teacher', NULL, 'Hà Nội', false, false, true, false, false, '2026-08-20'),
  ('u-004', 'linh@st.neu.edu.vn', 'Lê Thu Linh', NULL, 'scrypt$16384$wvOxhFHmjO73AP8pPbvfJA$anIV6SxT_kfCQe91aSIvK1lnpZdCXe042R9Xr7O1gs8UeerpjtubHv1sJKY41B_2BgeZ6O_oh1kWH8hgMbN-2A', NULL, true, false, false, 0, 'student', 2025, 'Hà Nội', false, false, true, false, false, '2026-09-01'),
  ('u-005', 'tuyensinh@neu.edu.vn', 'Phòng Tuyển sinh NEU', NULL, 'scrypt$16384$u_EGJLQVdhojOoap9TAxbQ$KRkDgnwyhb7eWzaclwD4y8K46IRMRfaBaJXPoJh_xPLs5j79fojcaxd0jWCc9DjMsbWQlBR7jSBnFLRRE7x2NA', NULL, true, false, false, 0, 'school', NULL, 'Hà Nội', false, false, true, false, false, '2026-09-15'),
  ('u-006', 'kiemduyet@trovio.vn', 'Đỗ Minh Kiểm', NULL, 'scrypt$16384$U6G_6G7dU-GdZdUNxDT9gw$B5N3JcYqFDM9xInR4ah10_LNdKm0CXpRb7DAKg4s6l99lCwm1GfMeim4E_x6L042MCbAKTuWNKqLs947zCabkw', NULL, true, false, false, 0, NULL, NULL, NULL, false, false, true, false, false, '2026-09-20');

INSERT INTO user_system_roles (user_id, role_code) VALUES
  ('u-000', 'admin'),
  ('u-006', 'moderator');

INSERT INTO school_staff (user_id, school_id, status, requested_at, reviewed_at) VALUES
  ('u-005', 'neu', 'approved', '2026-09-15T08:00:00.000Z', '2026-09-16T08:00:00.000Z');


-- ================================================================================================
-- 9. Nội dung cộng đồng minh hoạ (is_demo = true)
-- ================================================================================================
INSERT INTO qa_questions (id, program_id, user_id, text, status, is_demo, created_at) VALUES
  ('qa-demo-01', 'neu-marketing', NULL, 'Năm nhất có phải học nhiều Toán không ạ? Em học D01 hơi yếu Toán.', 'approved', true, '2026-09-20T08:00:00.000Z'),
  ('qa-demo-02', 'neu-marketing', NULL, 'Sinh viên Marketing có được đi thực tập từ năm mấy ạ?', 'approved', true, '2026-09-25T08:00:00.000Z');

INSERT INTO qa_answers (id, question_id, user_id, display_name, school_domain, text, status, created_at) VALUES
  ('qa-demo-01-a1', 'qa-demo-01', 'u-004', 'Linh L.', 'st.neu.edu.vn', 'Có 2 môn Toán cao cấp và Xác suất thống kê ở năm 1, mức vừa phải. Thầy cô cho bài tập nhóm nhiều hơn là tính toán khó — bạn yên tâm nhé.', 'approved', '2026-09-21T10:00:00.000Z'),
  ('qa-demo-02-a1', 'qa-demo-02', 'u-004', 'Linh L.', 'st.neu.edu.vn', 'Chính thức là kỳ thực tập năm 4, nhưng từ năm 2 nhiều bạn đã làm cộng tác viên ở agency. Câu lạc bộ của khoa hay giới thiệu chỗ.', 'approved', '2026-09-26T09:00:00.000Z');

INSERT INTO outcome_surveys (id, program_id, user_id, satisfaction, choose_again, choose_school_again, trovio_right, wish, cohort, is_demo, created_at) VALUES
  ('os-demo-neu-marketing-0-0', 'neu-marketing', NULL, 5, 'yes', NULL, 'yes', 'Năm nhất nhiều môn đại cương, chưa học chuyên ngành ngay.', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-0-1', 'neu-marketing', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-0-2', 'neu-marketing', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-0-3', 'neu-marketing', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-0-4', 'neu-marketing', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-0-5', 'neu-marketing', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-0-6', 'neu-marketing', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-0-7', 'neu-marketing', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-0-8', 'neu-marketing', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-0-9', 'neu-marketing', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-0-10', 'neu-marketing', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-0-11', 'neu-marketing', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-0-12', 'neu-marketing', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-0-13', 'neu-marketing', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-0', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-1', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-2', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-3', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-4', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-5', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-6', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-7', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-8', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-9', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-10', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-11', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-12', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-13', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-14', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-15', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-16', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-17', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-18', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-1-19', 'neu-marketing', NULL, 4, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-2-0', 'neu-marketing', NULL, 4, 'yes', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-2-1', 'neu-marketing', NULL, 4, 'yes', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-2-2', 'neu-marketing', NULL, 4, 'yes', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-2-3', 'neu-marketing', NULL, 4, 'yes', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-2-4', 'neu-marketing', NULL, 4, 'yes', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-2-5', 'neu-marketing', NULL, 4, 'yes', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-2-6', 'neu-marketing', NULL, 4, 'yes', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-2-7', 'neu-marketing', NULL, 4, 'yes', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-2-8', 'neu-marketing', NULL, 4, 'yes', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-3-0', 'neu-marketing', NULL, 4, 'unsure', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-3-1', 'neu-marketing', NULL, 4, 'unsure', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-3-2', 'neu-marketing', NULL, 4, 'unsure', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-4-0', 'neu-marketing', NULL, 3, 'unsure', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-5-0', 'neu-marketing', NULL, 3, 'no', NULL, 'no', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-5-1', 'neu-marketing', NULL, 3, 'no', NULL, 'no', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-5-2', 'neu-marketing', NULL, 3, 'no', NULL, 'no', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-5-3', 'neu-marketing', NULL, 3, 'no', NULL, 'no', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-5-4', 'neu-marketing', NULL, 3, 'no', NULL, 'no', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-6-0', 'neu-marketing', NULL, 2, 'no', NULL, 'no', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-6-1', 'neu-marketing', NULL, 2, 'no', NULL, 'no', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-6-2', 'neu-marketing', NULL, 2, 'no', NULL, 'no', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-neu-marketing-6-3', 'neu-marketing', NULL, 2, 'no', NULL, 'no', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-0-0', 'hust-cong-nghe-thong-tin', NULL, 5, 'yes', NULL, 'yes', 'Năm nhất nhiều môn đại cương, chưa học chuyên ngành ngay.', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-0-1', 'hust-cong-nghe-thong-tin', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-0-2', 'hust-cong-nghe-thong-tin', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-0-3', 'hust-cong-nghe-thong-tin', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-0-4', 'hust-cong-nghe-thong-tin', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-0-5', 'hust-cong-nghe-thong-tin', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-0-6', 'hust-cong-nghe-thong-tin', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-0-7', 'hust-cong-nghe-thong-tin', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-0-8', 'hust-cong-nghe-thong-tin', NULL, 5, 'yes', NULL, 'yes', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-1-0', 'hust-cong-nghe-thong-tin', NULL, 4, 'yes', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-1-1', 'hust-cong-nghe-thong-tin', NULL, 4, 'yes', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-1-2', 'hust-cong-nghe-thong-tin', NULL, 4, 'yes', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-1-3', 'hust-cong-nghe-thong-tin', NULL, 4, 'yes', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-1-4', 'hust-cong-nghe-thong-tin', NULL, 4, 'yes', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-1-5', 'hust-cong-nghe-thong-tin', NULL, 4, 'yes', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-1-6', 'hust-cong-nghe-thong-tin', NULL, 4, 'yes', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-1-7', 'hust-cong-nghe-thong-tin', NULL, 4, 'yes', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-2-0', 'hust-cong-nghe-thong-tin', NULL, 3, 'unsure', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-2-1', 'hust-cong-nghe-thong-tin', NULL, 3, 'unsure', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-2-2', 'hust-cong-nghe-thong-tin', NULL, 3, 'unsure', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-2-3', 'hust-cong-nghe-thong-tin', NULL, 3, 'unsure', NULL, 'unsure', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-3-0', 'hust-cong-nghe-thong-tin', NULL, 2, 'no', NULL, 'no', '', 2025, true, '2026-09-15T00:00:00.000Z'),
  ('os-demo-hust-cong-nghe-thong-tin-3-1', 'hust-cong-nghe-thong-tin', NULL, 2, 'no', NULL, 'no', '', 2025, true, '2026-09-15T00:00:00.000Z');

INSERT INTO teacher_classes (id, teacher_id, name, school_name, code, last_remind_at, created_at) VALUES
  ('cls-demo-12a1', 'u-003', '12A1 (minh hoạ)', 'THPT Trovio', 'DEMO12', NULL, '2026-09-05T08:00:00.000Z');

INSERT INTO class_members (class_id, user_id) VALUES
  ('cls-demo-12a1', 'u-001');


COMMIT;
