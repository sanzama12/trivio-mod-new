# Đề xuất 3 chức năng doanh nghiệp cho Trovio

| Thuộc tính | Giá trị |
| --- | --- |
| Tài liệu | Đặc tả đề xuất sản phẩm và nghiệp vụ |
| Phiên bản | 1.0 |
| Ngày lập | 15/10/2026 |
| Trạng thái | Đề xuất — chưa triển khai |
| Phạm vi | Ba chức năng mới có thể đánh giá bằng quy trình, dữ liệu và tiêu chí nghiệm thu |

> **Lưu ý đánh giá:** tài liệu này mô tả mục tiêu và tiêu chí cần đạt. Các chỉ số hiệu năng, chuyển đổi và SLA bên dưới là **mục tiêu cần kiểm thử**, không phải kết quả đã được chứng minh.

## 1. Mục tiêu

Trovio hiện đã bao phủ tốt nhóm chức năng dành cho học sinh và quản trị nội dung: tìm kiếm chương trình, trắc nghiệm, gợi ý, so sánh, lập nguyện vọng, dữ liệu điểm/học phí, cổng trường, lớp giáo viên, kiểm duyệt, báo sai dữ liệu, thông báo và thống kê hành vi ẩn danh.

Ba chức năng trong tài liệu này nhằm bổ sung ba năng lực thường xuất hiện trong một hệ thống vận hành thực tế:

1. Quản lý khách hàng tổ chức và phân quyền nội bộ.
2. Quản lý yêu cầu tư vấn tuyển sinh có sự đồng ý của học sinh.
3. Kiểm soát phát hành dữ liệu theo phiên bản, có duyệt và khôi phục.

## 2. Căn cứ từ mã nguồn hiện tại

| Năng lực đã có | Bằng chứng trong dự án | Khoảng trống còn lại |
| --- | --- | --- |
| Tài khoản và vai trò | `src/domain/types.ts`, `src/services/auth.service.ts` | Vai trò hiện gắn trực tiếp vào người dùng; chưa có tổ chức, thành viên và quyền theo từng trường |
| Cổng cán bộ tuyển sinh | `src/services/school-portal.service.ts`, `/cong-truong` | Một cán bộ gắn với một trường nhưng chưa có chủ tổ chức, lời mời thành viên, nhóm quyền hoặc quản lý nhiều cơ sở |
| Trường gửi đề xuất sửa dữ liệu | `SchoolSubmission`, `schoolPortalService.submit/resolve` | Chưa có bản phát hành dữ liệu độc lập, cơ chế người tạo khác người duyệt và khôi phục toàn bộ phiên bản |
| Nhật ký thay đổi | `src/services/audit.service.ts`, `ProgramAdminRepository` | Có ghi vết nhưng chưa tạo được release/snapshot để đối chiếu và rollback nguyên tử |
| Hỏi đáp và lớp giáo viên | `src/services/community.service.ts`, `src/services/class.service.ts` | Chưa có yêu cầu tư vấn riêng, phân công tư vấn viên, lịch hẹn, SLA và trạng thái chuyển đổi |
| Phễu hành vi ẩn danh | `src/services/analytics.service.ts` | Không phải CRM; cố ý không lưu danh tính và không quản lý hồ sơ tư vấn |

## 3. Tóm tắt ba chức năng đề xuất

| Mã | Chức năng | Bài toán doanh nghiệp | Giá trị cần kiểm chứng |
| --- | --- | --- | --- |
| F1 | Không gian tổ chức trường học và RBAC | Một trường có nhiều cán bộ, nhiều cơ sở và trách nhiệm khác nhau | Giảm cấp quyền thủ công, ngăn truy cập chéo trường, truy vết rõ trách nhiệm |
| F2 | CRM yêu cầu tư vấn và lịch hẹn có consent | Học sinh cần tư vấn trực tiếp; trường cần tiếp nhận, phân công và theo dõi kết quả | Đo được thời gian phản hồi, tỷ lệ hoàn thành tư vấn và nguồn yêu cầu |
| F3 | Data Release: staging, duyệt, publish và rollback | Dữ liệu tuyển sinh thay đổi theo đợt; cập nhật sai có thể ảnh hưởng toàn hệ thống | Ngăn tự duyệt, phát hành nguyên tử, so sánh phiên bản và phục hồi khi có sự cố |

---

## 4. F1 — Không gian tổ chức trường học và phân quyền RBAC

### 4.1. Bài toán

Cổng trường hiện xác nhận một người dùng là cán bộ của một trường. Trong vận hành thực tế, một trường có thể có nhiều cán bộ tuyển sinh, người kiểm duyệt, quản lý và nhân viên tại các cơ sở khác nhau. Nếu mọi cán bộ có cùng quyền, hệ thống khó kiểm soát ai được sửa, ai được duyệt và ai chỉ được xem báo cáo.

### 4.2. Vai trò nghiệp vụ

| Vai trò | Quyền chính |
| --- | --- |
| `org_owner` | Quản lý tổ chức, cơ sở, thành viên và cấu hình bảo mật |
| `org_admin` | Mời thành viên, phân quyền và xem toàn bộ dữ liệu của tổ chức |
| `data_editor` | Tạo bản nháp và đề xuất cập nhật dữ liệu tuyển sinh |
| `data_reviewer` | Duyệt hoặc từ chối bản nháp; không được duyệt nội dung do chính mình tạo |
| `counselor` | Tiếp nhận yêu cầu tư vấn được phân công |
| `analyst` | Chỉ xem báo cáo tổng hợp, không xem dữ liệu ngoài phạm vi được cấp |

Một người có thể thuộc nhiều tổ chức nhưng phải chọn tổ chức đang làm việc. Mọi truy vấn nghiệp vụ phải giới hạn theo `organization_id` ở phía máy chủ; không tin cậy `organization_id` do trình duyệt tự gửi.

### 4.3. Quy trình chính

1. Đại diện trường đăng ký tổ chức bằng email công vụ.
2. Quản trị viên Trovio đối chiếu tên miền và trường trong danh mục.
3. Sau khi duyệt, người đăng ký trở thành `org_owner`.
4. Chủ tổ chức gửi lời mời có thời hạn tới cán bộ khác.
5. Người nhận đăng nhập, chấp nhận lời mời và được gán vai trò/cơ sở.
6. Mọi thao tác tạo, sửa, duyệt và xuất dữ liệu đều ghi audit theo tổ chức.
7. Khi thành viên nghỉ việc, chủ tổ chức thu hồi quyền; phiên đang hoạt động phải mất hiệu lực.

### 4.4. Yêu cầu chức năng

- **ORG-01:** Tạo và duyệt hồ sơ tổ chức gắn với một trường trong danh mục.
- **ORG-02:** Quản lý nhiều cơ sở trực thuộc một tổ chức.
- **ORG-03:** Mời thành viên bằng email, token một lần và ngày hết hạn.
- **ORG-04:** Gán một hoặc nhiều vai trò theo tổ chức/cơ sở.
- **ORG-05:** Thu hồi quyền và vô hiệu hóa phiên truy cập của thành viên.
- **ORG-06:** Nhật ký thành viên: ai mời, ai đổi quyền, thời điểm và giá trị trước/sau.
- **ORG-07:** Không cho người dùng cuối tự nâng quyền hoặc chuyển sang tổ chức khác bằng cách sửa request.
- **ORG-08:** Cho phép chủ tổ chức bàn giao quyền sở hữu nhưng tổ chức luôn phải có ít nhất một chủ sở hữu.

### 4.5. Mô hình dữ liệu tối thiểu

```text
organizations
- id, school_id, name, status, verified_domain, created_at

organization_campuses
- id, organization_id, name, address, active

organization_memberships
- id, organization_id, user_id, campus_id?, roles[], status, joined_at

organization_invitations
- id, organization_id, email, roles[], token_hash, expires_at, accepted_at
```

Ràng buộc bắt buộc:

- Duy nhất `(organization_id, user_id)`.
- Invitation token chỉ lưu dạng hash và chỉ dùng một lần.
- Không được xóa/thu hồi `org_owner` cuối cùng.
- Mọi dữ liệu tổ chức phải có khóa ngoại `organization_id`.

### 4.6. API và màn hình dự kiến

| Thành phần | Đường dẫn dự kiến |
| --- | --- |
| Thiết lập tổ chức | `/cong-truong/cai-dat` |
| Thành viên và lời mời | `/cong-truong/thanh-vien` |
| Chọn tổ chức/cơ sở | Menu tài khoản |
| API tổ chức | `/api/organizations` |
| API thành viên | `/api/organizations/[id]/members` |
| API lời mời | `/api/organizations/[id]/invitations` |

### 4.7. Tiêu chí nghiệm thu

1. **Given** cán bộ trường A, **when** gọi API của trường B, **then** máy chủ trả `403` và không rò rỉ bản ghi.
2. `data_editor` tạo được bản nháp nhưng không duyệt được bản nháp của chính mình.
3. Invitation hết hạn hoặc đã dùng không thể dùng lại.
4. Thu hồi thành viên làm các phiên cũ mất quyền ở request tiếp theo.
5. Mọi thay đổi vai trò xuất hiện trong audit với người thao tác, thời gian và trước/sau.
6. Hệ thống từ chối thao tác khiến tổ chức không còn `org_owner`.

### 4.8. Kiểm thử bắt buộc

- Unit test ma trận quyền theo vai trò.
- Integration test chống truy cập chéo `organization_id`.
- E2E test mời → chấp nhận → cấp quyền → thu hồi.
- Security test IDOR, token dùng lại, token hết hạn và tự nâng quyền.
- Load test danh sách thành viên; mục tiêu ban đầu: p95 dưới 500 ms với 10.000 thành viên/tổ chức, chỉ được công bố sau khi benchmark.

---

## 5. F2 — CRM yêu cầu tư vấn và lịch hẹn có sự đồng ý

### 5.1. Bài toán

Hỏi đáp cộng đồng giải quyết nội dung công khai, còn lớp giáo viên theo dõi định hướng trong lớp. Doanh nghiệp tuyển sinh cần một luồng khác: học sinh chủ động yêu cầu tư vấn riêng, đồng ý chia sẻ thông tin cần thiết, được phân công đúng tư vấn viên và nhận lịch hẹn. Đây không phải việc tự động thu thập lead từ hành vi duyệt web.

### 5.2. Nguyên tắc quyền riêng tư

- Chỉ tạo yêu cầu khi học sinh chủ động gửi form và đánh dấu đồng ý.
- Tách riêng đồng ý nhận tư vấn và đồng ý nhận nội dung quảng bá.
- Không tự chuyển dữ liệu trắc nghiệm, điểm hoặc nguyện vọng cho trường.
- Học sinh chọn từng trường dữ liệu muốn chia sẻ.
- Có ngày hết hạn consent, nút thu hồi và yêu cầu xóa dữ liệu.
- Người dưới 16 tuổi phải áp dụng quy tắc đồng ý của phụ huynh đang có trong hệ thống.
- Không cho phép trường tải hàng loạt dữ liệu học sinh khi chưa có consent phù hợp.

### 5.3. Quy trình chính

1. Học sinh bấm **Yêu cầu tư vấn** tại trang trường/chương trình.
2. Hệ thống hiển thị chính xác dữ liệu sẽ chia sẻ và mục đích sử dụng.
3. Học sinh chọn chủ đề, kênh liên hệ, khung giờ và gửi yêu cầu.
4. Yêu cầu vào hàng chờ của tổ chức tương ứng.
5. Quản lý phân công thủ công hoặc tự động theo tải/cơ sở/chuyên môn.
6. Tư vấn viên cập nhật trạng thái và ghi hoạt động.
7. Học sinh xác nhận lịch, đổi lịch hoặc hủy.
8. Khi hoàn tất, học sinh đánh giá; hệ thống lưu kết quả phục vụ báo cáo SLA.
9. Khi consent hết hạn/thu hồi, trường không được xem tiếp thông tin cá nhân ngoài phần bắt buộc lưu theo chính sách.

### 5.4. Trạng thái nghiệp vụ

```text
new → assigned → contacted → appointment_scheduled → completed
  └──────────────→ cancelled
  └──────────────→ unreachable
```

Mỗi lần đổi trạng thái phải tạo một hoạt động bất biến, không chỉ ghi đè trạng thái cuối.

### 5.5. Yêu cầu chức năng

- **CRM-01:** Form yêu cầu tư vấn gắn với trường/chương trình.
- **CRM-02:** Consent có phiên bản nội dung, mục đích, phạm vi và hạn dùng.
- **CRM-03:** Hàng chờ, bộ lọc, người phụ trách và mức ưu tiên.
- **CRM-04:** Phân công tự động theo tải tối đa và chuyên môn.
- **CRM-05:** Lịch hẹn, xác nhận, đổi/hủy lịch và chống trùng khung giờ.
- **CRM-06:** Nhật ký hoạt động: phân công, liên hệ, ghi chú, trạng thái.
- **CRM-07:** Nhắc việc khi sắp quá SLA; escalation cho quản lý.
- **CRM-08:** Học sinh xem trạng thái, thu hồi consent và yêu cầu xóa.
- **CRM-09:** Báo cáo tổng hợp theo nguồn, chương trình, tư vấn viên và trạng thái.
- **CRM-10:** Không hiển thị điểm/nguyện vọng nếu consent không bao gồm các trường đó.

### 5.6. Mô hình dữ liệu tối thiểu

```text
consents
- id, user_id, organization_id, purpose, fields[], policy_version
- granted_at, expires_at, revoked_at

counseling_requests
- id, organization_id, user_id, program_id?, topic, priority
- status, assignee_id?, source, consent_id, created_at, closed_at

counseling_activities
- id, request_id, actor_id, type, note, from_status?, to_status?, created_at

appointments
- id, request_id, counselor_id, starts_at, ends_at, channel, status
```

Ghi chú tư vấn phải được làm sạch dữ liệu đầu vào, giới hạn độ dài và nằm trong audit. Không đưa ghi chú riêng vào log kỹ thuật.

### 5.7. API và màn hình dự kiến

| Thành phần | Đường dẫn dự kiến |
| --- | --- |
| Học sinh gửi/xem yêu cầu | `/tu-van`, `/tu-van/[id]` |
| Hàng chờ của trường | `/cong-truong/tu-van` |
| Lịch tư vấn viên | `/cong-truong/lich-tu-van` |
| Báo cáo CRM | `/cong-truong/bao-cao` |
| API yêu cầu | `/api/counseling/requests` |
| API phân công/hoạt động | `/api/organizations/[id]/counseling` |

### 5.8. Tiêu chí nghiệm thu

1. Không có consent hợp lệ thì không tạo được yêu cầu tư vấn.
2. Tư vấn viên chỉ xem yêu cầu thuộc tổ chức và phạm vi được phân công.
3. Hai lịch hẹn chồng nhau của cùng tư vấn viên bị từ chối bằng ràng buộc máy chủ.
4. Thu hồi consent làm dữ liệu đã chọn không còn hiển thị cho tư vấn viên.
5. Mọi lần đổi trạng thái có activity riêng, người thực hiện và thời gian.
6. Báo cáo chỉ tổng hợp dữ liệu đúng phạm vi tổ chức; không lộ thông tin trường khác.
7. Yêu cầu xóa tạo tác vụ và có trạng thái xử lý; không chỉ hiện thông báo giao diện.

### 5.9. Chỉ số cần đo sau pilot

- Thời gian phản hồi đầu tiên.
- Tỷ lệ yêu cầu được phân công trong SLA.
- Tỷ lệ lịch hẹn được xác nhận và hoàn thành.
- Tỷ lệ học sinh tự hủy/thu hồi consent.
- Điểm hài lòng sau tư vấn.

Không dùng các chỉ số này để tuyên bố hiệu quả trước khi có dữ liệu pilot và cỡ mẫu được công bố.

### 5.10. Kiểm thử bắt buộc

- Unit test máy trạng thái và tính hiệu lực consent.
- Integration test phân quyền theo tổ chức/người phụ trách.
- E2E test gửi yêu cầu → phân công → đặt lịch → hoàn tất → đánh giá.
- Security test IDOR, xem dữ liệu sau khi thu hồi consent và CSV injection khi xuất báo cáo.
- Test đồng thời hai người đặt cùng một khung giờ.

---

## 6. F3 — Data Release: staging, phê duyệt, phát hành và rollback

### 6.1. Bài toán

Trovio đã có import, kiểm tra lỗi, audit, trường đề xuất bản sửa và quản trị viên xác minh. Tuy nhiên, một lần nhập lớn vẫn cần cơ chế quản trị phát hành như hệ thống doanh nghiệp: dữ liệu mới nằm ở staging, được so sánh với bản đang chạy, có người khác phê duyệt, phát hành nguyên tử và khôi phục được toàn bộ phiên bản.

### 6.2. Nguyên tắc kiểm soát

- **Maker–checker:** người tạo release không được là người duyệt cuối.
- **Immutable snapshot:** nội dung release đã gửi duyệt không bị sửa trực tiếp.
- **Atomic publish:** hoặc toàn bộ release được áp dụng, hoặc không có gì thay đổi.
- **Idempotency:** gửi lại cùng yêu cầu publish không tạo dữ liệu lặp.
- **Rollback:** khôi phục về snapshot trước đó bằng một release đảo ngược có audit.
- **Evidence:** release phải ghi nguồn, phạm vi, năm tuyển sinh và ghi chú.

### 6.3. Quy trình chính

1. Admin hoặc cán bộ trường tạo bản nháp từ file import/đề xuất sửa.
2. Hệ thống chạy validation và sinh báo cáo diff:
   - tạo mới, cập nhật, bỏ qua;
   - thay đổi điểm/học phí/chỉ tiêu/tổ hợp;
   - nguồn thiếu hoặc hết hạn;
   - xung đột khóa trường + ngành + phương thức.
3. Người tạo sửa lỗi rồi **Khóa và gửi duyệt**.
4. Reviewer xem diff, bằng chứng và mẫu ngẫu nhiên trước khi duyệt/từ chối.
5. Release được lên lịch hoặc publish ngay trong transaction.
6. Sau publish, health check xác nhận số lượng, khóa ngoại và dữ liệu công khai.
7. Nếu có sự cố, người có quyền tạo rollback về snapshot trước.

### 6.4. Trạng thái release

```text
draft → validating → ready_for_review → approved → scheduled → publishing → published
                   └───────────────→ rejected
published → rollback_pending → rolled_back
publishing → failed
```

### 6.5. Yêu cầu chức năng

- **REL-01:** Tạo release từ import, đề xuất trường hoặc chỉnh sửa thủ công.
- **REL-02:** Validation bất đồng bộ, có tiến độ và tổng hợp lỗi.
- **REL-03:** Diff theo trường/chương trình/trường dữ liệu, có bộ lọc mức rủi ro.
- **REL-04:** Khóa snapshot khi gửi duyệt.
- **REL-05:** Bắt buộc reviewer khác creator đối với release rủi ro cao.
- **REL-06:** Publish transaction và idempotency key.
- **REL-07:** Lên lịch phát hành và hủy lịch trước thời điểm chạy.
- **REL-08:** Health check sau phát hành; tự đánh dấu failed nếu sai bất biến.
- **REL-09:** Rollback nguyên release, không rollback từng dòng tùy ý.
- **REL-10:** Audit chứa mã release, creator, reviewer, thời điểm, checksum và số bản ghi.

### 6.6. Phân loại rủi ro đề xuất

| Mức | Điều kiện ví dụ | Quy tắc |
| --- | --- | --- |
| Thấp | Sửa ghi chú hoặc nguồn, dưới 20 bản ghi | Một reviewer |
| Trung bình | Sửa điểm/học phí/chỉ tiêu, 20–500 bản ghi | Reviewer khác creator |
| Cao | Trên 500 bản ghi, xóa/ẩn dữ liệu, đổi khóa hoặc có cảnh báo | Reviewer khác creator + xác nhận lần hai trước publish |

Các ngưỡng trên là cấu hình ban đầu và phải được hiệu chỉnh sau khi có dữ liệu vận hành.

### 6.7. Mô hình dữ liệu tối thiểu

```text
data_releases
- id, organization_id?, title, source_type, status, risk_level
- created_by, reviewed_by?, scheduled_at?, published_at?, checksum
- summary_json, created_at

data_release_items
- id, release_id, entity_type, entity_id?, natural_key
- operation, before_json, after_json, validation_json

data_release_approvals
- id, release_id, reviewer_id, decision, note, created_at

data_snapshots
- id, release_id, previous_release_id?, payload_ref, checksum, created_at
```

Với dữ liệu lớn, `before_json/after_json` có thể chuyển sang object storage; database chỉ giữ metadata, checksum và đường dẫn có chữ ký.

### 6.8. API và màn hình dự kiến

| Thành phần | Đường dẫn dự kiến |
| --- | --- |
| Danh sách release | `/quan-tri/phat-hanh-du-lieu` |
| Tạo release/import | `/quan-tri/phat-hanh-du-lieu/moi` |
| Diff và phê duyệt | `/quan-tri/phat-hanh-du-lieu/[id]` |
| API release | `/api/admin/data-releases` |
| API validate/publish | `/api/admin/data-releases/[id]/validate`, `/publish` |
| API rollback | `/api/admin/data-releases/[id]/rollback` |

### 6.9. Tiêu chí nghiệm thu

1. Creator không thể duyệt release do mình tạo khi chính sách yêu cầu maker–checker.
2. Sau khi gửi duyệt, sửa item làm release quay lại `draft` hoặc bị từ chối bằng version conflict.
3. Publish thất bại giữa chừng không để lại một phần dữ liệu mới.
4. Gửi lại cùng idempotency key trả cùng kết quả, không tạo bản ghi lặp.
5. Rollback đưa toàn bộ dữ liệu trong phạm vi về snapshot trước và tạo audit mới.
6. Checksum sai làm dừng publish.
7. Người dùng công khai không nhìn thấy dữ liệu staging.

### 6.10. Kiểm thử bắt buộc

- Unit test máy trạng thái release và phân loại rủi ro.
- Integration test transaction rollback khi lỗi ở giữa batch.
- Integration test idempotency và optimistic locking.
- E2E test tạo → validate → duyệt → publish → rollback.
- Security test tự duyệt, sửa release đã khóa và truy cập release ngoài phạm vi.
- Benchmark với 1.000, 10.000 và 20.000 dòng; báo cáo thời gian validate/publish, p95 và tài nguyên. Không công bố “nhanh” trước khi có kết quả đo.

---

## 7. Yêu cầu xuyên suốt

### 7.1. Bảo mật

- Authorization bắt buộc ở service/API, không chỉ ẩn nút trên giao diện.
- Mọi ID lấy từ request phải được kiểm tra quyền sở hữu/phạm vi tổ chức.
- Cookie phiên giữ `httpOnly`, `sameSite`, `secure` ở production.
- Rate limit riêng cho lời mời, CRM, export và publish.
- Secret/tokens không ghi log; invitation token chỉ lưu hash.
- Xuất CSV phải chống công thức bắt đầu bằng `=`, `+`, `-`, `@`.

### 7.2. Audit và quan sát hệ thống

- Mỗi request có `request_id`/`correlation_id`.
- Audit tách khỏi log kỹ thuật, không lưu dữ liệu nhạy cảm không cần thiết.
- Dashboard kỹ thuật theo dõi lỗi API, job thất bại và hàng đợi quá SLA.
- Cảnh báo khi publish thất bại hoặc CRM backlog vượt ngưỡng cấu hình.

### 7.3. Hiệu năng và khả năng phục hồi

- Tác vụ dài chạy bằng background job, giao diện đọc tiến độ theo polling hoặc SSE.
- API thay đổi trạng thái quan trọng dùng idempotency key.
- Danh sách lớn phân trang phía máy chủ và có index theo tenant/status/time.
- Backup và diễn tập restore phải được ghi thành biên bản kiểm thử riêng.

### 7.4. Quyền riêng tư

- Dữ liệu CRM không trộn vào analytics ẩn danh hiện có.
- Có thời hạn lưu giữ theo loại dữ liệu và job xóa/ẩn danh hóa.
- Consent lưu phiên bản văn bản để chứng minh người dùng đã đồng ý điều gì.
- Export và truy cập hồ sơ nhạy cảm đều phải có audit.

## 8. Thứ tự triển khai đề xuất

| Giai đoạn | Phạm vi | Lý do phụ thuộc |
| --- | --- | --- |
| 1 | F1 — Tổ chức và RBAC | Tạo nền tảng tenant/quyền cho hai chức năng sau |
| 2 | F3 — Data Release | Dùng vai trò editor/reviewer và phạm vi tổ chức từ F1 |
| 3 | F2 — CRM tư vấn | Dùng vai trò counselor, tổ chức, cơ sở và audit từ F1 |

Không nên triển khai F2 trước khi hoàn thành cô lập dữ liệu theo tổ chức và consent, vì rủi ro lộ dữ liệu cá nhân cao hơn lợi ích demo.

## 9. Kịch bản demo để thầy cô đánh giá

### Kịch bản A — Phân quyền tổ chức

1. Chủ trường mời một editor và một reviewer.
2. Editor đăng nhập, tạo thay đổi nhưng không tự duyệt được.
3. Dùng editor của trường A thử mở dữ liệu trường B và nhận `403`.
4. Chủ trường thu hồi editor; request tiếp theo mất quyền.

### Kịch bản B — Tư vấn có consent

1. Học sinh chọn chính xác dữ liệu muốn chia sẻ và gửi yêu cầu.
2. Quản lý phân công tư vấn viên, đặt lịch và hoàn tất tư vấn.
3. Học sinh thu hồi consent.
4. Tư vấn viên không còn xem được dữ liệu đã bị thu hồi; audit vẫn ghi nhận sự kiện hợp lệ.

### Kịch bản C — Phát hành và rollback

1. Import file có dòng hợp lệ, cảnh báo và lỗi.
2. Xem diff, sửa lỗi, khóa release và gửi duyệt.
3. Creator thử tự duyệt và bị từ chối.
4. Reviewer duyệt, publish toàn bộ release.
5. Thực hiện rollback và chứng minh dữ liệu trở lại snapshot trước.

## 10. Definition of Done chung

Một chức năng chỉ được coi là hoàn thành khi đáp ứng đủ:

- Có migration và ràng buộc dữ liệu.
- Có kiểm tra authorization ở server.
- Có unit, integration và E2E test cho happy path lẫn lỗi/phân quyền.
- Có audit cho thao tác quan trọng.
- Có trạng thái loading, empty, error và retry trên giao diện.
- Có tài liệu API và hướng dẫn vận hành.
- Có dữ liệu demo tách biệt dữ liệu production.
- Có báo cáo benchmark nếu đưa ra tuyên bố hiệu năng.
- Có kiểm thử người dùng/pilot nếu đưa ra tuyên bố về mức độ phù hợp hoặc hiệu quả nghiệp vụ.

## 11. Tiêu chí chấm điểm gợi ý

| Nhóm đánh giá | Trọng số gợi ý | Minh chứng |
| --- | ---: | --- |
| Đúng nghiệp vụ và máy trạng thái | 20% | Sơ đồ luồng, trạng thái, ràng buộc |
| Phân quyền và bảo mật | 20% | Ma trận quyền, test IDOR/maker–checker |
| Toàn vẹn dữ liệu | 20% | Transaction, khóa duy nhất, idempotency, rollback |
| Khả năng kiểm thử | 15% | Unit/integration/E2E, dữ liệu test độc lập |
| Trải nghiệm sử dụng | 10% | Loading/error/empty, tác vụ rõ ràng |
| Quan sát và audit | 10% | Audit, request ID, cảnh báo job/SLA |
| Tài liệu và demo | 5% | README, API, kịch bản demo tái lập được |

## 12. Phạm vi không đưa vào ba chức năng này

- Thanh toán và gói thuê bao.
- Tự động gửi quảng cáo khi chưa có consent riêng.
- AI tự quyết định tuyển sinh hoặc tự xếp hạng học sinh.
- Thu thập số điện thoại/điểm/nguyện vọng từ hành vi duyệt web.
- SSO/SAML doanh nghiệp ở phiên bản đầu; có thể bổ sung sau khi RBAC ổn định.

Các mục trên chỉ nên được xem xét sau khi ba nền tảng tổ chức, consent và kiểm soát dữ liệu đã được kiểm thử đầy đủ.
