# Trovio – Web học sinh (Next.js + Tailwind CSS)

Triển khai từ thiết kế Figma **Trovio — EdTech Platform** (trang *Page 1 · Đồng bộ style*, theme **Indigo 2026**).
Next.js App Router · React 19 · Tailwind CSS v4 · TypeScript · kiến trúc **phân lớp (layered)**.

> Dữ liệu runtime chỉ đến từ PostgreSQL. Ứng dụng không tự tạo tài khoản, danh mục hoặc số liệu mẫu khi khởi động.

## Chạy dự án

Yêu cầu Node.js ≥ 20.9.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start   # bản production
npm test             # cần DATABASE_URL trỏ tới database kiểm thử riêng
npm run typecheck
npm run db:migrate   # tạo schema + migration, không nạp seed/sample
npm run admissions:publish # publish dữ liệu tuyển sinh đã kiểm định
```

Tài liệu: `docs/Giai-trinh-chuc-nang-Trovio.docx` (giải trình toàn bộ chức năng) · `docs/Kich-ban-kiem-thu-Trovio.docx` (159 ca kiểm thử cho tester, bản mới nhất) · `docs/Kich-ban-test-nguoi-dung.docx` (test người dùng thật + SUS) · `docs/Bao-cao-kiem-thu-Trovio.docx` (báo cáo đợt trước).

Tạo `.env.local` từ `.env.example` và bắt buộc đặt `DATABASE_URL`, `APP_URL`, `SESSION_SECRET`. Nếu dùng Google OAuth, thêm `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. Sửa cấu hình xong cần khởi động lại ứng dụng.

Không có tài khoản mặc định. Quản trị viên và dữ liệu nghiệp vụ phải được tạo/publish qua quy trình có kiểm soát vào PostgreSQL.

Nhập sai mật khẩu 5 lần sẽ khoá tài khoản; đặt lại mật khẩu (hoặc đăng nhập Google cùng email) sẽ mở khoá. Mật khẩu được băm bằng **scrypt** trước khi ghi xuống đĩa.

## Tính năng định hướng nguyện vọng

| Tính năng | Ở đâu | Ghi chú |
| --- | --- | --- |
| Kiểm tra chiến lược nguyện vọng | `/da-luu` › tab Nguyện vọng › “Kiểm tra danh sách của tôi” | Cảnh báo: thiếu NV An toàn, thứ tự ngược (NV dễ đứng trước NV khó), không xét tổ hợp/phương thức, vượt ngân sách, danh sách quá rủi ro/quá an toàn. Nút “Sắp xếp lại theo gợi ý”. Logic thuần: `services/wishlist-strategy.ts` |
| “Nếu điểm của mình thay đổi…” | `/da-luu` (cả 2 tab) | Thanh kéo ±2 điểm (quy đổi theo thang của phương thức), hiện chương trình đổi mức |
| Chia sẻ cho phụ huynh | `/da-luu` › “Chia sẻ với phụ huynh” → `/chia-se/[id]` | Link chỉ xem 7/30 ngày, thu hồi được, tuỳ chọn hiện điểm/ghi chú; người xem gửi góp ý không cần tài khoản |
| Dành cho bạn | Trang chủ | Kết hợp RIASEC 45% · khả năng trúng tuyển 35% · vị trí 10% · nhóm ngành 10%; mỗi gợi ý kèm lý do. Giải thích ở `/cach-goi-y#danh-cho-ban` |
| Nhiều phương thức xét tuyển | `/diem-cua-toi`, bộ lọc `/chuong-trinh` | Điểm thi THPT, học bạ (thang 30), ĐGNL ĐHQG-HN (150), ĐGNL ĐHQG-HCM (1200). Ngưỡng & điểm ưu tiên quy đổi theo thang |
| Mốc tuyển sinh & nhắc hạn | `/moc-tuyen-sinh` | Lịch gốc ở `src/data/admission-timeline.ts` (mốc **minh hoạ**); quản trị viên cập nhật lịch thật ở `/quan-tri/moc-tuyen-sinh` (đánh dấu “chính thức” bắt buộc link `https://` tới văn bản của Bộ/ĐHQG). “Nhắc tôi” đồng bộ theo tài khoản, banner nhắc khi còn ≤ 14 ngày, xuất `.ics` / Google Calendar, **email nhắc trước 7 ngày và 1 ngày** (bật “Nhắc qua email”, cần email đã xác thực) |
| Quản trị dữ liệu | `/quan-tri` (chỉ admin) | Sửa điểm chuẩn, học phí, chỉ tiêu, nguồn; “Đánh dấu đã kiểm tra”; khôi phục gốc; nhật ký ai-sửa-gì. Lưu dạng ghi đè trong DB, không sửa file dữ liệu gốc |

## Việc làm & thu nhập · Cảm nhận sinh viên · Trợ lý hỏi đáp

| Tính năng | Ở đâu | Cơ chế kiểm soát |
| --- | --- | --- |
| Việc làm & thu nhập theo ngành | `/viec-lam`, `/nganh/[slug]#viec-lam`, tab “Việc làm SV” ở `/truong/[slug]` | Mỗi con số gắn **nguồn + năm + cỡ mẫu**; mức tin cậy (*Nguồn chính thức · Đáng tin – cần đối chiếu · Tham khảo · Minh hoạ*) **suy ra từ loại nguồn**, người nhập không tự chọn; số liệu > 3 năm bị đánh dấu cũ; số không có nguồn không hiển thị. Nguồn thật đã kiểm tra: Cục Thống kê (thu nhập bình quân 2025, thất nghiệp thanh niên), TT 01/2024 & TT 09/2024 của Bộ GD&ĐT, Tuổi Trẻ 21/01/2026 (khảo sát việc làm UEH). Số liệu theo từng ngành trong bản demo là **minh hoạ** |
| Quản trị số liệu việc làm | `/quan-tri/viec-lam` (admin) | Thêm nguồn (bắt buộc `https://`, ghi phạm vi/cỡ mẫu), sửa số liệu (bắt buộc chọn nguồn, kiểm tra khoảng giá trị), khôi phục gốc, nhật ký thay đổi |
| Cảm nhận sinh viên theo trường | Tab “Cảm nhận SV” ở `/truong/[slug]` | Chỉ tài khoản **đã xác thực email**; 1 cảm nhận/trường/tài khoản; **kiểm duyệt trước** (chờ duyệt → duyệt/từ chối có lý do; sửa → chờ duyệt lại); bộ lọc tự động gắn cờ SĐT/email/link, quảng cáo, ngôn từ, cáo buộc, nêu tên giảng viên, viết hoa, lặp ký tự; huy hiệu “Email trường”; tên hiển thị rút gọn hoặc ẩn danh; **báo cáo** cần đăng nhập, 3 tài khoản khác nhau báo cáo → tự ẩn chờ duyệt lại; “Hữu ích” mỗi tài khoản 1 lượt; xoá tài khoản xoá cảm nhận |
| Kiểm duyệt cảm nhận | `/quan-tri/cam-nhan` (admin) | Hàng chờ (chờ duyệt + bị ẩn do báo cáo), cờ tự động, duyệt / từ chối kèm lý do, lịch sử kiểm duyệt |
| Trợ lý hỏi đáp ngành học | Nút “Hỏi trợ lý” góc phải dưới (mọi trang trừ lúc làm bài trắc nghiệm) | Trả lời bằng **truy xuất dữ liệu có cấu trúc** (`services/chatbot.service.ts`), không tự sinh số liệu; mọi con số kèm năm/nguồn và link kiểm tra; **từ chối** dự đoán điểm chuẩn, cam kết đỗ, gian lận; thiếu dữ liệu → nói rõ “chưa có”, không đoán; gắn nhãn MINH HOẠ; hiểu ngữ cảnh hội thoại và trang đang xem; link được lọc (chỉ nội bộ/https); 20 câu/phút, 300 câu/ngày mỗi IP; nhật ký ẩn danh đã che email/SĐT |
| Giám sát chatbot | `/quan-tri/chatbot` (admin) | Thống kê trả lời/từ chối/chưa có dữ liệu, đánh giá của người dùng, danh sách câu cần xem lại |

Lớp diễn đạt bằng mô hình ngôn ngữ cho chatbot là **tuỳ chọn, mặc định tắt** (`CHATBOT_LLM=anthropic`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`). Khi bật, mô hình chỉ được viết lại dữ kiện đã truy xuất; câu trả lời chứa con số không có trong dữ kiện, chứa link, quá dài hoặc lỗi/timeout 8 giây → dùng câu trả lời gốc.

> Điểm chuẩn học bạ/ĐGNL trong dữ liệu mẫu được **suy ra từ điểm thi THPT theo công thức cố định** chỉ để demo (xem `src/data/programs.ts`).

## Cải tiến theo đánh giá (29/09/2026)

| Tính năng | Ở đâu | Ghi chú |
| --- | --- | --- |
| Báo dữ liệu sai (thật) | Nút “Báo dữ liệu sai” ở `/chuong-trinh/[slug]` → `/tro-giup?ct=<slug>#bao-loi`; xử lý ở `/quan-tri/bao-loi` | Không cần đăng nhập; bẫy bot + 5 lần/giờ/IP. Quản trị chuyển trạng thái *Mới → Đang xử lý → Đã xử lý / Không cần sửa*; kết luận bắt buộc ghi chú và được **báo lại cho người gửi** (thông báo trong web nếu có tài khoản, email nếu để lại địa chỉ). Nhật ký xử lý |
| Thông báo trong web | Chuông trên thanh menu (khi đăng nhập) | Cảm nhận được duyệt / từ chối (kèm lý do), báo lỗi đã xử lý, nhắc hạn tuyển sinh; giữ 50 thông báo gần nhất; chỉ link nội bộ |
| Nhãn “Ước tính” | Chương trình, so sánh, đã lưu, gợi ý, link chia sẻ, chatbot | Điểm học bạ/ĐGNL trong dữ liệu mẫu là **ước tính** (`MethodCutoff.estimated`). Quản trị nhập số chính thức ở `/quan-tri/chuong-trinh/[id]` → bỏ chọn “Còn là số ước tính” (tự bỏ khi sửa điểm) |
| Chatbot hiểu cách gọi khác | `/quan-tri/chatbot` › Từ khoá chatbot | Quản trị thêm từ khoá → ngành/trường (chặn từ quá chung, trùng); câu hỏi “ngành này có hợp với mình không?” dùng kết quả RIASEC; thẻ chương trình trong câu trả lời có nút **Lưu** và **So sánh** |
| Việc làm dễ tìm | Menu chính “Việc làm”, chân trang | |
| Lộ trình 5 bước | Trang chủ | Trắc nghiệm → nhập điểm → lưu → lập nguyện vọng → chia sẻ phụ huynh; tự đánh dấu bước đã xong |
| Tính tổng chi phí học | Thẻ Học phí ở `/chuong-trinh/[slug]`; `/chi-phi` so sánh các chương trình đã lưu | Học phí × số năm (tăng học phí %, học bổng %) + sinh hoạt phí + chi phí một lần; giả định do người dùng nhập, không gửi lên máy chủ (`lib/cost.ts`) |
| Lọc cảm nhận theo ngành & khoá | Tab “Cảm nhận SV” ở `/truong/[slug]` | Hiện khi trường có ≥ 4 cảm nhận; điểm trung bình riêng của nhóm đang lọc; “Xem thêm” 8 cảm nhận mỗi lần |
| Đo phễu hành vi ẩn danh | `/quan-tri/thong-ke` | 6 bước + hỏi trợ lý; mỗi trình duyệt 1 lần/bước/ngày; chỉ lưu (ngày, bước, mã ngẫu nhiên), không IP/tài khoản/URL; tự xoá sau 180 ngày; tôn trọng *Do Not Track* / *Global Privacy Control*; người dùng tắt được ở `/chinh-sach-rieng-tu` |
| Khảo sát SUS | `/khao-sat` (noindex) · kết quả ở `/quan-tri/thong-ke` (tải CSV) | 10 câu chuẩn, tính điểm 0–100, xếp loại Bangor; kịch bản test người dùng thật: `docs/Kich-ban-test-nguoi-dung.docx` |

## Tính năng đợt 10/2026 (14 hạng mục, bám thiết kế Figma N1–N6 · B1–B3 · C1–C5)

| # | Tính năng | Ở đâu | Ghi chú |
| --- | --- | --- | --- |
| 1 | “Vì sao Trovio gợi ý?” | Nút trên mỗi thẻ gợi ý (`/goi-y`, trang chủ) → ngăn kéo bên phải | 4 tiêu chí × trọng số 45/35/10/10, học phí là bộ lọc, biểu đồ điểm chuẩn 3 năm, “Trovio không dùng” ngày sinh/cung hoàng đạo, phản hồi Dễ hiểu/Chưa rõ |
| 2 | Khớp mục tiêu + cảnh báo + “Chưa đủ dữ liệu” | `/goi-y` | Chip Khớp/Gần/Không thuộc mục tiêu; cảnh báo khi RIASEC lệch ngành mục tiêu (< 50%); nhãn “Chưa đủ dữ liệu” khi chưa có điểm hoặc < 3 năm điểm chuẩn |
| 3 | Đặt mục tiêu qua hội thoại | `/muc-tieu` | 4 câu; chỉ hiện tổ hợp hợp lệ của ngành; thanh kéo có vạch điểm chuẩn 3 năm; xem trước số chương trình An toàn/Vừa sức/Thử sức; đồng bộ theo tài khoản (`UserData.goal`) |
| 4 | Tour 6 bước do trợ lý dẫn | Tự mở lần đầu ở `/`, xem lại ở `/tro-giup` hoặc `/?tour=1` | Bỏ qua bất cứ lúc nào, phím ←/→/Esc |
| 5 | Thẻ chia sẻ RIASEC + nguyện vọng | Kết quả trắc nghiệm, `/da-luu` | Ảnh 1080×1350 vẽ bằng canvas trên máy; tuỳ chọn ẩn tên/điểm; tải PNG / chia sẻ (Zalo, Messenger…) |
| 6 | Đăng ký thu ít dữ liệu | `/dang-ky` | Tên gọi không bắt buộc; cam kết “Trovio không hỏi số điện thoại, ngày sinh hay Facebook của bạn” |
| 7 | Chọn môn lớp 10 ↔ ngành mở/khoá | `/chon-mon` (`?huong=nganh-mon` cho chiều ngược lại) | Gợi ý đổi 1 môn để mở thêm ngành; từ ngành mục tiêu → bộ 4 môn nên chọn |
| 8 | Ma trận quyết định có trọng số | `/so-sanh?tab=ma-tran` | 6 tiêu chí × trọng số 0–5 (SAW, thang 100), ô thiếu dữ liệu = 3; phân tích độ nhạy; xếp nguyện vọng theo thứ tự; in PDF |
| 9 | Kế hoạch B + mùa công bố điểm | `/mua-diem` (`?ngay=2027-08-26` để xem mô phỏng giữa mùa) | Chấm lại NV với điểm thật, gợi ý kế hoạch B (chỉ An toàn/Vừa sức), theo dõi xét tuyển bổ sung + “Nhắc tôi”; thông báo “Ngành X của trường Y vừa mở xét bổ sung, phù hợp với điểm của bạn” (cron + khi mở trang) |
| 10 | Hỏi sinh viên thật + kênh giáo viên (bản gọn) | Mục “Hỏi sinh viên đang học” ở `/chuong-trinh/[slug]`; `/lop-hoc`; kiểm duyệt ở `/quan-tri/hoi-dap` | Hỏi ẩn danh; chỉ tài khoản đã xác thực bằng **email thuộc tên miền trường** được trả lời; mọi nội dung qua kiểm duyệt, tự che SĐT/email/link. Giáo viên tạo lớp → mã 6 ký tự; học sinh nhập mã = đồng ý chia sẻ **trạng thái** (không điểm, không tên trường); tổng quan RIASEC; ai chưa có NV; nhắc cả lớp 1 lần/6 giờ |
| 11 | Học bổng · miễn giảm · vay vốn NHCSXH · KTX | Khối “Tài chính cho việc học” ở trang chương trình; `/chi-phi#ho-tro` | 6 câu điều kiện (không hỏi thu nhập), thẻ chính sách có nguồn; tổng học phí + chỗ ở ước tính |
| 12 | Bản nhẹ cho mạng yếu + nhắc qua Zalo (bản gọn) | `/nhe` | Render hoàn toàn ở máy chủ, không ảnh/chat/tour, form GET; nút chia sẻ lịch mốc sang Zalo (Web Share/sao chép). Zalo Mini App/ZNS: chưa làm (cần Zalo OA) |
| 13 | Khảo sát hài lòng sau 1 năm | `/phan-hoi-nganh?ct=<slug>`; thống kê ở trang chương trình | Mỗi tài khoản đã xác thực 1 lần/chương trình; chỉ công bố khi ≥ 20 phản hồi; lời nhắn qua bộ lọc |
| 14 | Huy hiệu “Trường đã xác nhận” | Trang chương trình; quản trị gắn/gỡ ở `/quan-tri/chuong-trinh/[id]` | Bắt buộc ghi căn cứ; hiệu lực 12 tháng; có nhật ký |

Dữ liệu minh hoạ đi kèm (chỉ tạo ở chế độ demo, đều gắn nhãn): 2 hỏi đáp, 56 + 23 phiếu khảo sát, lớp `DEMO12`, huy hiệu xác nhận của 2 chương trình, 8 đợt xét bổ sung mùa 2027 (`src/data/supplementary-rounds.ts`), chính sách hỗ trợ (`src/data/financial-aid.ts`). DB đang ở **phiên bản 6**.

### Email nhắc hạn hằng ngày (cron)

Đặt `CRON_SECRET` rồi cho bộ lập lịch gọi mỗi ngày (khoảng 7:00 giờ Việt Nam):

```
GET /api/cron/reminders
Authorization: Bearer <CRON_SECRET>
```

- **Vercel**: thêm `vercel.json` → `{ "crons": [{ "path": "/api/cron/reminders", "schedule": "0 0 * * *" }] }` (00:00 UTC = 7:00 VN); Vercel tự gửi header `Authorization: Bearer $CRON_SECRET` khi biến môi trường `CRON_SECRET` được đặt.
- **Máy chủ riêng**: crontab `0 7 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://ten-mien/api/cron/reminders`.
- Chưa đặt `CRON_SECRET` → route trả 503 (tắt). Chạy thử thủ công: nút “Gửi email nhắc hạn đến hạn hôm nay” ở `/quan-tri/moc-tuyen-sinh`. Chạy nhiều lần trong ngày không gửi trùng (có nhật ký).
- Email đi qua `services/mailer.ts` (bản demo in ra terminal) — nối SMTP/dịch vụ email khi triển khai.

## Tốc độ khi demo

`npm run dev` (chế độ phát triển) biên dịch từng trang khi mở lần đầu và gửi ~6 MB JavaScript chưa nén mỗi trang → chuyển tab chậm. Khi trình bày / test người dùng hãy chạy **`npm run demo`** (build + chạy bản production, có dữ liệu demo): mỗi trang ~200 KB JS (gzip), server trả trong 10–40 ms. Ngoài ra đã có: thanh tiến trình ở mép trên khi bấm chuyển trang, trợ lý chat / hướng dẫn / thanh cookie tải sau, đọc người dùng 1 lần mỗi request. Không đặt `loading.tsx` dùng chung vì streaming làm mất mã 307/404 thật của trang cần đăng nhập.

## Quản trị A01–A09 & Cổng trường (đồng bộ Figma 10/2026)

`/quan-tri` dùng thanh bên theo Figma: Tổng quan dữ liệu · Trường & Cơ sở · Ngành · Chương trình · Điểm & Học phí · Bài test RIASEC · Nhập & Kiểm duyệt (CSV/XLSX) · Người dùng · Quy tắc gợi ý (có chạy thử), cùng nhóm Cộng đồng & vận hành. Mọi thao tác lưu vào database và ghi nhật ký; “xoá” trường/ngành/chương trình là **tạm ẩn** (khôi phục được). Kiểm duyệt viên chỉ thấy mục cảm nhận, hỏi đáp, báo lỗi. Cán bộ tuyển sinh (email đúng tên miền trường, quản trị viên duyệt) xác nhận số liệu hoặc gửi bản sửa ở `/cong-truong`. Bản Mini App: `/zalo`. Chi tiết: `docs/TIEP-TUC-TROVIO.md` mục 11.

## Phong cách làm việc · MBTI tham khảo · câu hỏi theo tình huống (10/2026)

- **Mini-test Phong cách làm việc** `/trac-nghiem/phong-cach`: 12 tình huống chọn 1 trong 2 (phím 1/2 hoặc A/B, ← quay lại), đo 4 trục *Làm cùng mọi người ↔ Làm độc lập · Ổn định ↔ Thay đổi · Thực hành ↔ Máy tính · Chi tiết ↔ Ý tưởng* (mỗi trục 3 câu, điểm −3/−1/+1/+3). Kết quả hiện dòng “Phong cách · Khớp n/m …” trên thẻ gợi ý, khối riêng trong ngăn “Vì sao gợi ý?”, câu giải thích trên trang kết quả trắc nghiệm (VD “Ngành Kế toán hợp mã CEI của bạn, và phong cách thích ổn định, chi tiết của bạn cũng khớp”), thẻ ở trang ngành. **Không tham gia công thức điểm** (có unit test + E2E chứng minh).
- **Góc nhìn MBTI**: học sinh tự chọn 1 trong 16 mã đã biết → so từng chữ với mini-test (E/I ↔ nhóm/độc lập, S/N ↔ chi tiết/ý tưởng, J/P ↔ ổn định/thay đổi, T/F chỉ mô tả) + mục “Vì sao Trovio dùng RIASEC làm chính?”. Mô tả do Trovio tự viết.
- **RIASEC**: 24/60 câu viết lại theo tình huống đời thường (giữ mã câu & thứ tự → bài làm dở không hỏng). Thống kê thêm sự kiện `quiz_started`, `style_done`, `mbti_added` và tỉ lệ làm hết trắc nghiệm.
- Mã nguồn: `src/domain/work-style.ts` (câu hỏi, chấm điểm, hồ sơ ngành, MBTI, làm sạch dữ liệu), `src/components/work-style/*`, test `tests/work-style.test.ts`. Dữ liệu `workStyle`, `mbti` đồng bộ theo tài khoản như kết quả trắc nghiệm.

## Bảo mật

- **Mật khẩu** băm scrypt; **phiên** là cookie httpOnly, SameSite=Lax, ký HMAC, kèm *phiên bản phiên* → đổi/đặt lại mật khẩu hoặc “Đăng xuất khỏi thiết bị khác” làm mọi phiên cũ mất hiệu lực.
- **CSRF**: `src/proxy.ts` (Next 16, thay cho middleware) chặn request ghi vào `/api/*` từ nguồn khác; kèm header `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Giới hạn tần suất** (`lib/rate-limit.ts`): đăng nhập, đăng ký, OTP, quên mật khẩu, góp ý công khai. **Giới hạn kích thước body** (`lib/http.ts`, 413).
- **Chế độ demo** (`lib/env.ts`): OTP cố định, token đặt lại mật khẩu trả về trình duyệt và tài khoản demo **chỉ có khi demo** (mặc định bật ở `npm run dev`, tắt ở `npm start`). Production: OTP ngẫu nhiên 6 số (băm, hạn 15 phút, dùng 1 lần), link đặt lại gửi qua `services/mailer.ts`.
- `SESSION_SECRET` thiếu ở production → dùng khoá ngẫu nhiên theo tiến trình thay vì chuỗi mặc định.
- **Link chia sẻ**: id 144 bit ngẫu nhiên, có hạn, thu hồi được; trang `noindex`, `no-referrer`, không lộ email; góp ý giới hạn độ dài/số lượng, lọc ký tự điều khiển, có bẫy bot.
- **Quản trị**: kiểm tra quyền ở từng route (`requireAdmin`), trang trả 404 với tài khoản thường; dữ liệu nhập được kiểm tra khoảng giá trị.
- **Nội dung do người dùng tạo** (cảm nhận): kiểm duyệt trước khi hiển thị, React tự escape nội dung, không lộ email/người báo cáo; báo cáo gắn tài khoản đã xác thực (không tin `X-Forwarded-For` để tránh giả mạo IP ẩn hàng loạt).
- **Chatbot**: câu hỏi ≤ 300 ký tự, body ≤ 8 KB, dữ liệu ngữ cảnh (ngành/trường/RIASEC/trang) được kiểm tra lại ở server; client chỉ hiển thị link nội bộ hoặc `https://` (`domain/chat.ts › safeChatHref`).
- Giới hạn tần suất theo IP dựa vào header `X-Forwarded-For`: khi deploy phải đặt sau proxy/CDN **ghi đè** header này (Vercel, Nginx `proxy_set_header`), nếu không kẻ xấu có thể đổi IP giả để vượt giới hạn.
- **Báo lỗi / khảo sát / sự kiện phễu** (công khai): body ≤ 8 KB / 4 KB / 512 B, giới hạn tần suất theo IP, bẫy bot; phễu giới hạn 20.000 mã/sự kiện/ngày để file dữ liệu không phình. **Xuất CSV** chặn “CSV injection” (ô bắt đầu bằng `= + - @`).
- **Cron nhắc hạn**: so khớp `CRON_SECRET` bằng `timingSafeEqual`; không đặt → tắt.
- Khi triển khai thật: đặt `SESSION_SECRET`, xoá tài khoản demo, cấp admin qua `ADMIN_EMAILS`, nối `mailer.ts` với dịch vụ email, thay rate-limit bộ nhớ bằng Redis nếu chạy nhiều instance.

## Đăng nhập & dữ liệu người dùng

| Tính năng | Khách | Cần đăng nhập |
| --- | --- | --- |
| Tìm kiếm, xem trường/ngành, so sánh, trắc nghiệm, nhập điểm | ✅ (lưu trên trình duyệt) | |
| Lưu chương trình ♡ | ✅ trên trình duyệt, từ lần lưu thứ 2 có lời nhắc đăng nhập (mềm, “Để sau”) | Đồng bộ đa thiết bị |
| Nguyện vọng dự kiến (thêm, sắp xếp, ghi chú) | | ✅ |
| Xuất PDF, chia sẻ danh sách | | ✅ |
| Lưu kết quả trắc nghiệm vào hồ sơ, trang Hồ sơ | | ✅ |

- **Cổng đăng nhập mềm** (`components/auth/login-gate.tsx`): bấm tính năng cần tài khoản sẽ mở hộp thoại (Google / email / đăng ký). Sau khi đăng nhập, người dùng quay lại đúng trang và thao tác dang dở (VD: thêm nguyện vọng) được tự thực hiện.
- **Gộp dữ liệu khi đăng nhập**: dữ liệu khách trong `localStorage` được gộp (không ghi đè) vào tài khoản qua `POST /api/account/data/merge`; sau đó mọi thay đổi tự đồng bộ (`PUT /api/account/data`). Đăng xuất sẽ xoá bản sao trên trình duyệt.
- **2 cách đăng nhập, 1 tài khoản**: Google và email/mật khẩu liên kết theo cùng email đã xác minh. Người dùng Google có thể tạo mật khẩu sau; trang Hồ sơ › *Phương thức đăng nhập* cho liên kết/gỡ Google, đổi/tạo mật khẩu (luôn giữ ≥ 1 cách).
- **Dữ liệu thu thập**: Google chỉ xin `openid email profile` (tên, email, ảnh). Onboarding (`/chao-mung`) hỏi thêm — đều tuỳ chọn — vai trò, năm tốt nghiệp, tỉnh/thành; người dùng dưới 16 tuổi cần xác nhận phụ huynh đồng ý (Nghị định 13/2023/NĐ-CP). Không thu thập SĐT, ngày sinh, CCCD.

### Cấu hình đăng nhập Google

1. Vào [Google Cloud Console](https://console.cloud.google.com/) → tạo (hoặc chọn) project.
2. **APIs & Services › OAuth consent screen**: chọn *External*, điền tên ứng dụng “Trovio”, email hỗ trợ; scopes chỉ cần `openid`, `email`, `profile`. Khi còn ở chế độ *Testing*, thêm email của bạn vào **Test users**.
3. **APIs & Services › Credentials › Create credentials › OAuth client ID** → *Web application*:
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
4. Chép *Client ID* và *Client secret* vào `.env.local`:

   ```bash
   APP_URL=http://localhost:3000
   GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx
   ```

5. Khởi động lại `npm run dev`. Mở web bằng đúng địa chỉ đã khai báo (`localhost`, không phải `127.0.0.1`), nếu không Google báo `redirect_uri_mismatch`.

Khi deploy: thêm domain thật vào 2 mục trên và đặt `APP_URL=https://ten-mien-cua-ban`.

Luồng: `GET /api/auth/google?next=…` (tạo `state` chống CSRF, lưu trong cookie httpOnly có chữ ký) → Google → `GET /api/auth/google/callback` (kiểm tra `state`, đổi `code` lấy token, đọc userinfo, tạo/liên kết tài khoản, đặt cookie phiên). Viết tay bằng `fetch`, không phụ thuộc thư viện ngoài (`services/google-oauth.service.ts`).

## Kiến trúc MVC

```
┌──────────────────────────────────────────────────────────────┐
│ VIEW           src/app pages + src/components + API client   │
└───────────────▲──────────────────────────────────────────────┘
                │ chỉ gọi service (server) hoặc API /api/* (client)
┌───────────────┴──────────────────────────────────────────────┐
│ CONTROLLER     src/controllers + route handlers mỏng          │
└───────────────▲──────────────────────────────────────────────┘
                │ chỉ phụ thuộc interface repository
┌───────────────┴──────────────────────────────────────────────┐
│ MODEL          src/domain + src/models + src/services         │
│                src/repositories/postgres* + src/lib/db.ts     │
└───────────────▲──────────────────────────────────────────────┘
┌───────────────┴──────────────────────────────────────────────┐
│ DATABASE       PostgreSQL (bảng quan hệ + JSONB aggregate)     │
└──────────────────────────────────────────────────────────────┘
        DOMAIN  src/domain – kiểu dữ liệu & hằng số dùng chung mọi lớp
```

Quy tắc:

- **Client Component không truy cập repository.** Client gọi API `/api/v1/*` qua `src/lib/api-client.ts`; Server Component có thể gọi Model/Service trực tiếp theo khuyến nghị của Next.js.
- **Service không biết Next.js** (không `cookies()`, không `NextResponse`) → test được bằng Node thuần (`tests/services.test.ts`).
- **PostgreSQL-only:** `repositories/index.ts` không có fallback memory/filesystem. Thiếu DB hoặc catalog chưa publish sẽ trả lỗi rõ ràng, không thay bằng mảng mẫu.

Chi tiết kiến trúc và hợp đồng API: `docs/architecture/MVC.md`, `docs/api/api-contracts.md`.

## Bản đồ màn hình

| Figma | Route | Ghi chú |
| --- | --- | --- |
| S01 Trang chủ | `/` | |
| S02 Tìm chương trình (+ rỗng, đang tải) | `/chuong-trinh` | Lọc trên URL, áp dụng ngay; gợi ý nới điều kiện khi rỗng; `loading.tsx` |
| S03 Chi tiết trường | `/truong/[slug]` | |
| S04 Danh mục ngành | `/nganh` | Lọc nhóm, chữ cái (có Đ), từ khoá |
| S05 Chi tiết ngành | `/nganh/[slug]` | |
| S06 Chương trình tại trường | `/chuong-trinh/[slug]` | Khả năng trúng tuyển theo điểm đã lưu |
| S07 Điểm & điều kiện | `/diem-cua-toi` | Điểm ưu tiên theo quy chế (giảm dần khi tổng ≥ 22,5) |
| S08–S10 Trắc nghiệm RIASEC | `/trac-nghiem`, `/lam-bai`, `/ket-qua` | 60 câu (24 câu theo tình huống), tự lưu nháp, nút "Tự điền để thử" |
| S17–S18 Phong cách làm việc + MBTI | `/trac-nghiem/phong-cach` (`#mbti`) | 12 tình huống, 4 trục, kết quả tham khảo, không tính điểm |
| S11 So sánh | `/so-sanh` | Tối đa 3, bật "chỉ khác biệt" |
| S12 Đã lưu & nguyện vọng | `/da-luu` | Sắp xếp NV, ghi chú, xuất PDF (in) |
| S13 Hồ sơ | `/ho-so` | Cần đăng nhập · sửa hồ sơ · phương thức đăng nhập · xoá tài khoản |
| S14–S16 Xác thực | `/dang-nhap`, `/dang-ky`, `/xac-thuc-email`, `/quen-mat-khau` | Đủ trạng thái lỗi |
| Onboarding | `/chao-mung` | Hồ sơ tuỳ chọn cho tài khoản mới, rồi màn chào mừng |
| Mốc tuyển sinh | `/moc-tuyen-sinh` | Nhắc hạn, .ics, nhắc qua email; nhãn minh hoạ / chính thức |
| Tính tổng chi phí | `/chi-phi` | So sánh chương trình đã lưu + học bổng, miễn giảm, vay vốn, KTX (`#ho-tro`) |
| N1–N2 Gợi ý có giải thích | `/goi-y` | Ngăn kéo “Vì sao gợi ý?”, chip mục tiêu, nhãn “Chưa đủ dữ liệu” |
| N3 Đặt mục tiêu | `/muc-tieu` | Hội thoại 4 câu |
| B1a/B1b Chọn môn lớp 10 | `/chon-mon`, `/chon-mon?huong=nganh-mon` | |
| B2 Ma trận quyết định | `/so-sanh?tab=ma-tran` | |
| B3 Mùa công bố điểm & kế hoạch B | `/mua-diem` | `?ngay=YYYY-MM-DD` để mô phỏng |
| C1 Kênh giáo viên | `/lop-hoc` | Giáo viên: bảng lớp · học sinh: nhập mã lớp |
| C3 Bản nhẹ | `/nhe` | Không dùng layout chính |
| C4 Khảo sát sau 1 năm | `/phan-hoi-nganh` | |
| Khảo sát trải nghiệm (SUS) | `/khao-sat` | noindex, ẩn danh |
| Chia sẻ (chỉ xem) | `/chia-se/[id]` | Không cần đăng nhập |
| Quản trị | `/quan-tri`, `/quan-tri/chuong-trinh/[id]`, `/quan-tri/viec-lam`, `/quan-tri/cam-nhan`, `/quan-tri/hoi-dap`, `/quan-tri/bao-loi`, `/quan-tri/moc-tuyen-sinh`, `/quan-tri/chatbot`, `/quan-tri/thong-ke` | Chỉ admin |
| Việc làm & thu nhập | `/viec-lam` | Bảng theo ngành, mốc chính thức, giải thích nguồn |
| G01–G04 | `/cach-goi-y`, `/tro-giup`, `/chinh-sach-rieng-tu`, `/dieu-khoan` | |
| SYS | `not-found.tsx`, `(site)/error.tsx`, `/het-phien` | |

## API (route handlers)

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/api/programs?q=&method=&score=&combos=&tuition=&regions=&types=&groups=&majors=&sort=&page=` | Tìm kiếm (`method`: `hocba` · `dgnl-hn` · `dgnl-hcm`) |
| GET | `/api/programs/[slug]` | Chi tiết + chương trình tương tự |
| GET | `/api/programs/compare?ids=` | Tối đa 3 |
| GET | `/api/programs/lookup?ids=` | Danh sách đã lưu |
| GET | `/api/majors?group=&q=&letter=` | Danh mục ngành |
| GET | `/api/quiz/questions` · POST `/api/quiz/result` · POST `/api/quiz/recommend` | RIASEC |
| POST | `/api/auth/login` · `register` · `verify-email` · `forgot-password` · `reset-password` · `logout` · GET `me` | Xác thực (cookie HMAC, httpOnly) |
| GET | `/api/auth/google?next=&mode=link` · `/api/auth/google/callback` | Đăng nhập / liên kết Google |
| GET · PATCH · DELETE | `/api/account` | Xem, sửa hồ sơ, xoá tài khoản |
| POST | `/api/account/password` | Đổi / tạo mật khẩu |
| DELETE | `/api/account/google` | Gỡ liên kết Google |
| GET · PUT | `/api/account/data` · POST `/api/account/data/merge` | Dữ liệu đồng bộ (đã lưu, nguyện vọng, điểm, RIASEC, nhắc hạn) |
| DELETE | `/api/account/sessions` | Đăng xuất khỏi thiết bị khác |
| POST | `/api/auth/verify-email/resend` | Gửi lại mã xác thực |
| GET · POST · DELETE | `/api/account/share` | Link chia sẻ cho phụ huynh (xem / tạo / thu hồi) |
| GET · DELETE | `/api/account/share/comments` | Góp ý nhận được (`?markRead=1`, `?id=`) |
| POST | `/api/share/[id]/comments` | Người xem link gửi góp ý (công khai, giới hạn tần suất) |
| POST | `/api/recommendations` | Gợi ý “Dành cho bạn” (`goalMajorId`, `limit` ≤ 12; trả `criteria`, `goalMatch`, `warning`, `fitGap`) |
| GET | `/api/decision?ids=` | Dữ liệu công khai cho ma trận quyết định (≤ 6, 60 lần/phút/IP) |
| GET · POST | `/api/supplementary` · `/api/supplementary/check` | Đợt xét bổ sung · tạo thông báo cho tôi (cần đăng nhập; `today` chỉ nhận ở chế độ demo) |
| GET · POST | `/api/qa?programId=` · `/api/qa` | Hỏi sinh viên: đọc (đã duyệt + câu của tôi đang chờ) · hỏi ẩn danh (5/10 phút/IP) |
| POST | `/api/qa/[id]/answers` | Sinh viên email trường trả lời (chờ duyệt) |
| GET · POST | `/api/admin/qa` | Hàng chờ · duyệt/từ chối `{ questionId, answerId?, action }` (admin) |
| POST | `/api/outcome-survey` | Phản hồi sau 1 năm (đăng nhập, đã xác thực, 1 lần/chương trình) |
| GET · POST | `/api/classes` · POST `/api/classes/join` | Lớp tôi dạy/tham gia · tạo lớp (giáo viên) · nhập mã lớp (10/10 phút) |
| GET · DELETE | `/api/classes/[id]` (`?leave=1`) · POST `/api/classes/[id]/remind` | Bảng tiến độ (chỉ GV) · xoá/rời lớp · nhắc cả lớp (1 lần/6 giờ) |
| PATCH · POST · DELETE | `/api/admin/programs/[id]` | Sửa dữ liệu / đánh dấu đã kiểm tra / `{ action: "school-verify", verified, note }` huy hiệu “Trường đã xác nhận” / khôi phục gốc (admin) |
| PATCH · DELETE | `/api/admin/outcomes/[majorId]` | Sửa số liệu việc làm (bắt buộc nguồn) / khôi phục gốc (admin) |
| POST | `/api/admin/sources` | Thêm nguồn dữ liệu (admin, chỉ https) |
| GET · POST · DELETE | `/api/schools/[id]/reviews` | Cảm nhận đã duyệt (`?sort=huu-ich&major=<mã ngành>&cohort=<năm>`) · gửi/sửa (vào hàng chờ) · rút lại |
| POST | `/api/reviews/[id]/helpful` · `/api/reviews/[id]/report` | Hữu ích / báo cáo (cần đăng nhập) |
| PATCH | `/api/admin/reviews/[id]` | Duyệt / từ chối `{ action, reason }` (admin) |
| POST | `/api/chat` · `/api/chat/feedback` | Hỏi trợ lý `{ message, context }` · đánh giá câu trả lời |
| POST | `/api/reports` | Báo dữ liệu sai `{ detail, topic, programId?, page?, email? }` (công khai, 5/giờ/IP) |
| PATCH | `/api/admin/reports/[id]` | Xử lý báo lỗi `{ status, note }` (admin) |
| GET · POST | `/api/notifications` · `/api/notifications/read` | Thông báo của tôi · đánh dấu đã đọc `{ ids? }` |
| PUT · DELETE | `/api/admin/timeline` | Lưu lịch tuyển sinh / quay về lịch gốc (admin) |
| POST · DELETE | `/api/admin/chat-aliases` · `/api/admin/chat-aliases/[id]` | Thêm / xoá từ khoá chatbot (admin) |
| GET · POST | `/api/cron/reminders` | Gửi email nhắc hạn (Bearer `CRON_SECRET`) · POST `/api/admin/reminders` chạy thử (admin) |
| POST | `/api/events` | Sự kiện phễu ẩn danh `{ event, anon }` (120/10 phút/IP) |
| POST | `/api/survey` · GET `/api/admin/survey/export` | Phiếu SUS (10/giờ/IP) · tải CSV (admin) |

## Design tokens

`src/app/globals.css` khai báo token Tailwind v4 (`@theme`) khớp collection **Trovio · Màu** trong Figma: `primary-*` (indigo #4F46E5), `accent-*` (cam #F97316), `success-*`, `danger-*`, `riasec-*`; neutral dùng thang `slate`. Font Be Vietnam Pro qua `next/font/google`.

## Trạng thái phía client

`src/stores/trovio-store.tsx` giữ *đã lưu, nguyện vọng, so sánh, hồ sơ điểm, kết quả & bản nháp trắc nghiệm, mục tiêu, nhắc hạn, phong cách làm việc, mã MBTI* trong `localStorage`. Khi đăng nhập, phần *đã lưu, nguyện vọng, hồ sơ điểm, kết quả trắc nghiệm, mục tiêu, nhắc hạn, phong cách làm việc, MBTI* được gộp vào tài khoản và tự đồng bộ lên server; *so sánh* và *bản nháp trắc nghiệm* chỉ ở trên máy.
