# Báo cáo rà soát nghiệp vụ dự án Trovio

> Ngày rà soát: 13/10/2026  
> Kết luận ngắn: **Khả thi về sản phẩm, chưa đủ điều kiện vận hành công khai như một nguồn tư vấn tuyển sinh chính thức.**  
> Điểm hỏng lớn nhất: **chuỗi tin cậy dữ liệu từ nguồn chính thức → kiểm duyệt → database → thuật toán → giao diện chưa khép kín.**

## 1. Phạm vi rà soát

Đã rà soát các phần có ảnh hưởng tới nghiệp vụ:

- Toàn bộ cây route trong `src/app`, controller, service, domain/model, repository và thư viện dùng chung.
- Cấu trúc PostgreSQL trong `database/schema.sql`, migration runtime, pipeline CSV và các script publish.
- Luồng người dùng, quản trị, trường học, giáo viên, cộng đồng, gợi ý, tính điểm, thông báo và xóa tài khoản.
- README, tài liệu kiến trúc/API và danh sách kiểm thử tự động.
- Đối chiếu các quy tắc tuyển sinh 2026 với Thông tư 06/2026/TT-BGDĐT từ Cổng văn bản Chính phủ.

Không coi `node_modules`, `.next`, file sinh tự động và nội dung nhị phân `.docx` là mã nghiệp vụ. Báo cáo cũ ở thư mục gốc có nhiều mô tả không còn đúng với kiến trúc PostgreSQL-only hiện tại, vì vậy không được dùng làm nguồn kết luận.

## 2. Đánh giá tính khả thi

| Hạng mục | Điểm | Nhận định |
| --- | ---: | --- |
| Ý tưởng và nhu cầu người dùng | 8/10 | Đúng vấn đề: học sinh cần gom dữ liệu, tính điểm, so sánh và lập nguyện vọng. |
| Độ đầy đủ tính năng prototype | 8/10 | Phạm vi rộng, đã có hầu hết luồng chính và cả công cụ quản trị. |
| Kiến trúc ứng dụng | 7/10 | Đã có phân lớp MVC/service/repository và PostgreSQL-only; còn hai mô hình lưu trữ chạy song song. |
| Chất lượng dữ liệu thật | 3/10 | Có dữ liệu thô lớn nhưng chưa publish được; thiếu mapping ngành, loại trường và chỉ tiêu. |
| Độ đúng của quyết định/gợi ý | 4/10 | Có giải thích và cảnh báo, nhưng công thức còn dùng giá trị mặc định và sai số liệu độ tin cậy. |
| Tính toàn vẹn và quyền riêng tư | 4/10 | Schema quan hệ tốt nhưng nhiều luồng thực tế đi qua JSONB không có khóa ngoại/cascade. |
| Khả năng vận hành production | 4/10 | Email chưa gửi thật, rate limit cục bộ, cache không đồng bộ, test suite đang không chạy trọn vẹn. |

### Kết luận khả thi

- **Khả thi để tiếp tục đầu tư:** có nền sản phẩm, UI và mô hình nghiệp vụ đủ tốt để sửa thay vì viết lại.
- **Khả thi để pilot kín:** sau khi hoàn thành các mục P0 và dùng tập dữ liệu đã được kiểm định.
- **Chưa khả thi để công bố đại trà:** hiện hệ thống có thể tạo hoặc hiển thị dữ liệu có vẻ “thật” nhưng không có đủ chứng cứ, làm sai lệch quyết định chọn ngành/trường.
- **Không cần đổi framework hoặc viết lại frontend.** Cần ưu tiên data governance, toàn vẹn database và kiểm định thuật toán.

## 3. Những gì đã có

| Bài toán | Phần đã có |
| --- | --- |
| Tra cứu trường/ngành/chương trình | Trang tìm kiếm, chi tiết, so sánh; `program.service.ts`, `catalog.service.ts` |
| Tính điểm | THPT, học bạ, HSA, ĐGNL HCM, TSA, điểm ưu tiên; `scoring.service.ts` |
| Gợi ý | RIASEC, điểm, vùng, nhóm ngành, ngân sách, giải thích; `recommendation.service.ts` |
| Lập nguyện vọng | Lưu, sắp xếp, cảnh báo chiến lược, chia sẻ phụ huynh |
| Lịch tuyển sinh | Timeline, nhắc hạn, calendar, quản trị mốc |
| Cộng đồng | Cảm nhận, hỏi đáp, báo cáo nội dung, khảo sát kết quả |
| Kênh giáo viên | Xác minh, tạo lớp, consent chia sẻ theo trường dữ liệu |
| Kênh trường | Cán bộ trường xác nhận hoặc đề nghị sửa dữ liệu |
| Quản trị | Catalog, nhập liệu, nguồn, audit, người dùng, quy tắc gợi ý |
| Dữ liệu | PostgreSQL schema khá đầy đủ, CSV thô 327 trường, 5.570 chương trình, 22.160 dòng điểm chuẩn |
| API | Nhiều route nghiệp vụ; API `/api/v1` đã bắt đầu chuẩn hóa cho catalog |

## 4. Điểm hỏng lớn nhất

### Chuỗi tin cậy dữ liệu chưa khép kín

Luồng mong muốn phải là:

`nguồn chính thức → bản ghi nguồn → dữ liệu theo mùa → kiểm duyệt → publish nguyên tử → API → thuật toán → giao diện kèm nguồn`

Hiện tại luồng bị gãy ở nhiều điểm:

1. Pipeline không có `database/csv/fields_of_study.csv`, nên chủ động dừng ở `database/scripts/publish-catalog.ts:106-110`.
2. Cả 327 trường trong `institutions.csv` đang trống `ownership`; cả 5.570 chương trình đang trống `quota`.
3. Form nhập hợp nhất tự gán thành phố, loại trường, mã ngành ngẫu nhiên, tổ hợp, chỉ tiêu và thời lượng học.
4. Một số chi tiết ngành và phương thức tuyển sinh không được lưu/đọc đầy đủ.
5. Thuật toán vẫn xếp hạng khi thiếu dữ liệu bằng các điểm mặc định.

Vì vậy, vấn đề cốt lõi không phải thiếu thêm màn hình mà là **không chứng minh được dữ liệu nào là thật, thuộc mùa nào, ai xác nhận, và thay đổi từ nguồn nào**.

## 5. Lỗi P0 — phải sửa trước khi pilot

### P0-01 — Không thể publish catalog thật đầy đủ

**Bằng chứng**

- `database/scripts/publish-catalog.ts:106-110` dừng khi thiếu `fields_of_study.csv`.
- Audit CSV ngày 13/10/2026: 327/327 trường thiếu `ownership`; 5.570/5.570 chương trình thiếu `quota`.

**Tác động**

- Database không có catalog production đáng tin cậy.
- Nếu nới validation để chạy cho xong, dữ liệu loại trường/ngành/chỉ tiêu sẽ sai.

**Gợi ý sửa**

- Tạo bảng mapping ngành chính thức có `code`, `name`, `group`, nguồn và ngày hiệu lực.
- Bổ sung loại hình sở hữu từ nguồn chính thức; cho phép `unknown` có nhãn “chưa xác minh”, không tự đoán.
- Cho `quota` là `null` nếu chưa công bố; không biến “chưa có” thành `0` hoặc một con số giả.
- Publish vào bảng staging, chạy validation, rồi chuyển phiên bản catalog trong một transaction.

### P0-02 — Luồng nhập liệu tạo dữ liệu giả có vẻ hợp lệ

**Bằng chứng**

- Thành phố mặc định Hà Nội: `src/services/unified-entry.service.ts:94`.
- Loại trường mặc định công lập: `src/services/unified-entry.service.ts:108`.
- Mã ngành 7 số ngẫu nhiên: `src/services/unified-entry.service.ts:153`.
- Nhóm ngành/RIASEC mặc định: `src/services/unified-entry.service.ts:152-161`.
- Tổ hợp `A00`, `D01`, thời lượng 4 năm, chỉ tiêu 100: `src/services/unified-entry.service.ts:280-286`.
- Mô tả chương trình được tự tạo: `src/services/unified-entry.service.ts:297-299`.

**Tác động**

- Vi phạm yêu cầu “toàn bộ dữ liệu thật lưu trong database”.
- Người dùng không phân biệt được giá trị do nguồn công bố và giá trị hệ thống tự đoán.

**Gợi ý sửa**

- Trường bắt buộc thiếu dữ liệu phải trả lỗi hoặc lưu `null + verification_status=pending`.
- Không sinh mã ngành nghiệp vụ ngẫu nhiên. ID kỹ thuật có thể dùng UUID, nhưng mã ngành phải đến từ nguồn.
- Mọi bản ghi nhập tay phải có `source_id`, `source_url`, `season`, `effective_at`, người nhập và người duyệt.

### P0-03 — Quản trị viên không xem được bản ghi đã ẩn để khôi phục

**Bằng chứng**

- Repository công khai luôn lọc `WHERE NOT hidden`: `database/repositories/postgres.ts:74`, `164`, `181`.
- Repository quản trị lại gọi trực tiếp repository công khai: `database/repositories/postgres-catalog.ts:152-158`.

**Tác động**

- Chức năng “tạm ẩn/khôi phục” chỉ làm được nửa đầu.
- Bản ghi bị ẩn biến mất khỏi chính trang quản trị.

**Gợi ý sửa**

- Tách `findPublished()` và `findAllForAdmin()`; query quản trị không lọc `hidden`.
- Thêm test: ẩn → không xuất hiện public → vẫn xuất hiện admin → khôi phục → xuất hiện public.

### P0-04 — Mất dữ liệu ngành và phương thức khi lưu/đọc

**Bằng chứng**

- Loader luôn trả `curriculum: []`, `careers: []`: `database/repositories/postgres.ts:197-202`.
- `saveMajor()` chỉ lưu bảng ngành và RIASEC: `database/repositories/postgres-catalog.ts:90-112`.
- `createProgram()` lưu chương trình, tổ hợp, điểm chuẩn nhưng không lưu `program_admission_methods`: `database/repositories/postgres-catalog.ts:115-148`.

**Tác động**

- Nội dung chương trình và nghề nghiệp biến mất sau khi restart/đọc lại.
- Chương trình mới có thể không còn phương thức tuyển sinh dù service vừa tạo một phương thức.

**Gợi ý sửa**

- Lưu/đọc toàn bộ aggregate trong cùng transaction.
- Thêm round-trip test: object trước lưu phải tương đương object sau đọc.

### P0-05 — Database có schema quan hệ nhưng runtime bỏ qua

**Bằng chứng**

- Schema đã có bảng quan hệ cho review, QA, survey, share, class, notification, chat log: `database/schema.sql:687-872`, `955-962`.
- Runtime lại lưu các đối tượng trên vào `app_documents`: `database/repositories/postgres-documents.ts:149-249`, `295-358`.
- Migration `database/migrations/20261013_postgres_runtime.sql:6-23` không đặt khóa ngoại cho `owner_id`, `parent_id`.

**Tác động**

- Không có FK, unique constraint, cascade và kiểm tra miền giá trị ở DB.
- Xóa user/program có thể để lại dữ liệu mồ côi.
- Cập nhật lớp theo kiểu đọc-sửa-ghi có thể mất dữ liệu khi hai người thao tác đồng thời.

**Gợi ý sửa**

- Di chuyển trước các aggregate nhạy cảm: `user-data`, review, QA, class/member, share/comment, notification, outcome survey.
- JSONB chỉ giữ cấu hình mềm hoặc snapshot có version; không dùng thay cho bảng quan hệ đã tồn tại.

### P0-06 — Xóa tài khoản không xóa hoặc ẩn danh đầy đủ dữ liệu cá nhân

**Bằng chứng**

- `deleteAccount()` chỉ gọi `repositories.users.delete(id)`: `src/services/auth.service.ts:397-398`.
- `user-data` có hàm delete riêng nhưng không được gọi: `database/repositories/postgres-documents.ts:141-146`.
- Các document khác chứa `owner_id` nhưng không có FK/cascade.

**Tác động**

- Dữ liệu cá nhân, lớp học, chia sẻ, bình luận, review, survey hoặc notification có thể còn sau khi tài khoản bị xóa.
- README đang tuyên bố “xóa tài khoản xóa cảm nhận”, nhưng runtime hiện tại không bảo đảm điều đó.

**Gợi ý sửa**

- Xây `AccountDeletionService` chạy transaction và có policy rõ: xóa, ẩn danh hay giữ vì audit.
- Có báo cáo dry-run số bản ghi sẽ bị tác động và integration test cascade.

### P0-07 — Bộ kiểm thử không chạy đầy đủ

**Bằng chứng**

- `npm run typecheck`: đạt.
- `npm test`: 15 test độc lập đạt, 14 nhóm/test lỗi khi import vì thiếu module `server-only`.
- Lỗi bắt đầu từ `src/lib/server-env.ts` và lan tới mọi test dùng repository/service.

**Tác động**

- Không có quality gate đáng tin cậy cho các thay đổi nghiệp vụ.
- Những test quan trọng về auth, catalog, RIASEC, teacher privacy và schema không thực thi.

**Gợi ý sửa**

- Sửa test environment để resolve `server-only` đúng cách hoặc tách module kiểm tra env khỏi marker dành cho Next bundler.
- CI phải chạy typecheck, unit, integration PostgreSQL riêng và build; không cho merge khi thiếu một gate.

## 6. Lỗi P1 — rủi ro nghiệp vụ cao

### P1-01 — Công thức độ tin cậy có thể đếm trùng dữ liệu ước tính

`src/services/recommendation.service.ts:255-260` lấy `program.cutoffs` rồi cộng số dòng `estimated` với `view.cutoffEstimated`. Hai giá trị có thể chỉ cùng một điểm chuẩn mới nhất, khiến `estimatedDataRatio` lớn hơn 1. Đồng thời, khi người dùng chọn phương thức khác THPT, thống kê vẫn dùng lịch sử THPT.

**Sửa:** lấy đúng series theo phương thức đang xét, mỗi bản ghi chỉ đếm một lần; chặn ratio trong `[0,1]`; thêm test cho THPT, HSA, HCM, TSA và học bạ.

### P1-02 — Xếp hạng khi thiếu dữ liệu bằng điểm mặc định tùy ý

Khi thiếu dữ liệu, hệ thống vẫn dùng `fit=50`, `interest=50`, `place=40`, `group=30`: `src/services/recommendation.service.ts:161`, `190-210`. Tiêu chí được gắn “missing” nhưng vẫn tham gia tổng điểm đầy đủ.

**Tác động:** hai học sinh chưa nhập thông tin vẫn nhận thứ tự có vẻ chính xác.

**Sửa:** renormalize trọng số trên các tiêu chí có dữ liệu; nếu bằng chứng dưới ngưỡng thì trả danh sách khám phá, không gọi là “phù hợp”.

### P1-03 — Bộ lọc ngân sách dùng học phí tối thiểu nhưng diễn đạt như toàn bộ khoảng nằm trong ngân sách

- Search chỉ xét `tuitionMin`: `src/services/program.service.ts:90-93`.
- Gợi ý cũng chỉ chặn theo `tuitionMin`: `src/services/recommendation.service.ts:156-157`.
- Lời giải thích lại ghi cả khoảng `min–max ≤ ngân sách`: `src/services/recommendation.service.ts:313`.

**Sửa:** cho người dùng chọn “chắc chắn không vượt” (`tuitionMax <= budget`) hoặc “có phương án trong ngân sách” (`tuitionMin <= budget`), và diễn đạt đúng lựa chọn.

### P1-04 — Nhãn An toàn/Vừa sức/Thử sức là heuristic chưa được hiệu chuẩn

Ngưỡng cố định `+1` và `-0.5` ở `src/services/scoring.service.ts:218-223` chỉ so với điểm chuẩn gần nhất. Chỉ tiêu, độ biến động, thay đổi phương thức và phân phối điểm không tham gia quyết định nhãn.

**Sửa:** gọi đây là “khoảng cách so với điểm chuẩn gần nhất”; chỉ gắn mức rủi ro khi đủ 3 năm dữ liệu cùng phương thức. Không diễn đạt thành xác suất trúng tuyển nếu chưa có mô hình được kiểm định.

### P1-05 — Policy theo mùa bị đóng cứng và fallback im lặng

- Nhiều API/service mặc định mùa 2026.
- Mùa không tồn tại tự rơi về policy 2026: `src/services/admission-policy.service.ts:124-130`.
- Ngày kiểm tra hiệu lực mặc định `2026-10-11`: `src/services/admission-policy.service.ts:140-142`.
- Giới hạn 15 nguyện vọng còn lặp ở `src/services/user-data.service.ts:11-13`.

**Tác động:** bước sang mùa mới, hệ thống có thể áp quy định cũ nhưng vẫn trả kết quả hợp lệ.

**Sửa:** policy lưu trong DB theo season/version/status; mùa không có policy phải fail-closed; một nguồn quy tắc duy nhất.

### P1-06 — Ngưỡng học bạ 16 điểm đang được áp như quy tắc chung

`OFFICIAL_POLICY_2026` đặt `transcriptMinimumThptScore: 16.0` tại `src/services/admission-policy.service.ts:23`, và validator dùng trực tiếp tại `217-224`.

Trong Thông tư 06/2026, nguồn tuyển chung là 15 điểm; nhóm đào tạo giáo viên, sức khỏe và pháp luật có ngưỡng riêng 16,5 hoặc 18 tùy trường hợp. Vì vậy một số 16 chung vừa có thể chặn hồ sơ hợp lệ, vừa có thể cho qua hồ sơ thuộc nhóm cần ngưỡng cao hơn.

**Sửa:** điều kiện phải thuộc `program + admission_method + season + candidate_category`, không đặt một số toàn cục.

Nguồn kiểm tra: [Thông tư 06/2026/TT-BGDĐT, Cổng văn bản Chính phủ](https://vanban.chinhphu.vn/?docid=217071&orggroupid=4&pageid=27160).

### P1-07 — Chính sách quy đổi chứng chỉ chưa đủ khả năng kiểm toán

`src/services/certificate-policy.service.ts:11-91` gắn nhãn “verified” cho NEU/HUST/FTU nhưng URL chỉ là trang tuyển sinh chung, không phải tài liệu cụ thể; `findPolicy()` còn khớp mã trường bằng substring hai chiều tại `119-122`.

**Sửa:** lưu ID trường chuẩn, URL tài liệu trực tiếp, checksum/snapshot, ngày hiệu lực và người duyệt; chỉ exact-match ID. Nếu tài liệu hết hạn hoặc không truy cập được thì từ chối quy đổi.

### P1-08 — Khảo sát kết quả học tập không chứng minh người trả lời đã học chương trình

- Bất kỳ email đã xác thực nào cũng có thể chọn bất kỳ chương trình: `src/services/community.service.ts:249-252`.
- Cohort sai bị thay bằng `năm hiện tại - 1`: `260-272`.
- Mỗi user/program chỉ trả lời một lần vĩnh viễn, nhưng cron mời trả lời lại mỗi năm: `262`, `280-296`.

**Sửa:** xác minh quan hệ học tập; dữ liệu sai phải báo lỗi; mô hình survey theo wave/year với unique `(user, program, survey_year)`.

### P1-09 — Review và hỏi đáp có huy hiệu tin cậy cao hơn mức xác minh thật

- QA tin email trùng domain website là sinh viên: `src/services/community.service.ts:85-90`.
- Website rỗng/sai làm `new URL()` ném lỗi 500.

**Sửa:** tách ba mức “tự khai”, “email trường”, “đã xác minh theo chương trình”; bắt lỗi URL; không gọi chung là “sinh viên thật”.

### P1-10 — Email nhắc hạn chưa gửi thật nhưng hệ thống vẫn ghi đã gửi

- `mailer.ts` chỉ in toàn bộ email/link ra log: `src/services/mailer.ts:1-14`.
- Lỗi gửi bị nuốt: `src/services/notification.service.ts:37-42`.
- Reminder vẫn thêm log chống gửi trùng và tăng `sent`: `src/services/reminder.service.ts:41-50`.

**Tác động:** người dùng không nhận email và hệ thống không retry; OTP/reset link còn có thể xuất hiện trong log.

**Sửa:** provider email thật, outbox/job retry, trạng thái `queued/sent/failed`, không log token nhạy cảm.

### P1-11 — Cập nhật user không nguyên tử và làm mất metadata duyệt cán bộ trường

`syncUserAccess()` xóa rồi chèn lại vai trò/staff tại `database/repositories/postgres.ts:400-420`, không giữ `reviewed_by`; schema có cột này tại `database/schema.sql:351`. Cập nhật bảng user và sync quyền là hai transaction khác nhau tại `475-505`.

**Sửa:** một transaction cho user + roles + staff; update delta thay vì xóa/chèn; giữ nguyên reviewer metadata khi chỉ đổi profile.

### P1-12 — Cache catalog không nhận thay đổi từ pipeline hoặc instance khác

Cache module chỉ nạp một lần, chỉ invalidated bởi các hàm admin trong cùng process: `database/repositories/postgres.ts:153-217`, `database/repositories/postgres-catalog.ts:87`, `112`, `149`.

**Sửa:** catalog version trong DB; cache key theo version hoặc TTL ngắn; publish phát notification/invalidation cho mọi instance.

### P1-13 — Build có thể “xanh” dù cấu hình database bắt buộc đang thiếu

`npm run build` hoàn tất 117 route dù trong bước tạo page data có nhiều lỗi `[config] Thiếu biến môi trường bắt buộc DATABASE_URL`. Điều này có nghĩa artefact deploy có thể được tạo thành công trong khi runtime catalog chắc chắn không hoạt động.

**Sửa:** thêm preflight production riêng kiểm tra env và kết nối/readiness database; CI/deploy phải chạy preflight trước build hoặc trước promote, không dựa riêng vào exit code của `next build`.

## 7. Lỗi P2 — cần xử lý trước khi mở rộng quy mô

1. **Fallback quan hệ giả:** thiếu school/major được thay bằng “Đại học”, “Ngành đào tạo”, nhóm `cntt` tại `src/services/program.service.ts:40-82`. Nên quarantine bản ghi lỗi thay vì hiển thị dữ liệu giả.
2. **Scoring nhận input sai:** `rawTotal` thiếu thành 0; weighted combo chấp nhận nhiều hơn 3 môn vì chỉ kiểm tra `< 3`: `src/controllers/scoring.controller.ts:27-39`, `122-127`.
3. **Tie-breaker do client tự gửi:** tiêu chí phụ không được lấy từ policy của chương trình; kết quả không thể coi là eligibility chính thức.
4. **Năm điểm chuẩn ở Cổng trường:** sửa cutoff dùng năm của phần tử đầu hoặc 2025: `src/services/school-portal.service.ts:44-49`, không dùng mùa tuyển sinh đang hoạt động.
5. **Mã lớp và member update có race condition:** check-then-create và read-modify-write trên JSON document: `src/services/class.service.ts:98-117`, `155-171`; schema quan hệ đã có unique code nhưng runtime không dùng.
6. **Xác minh giáo viên chỉ dựa vào ghi chú:** `src/services/teacher-verification.service.ts:27-58` chưa có file bằng chứng, domain công vụ hoặc trạng thái kiểm tra nguồn.
7. **Rate limit không chia sẻ:** cả `MemoryRateLimitStore` và `SharedRateLimitStore` đều là `Map` trong process; interface cho Promise nhưng `rateLimit()` ép thành number: `src/lib/rate-limit.ts:8-89`.
8. **Session production không fail-fast:** thiếu secret sẽ sinh khóa tạm, làm mọi phiên mất khi restart: `src/services/session.service.ts:12-24`.
9. **Pagination che lỗi URL:** page ngoài phạm vi bị ép về trang cuối: `src/services/program.service.ts:139-141`; API thường nên trả trang rỗng hoặc lỗi rõ.
10. **Tính năng không có quy trình cấp dữ liệu:** FAQ, hỗ trợ tài chính và đợt bổ sung chỉ có reader; không thấy writer/admin workflow tương ứng.
11. **API chưa thống nhất:** `/api/v1` mới bao phủ catalog; các API còn lại dùng nhiều response shape khác nhau, làm FE khó xử lý lỗi nhất quán.
12. **Tài liệu lệch code:** README vẫn nhắc `database/seeds/*`, dữ liệu demo và JSON/in-memory dù runtime hiện đã PostgreSQL-only.

## 8. Những điểm nghiệp vụ đang làm đúng

- Không tự fallback về catalog mẫu khi database rỗng; publish thiếu mapping ngành chủ động dừng.
- Có phân biệt điểm ước tính và điểm chính thức trong domain.
- Có disclaimer kết quả gợi ý không phải cam kết trúng tuyển.
- Chính sách ưu tiên khu vực/đối tượng và công thức giảm ưu tiên từ 22,5 được triển khai rõ.
- Các quy tắc 2026 về tối đa 15 nguyện vọng và ngành đào tạo giáo viên ở NV 1–5 phù hợp văn bản chính thức.
- Có moderation, audit concept, consent theo trường dữ liệu và giới hạn link nội bộ.
- PostgreSQL schema đã thể hiện khá đầy đủ quan hệ cần thiết; phần lớn công việc là nối runtime đúng vào schema đó.

## 9. Chức năng nên bổ sung

Không nên thêm đồng loạt. Bốn chức năng đầu mang lại giá trị cao nhất sau khi hoàn tất P0.

| Ưu tiên | Chức năng | Giá trị | Điều kiện trước |
| --- | --- | --- | --- |
| F1 | **Trung tâm độ tin cậy dữ liệu** | Hiện nguồn, mùa, ngày cập nhật, trạng thái xác minh, dữ liệu sắp hết hạn; admin thấy coverage và lỗi nguồn. | P0-01 đến P0-05 |
| F2 | **Kiểm tra điều kiện xét tuyển theo chương trình/phương thức** | Trả `đủ / thiếu / chưa xác định` cùng điều kiện và nguồn; hữu ích hơn chỉ so điểm chuẩn. | Policy/version và methods chuẩn |
| F3 | **Workspace mùa tuyển sinh** | Mỗi mùa có policy, lịch, chỉ tiêu, phương thức, cutoff, snapshot và publish riêng; không ghi đè lịch sử. | Catalog versioning |
| F4 | **Cảnh báo thay đổi có giải thích** | Báo khi trường đổi tổ hợp, học phí, chỉ tiêu, mốc hoặc phương thức; hiện trước/sau và nguồn. | Audit + outbox email |
| F5 | Ghép học bổng/hỗ trợ tài chính | Match điều kiện thực, thời hạn, hồ sơ và nguồn; không chỉ hiển thị danh sách tĩnh. | Writer/admin workflow tài chính |
| F6 | Checklist hồ sơ và deadline cá nhân | Theo dõi giấy tờ còn thiếu theo phương thức; nhắc hạn có trạng thái gửi thật. | F2 + notification ổn định |
| F7 | Xác minh sinh viên/cựu sinh viên nhiều mức | Nâng độ tin cậy cho review, QA và outcome survey. | Identity/evidence workflow |

### Không nên làm ngay

- Dự đoán xác suất đỗ bằng ML khi dữ liệu lịch sử chưa sạch.
- Cho chatbot tự tạo hoặc suy đoán chính sách tuyển sinh.
- Thêm nhiều bài trắc nghiệm tâm lý trước khi kiểm định RIASEC hiện tại.
- Tự động nộp hồ sơ/nguyện vọng lên hệ thống chính thức.

## 10. Lộ trình đề xuất

### Giai đoạn 0 — Đóng rủi ro công bố (1–2 ngày)

- Gắn banner nội bộ “dữ liệu chưa publish/đang kiểm định”.
- Tắt hoặc chặn luồng unified-entry tự sinh giá trị mặc định.
- Không gọi dữ liệu chứng chỉ là “verified” nếu chưa có tài liệu trực tiếp.

### Giai đoạn 1 — Catalog thật và có nguồn (5–8 ngày)

- Hoàn thiện mapping ngành, ownership, nullable quota.
- Staging + validation + publish transaction + catalog version.
- Sửa admin hidden, round-trip major/program/method.
- Bổ sung kiểm thử dữ liệu nguồn và uniqueness.

### Giai đoạn 2 — Toàn vẹn dữ liệu người dùng (7–12 ngày)

- Chuyển các aggregate nhạy cảm khỏi `app_documents` sang schema quan hệ.
- Làm deletion/anonymization transaction.
- Sửa race condition lớp học, role/staff sync và cache invalidation.

### Giai đoạn 3 — Độ đúng của tư vấn (5–8 ngày)

- Policy theo mùa/program/method.
- Sửa confidence ratio, budget semantics và renormalize trọng số.
- Đổi nhãn heuristic và thêm bộ test golden cases do chuyên gia tuyển sinh duyệt.

### Giai đoạn 4 — Vận hành production (4–7 ngày)

- Email provider + outbox/retry.
- Distributed rate limit, session secret fail-fast.
- Khôi phục toàn bộ test suite và CI quality gates.

### Giai đoạn 5 — Bổ sung chức năng

- Làm F1 → F2 → F3 → F4 trước; các mục còn lại chỉ làm khi dữ liệu nền đạt chuẩn.

## 11. Tiêu chí được phép pilot

- 100% chương trình public có trường, ngành, mùa và ít nhất một nguồn kiểm tra được.
- Không còn giá trị nghiệp vụ được tự điền để trông như dữ liệu thật.
- Publish thất bại không làm thay đổi catalog đang hoạt động.
- Admin ẩn/khôi phục hoạt động đủ vòng đời.
- Major/program lưu rồi đọc lại không mất trường dữ liệu.
- Xóa tài khoản có test chứng minh dữ liệu đã xóa/ẩn danh theo policy.
- Recommendation không xếp hạng dựa trên tiêu chí thiếu dữ liệu mà không nói rõ.
- `npm test`, typecheck, build và integration test PostgreSQL đều đạt trên CI.
- Email có trạng thái gửi và retry; không log OTP/reset token.
- Một chuyên gia tuyển sinh duyệt bộ test chính sách và 20–30 hồ sơ mẫu biên.

## 12. Kết quả kiểm tra kỹ thuật

| Kiểm tra | Kết quả | Ghi chú |
| --- | --- | --- |
| `npm run typecheck` | Đạt | TypeScript không báo lỗi. |
| `npm run build` | Đạt có cảnh báo nghiêm trọng | Build đủ 117 route; page-data logging báo thiếu `DATABASE_URL` nhiều lần nhưng process vẫn exit 0. |
| `npm test` | Không đạt | 15 test đạt; 14 nhóm/test không chạy được vì thiếu module `server-only`. |
| Integration với PostgreSQL thật | Chưa thực hiện | Workspace hiện không có `DATABASE_URL`; chưa thể xác nhận migration, constraint, transaction và dữ liệu publish ở runtime. |

Đây là lý do kết luận chỉ ở mức “khả thi có điều kiện”, không phải production-ready.

## 13. NOT in scope của báo cáo này

- Không sửa code nghiệp vụ; lượt này chỉ audit và lập khuyến nghị.
- Không xác nhận nội dung từng đề án riêng của mọi trường đại học.
- Không kiểm toán bảo mật xâm nhập hoặc tuân thủ pháp lý đầy đủ.
- Không đánh giá pixel/UI chi tiết và hiệu năng tải thật.
- Không kết nối SMTP, Redis, hệ thống Bộ GDĐT hoặc dịch vụ bên thứ ba.
- Không đề xuất viết lại Next.js hay thay PostgreSQL vì chưa có bằng chứng cần thiết.

## 14. Quyết định khuyến nghị

Chọn **Selective Expansion**:

1. Không mở rộng tính năng trong lúc P0 chưa xong.
2. Ổn định catalog và dữ liệu người dùng trước.
3. Sau đó chỉ thêm bốn chức năng F1–F4 vì chúng trực tiếp tăng độ tin cậy và giá trị ra quyết định.
4. Giữ lại UI và phần lớn service hiện tại; sửa theo lát cắt nghiệp vụ, không viết lại toàn hệ thống.
