# Đề xuất nâng cấp chức năng Trovio

Ngày lập: 20/10/2026. Trạng thái: đề xuất, chưa triển khai.

## 1. Hướng phát triển nên chọn

Trovio nên phát triển từ công cụ **tìm và chọn trường/ngành** thành công cụ **giúp học sinh hoàn thành kế hoạch tuyển sinh**: chọn chương trình → hiểu điều kiện → chuẩn bị hồ sơ → theo dõi thay đổi → thực hiện đúng hạn.

Ba nâng cấp mình đề xuất làm trước:

1. **Checklist hồ sơ cá nhân theo chương trình và mùa tuyển sinh.**
2. **Theo dõi thay đổi của những chương trình đã lưu.**
3. **Kiểm tra điều kiện xét tuyển và giải thích điều kiện còn thiếu.**

Đây là đánh giá sản phẩm dựa trên mã nguồn, tài liệu nghiệp vụ và kết quả rà soát database của dự án; chưa phải kết quả khảo sát thị trường hoặc xác nhận nhu cầu từ người dùng thật. Trước khi đầu tư lớn, nên cho học sinh và giáo viên thử nguyên mẫu của từng chức năng.

## 2. Những phần đã có, không cần xây lại

| Năng lực hiện tại | Hướng mở rộng hợp lý |
| --- | --- |
| Tìm trường/ngành/chương trình, lưu danh sách | Theo dõi thay đổi trên danh sách đã lưu |
| Nhập điểm, tính điểm, gợi ý có giải thích | Kiểm tra điều kiện riêng theo trường, phương thức và mùa |
| So sánh, ma trận quyết định, giả lập thay đổi điểm | Lưu nhiều phương án để quay lại so sánh |
| Nguyện vọng và kế hoạch B | Checklist thực hiện và lịch sử các phiên bản kế hoạch |
| Lịch tuyển sinh, thông báo và email nhắc hạn | Công việc cá nhân, hồ sơ còn thiếu, hạn riêng của từng chương trình |
| Chia sẻ phụ huynh, hỏi đáp sinh viên, lớp giáo viên | Góp ý theo phương án và lịch hẹn tư vấn |
| Tính chi phí và thông tin hỗ trợ tài chính | Theo dõi việc tìm, chuẩn bị và nộp hồ sơ học bổng |
| Nhập dữ liệu, xác minh nguồn, audit và khôi phục chương trình | Hàng đợi đối soát mã ngành; duyệt và phát hành cả đợt dữ liệu |

Căn cứ chính: các service trong `src/services`, repository trong `database/repositories`, tài liệu luồng nghiệp vụ ở gốc dự án. README có một số mô tả lịch sử; cần dùng mã đang chạy và kiểm thử thực tế để xác nhận mức hoàn thiện của từng màn hình.

## 3. Thứ tự ưu tiên

| Mã | Chức năng | Loại thay đổi | Ưu tiên | Độ lớn tương đối |
| --- | --- | --- | --- | --- |
| F0 | Hàng đợi đối soát mã ngành và nguồn dữ liệu | Nâng cấp quản trị | P0 — nền tảng | Vừa |
| F1 | Checklist hồ sơ và công việc cá nhân | Mở rộng lịch/nhắc hạn | P1 | Vừa |
| F2 | Theo dõi thay đổi chương trình đã lưu | Mở rộng thông báo | P1 | Vừa |
| F3 | Kiểm tra điều kiện xét tuyển theo mùa | Mở rộng tính điểm/chính sách | P1, sau khi đủ dữ liệu | Lớn |
| F4 | Lưu và so sánh nhiều phương án tuyển sinh | Mở rộng ma trận/nguyện vọng | P2 | Vừa |
| F5 | Hồ sơ theo dõi học bổng | Mở rộng hỗ trợ tài chính | P2 | Vừa |
| F6 | Khám phá nghề bằng nhiệm vụ trải nghiệm | Nội dung và trải nghiệm mới | P2 | Lớn về nội dung |
| F7 | Đặt lịch tư vấn với giáo viên/cán bộ trường | Luồng nghiệp vụ mới | P3, cần người vận hành | Lớn |
| F8 | Không gian tổ chức và phát hành dữ liệu theo đợt | Mở rộng vận hành tổ chức | P3, khi có đối tác | Lớn |

Độ lớn là so sánh tương đối, không phải báo giá hay cam kết số ngày. Phạm vi thiết kế, chất lượng dữ liệu và khả năng vận hành cần được chốt trước khi ước lượng triển khai.

## 4. F0 — Hàng đợi đối soát mã ngành và nguồn dữ liệu

**Vấn đề:** đợt chuẩn hóa database đã giữ lại 2.198 bản ghi ngành cần đối soát mã. Nếu xây chức năng suy luận sâu trên các liên kết chưa rõ, kết quả có thể chính xác về phép tính nhưng sai về ngành được xét.

**Người dùng:** quản trị viên; cán bộ trường được phân quyền gửi minh chứng.

**Luồng đề xuất:** mở danh sách cần đối soát → xem mã cũ, lý do và các chương trình liên quan → chọn ngành chuẩn hoặc bổ sung minh chứng → xem trước ảnh hưởng → người có quyền duyệt xác nhận.

**Bản đầu tiên:** tìm/lọc theo trường, nhóm ngành và lý do; gán mã đã xác định; đính kèm URL nguồn và ghi chú; ghi người duyệt và thời điểm. Chưa tự động hợp nhất ID.

**Dữ liệu:** dùng `major_code_review`, `majors`, `programs` hiện có. Bổ sung trạng thái xử lý và minh chứng theo migration; xem xét tái sử dụng `data_evidence_records` thay vì tạo một kho nguồn khác.

**Nghiệm thu:** không gán trùng mã chuẩn; không mất liên kết chương trình; xem lại được quyết định và nguồn. Đo số bản ghi đã đối soát, số bị trả lại và thời gian xử lý, không đặt mục tiêu “xóa hết cảnh báo” bằng cách đoán mã.

## 5. F1 — Checklist hồ sơ theo chương trình

**Giá trị:** học sinh biết mình cần làm gì tiếp theo cho từng lựa chọn, thay vì chỉ có một danh sách trường đã lưu.

**Ví dụ:** một chương trình yêu cầu đăng ký trên cổng trường và cung cấp chứng chỉ. Học sinh thấy hai công việc độc lập, hạn hoàn thành, nguồn hướng dẫn và trạng thái của mình.

**Luồng đề xuất:** chọn chương trình + mùa + phương thức → tạo checklist từ mẫu đã duyệt → đánh dấu công việc → nhận nhắc cho việc chưa hoàn thành → lưu kết quả tự khai báo.

**Bản đầu tiên:** công việc, ngày đến hạn, ghi chú, liên kết cổng nộp chính thức; trạng thái `chưa làm / đang làm / đã làm / không áp dụng`. Người dùng được thêm việc riêng. Việc đã làm không tiếp tục gửi nhắc.

**Khác với hiện tại:** lịch hiện có nhắc sự kiện; checklist theo dõi tiến độ chuẩn bị của từng học sinh cho từng chương trình.

**Dữ liệu:** đánh giá mở rộng `action_items`, `progress_logs` và liên kết kế hoạch hiện có. Checklist sinh từ mẫu phải có khóa duy nhất theo người dùng, chương trình/mùa/phương thức và mục mẫu để bấm tạo lại không sinh bản sao.

**Nghiệm thu:** đổi thiết bị vẫn giữ trạng thái; tạo lại không mất công việc đã hoàn thành; cập nhật mẫu không tự xóa ghi chú cá nhân. Nhãn “đã nộp” là người dùng tự xác nhận nếu chưa có tích hợp với hệ thống tiếp nhận.

**Để sau:** tải giấy tờ cá nhân, OCR và tự động nộp hồ sơ. Bản đầu không cần thu thập những dữ liệu này.

## 6. F2 — Theo dõi thay đổi chương trình đã lưu

**Giá trị:** học sinh biết một thông tin quan trọng đã đổi kể từ lúc mình chọn chương trình.

**Ví dụ:** thông báo “Học phí của chương trình A được cập nhật”, kèm giá trị trước/sau, mùa áp dụng, ngày kiểm tra và nguồn. Đây là ví dụ hành vi, không phải dữ liệu trường thật.

**Luồng đề xuất:** bật theo dõi → dữ liệu được duyệt và lưu thành công → xác định thay đổi có ý nghĩa → thông báo trong web hoặc email theo tùy chọn → mở trang xem chi tiết.

**Bản đầu tiên:** theo dõi học phí, tổ hợp, chỉ tiêu và hạn hồ sơ khi đã có nguồn; chọn loại thay đổi muốn nhận; tắt theo dõi; gom thông báo cùng đợt để tránh gửi dồn.

**Khác với hiện tại:** nhắc hạn là thông báo theo thời gian; chức năng này là thông báo theo thay đổi dữ liệu đã duyệt.

**Dữ liệu:** tiếp tục dùng ID chương trình ổn định. Có thể bổ sung `program_subscriptions`, `catalog_change_events`, `notification_deliveries`; tên bảng chỉ là đề xuất. Dùng khóa chống gửi trùng theo sự kiện, người nhận và kênh. Ghi sự kiện trong cùng transaction với thay đổi; tác vụ gửi chạy sau commit.

**Nghiệm thu:** rollback dữ liệu không phát thông báo; chạy lại job không gửi trùng; tắt theo dõi có hiệu lực; nội dung hiển thị đúng phiên bản dữ liệu gây ra thông báo.

## 7. F3 — Kiểm tra điều kiện xét tuyển theo mùa

**Giá trị:** giải thích học sinh còn thiếu điều kiện gì trước khi đưa chương trình vào kế hoạch.

**Luồng đề xuất:** chọn chương trình + mùa + phương thức → nhập đúng các thông tin cần dùng → kiểm tra từng điều kiện → hiển thị kết quả và nguồn của mỗi điều kiện → tạo công việc bổ sung nếu cần.

**Bản đầu tiên:** chỉ hỗ trợ những quy tắc có nguồn đã duyệt. Tận dụng tính điểm, tổ hợp và chính sách chứng chỉ đang có; bổ sung điều kiện riêng của chương trình theo mùa.

**Kết quả cần phân biệt:**

- Đáp ứng các điều kiện đã kiểm tra.
- Có điều kiện chưa đáp ứng.
- Chưa đủ thông tin của học sinh.
- Chưa đủ dữ liệu chính thức của chương trình.

Kết quả điều kiện không được diễn đạt thành “chắc chắn trúng tuyển”. Điểm chuẩn lịch sử không thay thế điều kiện nhận hồ sơ của mùa hiện tại.

**Dữ liệu:** rà soát `admission_cycles`, `program_offerings`, `program_offering_methods` cùng các service chính sách hiện có. Mỗi bộ quy tắc cần phiên bản, thời gian hiệu lực và nguồn; không rải điều kiện cố định ở nhiều component.

**Nghiệm thu:** cùng hồ sơ và phiên bản quy tắc cho cùng kết quả; giải thích được từng điều kiện; thay đổi mùa không dùng nhầm quy tắc cũ; thiếu dữ liệu không được tự chuyển thành đạt. Quy chế thực tế phải được xác minh từ nguồn có thẩm quyền trước khi nhập, không suy ra từ tài liệu đề xuất này.

## 8. F4 — Lưu nhiều phương án tuyển sinh

**Giá trị:** học sinh có thể giữ phương án “gần nhà”, “trong ngân sách” và “ưu tiên ngành yêu thích”, rồi xem rõ đánh đổi.

**Luồng đề xuất:** sao chép kế hoạch hiện tại → đặt tên phương án → điều chỉnh ngân sách, vị trí hoặc danh sách → so sánh → chọn một phương án làm kế hoạch chính.

**Bản đầu tiên:** lưu tối đa một số ít phương án có tên, thời điểm và ghi chú; so sánh chi phí dự kiến, chương trình khác nhau và điều kiện còn thiếu. Khi chọn phương án chính phải có bước xem trước, không âm thầm ghi đè nguyện vọng.

**Khác với hiện tại:** mở rộng ma trận và giả lập điểm bằng khả năng lưu lại nhiều cấu hình, không xây một thuật toán xếp hạng thứ hai.

**Dữ liệu:** xem xét `admission_plans`, `admission_plan_items`, `decision_scenarios`, `decision_scenario_items` đã có trong migration. Giữ một nguồn kế hoạch chính; nếu chuyển từ JSON người dùng sang bảng quan hệ phải có migration rõ ràng. Lưu giả định và phiên bản dữ liệu khi cần tái hiện kết quả, không nhân bản toàn bộ catalog.

**Nghiệm thu:** sửa phương án A không làm đổi B; thay kế hoạch chính có xác nhận; chương trình bị ẩn hoặc dữ liệu đã thay đổi được đánh dấu khi mở lại.

## 9. F5 — Hồ sơ theo dõi học bổng

**Giá trị:** nối phần hỗ trợ tài chính hiện có với việc học sinh thực sự chuẩn bị hồ sơ.

**Luồng đề xuất:** xem học bổng có nguồn → xem điều kiện và thời hạn → lưu quan tâm → tạo checklist → tự cập nhật tình trạng nộp và kết quả.

**Bản đầu tiên:** danh mục do quản trị duyệt, bộ lọc theo trường/mùa, mức hỗ trợ và điều kiện duy trì nếu được công bố; trạng thái `quan tâm / đang chuẩn bị / đã nộp / có kết quả`.

**Dữ liệu:** có thể bổ sung `scholarships`, `scholarship_cycles`, `user_scholarship_applications`, dùng chung checklist và thông báo. Chỉ lưu một hồ sơ theo người dùng và đợt học bổng.

**Nghiệm thu:** không tự trừ học bổng chưa được cấp khỏi chi phí chắc chắn phải trả; tách kịch bản “nếu được học bổng”; học bổng hết hạn không hiện như còn nhận hồ sơ.

## 10. F6 — Khám phá nghề bằng nhiệm vụ trải nghiệm

**Giá trị:** học sinh hiểu hoạt động thực tế của một hướng nghề trước khi quyết định theo tên ngành hoặc kết quả trắc nghiệm.

**Ví dụ nội dung:** phân tích một bảng dữ liệu nhỏ, thiết kế thông điệp cho một tình huống, hoặc lập kế hoạch một hoạt động. Đây là nội dung cần biên soạn và kiểm thử, không phải bài đánh giá năng lực đã được chuẩn hóa.

**Luồng đề xuất:** chọn nghề → xem công việc và các ngành liên quan → làm nhiệm vụ ngắn → tự ghi mức hứng thú/khó khăn → lưu để trao đổi với giáo viên.

**Bản đầu tiên:** một số nghề có nội dung được biên tập, liên kết nhiều-ngành–nhiều-nghề, câu hỏi tự phản ánh. Không cần tự động chấm bằng AI.

**Dữ liệu:** tận dụng `career_clusters`, `occupations`, `major_occupations`; chỉ thêm bảng nhiệm vụ và kết quả cá nhân nếu mô hình đánh giá hiện có không đáp ứng.

**Nghiệm thu:** không kết luận một bài trải nghiệm quyết định học sinh phù hợp hay không phù hợp với nghề; số liệu lương/việc làm, nếu bổ sung sau, phải có nguồn, thời điểm và phạm vi khảo sát.

## 11. F7 — Đặt lịch tư vấn

**Giá trị:** chuyển từ hỏi đáp chung sang một cuộc trao đổi có người phụ trách và thời gian rõ ràng.

**Luồng đề xuất:** chọn chủ đề và người tư vấn → chọn khung giờ → chọn thông tin đồng ý chia sẻ → nhận xác nhận → tư vấn → lưu ghi chú và việc cần làm tiếp.

**Bản đầu tiên:** danh sách tư vấn viên đã xác minh, lịch trống, đặt/hủy lịch, nhắc lịch và ghi chú. Dùng liên kết họp do người tư vấn cung cấp; chưa cần xây video call hoặc thanh toán.

**Điều kiện triển khai:** có giáo viên/cán bộ thực sự nhận lịch, người xử lý lịch hủy và quy định ai được xem ghi chú.

**Nghiệm thu:** hai người không đặt cùng một suất; hủy lịch giải phóng đúng suất; người tư vấn chỉ thấy hồ sơ được chia sẻ; quyền chia sẻ có thể thu hồi.

Chức năng này mở rộng hướng CRM tư vấn trong [đề xuất doanh nghiệp](DE-XUAT-3-CHUC-NANG-DOANH-NGHIEP.md); không nên xây một hệ thống lịch hẹn riêng biệt cạnh CRM đó.

## 12. F8 — Không gian tổ chức và phát hành dữ liệu

Nên làm khi có trường học sử dụng hệ thống như một công cụ vận hành: quản lý thành viên theo tổ chức, phân biệt người nhập/người duyệt, xem trước cả đợt thay đổi và phát hành nguyên tử.

Hiện đã có cổng trường, audit và bản gốc phục vụ khôi phục từng chương trình. Khoảng mở rộng là **quyền theo tổ chức và quản lý một đợt dữ liệu có nhiều bản ghi**, không phải thêm một nút khôi phục tương tự.

Đặc tả tham khảo: [F1 và F3 trong tài liệu doanh nghiệp](DE-XUAT-3-CHUC-NANG-DOANH-NGHIEP.md). Cần đối chiếu lại với mô hình database sau ngày 20/10/2026 trước khi triển khai.

## 13. Lộ trình đề xuất theo điều kiện hoàn thành

| Giai đoạn | Phạm vi | Điều kiện chuyển tiếp |
| --- | --- | --- |
| A — Dữ liệu đáng tin | F0; chọn một tập chương trình có nguồn rõ để thử nghiệm | Tập thử nghiệm đã đối soát ID/mã, nguồn và mùa |
| B — Học sinh biết việc cần làm | F1 và F2; ưu tiên thông báo trong web trước | Luồng checklist dùng được trên điện thoại; không tạo việc/gửi thông báo trùng |
| C — Hỗ trợ quyết định sâu hơn | F3 và F4 | Quy tắc có phiên bản và nguồn; không dùng dữ liệu chưa rõ để kết luận |
| D — Nội dung và dịch vụ | Chọn F5 hoặc F6 theo phản hồi thực tế | Có người cập nhật nội dung và đo được mức sử dụng |
| E — Đối tác tổ chức | F7 và F8 | Có đối tác, người vận hành và phân quyền đã kiểm thử |

Không cần đợi xử lý toàn bộ 2.198 mã mới xây nguyên mẫu giao diện. Tuy nhiên, chỉ bật chức năng ra quyết định trên tập dữ liệu đã xác minh phù hợp; các bản ghi còn thiếu phải hiển thị đúng trạng thái.

## 14. Nguyên tắc database và tốc độ khi mở rộng

- Schema, migration, repository và script DB tiếp tục nằm trong `database/`.
- Các tên bảng mới trong tài liệu là phác thảo. Kiểm kê bảng hiện có trước; có bảng trong migration không có nghĩa chức năng tương ứng đã hoàn thiện.
- ID nội bộ bất biến; dùng khóa nghiệp vụ và UNIQUE để chống trùng. Không tạo thêm ID từ tên hoặc mã thứ tự.
- Không giữ hai nguồn dữ liệu hiện hành cho cùng một chức năng. Snapshot chỉ phục vụ lịch sử/tái hiện và có mục đích rõ ràng.
- Mỗi bảng công việc/hồ sơ cá nhân phải gắn người sở hữu; quyền truy cập được kiểm tra ở server.
- Thông báo theo thay đổi dùng sự kiện sau commit, chống gửi trùng và giới hạn số lượng. Không gửi email trong transaction sửa dữ liệu.
- Dùng phân trang và index theo bộ lọc thực tế; mở một trang checklist không được tải toàn bộ chương trình hoặc mọi hồ sơ người dùng.
- Khi có nhiều instance, bổ sung cơ chế làm mới cache liên instance cho thay đổi cần hiện ngay; TTL 2 phút hiện tại không đủ cho mọi luồng thời gian thực.
- Đo thời gian request và truy vấn thực tế trước/sau triển khai. Không lấy số đo RAM cache để cam kết tốc độ tải trang.

## 15. Những việc chưa nên ưu tiên

- AI dự đoán phần trăm đỗ chính xác khi chưa có dữ liệu và phương pháp kiểm định.
- Một chatbot mới thay cho việc cải thiện nguồn dữ liệu của chatbot hiện tại.
- Tự đăng nhập hoặc tự nộp nguyện vọng trên hệ thống bên ngoài khi chưa có tích hợp được cho phép.
- Mạng xã hội tổng quát hoặc ứng dụng di động riêng khi các luồng chính trên web chưa được kiểm chứng.
- Dashboard lớn chỉ để có nhiều biểu đồ, nhưng chưa giúp học sinh hoặc quản trị thực hiện quyết định cụ thể.

**Đề xuất chọn phạm vi cho đợt tiếp theo:** làm F0 ở mức hàng đợi đối soát, sau đó triển khai F1 và F2 trên một tập chương trình đã kiểm chứng. Đây là phần bổ sung nối trực tiếp với các chức năng đang có và có tiêu chí nghiệm thu rõ.

## 16. Tài liệu liên quan

- [Luồng nghiệp vụ và use case](../LUONG-NGHIEP-VU-LAM-CO-SO-VE-USE-CASE.md).
- [Migration chuẩn hóa ID và mã ngành](../database/migrations/20261020_identity_integrity.sql).
- [Kết quả audit database hiện có](../database/audit-report.json).
- [Ba chức năng dành cho vận hành tổ chức](DE-XUAT-3-CHUC-NANG-DOANH-NGHIEP.md).
