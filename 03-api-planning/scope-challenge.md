# Scope challenge — Khắc phục nghiệp vụ Trovio

> Mode: Selective Expansion  
> Mục tiêu: đưa dự án từ prototype giàu tính năng thành pilot có dữ liệu kiểm chứng được.

## What already exists

| Sub-problem | Existing code to reuse |
| --- | --- |
| Catalog publish | `scripts/publish-catalog.ts`, CSV raw, bảng schools/majors/programs |
| Source tracking | `data_sources`, `source_url`, admin sources và audit concept |
| Program/major persistence | `postgres.ts`, `postgres-catalog.ts`, repository interfaces |
| Policy rules | `admission-policy.service.ts`, domain policy, tests 2026 |
| Recommendation | `recommendation.service.ts`, scoring helpers, explanation UI |
| User lifecycle | `auth.service.ts`, users/roles/staff schema |
| Community | Review, QA, survey services; normalized schema đã có sẵn |
| Class privacy | Consent model, audit service, normalized class tables đã có |
| Notifications | Notification/reminder services, timeline and reminder log |
| API migration | `/api/v1`, common response helpers và API client |

## Minimum changes that achieve the goal

1. Hoàn thiện dữ liệu mapping bắt buộc và staging/publish nguyên tử.
2. Xóa mọi default nghiệp vụ giả trong unified entry.
3. Sửa query admin hidden và round-trip persistence.
4. Làm account deletion đầy đủ.
5. Sửa test environment và dựng integration DB.
6. Sửa recommendation ratio/budget/missing-weight.
7. Chuyển policy sang season/version fail-closed.

Các feature mới không chặn pilot nên được defer.

## Complexity check

Toàn bộ remediation chắc chắn chạm hơn 8 file và nhiều service. Đây là dấu hiệu không nên làm trong một PR lớn.

Đề xuất chia thành các vertical slice độc lập:

- Slice 1: catalog staging/publish/version.
- Slice 2: admin catalog round-trip.
- Slice 3: account deletion + privacy.
- Slice 4: community normalization.
- Slice 5: class normalization/concurrency.
- Slice 6: policy + recommendation correctness.
- Slice 7: email/rate-limit/CI.

Mỗi slice có migration, repository, service, route/API compatibility và test riêng.

## Edge cases bắt buộc

- Source mất truy cập sau khi đã publish.
- Hai admin publish đồng thời.
- Một trường đổi mã/tên/ownership giữa mùa.
- Chương trình cùng ngành nhưng khác campus, ngôn ngữ hoặc loại đào tạo.
- Quota chưa công bố và quota bằng 0 là hai trạng thái khác nhau.
- User xóa tài khoản khi đang là teacher/staff, có lớp/share/review/audit.
- Hai học sinh join lớp cùng lúc hoặc cùng user join lặp.
- Policy mùa chưa được publish, đã hết hiệu lực hoặc ở trạng thái draft.
- Recommendation thiếu một phần hồ sơ hoặc chỉ có cutoff ước tính.
- Email provider timeout sau khi notification trong web đã được tạo.

## API implications

- Catalog response cần `season`, `catalogVersion`, `source`, `verifiedAt`, `freshness`.
- Giá trị chưa biết dùng `null`, không dùng 0 hoặc chuỗi mặc định.
- Eligibility response nên là discriminated union: `eligible | ineligible | unknown` và có `reasons[]`.
- Mutating API cần idempotency key cho import/publish/reminder.
- Error envelope dùng một chuẩn cho cả legacy và `/api/v1` trước khi mở rộng versioning.
- Admin list có tham số trạng thái rõ, không tái dùng query public.

## Completeness check

Một slice chỉ được coi là xong khi có:

- Migration có rollback hoặc chiến lược forward-fix.
- Backfill dữ liệu hiện có và báo cáo record lỗi.
- Contract test API.
- Integration test PostgreSQL cho constraint/transaction/cascade.
- Audit log và authorization test cho thao tác admin.
- Tài liệu vận hành và metric/alert tối thiểu.

## Feature expansion opportunities

Sau remediation, có thể cherry-pick:

1. Data trust center — effort M, risk Low, ưu tiên cao.
2. Eligibility engine — effort L, risk Medium, ưu tiên cao.
3. Admission-season workspace — effort M, risk Medium, ưu tiên cao.
4. Change alerts — effort M, risk Medium, ưu tiên cao.
5. Financial-aid matcher — effort M, risk Medium, defer.
6. Verified alumni/student levels — effort L, risk Medium, defer.

## NOT in scope

- Đổi Next.js, React hoặc PostgreSQL.
- Microservice hóa.
- GraphQL chỉ để thay REST hiện có.
- ML ranking/prediction trước khi có dataset sạch và benchmark.
- Mobile app native hoặc Zalo Mini App đầy đủ.
- Kết nối nộp nguyện vọng chính thức.
- Sửa toàn bộ UI/branding.

