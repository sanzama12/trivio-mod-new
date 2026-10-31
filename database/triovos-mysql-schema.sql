-- =====================================================================================================
-- TRIOVOS — Lược đồ cơ sở dữ liệu quan hệ (MySQL 8.x)
-- Đề tài: Xây dựng website Triovos hỗ trợ chọn trường theo năng lực học sinh
-- Phiên bản đề xuất: 27 bảng • Tên bảng và field tiếng Việt không dấu, snake_case
--
-- Nguyên tắc thiết kế:
--   • Không lưu điểm từng môn; chỉ ghi nhận môn thế mạnh, sở thích
--     và tổng điểm xét tuyển dự kiến nếu học sinh tự cung cấp.
--   • Thông tin trường/ngành lưu một lần. Điểm chuẩn, học phí, chỉ tiêu,
--     phương thức và trạng thái tuyển sinh được quản lý theo từng năm.
--   • Gợi ý ngành/trường bằng liên kết dữ liệu và bộ lọc; không thiết kế
--     thuật toán chấm điểm phù hợp, dự đoán trúng tuyển hay trắc nghiệm nghề nghiệp.
--   • Import Excel phải xem trước, phát hiện trùng, cập nhật đúng năm
--     và lưu nhật ký xử lý.
--   • AI trả lời ưu tiên dữ liệu có cấu trúc trong Triovos;
--     Donate có trạng thái xác nhận giao dịch.
--   • Xóa dữ liệu danh mục: ưu tiên đổi trang_thai thay vì xóa vật lý;
--     ON DELETE RESTRICT cho các dữ liệu lịch sử quan trọng.
--
-- Khởi tạo: mysql -u <user> -p < triovos-mysql-schema.sql
-- =====================================================================================================

CREATE DATABASE IF NOT EXISTS triovos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE triovos;

-- Tắt tạm thời kiểm tra khóa ngoại để tạo bảng thuận tiện
SET FOREIGN_KEY_CHECKS = 0;


-- =====================================================================================================
-- A. TÀI KHOẢN, HỒ SƠ VÀ DỮ LIỆU GỢI Ý NGÀNH (10 bảng)
-- =====================================================================================================

-- ----------------------------------------------------------------------------------------------------
-- 01. tai_khoan
-- Tài khoản đăng nhập của học sinh và quản trị viên.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tai_khoan (
  id            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  ho_ten        VARCHAR(120)      NOT NULL                       COMMENT 'Họ tên người sử dụng',
  email         VARCHAR(150)      NOT NULL                       COMMENT 'Email dùng để đăng nhập',
  mat_khau      VARCHAR(255)      NOT NULL                       COMMENT 'Mật khẩu đã băm; không lưu mật khẩu rõ',
  vai_tro       ENUM('hoc_sinh','quan_tri')
                                  NOT NULL DEFAULT 'hoc_sinh'    COMMENT 'Phân quyền người dùng',
  trang_thai    ENUM('hoat_dong','khoa')
                                  NOT NULL DEFAULT 'hoat_dong'   COMMENT 'Trạng thái tài khoản',
  tao_luc       DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                                 COMMENT 'Thời điểm tạo tài khoản',
  cap_nhat_luc  DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP    COMMENT 'Thời điểm cập nhật gần nhất',

  PRIMARY KEY (id),
  UNIQUE KEY uq_tai_khoan_email (email)
) ENGINE=InnoDB COMMENT='01. Tài khoản đăng nhập của học sinh và quản trị viên';


-- ----------------------------------------------------------------------------------------------------
-- 03. tinh_thanh
-- Danh mục tỉnh/thành phố dùng chung cho hồ sơ và trường đại học.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tinh_thanh (
  id            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  ma_tinh       VARCHAR(20)       NOT NULL                       COMMENT 'Mã tỉnh/thành phố dùng để đối chiếu và Import',
  ten_tinh      VARCHAR(120)      NOT NULL                       COMMENT 'Tên tỉnh/thành phố',
  mien          ENUM('bac','trung','nam')
                                  NULL                           COMMENT 'Vùng miền để hỗ trợ lọc',
  trang_thai    TINYINT(1)        NOT NULL DEFAULT 1             COMMENT '1: còn sử dụng; 0: ngừng sử dụng',

  PRIMARY KEY (id),
  UNIQUE KEY uq_tinh_thanh_ma (ma_tinh)
) ENGINE=InnoDB COMMENT='03. Danh mục tỉnh/thành phố dùng chung';


-- ----------------------------------------------------------------------------------------------------
-- 04. mon_hoc
-- Danh mục môn học để học sinh chọn môn thế mạnh và định nghĩa tổ hợp xét tuyển.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mon_hoc (
  id            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  ma_mon        VARCHAR(20)       NOT NULL                       COMMENT 'Mã môn học nội bộ',
  ten_mon       VARCHAR(100)      NOT NULL                       COMMENT 'Tên môn, ví dụ Toán, Ngữ văn, Tiếng Anh',
  trang_thai    TINYINT(1)        NOT NULL DEFAULT 1             COMMENT '1: sử dụng; 0: ngừng sử dụng',

  PRIMARY KEY (id),
  UNIQUE KEY uq_mon_hoc_ma (ma_mon)
) ENGINE=InnoDB COMMENT='04. Danh mục môn học';


-- ----------------------------------------------------------------------------------------------------
-- 05. so_thich
-- Danh mục sở thích/lĩnh vực để học sinh lựa chọn; không phải trắc nghiệm.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS so_thich (
  id            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  ten_so_thich  VARCHAR(120)      NOT NULL                       COMMENT 'Ví dụ công nghệ, kinh doanh, giao tiếp, thiết kế',
  mo_ta         VARCHAR(500)      NULL                           COMMENT 'Diễn giải nội dung sở thích/lĩnh vực',
  trang_thai    TINYINT(1)        NOT NULL DEFAULT 1             COMMENT 'Cho phép lựa chọn hoặc ẩn đi',

  PRIMARY KEY (id),
  UNIQUE KEY uq_so_thich_ten (ten_so_thich)
) ENGINE=InnoDB COMMENT='05. Danh mục sở thích/lĩnh vực';


-- ----------------------------------------------------------------------------------------------------
-- 14. phuong_thuc_xet_tuyen
-- Danh mục phương thức xét tuyển được sử dụng ở nhiều trường.
-- (Khai báo trước để làm foreign key cho ho_so_hoc_sinh)
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS phuong_thuc_xet_tuyen (
  id                BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  ma_phuong_thuc    VARCHAR(30)       NOT NULL                   COMMENT 'Mã phương thức nội bộ',
  ten_phuong_thuc   VARCHAR(200)      NOT NULL                   COMMENT 'Ví dụ: xét kết quả thi tốt nghiệp THPT',
  mo_ta             TEXT              NULL                       COMMENT 'Mô tả cách thức xét tuyển',
  trang_thai        TINYINT(1)        NOT NULL DEFAULT 1         COMMENT '1: được sử dụng; 0: ngừng sử dụng',

  PRIMARY KEY (id),
  UNIQUE KEY uq_phuong_thuc_ma (ma_phuong_thuc)
) ENGINE=InnoDB COMMENT='14. Danh mục phương thức xét tuyển';


-- ----------------------------------------------------------------------------------------------------
-- 15. to_hop_xet_tuyen
-- Danh mục tổ hợp xét tuyển.
-- (Khai báo trước để làm foreign key cho ho_so_hoc_sinh)
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS to_hop_xet_tuyen (
  id            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  ma_to_hop     VARCHAR(15)       NOT NULL                       COMMENT 'Ví dụ A00, A01, D01',
  ten_to_hop    VARCHAR(200)      NOT NULL                       COMMENT 'Tên hoặc mô tả tổ hợp xét tuyển',
  trang_thai    TINYINT(1)        NOT NULL DEFAULT 1             COMMENT '1: sử dụng; 0: ngừng sử dụng',

  PRIMARY KEY (id),
  UNIQUE KEY uq_to_hop_ma (ma_to_hop)
) ENGINE=InnoDB COMMENT='15. Danh mục tổ hợp xét tuyển';


-- ----------------------------------------------------------------------------------------------------
-- 02. ho_so_hoc_sinh
-- Thông tin hỗ trợ tư vấn; không lưu điểm chi tiết từng môn.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ho_so_hoc_sinh (
  id                      BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  tai_khoan_id            BIGINT UNSIGNED   NOT NULL             COMMENT 'Mỗi học sinh có một hồ sơ',
  ngay_sinh               DATE              NULL                 COMMENT 'Ngày sinh, không bắt buộc',
  tinh_thanh_hien_tai_id  BIGINT UNSIGNED   NULL                 COMMENT 'Địa phương sinh sống hiện tại',
  tinh_thanh_mong_muon_id BIGINT UNSIGNED   NULL                 COMMENT 'Địa phương muốn học đại học',
  hoc_luc_tu_danh_gia     ENUM('gioi','kha','trung_binh','yeu','chua_xac_dinh')
                                            NOT NULL DEFAULT 'chua_xac_dinh'
                                                                 COMMENT 'Mức học lực học sinh tự chọn',
  ngan_sach_hoc_phi_nam   BIGINT UNSIGNED   NULL                 COMMENT 'Mức học phí tối đa mong muốn, VNĐ/năm',
  diem_xet_tuyen_du_kien  DECIMAL(7,2)      NULL                 COMMENT 'Tổng điểm dự kiến (không bắt buộc)',
  thang_diem_du_kien      DECIMAL(7,2)      NULL                 COMMENT 'Thang điểm của tổng điểm dự kiến',
  phuong_thuc_du_kien_id  BIGINT UNSIGNED   NULL                 COMMENT 'Phương thức tương ứng với điểm dự kiến',
  to_hop_du_kien_id       BIGINT UNSIGNED   NULL                 COMMENT 'Tổ hợp môn nếu phương thức xét tuyển có sử dụng',
  cap_nhat_luc            DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP
                                                                 COMMENT 'Thời điểm cập nhật hồ sơ',

  PRIMARY KEY (id),
  UNIQUE KEY uq_ho_so_tai_khoan (tai_khoan_id),

  CONSTRAINT fk_ho_so_tai_khoan
    FOREIGN KEY (tai_khoan_id) REFERENCES tai_khoan(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_ho_so_tinh_hien_tai
    FOREIGN KEY (tinh_thanh_hien_tai_id) REFERENCES tinh_thanh(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_ho_so_tinh_mong_muon
    FOREIGN KEY (tinh_thanh_mong_muon_id) REFERENCES tinh_thanh(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_ho_so_phuong_thuc
    FOREIGN KEY (phuong_thuc_du_kien_id) REFERENCES phuong_thuc_xet_tuyen(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_ho_so_to_hop
    FOREIGN KEY (to_hop_du_kien_id) REFERENCES to_hop_xet_tuyen(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT chk_ngan_sach CHECK (ngan_sach_hoc_phi_nam IS NULL OR ngan_sach_hoc_phi_nam >= 0),
  CONSTRAINT chk_diem_du_kien CHECK (diem_xet_tuyen_du_kien IS NULL OR diem_xet_tuyen_du_kien >= 0),
  CONSTRAINT chk_thang_diem CHECK (thang_diem_du_kien IS NULL OR thang_diem_du_kien > 0)
) ENGINE=InnoDB COMMENT='02. Hồ sơ học sinh hỗ trợ tư vấn (không lưu điểm từng môn)';


-- ----------------------------------------------------------------------------------------------------
-- 06. hoc_sinh_mon_the_manh
-- Bảng liên kết nhiều-nhiều giữa hồ sơ học sinh và môn học thế mạnh.
-- Khóa chính ghép: (ho_so_id, mon_hoc_id). Không có cột điểm.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hoc_sinh_mon_the_manh (
  ho_so_id      BIGINT UNSIGNED   NOT NULL                       COMMENT 'Hồ sơ học sinh',
  mon_hoc_id    BIGINT UNSIGNED   NOT NULL                       COMMENT 'Môn học được chọn là thế mạnh',

  PRIMARY KEY (ho_so_id, mon_hoc_id),

  CONSTRAINT fk_hs_mon_ho_so
    FOREIGN KEY (ho_so_id) REFERENCES ho_so_hoc_sinh(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_hs_mon_mon
    FOREIGN KEY (mon_hoc_id) REFERENCES mon_hoc(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='06. Liên kết nhiều-nhiều hồ sơ học sinh và môn học thế mạnh';


-- ----------------------------------------------------------------------------------------------------
-- 07. hoc_sinh_so_thich
-- Các sở thích/lĩnh vực được một học sinh chọn trong hồ sơ.
-- Khóa chính ghép: (ho_so_id, so_thich_id).
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hoc_sinh_so_thich (
  ho_so_id      BIGINT UNSIGNED   NOT NULL                       COMMENT 'Hồ sơ học sinh',
  so_thich_id   BIGINT UNSIGNED   NOT NULL                       COMMENT 'Sở thích hoặc lĩnh vực quan tâm',

  PRIMARY KEY (ho_so_id, so_thich_id),

  CONSTRAINT fk_hs_st_ho_so
    FOREIGN KEY (ho_so_id) REFERENCES ho_so_hoc_sinh(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_hs_st_so_thich
    FOREIGN KEY (so_thich_id) REFERENCES so_thich(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='07. Liên kết nhiều-nhiều hồ sơ học sinh và sở thích';


-- ----------------------------------------------------------------------------------------------------
-- 08. nganh_hoc
-- Danh mục ngành học dùng chung giữa các trường.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nganh_hoc (
  id                      BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  ma_nganh                VARCHAR(30)       NOT NULL             COMMENT 'Mã ngành theo danh mục áp dụng',
  ten_nganh               VARCHAR(200)      NOT NULL             COMMENT 'Tên ngành học',
  mo_ta                   TEXT              NULL                 COMMENT 'Giới thiệu ngành, kiến thức và nội dung đào tạo',
  dinh_huong_nghe_nghiep  TEXT              NULL                 COMMENT 'Định hướng công việc hoặc lĩnh vực nghề nghiệp liên quan',
  trang_thai              TINYINT(1)        NOT NULL DEFAULT 1   COMMENT '1: sử dụng; 0: ngừng sử dụng',

  PRIMARY KEY (id),
  UNIQUE KEY uq_nganh_hoc_ma (ma_nganh)
) ENGINE=InnoDB COMMENT='08. Danh mục ngành học dùng chung';


-- ----------------------------------------------------------------------------------------------------
-- 09. nganh_mon_hoc
-- Liên kết ngành học với những môn học thường hữu ích hoặc liên quan.
-- Khóa chính ghép: (nganh_id, mon_hoc_id).
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nganh_mon_hoc (
  nganh_id      BIGINT UNSIGNED   NOT NULL                       COMMENT 'Ngành học',
  mon_hoc_id    BIGINT UNSIGNED   NOT NULL                       COMMENT 'Môn học liên quan',

  PRIMARY KEY (nganh_id, mon_hoc_id),

  CONSTRAINT fk_nganh_mon_nganh
    FOREIGN KEY (nganh_id) REFERENCES nganh_hoc(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_nganh_mon_mon
    FOREIGN KEY (mon_hoc_id) REFERENCES mon_hoc(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='09. Liên kết ngành học với môn học liên quan';


-- ----------------------------------------------------------------------------------------------------
-- 10. nganh_so_thich
-- Liên kết ngành học với sở thích/lĩnh vực nhằm gợi ý ngành đơn giản.
-- Khóa chính ghép: (nganh_id, so_thich_id).
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nganh_so_thich (
  nganh_id      BIGINT UNSIGNED   NOT NULL                       COMMENT 'Ngành học',
  so_thich_id   BIGINT UNSIGNED   NOT NULL                       COMMENT 'Sở thích/lĩnh vực liên quan',

  PRIMARY KEY (nganh_id, so_thich_id),

  CONSTRAINT fk_nganh_st_nganh
    FOREIGN KEY (nganh_id) REFERENCES nganh_hoc(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_nganh_st_so_thich
    FOREIGN KEY (so_thich_id) REFERENCES so_thich(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='10. Liên kết ngành học với sở thích/lĩnh vực';


-- =====================================================================================================
-- B. TRƯỜNG ĐẠI HỌC VÀ TUYỂN SINH THEO NĂM (10 bảng)
-- =====================================================================================================

-- ----------------------------------------------------------------------------------------------------
-- 11. truong_dai_hoc
-- Thông tin cơ bản của từng trường, chỉ lưu một lần.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS truong_dai_hoc (
  id            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  ma_truong     VARCHAR(30)       NOT NULL                       COMMENT 'Mã trường để đối chiếu dữ liệu Import',
  ten_truong    VARCHAR(250)      NOT NULL                       COMMENT 'Tên trường đại học',
  loai_truong   ENUM('cong_lap','tu_thuc','khac')
                                  NULL                           COMMENT 'Loại hình cơ sở giáo dục',
  tinh_thanh_id BIGINT UNSIGNED   NULL                           COMMENT 'Tỉnh/thành phố nơi đặt trường/cơ sở chính',
  dia_chi       VARCHAR(500)      NULL                           COMMENT 'Địa chỉ trường hoặc cơ sở chính',
  website       VARCHAR(500)      NULL                           COMMENT 'Trang web chính thức',
  logo          VARCHAR(500)      NULL                           COMMENT 'Đường dẫn ảnh logo',
  gioi_thieu    TEXT              NULL                           COMMENT 'Giới thiệu ngắn về trường',
  trang_thai    ENUM('hoat_dong','tam_ngung','da_sap_nhap')
                                  NOT NULL DEFAULT 'hoat_dong'   COMMENT 'Trạng thái thông tin trường',
  cap_nhat_luc  DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP    COMMENT 'Thời điểm cập nhật gần nhất',

  PRIMARY KEY (id),
  UNIQUE KEY uq_truong_ma (ma_truong),

  CONSTRAINT fk_truong_tinh_thanh
    FOREIGN KEY (tinh_thanh_id) REFERENCES tinh_thanh(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='11. Thông tin cơ bản của trường đại học';


-- ----------------------------------------------------------------------------------------------------
-- 12. truong_nganh
-- Quan hệ trường – ngành; một trường có nhiều ngành, một ngành có ở nhiều trường.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS truong_nganh (
  id            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  truong_id     BIGINT UNSIGNED   NOT NULL                       COMMENT 'Trường đào tạo',
  nganh_id      BIGINT UNSIGNED   NOT NULL                       COMMENT 'Ngành đào tạo',
  trang_thai    TINYINT(1)        NOT NULL DEFAULT 1             COMMENT '1: quan hệ đang sử dụng; 0: ẩn/ngừng',
  ghi_chu       VARCHAR(500)      NULL                           COMMENT 'Thông tin bổ sung về ngành tại trường',

  PRIMARY KEY (id),
  UNIQUE KEY uq_truong_nganh (truong_id, nganh_id),

  CONSTRAINT fk_tn_truong
    FOREIGN KEY (truong_id) REFERENCES truong_dai_hoc(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_tn_nganh
    FOREIGN KEY (nganh_id) REFERENCES nganh_hoc(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='12. Quan hệ trường – ngành đào tạo';


-- ----------------------------------------------------------------------------------------------------
-- 13. nam_tuyen_sinh
-- Danh mục năm tuyển sinh để tổ chức và tra cứu dữ liệu lịch sử.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nam_tuyen_sinh (
  id            BIGINT UNSIGNED    NOT NULL AUTO_INCREMENT,
  nam           SMALLINT UNSIGNED  NOT NULL                      COMMENT 'Năm áp dụng, ví dụ 2026',
  trang_thai    ENUM('nhap_lieu','cong_bo','luu_tru')
                                   NOT NULL DEFAULT 'nhap_lieu'  COMMENT 'Trạng thái quản trị dữ liệu của năm',
  ghi_chu       VARCHAR(500)       NULL                          COMMENT 'Thông tin bổ sung',

  PRIMARY KEY (id),
  UNIQUE KEY uq_nam_tuyen_sinh_nam (nam)
) ENGINE=InnoDB COMMENT='13. Danh mục năm tuyển sinh';


-- ----------------------------------------------------------------------------------------------------
-- 16. to_hop_mon_hoc
-- Các môn học cấu thành một tổ hợp xét tuyển.
-- Khóa chính ghép: (to_hop_id, mon_hoc_id).
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS to_hop_mon_hoc (
  to_hop_id     BIGINT UNSIGNED   NOT NULL                       COMMENT 'Tổ hợp xét tuyển',
  mon_hoc_id    BIGINT UNSIGNED   NOT NULL                       COMMENT 'Môn thuộc tổ hợp',

  PRIMARY KEY (to_hop_id, mon_hoc_id),

  CONSTRAINT fk_thm_to_hop
    FOREIGN KEY (to_hop_id) REFERENCES to_hop_xet_tuyen(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_thm_mon_hoc
    FOREIGN KEY (mon_hoc_id) REFERENCES mon_hoc(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='16. Các môn học cấu thành một tổ hợp xét tuyển';


-- ----------------------------------------------------------------------------------------------------
-- 17. tuyen_sinh_nam
-- Thông tin một ngành tại một trường trong một năm tuyển sinh nhất định.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tuyen_sinh_nam (
  id                BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  truong_nganh_id   BIGINT UNSIGNED   NOT NULL                   COMMENT 'Ngành tại trường được tuyển sinh',
  nam_tuyen_sinh_id BIGINT UNSIGNED   NOT NULL                   COMMENT 'Năm tuyển sinh',
  chi_tieu          INT UNSIGNED      NULL                       COMMENT 'Chỉ tiêu tuyển sinh của ngành nếu có',
  hoc_phi_tu        BIGINT UNSIGNED   NULL                       COMMENT 'Học phí tham khảo từ mức này, VNĐ/năm',
  hoc_phi_den       BIGINT UNSIGNED   NULL                       COMMENT 'Học phí tham khảo đến mức này, VNĐ/năm',
  trang_thai        ENUM('du_kien','dang_tuyen','ngung_tuyen','ket_thuc')
                                      NOT NULL DEFAULT 'du_kien' COMMENT 'Trạng thái tuyển sinh ngành trong năm',
  nguon_thong_tin   VARCHAR(500)      NULL                       COMMENT 'URL hoặc thông tin nguồn do trường công bố',
  cap_nhat_luc      DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP
                                                                 COMMENT 'Thời điểm cập nhật dữ liệu',

  PRIMARY KEY (id),
  UNIQUE KEY uq_tuyen_sinh_nam (truong_nganh_id, nam_tuyen_sinh_id),

  CONSTRAINT fk_tsn_truong_nganh
    FOREIGN KEY (truong_nganh_id) REFERENCES truong_nganh(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_tsn_nam
    FOREIGN KEY (nam_tuyen_sinh_id) REFERENCES nam_tuyen_sinh(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT chk_tsn_chi_tieu CHECK (chi_tieu IS NULL OR chi_tieu >= 0),
  CONSTRAINT chk_tsn_hoc_phi CHECK (
    (hoc_phi_tu IS NULL AND hoc_phi_den IS NULL)
    OR (hoc_phi_tu IS NOT NULL AND hoc_phi_den IS NOT NULL AND hoc_phi_tu <= hoc_phi_den)
    OR (hoc_phi_tu IS NOT NULL AND hoc_phi_den IS NULL)
    OR (hoc_phi_tu IS NULL AND hoc_phi_den IS NOT NULL)
  )
) ENGINE=InnoDB COMMENT='17. Thông tin ngành tại trường theo từng năm tuyển sinh';


-- ----------------------------------------------------------------------------------------------------
-- 18. tuyen_sinh_phuong_thuc
-- Những phương thức được một ngành tại một trường áp dụng trong từng năm.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tuyen_sinh_phuong_thuc (
  id                  BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  tuyen_sinh_nam_id   BIGINT UNSIGNED   NOT NULL                 COMMENT 'Tham chiếu ngành–trường–năm',
  phuong_thuc_id      BIGINT UNSIGNED   NOT NULL                 COMMENT 'Phương thức xét tuyển',
  chi_tieu            INT UNSIGNED      NULL                     COMMENT 'Chỉ tiêu riêng của phương thức nếu có',
  dieu_kien_xet_tuyen TEXT              NULL                     COMMENT 'Điều kiện, quy định, lưu ý của phương thức',
  nguon_thong_tin     VARCHAR(500)      NULL                     COMMENT 'Nguồn công bố thông tin phương thức',
  trang_thai          TINYINT(1)        NOT NULL DEFAULT 1       COMMENT '1: phương thức áp dụng; 0: ngừng áp dụng',

  PRIMARY KEY (id),
  UNIQUE KEY uq_tuyen_sinh_phuong_thuc (tuyen_sinh_nam_id, phuong_thuc_id),

  CONSTRAINT fk_tspt_tuyen_sinh_nam
    FOREIGN KEY (tuyen_sinh_nam_id) REFERENCES tuyen_sinh_nam(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_tspt_phuong_thuc
    FOREIGN KEY (phuong_thuc_id) REFERENCES phuong_thuc_xet_tuyen(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT chk_tspt_chi_tieu CHECK (chi_tieu IS NULL OR chi_tieu >= 0)
) ENGINE=InnoDB COMMENT='18. Phương thức xét tuyển của ngành tại trường theo năm';


-- ----------------------------------------------------------------------------------------------------
-- 19. tuyen_sinh_to_hop
-- Các tổ hợp được áp dụng cho từng phương thức, có thể công bố trước điểm chuẩn.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tuyen_sinh_to_hop (
  id                          BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  tuyen_sinh_phuong_thuc_id   BIGINT UNSIGNED   NOT NULL         COMMENT 'Phương thức tuyển sinh trong năm',
  to_hop_id                   BIGINT UNSIGNED   NOT NULL         COMMENT 'Tổ hợp được chấp nhận',

  PRIMARY KEY (id),
  UNIQUE KEY uq_tuyen_sinh_to_hop (tuyen_sinh_phuong_thuc_id, to_hop_id),

  CONSTRAINT fk_tsth_phuong_thuc
    FOREIGN KEY (tuyen_sinh_phuong_thuc_id) REFERENCES tuyen_sinh_phuong_thuc(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_tsth_to_hop
    FOREIGN KEY (to_hop_id) REFERENCES to_hop_xet_tuyen(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='19. Tổ hợp môn áp dụng cho từng phương thức';


-- ----------------------------------------------------------------------------------------------------
-- 20. diem_chuan
-- Điểm chuẩn đã công bố; tách riêng theo năm/phương thức/tổ hợp (khi áp dụng).
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diem_chuan (
  id                          BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  tuyen_sinh_phuong_thuc_id   BIGINT UNSIGNED   NOT NULL         COMMENT 'Xác định trường, ngành, năm và phương thức',
  to_hop_id                   BIGINT UNSIGNED   NULL             COMMENT 'Tổ hợp áp dụng; NULL nếu không phân theo tổ hợp',
  diem_chuan                  DECIMAL(7,2)      NOT NULL         COMMENT 'Điểm chuẩn công bố',
  thang_diem                  DECIMAL(7,2)      NOT NULL         COMMENT 'Thang điểm tương ứng, tránh so sánh sai',
  dieu_kien_phu               TEXT              NULL             COMMENT 'Điều kiện phụ hoặc ghi chú điểm chuẩn',
  nguon_thong_tin             VARCHAR(500)      NULL             COMMENT 'Nguồn chính thức công bố điểm chuẩn',
  ngay_cong_bo                DATE              NULL             COMMENT 'Ngày công bố',
  cap_nhat_luc                DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                ON UPDATE CURRENT_TIMESTAMP
                                                                 COMMENT 'Thời điểm cập nhật',

  PRIMARY KEY (id),
  UNIQUE KEY uq_diem_chuan_pt_to_hop (tuyen_sinh_phuong_thuc_id, to_hop_id),

  CONSTRAINT fk_dc_phuong_thuc
    FOREIGN KEY (tuyen_sinh_phuong_thuc_id) REFERENCES tuyen_sinh_phuong_thuc(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_dc_to_hop
    FOREIGN KEY (to_hop_id) REFERENCES to_hop_xet_tuyen(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT chk_dc_diem_chuan CHECK (diem_chuan >= 0),
  CONSTRAINT chk_dc_thang_diem CHECK (thang_diem > 0)
) ENGINE=InnoDB COMMENT='20. Điểm chuẩn công bố theo năm, phương thức và tổ hợp';


-- =====================================================================================================
-- C. TÍNH NĂNG HỌC SINH, AI VÀ DONATE (5 bảng)
-- =====================================================================================================

-- ----------------------------------------------------------------------------------------------------
-- 21. truong_yeu_thich
-- Lưu danh sách trường mà học sinh quan tâm.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS truong_yeu_thich (
  id            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  tai_khoan_id  BIGINT UNSIGNED   NOT NULL                       COMMENT 'Học sinh lưu trường',
  truong_id     BIGINT UNSIGNED   NOT NULL                       COMMENT 'Trường được lưu',
  tao_luc       DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                                 COMMENT 'Thời điểm lưu trường',

  PRIMARY KEY (id),
  UNIQUE KEY uq_tyt_tai_khoan_truong (tai_khoan_id, truong_id),

  CONSTRAINT fk_tyt_tai_khoan
    FOREIGN KEY (tai_khoan_id) REFERENCES tai_khoan(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_tyt_truong
    FOREIGN KEY (truong_id) REFERENCES truong_dai_hoc(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='21. Danh sách trường yêu thích của học sinh';


-- ----------------------------------------------------------------------------------------------------
-- 22. hoi_thoai_ai
-- Mỗi phiên trò chuyện của học sinh với trợ lý AI.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hoi_thoai_ai (
  id            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  tai_khoan_id  BIGINT UNSIGNED   NOT NULL                       COMMENT 'Người sở hữu hội thoại',
  tieu_de       VARCHAR(200)      NULL                           COMMENT 'Tiêu đề tự đặt hoặc tự sinh',
  tao_luc       DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                                 COMMENT 'Thời điểm bắt đầu hội thoại',
  cap_nhat_luc  DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP    COMMENT 'Thời điểm có cập nhật mới',

  PRIMARY KEY (id),

  CONSTRAINT fk_htai_tai_khoan
    FOREIGN KEY (tai_khoan_id) REFERENCES tai_khoan(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='22. Phiên trò chuyện của học sinh với trợ lý AI';

CREATE INDEX idx_htai_user_time ON hoi_thoai_ai (tai_khoan_id, cap_nhat_luc DESC);


-- ----------------------------------------------------------------------------------------------------
-- 23. tin_nhan_ai
-- Lưu nội dung hỏi đáp và nguồn thông tin được dùng trong mỗi lần trả lời.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tin_nhan_ai (
  id              BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  hoi_thoai_id    BIGINT UNSIGNED   NOT NULL                     COMMENT 'Thuộc hội thoại nào',
  vai_tro         ENUM('nguoi_dung','tro_ly')
                                    NOT NULL                     COMMENT 'Phân biệt học sinh và trợ lý AI',
  noi_dung        LONGTEXT          NOT NULL                     COMMENT 'Nội dung câu hỏi hoặc câu trả lời',
  nguon_tham_khao JSON              NULL                         COMMENT 'Các nguồn URL/mã bản ghi được trợ lý tham khảo, nếu có',
  tao_luc         DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                                 COMMENT 'Thời điểm tạo tin nhắn',

  PRIMARY KEY (id),

  CONSTRAINT fk_tnai_hoi_thoai
    FOREIGN KEY (hoi_thoai_id) REFERENCES hoi_thoai_ai(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='23. Tin nhắn hỏi đáp AI';

CREATE INDEX idx_tnai_hoi_thoai ON tin_nhan_ai (hoi_thoai_id, tao_luc ASC);


-- ----------------------------------------------------------------------------------------------------
-- 24. tai_lieu_ai
-- Nguồn tài liệu/FAQ đã kiểm duyệt hỗ trợ AI trả lời các câu hỏi chung.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tai_lieu_ai (
  id            BIGINT UNSIGNED    NOT NULL AUTO_INCREMENT,
  tieu_de       VARCHAR(250)       NOT NULL                      COMMENT 'Chủ đề hoặc tiêu đề tài liệu',
  noi_dung      LONGTEXT           NOT NULL                      COMMENT 'Nội dung tóm tắt/hướng dẫn đã được quản trị viên kiểm tra',
  url_nguon     VARCHAR(500)       NULL                          COMMENT 'Địa chỉ nguồn tham khảo',
  nam_ap_dung   SMALLINT UNSIGNED  NULL                          COMMENT 'Năm áp dụng nếu thông tin phụ thuộc năm',
  trang_thai    ENUM('nhap','da_duyet','an')
                                   NOT NULL DEFAULT 'nhap'       COMMENT 'Chỉ dùng tài liệu đã duyệt để tư vấn',
  cap_nhat_luc  DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP   COMMENT 'Thời điểm cập nhật nội dung',

  PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='24. Nguồn tài liệu/FAQ đã kiểm duyệt cho AI';

CREATE INDEX idx_tlai_trang_thai ON tai_lieu_ai (trang_thai, nam_ap_dung);


-- ----------------------------------------------------------------------------------------------------
-- 25. dong_gop
-- Ghi nhận Donate cho mục đích duy trì/phát triển Triovos.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dong_gop (
  id                  BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  tai_khoan_id        BIGINT UNSIGNED   NULL                     COMMENT 'Người đóng góp nếu có đăng nhập',
  ten_nguoi_dong_gop  VARCHAR(150)      NULL                     COMMENT 'Tên hiển thị của người đóng góp',
  so_tien             DECIMAL(15,0)     NOT NULL                 COMMENT 'Số tiền đóng góp, VNĐ',
  phuong_thuc         ENUM('chuyen_khoan_qr','cong_thanh_toan')
                                        NOT NULL                 COMMENT 'Cách thức đóng góp',
  ma_giao_dich        VARCHAR(150)      NULL                     COMMENT 'Mã giao dịch do cổng thanh toán/hệ thống đối soát cung cấp',
  loi_nhan            VARCHAR(500)      NULL                     COMMENT 'Lời nhắn nếu có',
  trang_thai          ENUM('cho_xac_nhan','thanh_cong','that_bai','da_huy')
                                        NOT NULL DEFAULT 'cho_xac_nhan'
                                                                 COMMENT 'Trạng thái xác thực giao dịch',
  nguoi_xac_nhan_id   BIGINT UNSIGNED   NULL                     COMMENT 'Quản trị viên xác nhận thủ công nếu cần',
  tao_luc             DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                                 COMMENT 'Thời điểm ghi nhận đóng góp',
  xac_nhan_luc        DATETIME          NULL                     COMMENT 'Thời điểm giao dịch được xác nhận',

  PRIMARY KEY (id),
  UNIQUE KEY uq_dong_gop_ma_gd (ma_giao_dich),

  CONSTRAINT fk_dg_tai_khoan
    FOREIGN KEY (tai_khoan_id) REFERENCES tai_khoan(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT fk_dg_nguoi_xac_nhan
    FOREIGN KEY (nguoi_xac_nhan_id) REFERENCES tai_khoan(id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT chk_dg_so_tien CHECK (so_tien > 0)
) ENGINE=InnoDB COMMENT='25. Ghi nhận Donate (có trạng thái xác thực giao dịch)';

CREATE INDEX idx_dg_trang_thai_luc ON dong_gop (trang_thai, tao_luc DESC);


-- =====================================================================================================
-- D. IMPORT EXCEL VÀ NHẬT KÝ XỬ LÝ (2 bảng)
-- =====================================================================================================

-- ----------------------------------------------------------------------------------------------------
-- 26. dot_import
-- Quản lý mỗi lần tải lên và xử lý file Excel.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dot_import (
  id                BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  tai_khoan_id      BIGINT UNSIGNED   NOT NULL                   COMMENT 'Quản trị viên thực hiện',
  ten_tap_tin       VARCHAR(255)      NOT NULL                   COMMENT 'Tên file Excel tải lên',
  loai_du_lieu      ENUM('truong','nganh','truong_nganh','tuyen_sinh','diem_chuan','tong_hop')
                                      NOT NULL                   COMMENT 'Loại dữ liệu trong file',
  nam_tuyen_sinh_id BIGINT UNSIGNED   NULL                       COMMENT 'Năm áp dụng nếu file chứa dữ liệu tuyển sinh',
  trang_thai        ENUM('tai_len','da_kiem_tra','da_nhap','loi')
                                      NOT NULL DEFAULT 'tai_len' COMMENT 'Trạng thái xử lý đợt Import',
  tong_so_dong      INT UNSIGNED      NOT NULL DEFAULT 0         COMMENT 'Tổng số dòng dữ liệu',
  so_them           INT UNSIGNED      NOT NULL DEFAULT 0         COMMENT 'Số bản ghi thêm mới',
  so_cap_nhat       INT UNSIGNED      NOT NULL DEFAULT 0         COMMENT 'Số bản ghi được cập nhật',
  so_bo_qua         INT UNSIGNED      NOT NULL DEFAULT 0         COMMENT 'Số bản ghi bỏ qua',
  so_loi            INT UNSIGNED      NOT NULL DEFAULT 0         COMMENT 'Số dòng bị lỗi',
  tao_luc           DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                                 COMMENT 'Thời điểm tạo đợt Import',
  hoan_thanh_luc    DATETIME          NULL                       COMMENT 'Thời điểm hoàn thành Import',

  PRIMARY KEY (id),

  CONSTRAINT fk_di_tai_khoan
    FOREIGN KEY (tai_khoan_id) REFERENCES tai_khoan(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_di_nam
    FOREIGN KEY (nam_tuyen_sinh_id) REFERENCES nam_tuyen_sinh(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='26. Quản lý mỗi lần tải lên và xử lý file Excel';

CREATE INDEX idx_di_tao_luc ON dot_import (tao_luc DESC);


-- ----------------------------------------------------------------------------------------------------
-- 27. dong_import
-- Kết quả kiểm tra từng dòng trong file Excel phục vụ xem trước và rà soát lỗi.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dong_import (
  id              BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  dot_import_id   BIGINT UNSIGNED   NOT NULL                     COMMENT 'Đợt Import tương ứng',
  so_dong         INT UNSIGNED      NOT NULL                     COMMENT 'Vị trí dòng trong Excel',
  du_lieu_goc     JSON              NULL                         COMMENT 'Dữ liệu đầu vào đã đọc từ dòng Excel',
  ket_qua         ENUM('them_moi','cap_nhat','bo_qua','loi')
                                    NOT NULL                     COMMENT 'Hành động dự kiến/kết quả kiểm tra',
  da_thuc_hien    TINYINT(1)        NOT NULL DEFAULT 0           COMMENT '0: mới xem trước; 1: đã ghi nhận thao tác thành công',
  thong_bao       TEXT              NULL                         COMMENT 'Giải thích dữ liệu trùng hoặc lỗi kiểm tra',

  PRIMARY KEY (id),
  UNIQUE KEY uq_dong_import (dot_import_id, so_dong),

  CONSTRAINT fk_dgi_dot
    FOREIGN KEY (dot_import_id) REFERENCES dot_import(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='27. Kết quả kiểm tra từng dòng trong file Excel';

CREATE INDEX idx_dgi_ket_qua ON dong_import (dot_import_id, ket_qua);


-- =====================================================================================================
-- BẬT LẠI KIỂM TRA KHÓA NGOẠI
-- =====================================================================================================
SET FOREIGN_KEY_CHECKS = 1;


-- =====================================================================================================
-- VIEW HỖ TRỢ TRUY VẤN VÀ BÁO CÁO NGHIỆP VỤ
-- =====================================================================================================

-- View tra cứu điểm chuẩn chi tiết theo trường, ngành, năm và phương thức
CREATE OR REPLACE VIEW v_diem_chuan_chi_tiet AS
SELECT
  dc.id                       AS diem_chuan_id,
  tdh.id                      AS truong_id,
  tdh.ma_truong,
  tdh.ten_truong,
  nh.id                       AS nganh_id,
  nh.ma_nganh,
  nh.ten_nganh,
  nts.nam                     AS nam_tuyen_sinh,
  ptxt.ma_phuong_thuc,
  ptxt.ten_phuong_thuc,
  thxt.ma_to_hop,
  dc.diem_chuan,
  dc.thang_diem,
  dc.dieu_kien_phu,
  dc.nguon_thong_tin,
  dc.ngay_cong_bo
FROM diem_chuan dc
JOIN tuyen_sinh_phuong_thuc tspt ON tspt.id = dc.tuyen_sinh_phuong_thuc_id
JOIN tuyen_sinh_nam tsn          ON tsn.id  = tspt.tuyen_sinh_nam_id
JOIN truong_nganh tn             ON tn.id   = tsn.truong_nganh_id
JOIN truong_dai_hoc tdh          ON tdh.id  = tn.truong_id
JOIN nganh_hoc nh                ON nh.id   = tn.nganh_id
JOIN nam_tuyen_sinh nts          ON nts.id  = tsn.nam_tuyen_sinh_id
JOIN phuong_thuc_xet_tuyen ptxt  ON ptxt.id = tspt.phuong_thuc_id
LEFT JOIN to_hop_xet_tuyen thxt  ON thxt.id = dc.to_hop_id;


-- View gợi ý ngành theo môn thế mạnh học sinh
CREATE OR REPLACE VIEW v_goi_y_nganh_theo_mon AS
SELECT
  hs.tai_khoan_id,
  nh.id           AS nganh_id,
  nh.ma_nganh,
  nh.ten_nganh,
  COUNT(*)        AS so_mon_trung
FROM ho_so_hoc_sinh hs
JOIN hoc_sinh_mon_the_manh hsm  ON hsm.ho_so_id   = hs.id
JOIN nganh_mon_hoc nmh          ON nmh.mon_hoc_id = hsm.mon_hoc_id
JOIN nganh_hoc nh               ON nh.id          = nmh.nganh_id
WHERE nh.trang_thai = 1
GROUP BY hs.tai_khoan_id, nh.id, nh.ma_nganh, nh.ten_nganh;


-- View gợi ý ngành theo sở thích học sinh
CREATE OR REPLACE VIEW v_goi_y_nganh_theo_so_thich AS
SELECT
  hs.tai_khoan_id,
  nh.id           AS nganh_id,
  nh.ma_nganh,
  nh.ten_nganh,
  COUNT(*)        AS so_so_thich_trung
FROM ho_so_hoc_sinh hs
JOIN hoc_sinh_so_thich hsst     ON hsst.ho_so_id  = hs.id
JOIN nganh_so_thich nst         ON nst.so_thich_id = hsst.so_thich_id
JOIN nganh_hoc nh               ON nh.id           = nst.nganh_id
WHERE nh.trang_thai = 1
GROUP BY hs.tai_khoan_id, nh.id, nh.ma_nganh, nh.ten_nganh;


-- View thống kê donate
CREATE OR REPLACE VIEW v_thong_ke_dong_gop AS
SELECT
  COUNT(*)                                                        AS tong_so_giao_dich,
  SUM(CASE WHEN trang_thai = 'thanh_cong' THEN 1 ELSE 0 END)     AS so_thanh_cong,
  SUM(CASE WHEN trang_thai = 'cho_xac_nhan' THEN 1 ELSE 0 END)   AS so_cho_xac_nhan,
  SUM(CASE WHEN trang_thai = 'that_bai' THEN 1 ELSE 0 END)       AS so_that_bai,
  SUM(CASE WHEN trang_thai = 'da_huy' THEN 1 ELSE 0 END)         AS so_da_huy,
  COALESCE(SUM(CASE WHEN trang_thai = 'thanh_cong' THEN so_tien ELSE 0 END), 0) AS tong_tien_thanh_cong
FROM dong_gop;
