# Cơ sở dữ liệu Trovio (PostgreSQL)

## Dataset tuyển sinh toàn quốc (19 bảng mới, BIGINT)

Không tuyên bố đủ toàn quốc cho đến khi `coverage_report.md` + `unverified_records.csv` chứng minh độ phủ.

| Tệp / lệnh | Vai trò |
| --- | --- |
| `schema.sql` | App (TEXT PK) + 19 bảng dataset (BIGINT IDENTITY) |
| `DATA_DICTIONARY.md` / `ERD.md` | Từ điển + sơ đồ |
| `csv/` | CSV UTF-8 import; `institutions_raw.csv` là crawl MOET |
| `npx tsx scripts/crawl-moet.ts --all` | Crawl danh bạ MOET (~327 CSGD) |
| `npx tsx scripts/transform-admissions.ts` | Map raw → `institutions.csv` (không bịa ownership/điểm) |
| `npx tsx scripts/import-admissions.ts --dry-run` | Upsert transaction, không xóa dữ liệu cũ |
| `npx tsx scripts/validate-admissions.ts` | FK, khóa 7 chiều, thang điểm, thiếu source |

Provenance: 2026 chưa công bố → `score=NULL, status=not_announced`. Không copy 2025→2026. Không gộp thang 30/40/150/1200/100.

Bản thiết kế quan hệ **chuẩn hoá theo mã nguồn hiện tại**. Web demo đang lưu bằng file JSON (`.data/trovio-db.json`) và dữ liệu gốc trong `src/data/*.ts`. Thư mục này là lược đồ để chuyển sang PostgreSQL khi triển khai thật.

| Tệp | Nội dung |
| --- | --- |
| `schema.sql` | 79 bảng, 4 view, 2 hàm nghiệp vụ, trigger kiểm tra dữ liệu (schema `trovio`) |
| `seed.sql` | **Tự sinh** từ code bằng `npx tsx scripts/export-sql.ts > database/seed.sql`: danh mục, 16 trường, 22 ngành, 52 chương trình, 204 điểm chuẩn, 60 câu RIASEC, 12 câu mini-test, tài khoản demo… |

```bash
createdb trovio
psql -d trovio -f database/schema.sql
npx tsx scripts/export-sql.ts > database/seed.sql   # chạy lại mỗi khi dữ liệu trong src/data đổi
psql -d trovio -f database/seed.sql
```

Đã kiểm tra trên PostgreSQL 16: nạp không lỗi. `admission_score()` và `fit_level()` cho kết quả giống `scoring.service.ts` (VD 24 điểm, KV1 + UT1 → ưu tiên 2,20, tổng 26,20). `v_verification_progress` cho 2 / 47 / 3, khớp màn A01. Test `tests/sql-schema.test.ts` báo lỗi nếu code thêm giá trị mới mà SQL chưa cập nhật.

## Nhóm bảng

1. **Danh mục tham chiếu:** `regions` (miền của trường), `priority_regions` (KV1…KV3, điểm cộng), `priority_groups` (UT1/UT2), `admission_methods` (thang 30/150/1200), `subjects`, `combos`, `combo_subjects`, `riasec_types`, `work_axes`, `system_roles`.
2. **Tuyển sinh:** `major_groups`, `schools`, `school_campuses`, `majors`, `major_riasec`, `major_curriculum_blocks/items`, `major_careers`, `programs`, `program_combos`, `program_admission_methods`, `program_cutoffs`, `program_verified_fields`.
3. **Tài khoản:** `users`, `user_system_roles`, `school_staff`, `user_sessions`.
4. **Dữ liệu cá nhân (đồng bộ đa thiết bị):** `score_profiles` (+ `_subjects`, `_regions`, `_school_types`, `_major_groups`), `saved_programs`, `wishlist_items`, `quiz_results`, `quiz_result_scores`, `goals`, `goal_regions`, `work_styles`, `mbti_codes`.
5. **Trắc nghiệm:** `riasec_questions`, `riasec_type_weights`, `work_style_questions`, `major_group_work_styles`, `major_work_styles`.
6. **Gợi ý (A09):** `recommend_weights`, `recommend_rules`, `recommend_rule_params`.
7. **Việc làm:** `data_sources`, `major_outcomes`, `school_outcomes`, `benchmarks`.
8. **Mốc tuyển sinh:** `timeline_config`, `timeline_events`, `deadline_reminders`, `reminder_log`.
9. **Cộng đồng:** `school_reviews`, `review_flags`, `review_helpful_votes`, `review_reports`, `qa_questions`, `qa_answers`, `qa_answer_helpful_votes`, `qa_answer_reports`, `outcome_surveys`.
10. **Chia sẻ & lớp học:** `shares`, `share_comments`, `teacher_classes`, `class_members`.
11. **Vận hành:** `data_reports`, `notifications`, `audit_logs`, `audit_changes`, `import_batches`, `school_submissions`, `chat_aliases`, `chat_logs`, `analytics_events`, `sus_responses`.

## Đối chiếu với ERD cũ

| ERD cũ | Bảng mới | Thay đổi |
| --- | --- | --- |
| `truong` | `schools` (+ `school_campuses`) | thêm `slug`, `type`, `short_name`, `hidden`; `khu_vuc_id` → `region_code` (miền) |
| `khu_vuc` | `regions` + `priority_regions` | tách **miền của trường** và **khu vực ưu tiên của thí sinh** |
| `nganh`, `nhom_nganh` | `majors`, `major_groups` | mã ngành 7 số, `demand`, `growth`, `hidden` |
| `riasec_nhom_nganh` | `major_riasec` | RIASEC gắn **theo ngành** (3 nhóm có thứ tự), không theo nhóm ngành |
| `truong_nganh` | `programs` | thêm chỉ tiêu, số năm, cơ sở, nguồn https, ngày xác minh |
| — | `program_combos`, `program_admission_methods` | tổ hợp và phương thức của từng chương trình |
| `diem_chuan` | `program_cutoffs` | khoá (chương trình, phương thức, năm), cờ `is_estimated`, trigger chặn vượt thang |
| `hoc_phi` | `programs.tuition_min/max` | web dùng khoảng học phí/năm theo chương trình |
| `phuong_thuc_xet_tuyen` | `admission_methods` | thêm thang điểm, hệ số quy đổi ưu tiên |
| `doi_tuong_uu_tien` | `priority_groups` | theo quy chế: UT1 +2, UT2 +1 |
| `thi_sinh` | `users` (+ `score_profiles`) | không thu giới tính / ngày sinh; có năm tốt nghiệp, tỉnh, cờ dưới 16 tuổi |
| `diem_thi`, `ket_qua_to_hop` | `score_profile_subjects`, `score_profiles` | lưu phương thức, tổng, điểm ưu tiên, `reduced` |
| `nguyen_vong` | `wishlist_items` | thứ tự + ghi chú, luôn nằm trong `saved_programs` |
| `yeu_thich_truong_nganh` | `saved_programs` | |
| `so_sanh`, `chi_tiet_so_sanh` | (không lưu) | so sánh tối đa 3 chương trình, chỉ lưu trên trình duyệt |
| `lan_lam_test`, `cau_tra_loi`, `dap_an_test` | (không lưu) | bài làm dở lưu trên trình duyệt; server chỉ lưu kết quả |
| `ket_qua_riasec`, `ket_qua_riasec_chi_tiet` | `quiz_results`, `quiz_result_scores` | |
| `ket_qua_tu_van`, `chi_tiet_tu_van` | (không lưu) | gợi ý tính trực tiếp từ hồ sơ + `recommend_weights` / `recommend_rules` |
| `lich_su_xem`, `yeu_thich_truong`, `thi_sinh_mon_yeu_thich` | (bỏ) | web không có chức năng này |
| `roles`, `permissions`, `admins` | `system_roles`, `user_system_roles`, `school_staff` | quyền trong code: admin, kiểm duyệt viên, cán bộ tuyển sinh |
