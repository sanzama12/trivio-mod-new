# Trovio — Ghi chú bàn giao để tiếp tục làm việc (cập nhật 04/10/2026 — sau đợt đồng bộ Figma A01–A09, C1–C5)

> Dán file này (hoặc đường dẫn `docs/TIEP-TUC-TROVIO.md`) vào tab mới để tiếp tục mà không cần đọc lại lịch sử chat.
> Người dùng: **Nguyên Trần** — đồ án tốt nghiệp UI/UX. Trả lời bằng **tiếng Việt**, ngắn gọn.

---

## 1. Yêu cầu thường trực của người dùng (luôn tuân thủ)

1. Mỗi lần thêm/sửa chức năng: **rà soát để không phát sinh lỗ hổng bảo mật** và **đảm bảo chức năng cũ vẫn chạy**.
2. Sau khi làm xong: **chạy kiểm thử** (unit + typecheck + build, nếu được thì E2E) trước khi báo xong.
3. UI: chữ luôn đọc được, bố cục thuận mắt, **thanh menu luôn 1 dòng** (đã làm cơ chế tự thu gọn → chuyển menu ☰).
4. Tài liệu giao cho người khác → file **.docx** trong thư mục `docs/`.

---

## 2. Vị trí & môi trường

| Mục | Giá trị |
| --- | --- |
| Thư mục dự án trên Mac | `/Users/nguyen.tran/Documents/DATN UIUX/code/trovio-web` |
| Stack | Next.js **16.3.6** (App Router, `src/proxy.ts` thay middleware) · React 19 · TypeScript · Tailwind CSS v4 (`@theme` trong `src/app/globals.css`) · icon `react-icons/lu` |
| Node trên Mac | v22.x · dev server người dùng thường chạy sẵn ở **:3000** (`next dev`, output `.next/dev`, nên `next build` chạy song song được) |
| Dữ liệu | File JSON `.data/trovio-db.json`, **DB_VERSION = 6**, tự migrate (v5: hỏi đáp, lớp học, khảo sát sau 1 năm; v6: dữ liệu minh hoạ mới). Xoá file = về dữ liệu demo |
| Figma | “Trovio — EdTech Platform”, trang *Page 1 · Đồng bộ style*, theme Indigo 2026 |

### Chạy lệnh
```bash
npm run dev                         # http://localhost:3000
npm test                            # 75 unit test (tsx --test tests/*.test.ts)
node node_modules/typescript/bin/tsc --noEmit -p . --incremental false   # typecheck
npx next build                      # build production (~88 trang/route)
# E2E trên server thật, DB riêng (script GHI dữ liệu thử):
TROVIO_DEMO=true TROVIO_DB_FILE=/tmp/trovio-e2e.json CRON_SECRET=e2e-secret npx next start -p 3100
BASE_URL=http://localhost:3100 CRON_SECRET=e2e-secret node tests/e2e/smoke.mjs   # 109 kiểm tra
```

### Lưu ý công cụ (rút kinh nghiệm)
- **npm registry bị chặn (403)** ở máy chủ cloud và VM → không `npm install` được ở đó.
- `device_bash` (VM Linux) đọc/sửa được file nhưng **không chạy được `npm test`/tsx** (node_modules là bản macOS – esbuild darwin). Muốn chạy test/build/curl thật → dùng **Desktop Commander `start_process`** (chạy trên Mac thật, zsh).
- Sau khi sửa code mà dev server đang chạy: đã sửa lỗi cache cũ (xem mục 6), không cần restart.
- Trình duyệt tích hợp (Claude Browser) đã được cấp quyền `http://localhost:3000` để test UI thật (hay bị che → chụp màn hình lỗi; nên dùng cách dưới).
- **Chạy nền, không chờ lâu trên Mac** (người dùng yêu cầu): thư mục `code/_ci/`
  - `zsh check.sh tsc test build` → ghi `tsc.log`, `test.log`, `build.log` + file `done-…`; gọi bằng `(nohup zsh check.sh tsc > /dev/null 2>&1 &)` rồi đọc log ngắn.
  - `zsh e2e.sh [keep]` → dựng server :3100 với DB `/tmp/trovio-e2e.json`, chạy E2E, ghi `e2e.log` (`keep` = giữ server để chụp màn hình).
  - `node shots.mjs jobs.json` → chụp màn hình bằng Chrome headless (CDP, không cần thư viện), hỗ trợ đăng nhập, nạp localStorage, chạy JS; ghi `shots/*.png` + `shots/log.txt` (báo **tràn ngang**). Mẫu: `jobs2.json` (:3000, khách có dữ liệu mẫu), `jobs3.json` (:3100, có đăng nhập).
  - VM không xoá được file trong thư mục kết nối (rm bị chặn) — log được ghi đè nên không sao.

---

## 3. Tài khoản demo & biến môi trường

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Học sinh | an@trovio.vn | Trovio@2026 |
| Quản trị | admin@trovio.vn | Trovio@2026 |
| Bị khoá | binh.locked@trovio.vn | bất kỳ |
| OTP demo | – | 592841 |
| Link reset hết hạn | – | `/quen-mat-khau?token=expired` |
| Giáo viên (lớp mẫu `DEMO12`) | gv@trovio.vn | Trovio@2026 |
| Sinh viên email trường (trả lời hỏi đáp NEU) | linh@st.neu.edu.vn | Trovio@2026 |
| Cán bộ tuyển sinh NEU (đã duyệt, `/cong-truong`) | tuyensinh@neu.edu.vn | Trovio@2026 |
| Kiểm duyệt viên (chỉ cảm nhận / hỏi đáp / báo lỗi) | kiemduyet@trovio.vn | Trovio@2026 |

Env (xem `.env.example`): `SESSION_SECRET`, `APP_URL`, `TROVIO_DEMO` (mặc định bật ở dev, tắt ở `npm start`), `ADMIN_EMAILS`, `CRON_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `CHATBOT_LLM`/`ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` (mặc định tắt), `TROVIO_DB_FILE`.

---

## 4. Kiến trúc phân lớp

```
src/domain        kiểu & hằng số nghiệp vụ (types.ts, reviews.ts, sus.ts, chat.ts, riasec…)
src/data          dữ liệu gốc: 16 trường, 24 ngành, 52 chương trình, lịch, việc làm, users demo, reviews demo
src/repositories  types.ts (22 interface) · json-file.ts (dữ liệu người dùng) · memory.ts (tĩnh) · index.ts (điểm cắm duy nhất)
src/services      nghiệp vụ: scoring, recommendation, wishlist-strategy, share, auth, admin, outcome, review,
                  chatbot(+chatbot-llm), data-report, notification, timeline, reminder, analytics, mailer…
src/app/api       route handler (requireUser/requireAdmin, rateLimit, jsonBody giới hạn size)
src/app, src/components   giao diện; src/stores/trovio-store.tsx = state client (localStorage khách, đồng bộ khi đăng nhập)
src/lib           auth, http, rate-limit, cost.ts, track.ts, text, format, env
src/proxy.ts      chống CSRF (Origin/Sec-Fetch-Site) + header bảo mật
```
- Đổi sang CSDL thật: chỉ viết repository mới theo `src/repositories/types.ts` và thay trong `index.ts`.
- Token màu Tailwind: primary 50–900 (#4F46E5), accent (cam), success, danger, riasec-*; neutral = slate.

---

## 5. Chức năng đã có (tóm tắt)

**Khám phá:** trang chủ (lộ trình 5 bước, “Dành cho bạn”), `/chuong-trinh` (lọc theo 4 phương thức; trang tìm kiếm nằm trong route group `(tim-kiem)` cùng `loading.tsx`), chi tiết chương trình (điểm 3 năm, An toàn/Vừa sức/Thử sức: chênh ≥ +1 / ≥ −0,5, tính tổng chi phí, nút Báo dữ liệu sai), trường (tabs, Cảm nhận SV, Việc làm SV), ngành, so sánh ≤ 3.

**Cá nhân hoá:** RIASEC 60 câu, `/diem-cua-toi` (THPT/học bạ 30, ĐGNL HN 150, HCM 1200, điểm ưu tiên giảm khi ≥ 22,5), gợi ý (RIASEC 45% · trúng tuyển 35% · vị trí 10% · nhóm ngành 10%), `/da-luu` (kiểm tra chiến lược NV, “nếu điểm thay đổi ±2”, xuất PDF), chia sẻ phụ huynh `/chia-se/[id]` (7/30 ngày, góp ý), `/moc-tuyen-sinh` (Nhắc tôi, .ics, banner ≤14 ngày, **email nhắc trước 7 & 1 ngày**), `/chi-phi`.

**Nội dung:** `/viec-lam` (mỗi số có nguồn, mức tin cậy suy ra từ loại nguồn), cảm nhận SV (kiểm duyệt trước, cờ tự động, báo cáo 3 lần → ẩn, **lọc ngành/khoá khi ≥ 4 cảm nhận**, “Xem thêm” 8/lần, thông báo khi duyệt/từ chối), **chatbot** (truy xuất dữ liệu, từ chối dự đoán/cam kết đỗ/gian lận, ngữ cảnh trang & hội thoại, RIASEC “ngành này có hợp không”, nút Lưu/So sánh trong câu trả lời, từ khoá do admin thêm, 20 câu/phút), **báo dữ liệu sai** (`/tro-giup#bao-loi`, `?ct=<slug>` điền sẵn), **chuông thông báo**.

**Tài khoản:** đăng ký + OTP, đăng nhập email/Google, khoá sau 5 lần sai, đổi mật khẩu thu hồi phiên, xoá tài khoản, dưới 16 tuổi cần đồng ý phụ huynh.

**Quản trị `/quan-tri/*`:** dữ liệu chương trình (ô “Còn là số ước tính”), việc làm, cảm nhận, báo lỗi, mốc tuyển sinh (chính thức bắt buộc link https; quay về lịch gốc bấm 2 lần), chatbot (thống kê + từ khoá), thống kê (phễu 6 bước + SUS + CSV).

**Đo lường:** phễu ẩn danh `lib/track.ts` (tôn trọng DNT/GPC, tắt được ở `/chinh-sach-rieng-tu`), khảo sát SUS `/khao-sat`.

**UI/A11y:** `header-client.tsx` đo chiều rộng thật → thu gọn 5 mức → menu ☰ (SSR fallback gọn để không tràn trên điện thoại); không tràn ngang 360–1920px; tương phản AA; skip link; focus trap hộp thoại; tabs/sao dùng phím mũi tên; `data-scroll-behavior="smooth"` trên `<html>`.

---

### 5b. Đợt 14 tính năng (03/10/2026) — bám Figma N1–N6, B1–B3, C1–C5

| # | Route / vị trí | File chính |
| --- | --- | --- |
| 1–2 Vì sao gợi ý · khớp mục tiêu · “Chưa đủ dữ liệu” | `/goi-y`, trang chủ | `services/recommendation.service.ts`, `components/recommend/*` |
| 3 Đặt mục tiêu qua hội thoại | `/muc-tieu` | `services/goal.ts`, `components/goal/goal-chat.tsx`, `UserData.goal` |
| 4 Tour 6 bước | `/` lần đầu, `/?tour=1`, `/tro-giup` | `components/tour/guided-tour.tsx` (`data-tour=…`) |
| 5 Thẻ chia sẻ | kết quả RIASEC, `/da-luu` | `lib/share-card.ts`, `components/share-card/*` |
| 6 Đăng ký thu ít dữ liệu | `/dang-ky` | tên không bắt buộc (`auth.service.register`) |
| 7 Chọn môn lớp 10 | `/chon-mon`, `?huong=nganh-mon` | `services/grade10.ts` |
| 8 Ma trận quyết định | `/so-sanh?tab=ma-tran` | `services/decision.ts`, `/api/decision` |
| 9 Kế hoạch B + xét bổ sung | `/mua-diem` (`?ngay=2027-08-26` mô phỏng) | `services/plan-b.ts`, `supplementary.service.ts`, `data/supplementary-rounds.ts`; cron gọi `notifyAll()` |
| 10 Hỏi SV + kênh GV (gọn) | mục “Hỏi sinh viên” ở trang chương trình, `/lop-hoc`, `/quan-tri/hoi-dap` | `services/community.service.ts`, `class.service.ts` |
| 11 Học bổng/miễn giảm/vay/KTX | khối “Tài chính cho việc học” ở trang chương trình, `/chi-phi#ho-tro` | `data/financial-aid.ts`, `components/program/finance-block.tsx`, `financial-aid.tsx` |
| 12 Bản nhẹ + Zalo (gọn) | `/nhe` (ngoài layout chính) | chia sẻ lịch sang Zalo bằng Web Share; **chưa có Zalo Mini App/ZNS** |
| 13 Khảo sát sau 1 năm | `/phan-hoi-nganh`, thống kê ở trang chương trình | công bố khi ≥ 20 phản hồi |
| 14 Trường đã xác nhận | huy hiệu ở trang chương trình; gắn/gỡ ở `/quan-tri/chuong-trinh/[id]` | `services/verification.ts` (12 tháng), `adminService.setSchoolVerified` |

- Bảo mật/riêng tư đã rà: mọi API mới có `requireUser/requireAdmin` đúng chỗ, giới hạn tần suất, giới hạn kích thước body, regex id; hỏi đáp & lời nhắn tự che SĐT/email/link + kiểm duyệt; API lớp học **không trả id/email học sinh** (`PublicClass`); giáo viên chỉ thấy trạng thái; khảo sát cần tài khoản đã xác thực.
- Chân trang giữ đúng 4 cột như Figma, các công cụ mới nằm ở hàng “Công cụ:”; menu chính vẫn 6 mục 1 dòng; mục “Lớp học” nằm trong menu tài khoản.
- Test mới: `tests/new-features.test.ts` (10 nhóm), E2E mục 11 (8 nhóm) + 15 trang mới.

## 6. Lỗi đã sửa gần nhất (29–30/09) — đừng làm hỏng lại

1. **Chatbot “Trợ lý đang bận”**: DB v3 cũ nằm trong cache `globalThis.__trovioDb` qua hot-reload → thiếu `chatAliases` → 500.
   Sửa ở `src/repositories/json-file.ts`: chỉ dùng cache khi `cached.data.version === DB_VERSION`; `/api/chat` bọc try/catch trả JSON 500 rõ ràng; `knowledge()` bỏ qua lỗi đọc alias.
2. **Trang chủ 500 khi DB mới**: nhiều request cùng migrate/ghi, trùng tên file tạm → ENOENT.
   Sửa: `load()` single-flight (`g.__trovioDbLoading`), file tạm dùng `randomUUID()`.
3. **Chương trình không tồn tại trả 200**: `loading.tsx` bao cả `[slug]` → chuyển vào `src/app/(site)/chuong-trinh/(tim-kiem)/`.
4. Ngày 30/02 được chấp nhận ở lịch → `validDate` so khớp lại chuỗi.
5. Header tràn ngang trên điện thoại trước khi JS chạy; tab quản trị gây cuộn ngang (sr-only thiếu `relative`).

Test hồi quy: `tests/regression.test.ts`, `tests/improvements.test.ts`.

**Khi thêm trường mới vào DB:** thêm vào `DbShape` + `migrate()` + tăng `DB_VERSION` + cập nhật test migration (`tests/content.test.ts` & harness).

---

## 7. Tài liệu đã giao (thư mục `docs/`)

| File | Nội dung |
| --- | --- |
| `Giai-trinh-chuc-nang-Trovio.docx` | Giải trình toàn bộ chức năng (15 trang) |
| `Kich-ban-kiem-thu-Trovio.docx` | 159 ca kiểm thử cho tester (19 trang) |
| `Checklist-truoc-khi-public-Trovio.docx` | Checklist Back-End trước khi nạp DB & public (18 trang) |
| `Danh-muc-du-lieu-database-Trovio.docx` | Danh mục dữ liệu cần thu thập & bảng hệ thống cho database (18 trang) |
| `Kich-ban-test-nguoi-dung.docx` | Test người dùng thật + SUS |
| `Bao-cao-kiem-thu-Trovio.docx` | Báo cáo kiểm thử đợt trước |

Ngoài ra: `README.md` (đầy đủ API, bảo mật, cron), Claude Doc “checklist backend” (đợt trước). Script sinh docx dùng thư viện `docx` (Node) — style: Arial, màu tiêu đề #4F46E5, bảng header tím, A4 lề 2 cm, header/footer có số trang.

---

## 8. Việc còn mở / gợi ý làm tiếp

- [ ] `src/app/robots.ts` + `src/app/sitemap.ts` (chưa có).
- [ ] Header HSTS + Content-Security-Policy (chưa có).
- [ ] Thay email/hotline giả định ở `/chinh-sach-rieng-tu` (privacy@trovio.vn, 1900 8198).
- [ ] Nhắc qua **Zalo** thật (ZNS/Zalo OA) + đóng gói Zalo Mini App thật — hiện có bản web `/zalo` + `/nhe` và nút “Rủ nhóm lớp”.
- [x] Cổng trường `/cong-truong`, “Hữu ích/Báo cáo” hỏi đáp, nhắc riêng từng học sinh, lời mời khảo sát sau 1 năm (opt-in, cron) — xong 04/10.
- [ ] Thay dữ liệu minh hoạ: đợt xét bổ sung 2027, chính sách hỗ trợ/KTX, hỏi đáp & khảo sát demo, lớp `DEMO12`, huy hiệu xác nhận demo.
- [ ] Nối `services/mailer.ts` với SMTP thật; cron `/api/cron/reminders` (Bearer `CRON_SECRET`).
- [ ] Rate-limit sang Redis khi chạy nhiều instance; chuyển JSON → PostgreSQL (xem checklist docx).
- [ ] Nhập dữ liệu tuyển sinh thật, xoá dữ liệu minh hoạ (7 cảm nhận demo, số liệu việc làm minh hoạ, điểm ĐGNL/học bạ ước tính).
- [ ] Tổ chức test người dùng thật 5–8 người (SUS mục tiêu ≥ 72).
- [ ] Cập nhật `Bao-cao-kiem-thu-Trovio.docx` nếu cần bản báo cáo mới.

---

## 9. Quy trình làm việc đề xuất cho tab mới

1. Đọc file này + `README.md`. Sửa code **trực tiếp trong thư mục dự án trên Mac** (device_bash / Desktop Commander).
2. Sau khi sửa: trên Mac chạy `tsc --noEmit`, `npm test`, `npx next build`; chức năng lớn thì chạy E2E ở cổng 3100 với DB riêng.
3. Kiểm tra UI thật tại http://localhost:3000 (dev server người dùng) — xem console không lỗi, thử 390px & ≥1280px.
4. Báo kết quả ngắn gọn bằng tiếng Việt; tài liệu → docx trong `docs/`.

---

## 10. Figma — cập nhật 03/10/2026 (đồng bộ code + tính năng mới)

File “Trovio — EdTech Platform”, trang *Page 1 · Đồng bộ style*. Font Be Vietnam Pro, biến màu “Trovio · Màu” (mode Indigo 2026), component trong section 🧩 Components.

**Đã đồng bộ với code (sửa trực tiếp):** Header (6 mục menu, chuông, user-menu, 4 biến thể mới Việc làm / Mốc tuyển sinh), Footer, Program Card, Chat Launcher; S01–S16, G01–G04, SYS, Onboarding; mobile: menu ☰ có Việc làm + Mốc tuyển sinh, M-S01 có lộ trình 5 bước (bỏ hàng số liệu). Chat Launcher đã thêm vào mọi màn site (trừ S09 làm bài).
- A01–A09 và 2 màn Admin cũ **giữ nguyên, gắn nhãn “Chưa triển khai”** (code dùng 1 trang /quan-tri 7 tab).

**Section “🔄 Đồng bộ code · Màn bổ sung (10/2026)”** (y=24400): S03 tab Cảm nhận SV / Việc làm SV · /viec-lam · /moc-tuyen-sinh · /chi-phi · /chia-se/[id] · hộp thoại chia sẻ phụ huynh · /khao-sat (SUS) · trợ lý đang mở · menu Thông báo · menu Người dùng · trang chủ đã đăng nhập (“Dành cho bạn”) · 8 màn quản trị (Dữ liệu chương trình, Sửa chương trình, Việc làm, Kiểm duyệt cảm nhận, Báo lỗi, Mốc tuyển sinh, Chatbot, Thống kê & khảo sát).
- Màn quản trị dùng dữ liệu minh hoạ ở chỗ DB demo đang trống (báo lỗi, phễu, điểm SUS).

**Section “✨ Đề xuất A · 6 cải tiến” (hi-fi):** N1 Vì sao Trovio gợi ý (drawer, trọng số 45/35/10/10 + học phí là bộ lọc) · N2 Gợi ý khớp mục tiêu + cảnh báo + nhãn mới “Chưa đủ dữ liệu” · N3 Đặt mục tiêu qua hội thoại (chỉ hiện tổ hợp hợp lệ, thanh kéo có vạch điểm chuẩn 3 năm) · N4 Tour 6 bước do trợ lý dẫn + N4b kịch bản tour · N5 Thẻ chia sẻ RIASEC + danh sách NV (1080×1350) · N6 Đăng ký có cam kết “không hỏi SĐT, ngày sinh, Facebook”.

**Section “🎯 Đề xuất B · 3 hướng ưu tiên” (hi-fi):** B1a Chọn môn lớp 10 → ngành mở/khoá · B1b Từ ngành → nên chọn môn gì · B2 Ma trận quyết định có trọng số · B3 Kế hoạch B + theo dõi mùa công bố điểm & xét bổ sung.

**Section “💡 Đề xuất C · 5 hướng dài hạn” (concept):** C1 Hỏi sinh viên thật + trang giáo viên · C2 Học bổng/miễn giảm/vay vốn/KTX · C3 Zalo Mini App + bản nhẹ · C4 Khảo sát hài lòng sau 1 năm · C5 Trường xác nhận dữ liệu (huy hiệu).

**Quy ước khi làm tiếp trên Figma:**
- Nhãn khả năng theo code: An toàn ≥ +1 điểm, Vừa sức từ −0,5 đến < +1, Thử sức < −0,5. Nhãn “Chưa đủ dữ liệu” đã có trong code (khi chưa có điểm hoặc < 3 năm điểm chuẩn).
- Lỗi hiển thị của Figma: paint gắn biến màu + opacity trong **instance** bị vẽ đặc 100% → kính mờ trong Auth Panel đang dùng màu trắng không gắn biến (opacity 8%/14%).
- Prototype link gắn trên các node nội dung đã thay có thể mất → cần nối lại nếu dùng prototype.
- Còn lệch nhỏ: màu thẻ RIASEC ở S08, nhãn thẻ liên hệ G02, badge Đã lưu khi là khách, avatar S13 vẫn là ảnh.
- Ảnh chụp code dùng để đối chiếu: /tmp/trovio-shots trên Mac (tạm, có thể xoá).


---

## 11. Đợt đồng bộ Figma → code (04/10/2026)

Yêu cầu: “những gì Figma có thì phải triển khai hết lên code”. Lựa chọn của người dùng: `/quan-tri` đổi sang **thanh bên A01–A09**; quản trị **chạy thật, lưu DB**; C3/C5 làm **bản web chạy được**.

**Quản trị (route group `src/app/(admin)/quan-tri`, khung `components/admin/admin-shell.tsx`)** — thanh bên tối 240px theo Figma, nhóm “Cộng đồng & vận hành” chứa các mục cũ (cảm nhận, hỏi đáp, báo lỗi, việc làm, mốc, chatbot, thống kê). Màn hẹp: menu ngăn kéo.

| Màn | Route | Chức năng (đều ghi nhật ký) |
| --- | --- | --- |
| A01 Tổng quan dữ liệu | `/quan-tri` | 4 chỉ số, bảng vấn đề tự phát hiện (thiếu nguồn, điểm chênh > 2, thiếu điểm năm mới, trùng mã, bản sửa của trường, báo lỗi), tiến độ xác minh, hoạt động gần đây, duyệt bản sửa từ Cổng trường |
| A02 Trường & Cơ sở | `/quan-tri/truong` | lọc, thêm/sửa trong ngăn kéo (kiểm tra từng ô ✓/✗/⚠ như Figma), tạm ẩn/hiện lại, chọn nhiều |
| A03 Ngành | `/quan-tri/nganh` | thêm/sửa (mã 7 số, nhóm, 3 nhóm Holland); ngành mới = “Chờ duyệt” (ẩn) tới khi duyệt |
| A04 Chương trình | `/quan-tri/chuong-trinh` (+ `/[id]` sửa) | lọc trường/ngành/hệ, thêm chương trình, tạm ẩn; nhật ký ở cuối trang |
| A05 Điểm & Học phí | `/quan-tri/diem-hoc-phi` | sửa nhanh điểm năm mới nhất/học phí trên bảng, xác minh hàng loạt, nguồn tham chiếu (https + ngày + ghi chú), xoá điểm 1 năm, xuất CSV (chống CSV injection), tab học phí theo khoá |
| A06 Bài test RIASEC | `/quan-tri/trac-nghiem` | sửa/ẩn/thêm câu (mỗi nhóm ≥ 3 câu), trọng số nhóm 0,5–2,0 (dùng trong gợi ý), xuất JSON |
| A07 Nhập & Kiểm duyệt | `/quan-tri/nhap-du-lieu` | tải CSV/XLSX (≤ 2 MB, 2.000 dòng; bộ đọc XLSX tự viết `lib/sheet.ts`, chặn zip bomb), lỗi/cảnh báo từng dòng, sửa dòng, hộp thoại “Xác nhận công bố dữ liệu”, dòng lỗi bị bỏ qua, lịch sử lô nhập |
| A08 Người dùng | `/quan-tri/nguoi-dung` | thống kê, lọc vai trò/trạng thái/ngày, xem chi tiết, khoá (đăng xuất mọi thiết bị, chặn cả Google) / mở khoá, xoá (gõ lại email), tạo tài khoản + gửi link đặt mật khẩu, cấp kiểm duyệt viên, duyệt cán bộ tuyển sinh |
| A09 Quy tắc gợi ý | `/quan-tri/quy-tac-goi-y` | trọng số 4 tiêu chí (tổng 100%), quy tắc bật/tắt/bản nháp/sao chép/cấu hình, **chạy thử** top 3 với trọng số chưa lưu |

**Phía người dùng:** C5 `/cong-truong` (cán bộ tuyển sinh xác nhận từng nhóm số liệu → đủ 4 nhóm = huy hiệu; gửi bản sửa kèm minh chứng https → quản trị duyệt; trang chương trình hiện “đã xác nhận / chờ trường xác nhận” từng ô) · C3 `/zalo` (Mini App bản web, thẻ “Mã sở thích của …” + “Làm trắc nghiệm giống …”, nút “Rủ nhóm lớp” cả trong hộp thoại thẻ chia sẻ) · C1 “Hữu ích (n) · Báo cáo” cho câu trả lời (3 báo cáo → ẩn chờ duyệt lại), “Gửi nhắc” riêng từng học sinh (mã mờ HMAC, 1 lần/24 giờ) · C4 “Sẽ chọn lại trường này” + công tắc “Năm sau bạn có muốn trả lời 3 câu không?” (mặc định tắt, tắt lại trong Hồ sơ; cron gửi lời mời sau 12 tháng) · M-S02 bộ lọc bottom sheet trên điện thoại (“Xem N kết quả” đếm trực tiếp) · UI Patterns: toast mới (viền màu, ✕, “Hoàn tác”), thanh cookie (thống kê chỉ chạy sau khi đồng ý), hộp thoại “Xác nhận xoá” (xoá nguyện vọng + Hoàn tác) và “Chưa lưu thay đổi” (sửa hồ sơ), ngăn kéo “Báo cáo lỗi dữ liệu” ngay trên trang chương trình, cảnh báo “Phiên sẽ hết hạn sau 5 phút” + Gia hạn.

**Dữ liệu:** `DB_VERSION = 8` (thêm overrides/custom cho trường-ngành-chương trình, quizConfig, recommendConfig, importBatches, schoolSubmissions; seed `tuyensinh@neu.edu.vn`, `kiemduyet@trovio.vn`). Service mới: `catalog-admin`, `data-ops`, `quiz-admin`, `import`, `user-admin`, `rules`, `school-portal`. Quyền: `requireAdmin` / `requireStaff` (kiểm duyệt viên) / trang dùng `lib/admin-page.ts`.

**Kiểm thử 04/10:** tsc sạch · 84 unit test (thêm `tests/admin-ops.test.ts`) · build OK · E2E 114/114 (mục 12 mới) · ảnh chụp 1440/390 không tràn ngang.

### 11b. Tốc độ chuyển trang (04/10)

Nguyên nhân chậm: chạy `next dev` (biên dịch theo yêu cầu, ~6 MB JS/trang, server dev ~1 GB RAM). Bản production: ~200 KB JS gzip/trang, server 10–40 ms. Đã thêm `npm run demo`, thanh tiến trình `components/layout/nav-progress.tsx`, `components/layout/lazy-widgets.tsx` (chat, tour, cookie, cảnh báo phiên tải sau), `getCurrentUser` bọc `cache()`. Đã thử `loading.tsx` toàn cục nhưng bỏ (đã chuyển vào `_backup/loading-rejected/`): streaming làm trang cần đăng nhập/không tồn tại trả 200 thay vì 307/404 → E2E báo 11 lỗi.

## 12. Phong cách làm việc · MBTI tham khảo · RIASEC theo tình huống (04/10/2026)

Yêu cầu: thêm 3 ý vào Figma rồi triển khai code, tự kiểm thử. **Giả định đã chốt (người dùng chưa trả lời câu 3 hay 4 trục): dùng 4 trục**, thêm *Chi tiết ↔ Ý tưởng* vì khớp ví dụ “ổn định, chi tiết” của người dùng.

**Figma** (trang `330:2`, section `540:10426` “🧭 Phong cách làm việc · MBTI · RIASEC tình huống (10/2026)”, đặt dưới các section Đề xuất, y ≈ 35400): S17 Giới thiệu `540:10427` · S17 Câu hỏi `540:10604` · S18 Kết quả + MBTI `541:10640` · mảnh bổ sung thẻ gợi ý / ngăn Vì sao / thẻ mời `542:10769` · Mobile câu hỏi `543:10816` · Mobile kết quả `543:10883` · bảng 24 câu RIASEC trước→sau `544:10889` · đặc tả 12 tình huống + ánh xạ MBTI `544:11068`. Dùng component Header/Footer/Button/Tag/Icon sẵn có.

**Code:**
- `src/domain/work-style.ts`: 12 câu (xen kẽ trục, mỗi trục đảo A/B 1 câu), `scoreWorkStyle`, `describeAxis`, `summarizeWorkStyle`, hồ sơ phong cách 22 ngành (`MAJOR_STYLE`) + mặc định theo nhóm (`GROUP_STYLE`, cho ngành admin thêm mới), `matchWorkStyle`/`styleLine`/`styleSentence`/`styleReasons`, MBTI (`MBTI_CODES`, `compareMbti`), `sanitizeWorkStyle`/`sanitizeMbti`.
- Kiểu `WorkAxis`, `StoredWorkStyle`, `StoredMbti`; `UserData.workStyle?`, `UserData.mbti?` (dữ liệu cũ thiếu → null). Store: `workStyle`, `mbti`, `setWorkStyle`, `setMbti`; đồng bộ + gộp (lấy bản mới hơn) + xoá khi đăng xuất.
- UI: `components/work-style/work-style-view.tsx` (giới thiệu → câu hỏi tự sang câu, phím tắt, tiêu điểm về câu mới → kết quả 4 trục, gợi ý ngành nhìn theo phong cách, làm lại / xoá có xác nhận), `mbti-card.tsx` (lưới 16 mã, so sánh, “Vì sao RIASEC”), `style-bits.tsx` (StyleLine trên RecCard, StyleWhyBlock trong WhyDrawer, StyleEntryCard + MajorStyleNote ở trang kết quả, StylePills ở Hồ sơ, MajorStyleCard ở trang ngành). Lối vào thêm ở `/trac-nghiem`, `/cach-goi-y` và chính sách riêng tư đã ghi rõ.
- `data/riasec.ts`: 24 câu viết lại (R1,3,4,9 · I1,4,7,10 · A4,5,9,10 · S2,5,7,9 · E1,4,5,8 · C1,3,6,9), mã câu giữ nguyên. Bỏ số “60” cứng (đếm theo ngân hàng câu). Phễu: `quiz_started`, `style_done`, `mbti_added`, tỉ lệ làm hết trắc nghiệm ở `/quan-tri/thong-ke`.

**Bất biến cần giữ:** `recommendation.service`, `scoring.service`, `rules.service`, `riasec.service` KHÔNG được import `work-style` hay đọc `workStyle`/`mbti` (test kiểm tra bằng cách đọc mã nguồn + so điểm trước/sau).

**Kiểm thử 04/10:** tsc sạch · 95 unit test (thêm `tests/work-style.test.ts`, 11 test) · build OK · E2E 116/116 (mục 13 mới) · ảnh chụp 1440/390 không tràn ngang. Cải tiến UI trong lúc kiểm: nhãn 4 trục ở màn giới thiệu xuống dòng tự nhiên (biểu tượng ⇄ nằm trong dòng chữ), thẻ phong cách ở trang ngành rút gọn tiêu đề.


### 12b. Quản trị: nút về trang chủ + rà soát UX (04/10/2026)

- Nút **“Về trang chủ Trovio”** ngay dưới logo ở thanh bên (logo bấm về Tổng quan), nút **“Trang chủ”** ở thanh trên màn hẹp và ở đầu trang quản trị (màn rộng).
- Thanh bên gọn hơn (đủ 16 mục không cần cuộn ở 900px), đổi “Kiểm duyệt cảm nhận” → “Duyệt cảm nhận” cho khỏi bị cắt chữ, tự cuộn tới mục đang mở.
- “Hoạt động gần đây” (A01) hiện tiếng Việt (`domain/audit-labels.ts` → `describeAudit`), không còn lộ tên trường kỹ thuật như `*`, `alias`, `season`.
- Thẻ số liệu xếp 2 cột trên điện thoại; trạng thái rỗng của Báo lỗi rõ ràng hơn; nhật ký tự xuống dòng với chuỗi dài.
- Sửa lỗi tràn ngang trên điện thoại ở trang Chương trình đào tạo: chữ ẩn `sr-only` trong bảng cuộn ngang làm trang rộng 1043px → thêm quy tắc `.overflow-x-auto { position: relative }` (lớp base, áp dụng toàn web).
- Kiểm thử: tsc sạch · 96 unit test (thêm `tests/admin-ux.test.ts`) · build OK · E2E 116/116 · ảnh chụp 1440/390 không tràn.

### 12c. Lược đồ PostgreSQL chuẩn hoá theo code (04/10/2026)

`database/schema.sql` (79 bảng, 4 view, hàm `admission_score`/`fit_level`, trigger chặn điểm vượt thang), `database/seed.sql` **tự sinh** bằng `npx tsx scripts/export-sql.ts > database/seed.sql`, `database/README.md` (đối chiếu ERD cũ → bảng mới). Đã nạp thử trên PostgreSQL 16: số liệu khớp web (16 trường, 22 ngành, 52 chương trình, A01 2/47/3). `tests/sql-schema.test.ts` báo lỗi nếu code thêm giá trị liệt kê mới mà SQL chưa cập nhật → khi đổi kiểu dữ liệu nhớ sửa `schema.sql` rồi chạy lại script sinh seed.
