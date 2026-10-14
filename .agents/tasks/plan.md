# Kế hoạch mở rộng dữ liệu Trovio — Schools, Majors, Programs

## Tổng quan

Dự án là Next.js + TypeScript tại `trovio-web/trovio-web/`.  
Dữ liệu hiện tại: **16 trường**, **21 ngành**, **~55 programs**.  
Mục tiêu: **~80 trường** (đủ các vùng, loại hình), **~60 ngành** (thêm ngành hẹp đầy đủ), **programs mẫu cho mỗi trường mới**.

Schema gốc nằm tại `src/domain/types.ts`.  
Ba file cần sửa: `src/data/schools.ts`, `src/data/majors.ts`, `src/data/programs.ts`.  
MajorGroups đã có 8 nhóm tại `src/data/major-groups.ts` — không thêm nhóm mới, chỉ thêm ngành vào nhóm đã có.

---

## Bước 1 — Thêm trường vào `src/data/schools.ts`

Thứ tự append vào mảng `schools`, nhóm theo `region`. Mỗi trường cần đủ 13 trường bắt buộc của interface `School`.

### 1A. Miền Bắc (`region: "bac"`)

| id | code | name | shortName | city | type |
|----|------|------|-----------|------|------|
| `vnu` | `QHF` | Đại học Quốc gia Hà Nội (trực thuộc) | ĐH Quốc gia HN | Hà Nội | `cong-lap` |
| `ptit-hn` | `PTH` | Học viện Công nghệ Bưu chính Viễn thông (HN) | HV BCVT Hà Nội | Hà Nội | `cong-lap` |
| `hust-e` | `BKA` | ĐH Bách khoa HN – Chương trình tiên tiến | ĐH Bách khoa HN (TT) | Hà Nội | `cong-lap` |
| `hlu` | `HLU` | Trường Đại học Luật Hà Nội | ĐH Luật Hà Nội | Hà Nội | `cong-lap` |
| `hua` | `HUA` | Học viện Tài chính | HV Tài chính | Hà Nội | `cong-lap` |
| `hce` | `HCE` | Trường Đại học Thương mại | ĐH Thương mại | Hà Nội | `cong-lap` |
| `hpu` | `HPU` | Trường Đại học Sư phạm Hà Nội 2 | ĐH Sư phạm HN 2 | Vĩnh Phúc | `cong-lap` |
| `vimaru` | `VMU` | Trường Đại học Hàng hải Việt Nam | ĐH Hàng hải VN | Hải Phòng | `cong-lap` |
| `haui` | `HAU` | Trường Đại học Công nghiệp Hà Nội | ĐH CN Hà Nội | Hà Nội | `cong-lap` |
| `ntu-hn` | `NTU` | Trường Đại học Kiến trúc Hà Nội | ĐH Kiến trúc HN | Hà Nội | `cong-lap` |
| `vfu` | `VFU` | Học viện Ngoại giao | HV Ngoại giao | Hà Nội | `cong-lap` |
| `humg` | `MTA` | Trường Đại học Mỏ – Địa chất | ĐH Mỏ – Địa chất | Hà Nội | `cong-lap` |
| `tlmu` | `TLM` | Trường Đại học Thủy lợi | ĐH Thủy lợi | Hà Nội | `cong-lap` |
| `hvnh` | `HBK` | Học viện Ngân hàng | HV Ngân hàng | Hà Nội | `cong-lap` |
| `gmu` | `GMU` | Học viện Quân y | HV Quân y | Hà Nội | `cong-lap` |
| `ussh-hn` | `QHX` | ĐH Khoa học Xã hội & Nhân văn – ĐHQGHN *(alias, đã có với id `ussh`)* | — | — | — |
| `tmu` | `TMU` | Trường Đại học Thương mại | ĐH Thương mại | Hà Nội | `cong-lap` |
| `neu2` | *(đã có `neu`)* | — | — | — | — |
| `hust2` | *(đã có `hust`)* | — | — | — | — |

> **Lưu ý:** `ussh`, `neu`, `hust`, `fpt` đã có — không nhân đôi. `hce` và `tmu` cùng là Đại học Thương mại — chỉ dùng một id. Dưới đây là danh sách **trường thực sự thêm mới** miền Bắc (15 trường):

```
ptit-hn, hlu, hua, hce, hpu, vimaru, haui, ntu-hn, vfu, humg, tlmu, hvnh, gmu, vnu-ussh (alias skip), hanoi-open
```

**15 trường mới miền Bắc (id chính thức):**

| # | id | code | name | city | type | founded | students |
|---|-----|------|------|------|------|---------|---------|
| 1 | `ptit-hn` | `PTH` | Học viện Công nghệ Bưu chính Viễn thông | Hà Nội | `cong-lap` | 1953 | 20000 |
| 2 | `hlu` | `HLU` | Trường Đại học Luật Hà Nội | Hà Nội | `cong-lap` | 1979 | 12000 |
| 3 | `hvtc` | `HVT` | Học viện Tài chính | Hà Nội | `cong-lap` | 1963 | 15000 |
| 4 | `tmu` | `TMU` | Trường Đại học Thương mại | Hà Nội | `cong-lap` | 1960 | 22000 |
| 5 | `hpu2` | `SPH2` | Trường Đại học Sư phạm Hà Nội 2 | Vĩnh Phúc | `cong-lap` | 1967 | 10000 |
| 6 | `vimaru` | `VMU` | Trường Đại học Hàng hải Việt Nam | Hải Phòng | `cong-lap` | 1956 | 18000 |
| 7 | `haui` | `HAU` | Trường Đại học Công nghiệp Hà Nội | Hà Nội | `cong-lap` | 1898 | 30000 |
| 8 | `nkuhn` | `KXD` | Trường Đại học Kiến trúc Hà Nội | Hà Nội | `cong-lap` | 1969 | 8000 |
| 9 | `hvng` | `NG` | Học viện Ngoại giao | Hà Nội | `cong-lap` | 1959 | 5000 |
| 10 | `humg` | `MGH` | Trường Đại học Mỏ – Địa chất | Hà Nội | `cong-lap` | 1966 | 14000 |
| 11 | `wru` | `TLH` | Trường Đại học Thủy lợi | Hà Nội | `cong-lap` | 1959 | 18000 |
| 12 | `hvnh` | `HBK` | Học viện Ngân hàng | Hà Nội | `cong-lap` | 1961 | 15000 |
| 13 | `ptit-hcm` | `PTS` | HV Công nghệ Bưu chính Viễn thông (Cơ sở HCM) | TP.HCM | `cong-lap` | 1997 | 8000 |
| 14 | `hnou` | `HNO` | Trường Đại học Mở Hà Nội | Hà Nội | `cong-lap` | 1993 | 40000 |
| 15 | `hust-elitech` | `BKE` | ĐH Bách khoa HN – Chương trình ELITECH | Hà Nội | `cong-lap` | 1956 | 2000 |

### 1B. Miền Trung (`region: "trung"`)

**12 trường mới miền Trung:**

| # | id | code | name | city | type | founded | students |
|---|-----|------|------|------|------|---------|---------|
| 1 | `hued` | `DHH` | Đại học Huế | Huế | `cong-lap` | 1957 | 60000 |
| 2 | `huedu` | `DHY` | Trường ĐH Y Dược – ĐH Huế | Huế | `cong-lap` | 1957 | 6000 |
| 3 | `ued` | `DHL` | Trường ĐH Sư phạm – ĐH Đà Nẵng | Đà Nẵng | `cong-lap` | 1954 | 12000 |
| 4 | `due` | `DHK` | Trường ĐH Kinh tế – ĐH Đà Nẵng | Đà Nẵng | `cong-lap` | 1975 | 15000 |
| 5 | `dnu` | `DND` | Trường ĐH Ngoại ngữ – ĐH Đà Nẵng | Đà Nẵng | `cong-lap` | 1955 | 8000 |
| 6 | `qnu` | `QNI` | Trường Đại học Quy Nhơn | Bình Định | `cong-lap` | 1977 | 20000 |
| 7 | `dthu` | `DTH` | Trường Đại học Duy Tân | Đà Nẵng | `tu-thuc` | 1994 | 30000 |
| 8 | `donga` | `DGA` | Trường Đại học Đông Á | Đà Nẵng | `tu-thuc` | 2007 | 10000 |
| 9 | `vinhuni` | `VNH` | Trường Đại học Vinh | Nghệ An | `cong-lap` | 1959 | 25000 |
| 10 | `huelaw` | `HUL` | Trường ĐH Luật – ĐH Huế | Huế | `cong-lap` | 1975 | 5000 |
| 11 | `ntu-dn` | `NTS` | Trường ĐH Nha Trang | Khánh Hòa | `cong-lap` | 1959 | 12000 |
| 12 | `pdu` | `PDU` | Trường Đại học Phú Xuân | Huế | `tu-thuc` | 2005 | 5000 |

### 1C. Miền Nam (`region: "nam"`)

**18 trường mới miền Nam:**

| # | id | code | name | city | type | founded | students |
|---|-----|------|------|------|------|---------|---------|
| 1 | `hcmut` | `BKU` | Trường ĐH Bách khoa – ĐHQG-HCM | TP.HCM | `cong-lap` | 1957 | 22000 |
| 2 | `hcmulaw` | `QTL` | Trường ĐH Luật TP. Hồ Chí Minh | TP.HCM | `cong-lap` | 1976 | 15000 |
| 3 | `hcmcou` | `MHO` | Trường ĐH Mở TP. Hồ Chí Minh | TP.HCM | `cong-lap` | 1993 | 25000 |
| 4 | `hcmue` | `SPH3` | Trường ĐH Sư phạm TP. Hồ Chí Minh | TP.HCM | `cong-lap` | 1976 | 18000 |
| 5 | `hcmup` | `YHD` | Trường ĐH Y Dược TP. Hồ Chí Minh | TP.HCM | `cong-lap` | 1947 | 10000 |
| 6 | `vnuhcm-hcmuss` | `QSX` | Trường ĐH KHXH&NV – ĐHQG-HCM | TP.HCM | `cong-lap` | 1996 | 18000 |
| 7 | `huflit` | `HFL` | Trường ĐH Ngoại ngữ – Tin học TP.HCM | TP.HCM | `tu-thuc` | 1994 | 15000 |
| 8 | `ute-hcm` | `SUH` | Trường ĐH Sư phạm Kỹ thuật TP.HCM | TP.HCM | `cong-lap` | 1962 | 28000 |
| 9 | `uit` | `QTK` | Trường ĐH Công nghệ Thông tin – ĐHQG-HCM | TP.HCM | `cong-lap` | 2006 | 12000 |
| 10 | `agu` | `AGU` | Trường Đại học An Giang | An Giang | `cong-lap` | 2000 | 10000 |
| 11 | `dlou` | `DLO` | Trường Đại học Đà Lạt | Lâm Đồng | `cong-lap` | 1958 | 12000 |
| 12 | `hcmiu` | `IUH` | Trường ĐH Quốc tế – ĐHQG-HCM | TP.HCM | `cong-lap` | 2003 | 8000 |
| 13 | `bdu` | `BDU` | Trường Đại học Bình Dương | Bình Dương | `tu-thuc` | 1997 | 15000 |
| 14 | `hcmcit` | `HTT` | Trường ĐH Công nghiệp TP. Hồ Chí Minh | TP.HCM | `cong-lap` | 1962 | 45000 |
| 15 | `vanlang` | `VLG` | Trường Đại học Văn Lang | TP.HCM | `tu-thuc` | 1995 | 30000 |
| 16 | `hutech` | `HTC` | Trường Đại học Hutech | TP.HCM | `tu-thuc` | 1997 | 35000 |
| 17 | `bentre` | `BTR` | Trường Đại học Bến Tre | Bến Tre | `cong-lap` | 2010 | 5000 |
| 18 | `vgu` | `VGU` | Trường Đại học Việt – Đức | Bình Dương | `quoc-te` | 2008 | 3000 |

**Tổng trường mới thêm: 15 (Bắc) + 12 (Trung) + 18 (Nam) = 45 trường.**  
**Tổng sau khi thêm: 16 + 45 = 61 trường** (đủ đa dạng để demo; có thể thêm tiếp đến 80 trong lần sau nếu cần).

---

## Bước 2 — Thêm ngành vào `src/data/majors.ts`

### Nguyên tắc thêm
- Chỉ dùng 8 `groupId` đã có: `cntt`, `kinh-te`, `y-duoc`, `ky-thuat`, `xa-hoi`, `nghe-thuat`, `giao-duc`, `nong-lam`.
- Mỗi ngành hẹp là một entry riêng với `slug` duy nhất, `code` theo mã ngành Bộ GD&ĐT.
- Đặt `id = slug` (giống pattern hiện tại).

### 2A. Nhóm `cntt` — thêm 10 ngành hẹp

| slug | code | name |
|------|------|------|
| `lap-trinh-ung-dung-phan-mem` | `7480202` | Lập trình ứng dụng phần mềm |
| `lap-trinh-web` | `7480209` | Lập trình Web |
| `lap-trinh-game` | `7480210` | Lập trình Game |
| `an-toan-thong-tin` | `7480202` | An toàn thông tin |
| `mang-may-tinh-va-truyen-thong` | `7480102` | Mạng máy tính và Truyền thông |
| `he-thong-thong-tin` | `7480104` | Hệ thống thông tin |
| `khoa-hoc-du-lieu` | `7480108` | Khoa học dữ liệu |
| `dien-tu-vien-thong` | `7520207` | Điện tử – Viễn thông |
| `cong-nghe-iot` | `7480211` | Công nghệ IoT và Nhúng |
| `blockchain-fintech` | `7480212` | Blockchain & Fintech |

### 2B. Nhóm `kinh-te` — thêm 8 ngành hẹp

| slug | code | name |
|------|------|------|
| `kinh-doanh-thuong-mai` | `7340121` | Kinh doanh thương mại |
| `thuong-mai-dien-tu` | `7340122` | Thương mại điện tử |
| `logistics-chuoi-cung-ung` | `7510605` | Logistics và Quản lý chuỗi cung ứng |
| `kinh-te-phat-trien` | `7310105` | Kinh tế phát triển |
| `quan-tri-nhan-luc` | `7340404` | Quản trị nhân lực |
| `bao-hiem` | `7340204` | Bảo hiểm |
| `kiem-toan` | `7340302` | Kiểm toán |
| `he-thong-thong-tin-quan-ly` | `7340405` | Hệ thống thông tin quản lý |
| `quan-tri-khach-san` | `7810201` | Quản trị khách sạn |

### 2C. Nhóm `y-duoc` — thêm 5 ngành hẹp

| slug | code | name |
|------|------|------|
| `dieu-duong` | `7720301` | Điều dưỡng |
| `ky-thuat-xet-nghiem` | `7720601` | Kỹ thuật xét nghiệm y học |
| `rang-ham-mat` | `7720501` | Răng Hàm Mặt |
| `y-hoc-co-truyen` | `7720115` | Y học cổ truyền |
| `y-te-cong-cong` | `7720701` | Y tế công cộng |

### 2D. Nhóm `ky-thuat` — thêm 7 ngành hẹp

| slug | code | name |
|------|------|------|
| `ky-thuat-xay-dung` | `7580201` | Kỹ thuật xây dựng |
| `ky-thuat-hoa-hoc` | `7520301` | Kỹ thuật hóa học |
| `ky-thuat-moi-truong` | `7520320` | Kỹ thuật môi trường |
| `ky-thuat-o-to` | `7520116` | Kỹ thuật ô tô |
| `ky-thuat-hang-khong` | `7520130` | Kỹ thuật hàng không |
| `cong-nghe-sinh-hoc` | `7420201` | Công nghệ sinh học |
| `ky-thuat-robot` | `7520207` | Kỹ thuật robot và Cơ điện tử |

### 2E. Nhóm `xa-hoi` — thêm 5 ngành hẹp

| slug | code | name |
|------|------|------|
| `bao-chi` | `7320101` | Báo chí |
| `truyen-thong-da-phuong-tien` | `7320104` | Truyền thông đa phương tiện |
| `xa-hoi-hoc` | `7310301` | Xã hội học |
| `ngoai-giao` | `7310206` | Quan hệ quốc tế |
| `ngon-ngu-anh` | `7220201` | Ngôn ngữ Anh |

### 2F. Nhóm `nghe-thuat` — thêm 4 ngành hẹp

| slug | code | name |
|------|------|------|
| `thiet-ke-noi-that` | `7210404` | Thiết kế nội thất |
| `thiet-ke-thoi-trang` | `7210401` | Thiết kế thời trang |
| `my-thuat-ung-dung` | `7210400` | Mỹ thuật ứng dụng |
| `phim-anh-truyen-hinh` | `7210101` | Điện ảnh – Truyền hình |

### 2G. Nhóm `giao-duc` — thêm 4 ngành hẹp

| slug | code | name |
|------|------|------|
| `su-pham-vat-ly` | `7140211` | Sư phạm Vật lý |
| `su-pham-hoa-hoc` | `7140212` | Sư phạm Hóa học |
| `su-pham-tin-hoc` | `7140210` | Sư phạm Tin học |
| `giao-duc-mam-non` | `7140201` | Giáo dục Mầm non |

### 2H. Nhóm `nong-lam` — thêm 4 ngành hẹp

| slug | code | name |
|------|------|------|
| `nuoi-trong-thuy-san` | `7620301` | Nuôi trồng thủy sản |
| `chan-nuoi` | `7620105` | Chăn nuôi |
| `lam-nghiep` | `7620201` | Lâm nghiệp |
| `kinh-te-nong-nghiep` | `7620115` | Kinh tế nông nghiệp |

**Tổng ngành mới thêm: 10 + 9 + 5 + 7 + 5 + 4 + 4 + 4 = 48 ngành.**  
**Tổng sau khi thêm: 21 + 48 = 69 ngành.**

---

## Bước 3 — Chiến lược viết `programs.ts` cho trường mới

### Nguyên tắc chung

1. **Mỗi trường mới cần tối thiểu 2–4 programs** tương ứng ngành mạnh của trường.
2. Dùng pattern `Seed` đã có — chỉ cần thêm vào mảng `seeds[]`.
3. Trường mới **không cần** `extraMethods` phức tạp — chỉ `cutoffs`, `combos`, `tuition`, `quota` là đủ TypeScript compile.
4. `altCutoffs` được tự động tính bởi hàm `altCutoffsOf` — chỉ cần thêm trường vào set tương ứng nếu xét học bạ/ĐGNL.
5. `campus` là index vào `school.campuses[]` — nếu chỉ có 1 campus thì không cần khai báo (mặc định 0).

### Set phương thức xét tuyển mở rộng (thêm vào các Set hiện có)

```typescript
// Bổ sung vào HOCBA_SCHOOLS (xét học bạ):
"haui", "tmu", "hvtc", "hcmcit", "ute-hcm", "vanlang", "hutech",
"hcmcou", "dthu", "qnu", "vinhuni", "ntu-dn"

// Bổ sung vào DGNL_HN_SCHOOLS (ĐGNL Hà Nội):
"ptit-hn", "hlu", "hvtc", "hvnh", "tmu", "haui", "wru"

// Bổ sung vào DGNL_HCM_SCHOOLS (ĐGNL TP.HCM):
"hcmut", "hcmulaw", "hcmue", "hcmup", "uit", "ute-hcm",
"hcmcit", "vanlang", "hutech", "hcmcou", "vnuhcm-hcmuss"
```

### Programs mẫu theo từng trường mới

Mỗi dòng dưới đây là 1 seed entry. Format: `{ school, major, code, cutoffs[2025,2024,2023], tuition[min,max], combos[], quota }`.

#### Miền Bắc

**ptit-hn** (Học viện BCVT Hà Nội — mạnh CNTT, điện tử viễn thông):
```
{ school:"ptit-hn", major:"cong-nghe-thong-tin",   code:"PTH01", cutoffs:[26.0,25.8,25.5], tuition:[16,20], combos:["A00","A01"],         quota:400 }
{ school:"ptit-hn", major:"dien-tu-vien-thong",    code:"PTH02", cutoffs:[24.5,24.2,24.0], tuition:[16,20], combos:["A00","A01"],         quota:350 }
{ school:"ptit-hn", major:"an-toan-thong-tin",     code:"PTH03", cutoffs:[25.0,24.8,24.5], tuition:[16,20], combos:["A00","A01"],         quota:150 }
```

**hlu** (ĐH Luật HN — mạnh Luật):
```
{ school:"hlu", major:"luat",          code:"HLU01", cutoffs:[28.2,28.0,27.8], tuition:[14,16], combos:["A00","A01","C00","D01"], quota:400 }
{ school:"hlu", major:"ngoai-giao",   code:"HLU02", cutoffs:[27.5,27.3,27.1], tuition:[14,16], combos:["A00","A01","D01"],        quota:80  }
```

**hvtc** (HV Tài chính — mạnh Tài chính, Kế toán):
```
{ school:"hvtc", major:"tai-chinh-ngan-hang", code:"HVT01", cutoffs:[26.5,26.3,26.1], tuition:[16,20], combos:["A00","A01","D01","D07"], quota:400 }
{ school:"hvtc", major:"ke-toan",             code:"HVT02", cutoffs:[26.0,25.8,25.5], tuition:[16,20], combos:["A00","A01","D01","D07"], quota:300 }
{ school:"hvtc", major:"kiem-toan",           code:"HVT03", cutoffs:[25.8,25.5,25.2], tuition:[16,20], combos:["A00","A01","D01","D07"], quota:200 }
```

**tmu** (ĐH Thương mại — mạnh Thương mại, Marketing):
```
{ school:"tmu", major:"marketing",           code:"TMU01", cutoffs:[26.0,25.8,25.6], tuition:[14,18], combos:["A00","A01","D01","D07"], quota:200 }
{ school:"tmu", major:"quan-tri-kinh-doanh", code:"TMU02", cutoffs:[25.5,25.3,25.0], tuition:[14,18], combos:["A00","A01","D01","D07"], quota:300 }
{ school:"tmu", major:"thuong-mai-dien-tu",  code:"TMU03", cutoffs:[25.0,24.8,24.5], tuition:[14,18], combos:["A00","A01","D01","D07"], quota:150 }
{ school:"tmu", major:"logistics-chuoi-cung-ung", code:"TMU04", cutoffs:[24.5,24.2,24.0], tuition:[14,18], combos:["A00","A01","D01"], quota:200 }
```

**hpu2** (ĐH Sư phạm HN 2 — mạnh Sư phạm):
```
{ school:"hpu2", major:"su-pham-toan",     code:"SPH201", cutoffs:[25.0,24.8,24.5], tuition:[0,0],   combos:["A00","A01","D01"],     quota:100 }
{ school:"hpu2", major:"su-pham-vat-ly",   code:"SPH202", cutoffs:[23.5,23.2,23.0], tuition:[0,0],   combos:["A00","A01"],           quota:80  }
{ school:"hpu2", major:"su-pham-tin-hoc",  code:"SPH203", cutoffs:[22.5,22.2,22.0], tuition:[0,0],   combos:["A00","A01","D01"],     quota:60  }
```

**vimaru** (ĐH Hàng hải — mạnh Hàng hải, Cơ khí):
```
{ school:"vimaru", major:"ky-thuat-co-khi", code:"VMU01", cutoffs:[21.0,20.8,20.5], tuition:[16,20], combos:["A00","A01"],         quota:300 }
{ school:"vimaru", major:"logistics-chuoi-cung-ung", code:"VMU02", cutoffs:[22.0,21.8,21.5], tuition:[16,20], combos:["A00","A01","D01"], quota:200 }
```

**haui** (ĐH Công nghiệp HN — đa ngành kỹ thuật):
```
{ school:"haui", major:"cong-nghe-thong-tin", code:"HAU01", cutoffs:[24.5,24.2,24.0], tuition:[18,22], combos:["A00","A01","D01"], quota:400 }
{ school:"haui", major:"ky-thuat-dien",       code:"HAU02", cutoffs:[22.5,22.2,22.0], tuition:[18,22], combos:["A00","A01"],       quota:300 }
{ school:"haui", major:"ke-toan",             code:"HAU03", cutoffs:[23.0,22.8,22.5], tuition:[18,22], combos:["A00","A01","D01"], quota:250 }
```

**nkuhn** (ĐH Kiến trúc HN):
```
{ school:"nkuhn", major:"kien-truc",        code:"KXD01", cutoffs:[23.5,23.2,23.0], tuition:[22,28], combos:["V00"],        quota:200, years:5 }
{ school:"nkuhn", major:"thiet-ke-noi-that", code:"KXD02", cutoffs:[22.0,21.8,21.5], tuition:[22,28], combos:["V00","A01"], quota:120 }
```

**hvng** (HV Ngoại giao):
```
{ school:"hvng", major:"ngoai-giao",       code:"NG01", cutoffs:[27.5,27.3,27.0], tuition:[18,22], combos:["A00","A01","D01"], quota:100 }
{ school:"hvng", major:"kinh-doanh-quoc-te", code:"NG02", cutoffs:[26.5,26.3,26.0], tuition:[18,22], combos:["A00","A01","D01"], quota:80 }
```

**humg** (ĐH Mỏ – Địa chất):
```
{ school:"humg", major:"ky-thuat-hoa-hoc", code:"MGH01", cutoffs:[19.0,18.8,18.5], tuition:[16,20], combos:["A00","B00"],     quota:200 }
{ school:"humg", major:"khoa-hoc-moi-truong", code:"MGH02", cutoffs:[17.5,17.2,17.0], tuition:[16,20], combos:["A00","B00"], quota:150 }
```

**wru** (ĐH Thủy lợi):
```
{ school:"wru", major:"ky-thuat-xay-dung", code:"TLH01", cutoffs:[22.0,21.8,21.5], tuition:[16,20], combos:["A00","A01"], quota:400 }
{ school:"wru", major:"ky-thuat-moi-truong", code:"TLH02", cutoffs:[19.5,19.2,19.0], tuition:[16,20], combos:["A00","B00"], quota:150 }
```

**hvnh** (HV Ngân hàng):
```
{ school:"hvnh", major:"tai-chinh-ngan-hang", code:"HBK01", cutoffs:[26.5,26.3,26.0], tuition:[16,20], combos:["A00","A01","D01","D07"], quota:400 }
{ school:"hvnh", major:"ke-toan",             code:"HBK02", cutoffs:[25.5,25.2,25.0], tuition:[16,20], combos:["A00","A01","D01","D07"], quota:250 }
{ school:"hvnh", major:"bao-hiem",            code:"HBK03", cutoffs:[24.0,23.8,23.5], tuition:[16,20], combos:["A00","A01","D01"],       quota:100 }
```

**ptit-hcm** (HV BCVT cơ sở HCM):
```
{ school:"ptit-hcm", major:"cong-nghe-thong-tin", code:"PTS01", cutoffs:[22.5,22.2,22.0], tuition:[15,18], combos:["A00","A01"],       quota:300 }
{ school:"ptit-hcm", major:"dien-tu-vien-thong",  code:"PTS02", cutoffs:[21.5,21.2,21.0], tuition:[15,18], combos:["A00","A01"],       quota:250 }
```

**hnou** (ĐH Mở HN — đào tạo từ xa):
```
{ school:"hnou", major:"quan-tri-kinh-doanh",  code:"HNO01", cutoffs:[20.0,19.8,19.5], tuition:[12,16], combos:["A00","A01","D01"], quota:1000 }
{ school:"hnou", major:"luat",                  code:"HNO02", cutoffs:[19.5,19.2,19.0], tuition:[12,16], combos:["A00","A01","C00"], quota:800  }
{ school:"hnou", major:"cong-nghe-thong-tin",   code:"HNO03", cutoffs:[19.0,18.8,18.5], tuition:[12,16], combos:["A00","A01"],       quota:600  }
```

**hust-elitech** (Bách khoa HN – Elitech, chương trình tiên tiến):
```
{ school:"hust-elitech", major:"khoa-hoc-may-tinh", code:"BKE01", cutoffs:[29.0,28.9,28.8], tuition:[60,80], combos:["A00","A01"], quota:60, type:"Tiên tiến" }
{ school:"hust-elitech", major:"tri-tue-nhan-tao",  code:"BKE02", cutoffs:[28.8,28.7,28.6], tuition:[60,80], combos:["A00","A01"], quota:50, type:"Tiên tiến" }
```

#### Miền Trung

**hued** (ĐH Huế — đa ngành):
```
{ school:"hued", major:"y-khoa",              code:"DHH01", cutoffs:[26.5,26.2,26.0], tuition:[40,50], combos:["B00"],                     quota:200, years:6 }
{ school:"hued", major:"duoc-hoc",            code:"DHH02", cutoffs:[23.5,23.2,23.0], tuition:[24,28], combos:["A00","B00"],               quota:150, years:5 }
{ school:"hued", major:"cong-nghe-thong-tin", code:"DHH03", cutoffs:[22.5,22.2,22.0], tuition:[16,20], combos:["A00","A01"],               quota:200 }
{ school:"hued", major:"kinh-te-phat-trien",  code:"DHH04", cutoffs:[21.0,20.8,20.5], tuition:[14,18], combos:["A00","A01","D01","D07"],   quota:150 }
```

**huedu** (ĐH Y Dược Huế):
```
{ school:"huedu", major:"y-khoa",    code:"DHY01", cutoffs:[27.0,26.8,26.5], tuition:[45,55], combos:["B00"],         quota:150, years:6 }
{ school:"huedu", major:"dieu-duong", code:"DHY02", cutoffs:[22.0,21.8,21.5], tuition:[18,22], combos:["A00","B00"],  quota:200 }
```

**ued** (ĐH Sư phạm Đà Nẵng):
```
{ school:"ued", major:"su-pham-toan",    code:"DHL01", cutoffs:[26.5,26.2,26.0], tuition:[0,0], combos:["A00","A01","D01"], quota:100 }
{ school:"ued", major:"su-pham-vat-ly",  code:"DHL02", cutoffs:[24.5,24.2,24.0], tuition:[0,0], combos:["A00","A01"],       quota:60  }
{ school:"ued", major:"giao-duc-mam-non",code:"DHL03", cutoffs:[24.0,23.8,23.5], tuition:[0,0], combos:["M00","C00"],       quota:80  }
```

**due** (ĐH Kinh tế Đà Nẵng):
```
{ school:"due", major:"marketing",           code:"DHK01", cutoffs:[25.5,25.2,25.0], tuition:[18,22], combos:["A00","A01","D01","D07"], quota:200 }
{ school:"due", major:"quan-tri-kinh-doanh", code:"DHK02", cutoffs:[24.8,24.5,24.2], tuition:[18,22], combos:["A00","A01","D01","D07"], quota:300 }
{ school:"due", major:"tai-chinh-ngan-hang", code:"DHK03", cutoffs:[24.5,24.2,24.0], tuition:[18,22], combos:["A00","A01","D01","D07"], quota:250 }
```

**dnu** (ĐH Ngoại ngữ Đà Nẵng):
```
{ school:"dnu", major:"ngon-ngu-anh",  code:"DND01", cutoffs:[26.5,26.2,26.0], tuition:[16,20], combos:["A00","A01","D01"], quota:250 }
{ school:"dnu", major:"ngoai-giao",    code:"DND02", cutoffs:[25.0,24.8,24.5], tuition:[16,20], combos:["A00","A01","D01"], quota:80  }
```

**qnu** (ĐH Quy Nhơn):
```
{ school:"qnu", major:"cong-nghe-thong-tin", code:"QNI01", cutoffs:[21.0,20.8,20.5], tuition:[14,18], combos:["A00","A01"],       quota:200 }
{ school:"qnu", major:"su-pham-toan",        code:"QNI02", cutoffs:[24.0,23.8,23.5], tuition:[0,0],   combos:["A00","A01","D01"], quota:80  }
{ school:"qnu", major:"ke-toan",             code:"QNI03", cutoffs:[20.5,20.2,20.0], tuition:[14,18], combos:["A00","A01","D01"], quota:150 }
```

**dthu** (ĐH Duy Tân):
```
{ school:"dthu", major:"cong-nghe-thong-tin", code:"DTH01", cutoffs:[20.5,20.2,20.0], tuition:[22,28], combos:["A00","A01","D01"], quota:500 }
{ school:"dthu", major:"y-khoa",              code:"DTH02", cutoffs:[25.0,24.8,24.5], tuition:[50,60], combos:["B00"],             quota:100, years:6 }
{ school:"dthu", major:"quan-tri-kinh-doanh", code:"DTH03", cutoffs:[20.0,19.8,19.5], tuition:[22,28], combos:["A00","A01","D01"], quota:300 }
```

**vinhuni** (ĐH Vinh):
```
{ school:"vinhuni", major:"su-pham-toan",    code:"VNH01", cutoffs:[25.0,24.8,24.5], tuition:[0,0],   combos:["A00","A01","D01"], quota:80 }
{ school:"vinhuni", major:"cong-nghe-thong-tin", code:"VNH02", cutoffs:[20.5,20.2,20.0], tuition:[14,18], combos:["A00","A01"],   quota:150 }
{ school:"vinhuni", major:"ke-toan",         code:"VNH03", cutoffs:[21.0,20.8,20.5], tuition:[14,18], combos:["A00","A01","D01"], quota:120 }
```

**ntu-dn** (ĐH Nha Trang — mạnh Thủy sản, CNTP):
```
{ school:"ntu-dn", major:"cong-nghe-thuc-pham",   code:"NTS01", cutoffs:[18.5,18.2,18.0], tuition:[14,18], combos:["A00","B00","D07"], quota:200 }
{ school:"ntu-dn", major:"nuoi-trong-thuy-san",    code:"NTS02", cutoffs:[16.5,16.2,16.0], tuition:[14,18], combos:["A00","B00"],       quota:150 }
{ school:"ntu-dn", major:"quan-tri-kinh-doanh",    code:"NTS03", cutoffs:[19.5,19.2,19.0], tuition:[14,18], combos:["A00","A01","D01"], quota:200 }
```

**huelaw** (ĐH Luật Huế):
```
{ school:"huelaw", major:"luat",    code:"HUL01", cutoffs:[24.5,24.2,24.0], tuition:[14,16], combos:["A00","A01","C00","D01"], quota:300 }
{ school:"huelaw", major:"ngoai-giao", code:"HUL02", cutoffs:[23.0,22.8,22.5], tuition:[14,16], combos:["A00","A01","D01"],   quota:60  }
```

**donga** (ĐH Đông Á):
```
{ school:"donga", major:"cong-nghe-thong-tin", code:"DGA01", cutoffs:[18.5,18.2,18.0], tuition:[18,22], combos:["A00","A01","D01"], quota:300 }
{ school:"donga", major:"quan-tri-kinh-doanh", code:"DGA02", cutoffs:[18.0,17.8,17.5], tuition:[18,22], combos:["A00","A01","D01"], quota:250 }
```

**pdu** (ĐH Phú Xuân Huế):
```
{ school:"pdu", major:"quan-tri-kinh-doanh", code:"PDU01", cutoffs:[18.0,17.8,17.5], tuition:[16,20], combos:["A00","A01","D01"], quota:200 }
{ school:"pdu", major:"thiet-ke-do-hoa",     code:"PDU02", cutoffs:[17.5,17.2,17.0], tuition:[16,20], combos:["V00","A01"],       quota:100 }
```

#### Miền Nam

**hcmut** (ĐH Bách khoa HCM — kỹ thuật hàng đầu phía Nam):
```
{ school:"hcmut", major:"cong-nghe-thong-tin", code:"BKU01", cutoffs:[27.8,27.6,27.4], tuition:[30,38], combos:["A00","A01"],       quota:500 }
{ school:"hcmut", major:"ky-thuat-dien",        code:"BKU02", cutoffs:[25.5,25.2,25.0], tuition:[30,38], combos:["A00","A01"],       quota:400 }
{ school:"hcmut", major:"ky-thuat-co-khi",      code:"BKU03", cutoffs:[24.5,24.2,24.0], tuition:[30,38], combos:["A00","A01"],       quota:400 }
{ school:"hcmut", major:"ky-thuat-hoa-hoc",     code:"BKU04", cutoffs:[23.5,23.2,23.0], tuition:[30,38], combos:["A00","B00"],       quota:200 }
```

**hcmulaw** (ĐH Luật HCM):
```
{ school:"hcmulaw", major:"luat",    code:"QTL01", cutoffs:[27.5,27.3,27.0], tuition:[16,20], combos:["A00","A01","C00","D01"], quota:500 }
{ school:"hcmulaw", major:"ngoai-giao", code:"QTL02", cutoffs:[27.0,26.8,26.5], tuition:[16,20], combos:["A00","A01","D01"],    quota:80  }
```

**hcmcou** (ĐH Mở HCM):
```
{ school:"hcmcou", major:"quan-tri-kinh-doanh",  code:"MHO01", cutoffs:[22.5,22.2,22.0], tuition:[16,20], combos:["A00","A01","D01"], quota:600 }
{ school:"hcmcou", major:"cong-nghe-thong-tin",   code:"MHO02", cutoffs:[22.0,21.8,21.5], tuition:[16,20], combos:["A00","A01"],       quota:400 }
{ school:"hcmcou", major:"luat",                   code:"MHO03", cutoffs:[22.0,21.8,21.5], tuition:[16,20], combos:["A00","A01","C00"], quota:300 }
```

**hcmue** (ĐH Sư phạm HCM):
```
{ school:"hcmue", major:"su-pham-toan",   code:"SPH301", cutoffs:[27.0,26.8,26.5], tuition:[0,0],   combos:["A00","A01","D01"], quota:120 }
{ school:"hcmue", major:"su-pham-tin-hoc", code:"SPH302", cutoffs:[24.5,24.2,24.0], tuition:[0,0],   combos:["A00","A01"],       quota:80  }
{ school:"hcmue", major:"tam-ly-hoc",      code:"SPH303", cutoffs:[26.5,26.2,26.0], tuition:[14,18], combos:["A00","B00","C00"], quota:100 }
```

**hcmup** (ĐH Y Dược HCM):
```
{ school:"hcmup", major:"y-khoa",    code:"YHD01", cutoffs:[28.5,28.3,28.0], tuition:[55,65], combos:["B00"],         quota:350, years:6 }
{ school:"hcmup", major:"duoc-hoc",  code:"YHD02", cutoffs:[26.5,26.2,26.0], tuition:[30,36], combos:["A00","B00"],   quota:400, years:5 }
{ school:"hcmup", major:"dieu-duong", code:"YHD03", cutoffs:[24.0,23.8,23.5], tuition:[22,28], combos:["A00","B00"],  quota:200 }
```

**vnuhcm-hcmuss** (ĐH KHXH&NV HCM):
```
{ school:"vnuhcm-hcmuss", major:"bao-chi",            code:"QSX01", cutoffs:[25.5,25.2,25.0], tuition:[16,20], combos:["A01","C00","D01"], quota:80 }
{ school:"vnuhcm-hcmuss", major:"xa-hoi-hoc",         code:"QSX02", cutoffs:[22.5,22.2,22.0], tuition:[16,20], combos:["A01","C00","D01"], quota:60 }
{ school:"vnuhcm-hcmuss", major:"tam-ly-hoc",         code:"QSX03", cutoffs:[24.5,24.2,24.0], tuition:[16,20], combos:["A00","B00","D01"], quota:80 }
```

**huflit** (ĐH Ngoại ngữ - Tin học HCM):
```
{ school:"huflit", major:"ngon-ngu-anh",      code:"HFL01", cutoffs:[24.5,24.2,24.0], tuition:[22,28], combos:["A00","A01","D01"], quota:300 }
{ school:"huflit", major:"cong-nghe-thong-tin", code:"HFL02", cutoffs:[21.0,20.8,20.5], tuition:[22,28], combos:["A00","A01"],     quota:200 }
```

**ute-hcm** (ĐH Sư phạm Kỹ thuật HCM):
```
{ school:"ute-hcm", major:"cong-nghe-thong-tin",  code:"SUH01", cutoffs:[24.5,24.2,24.0], tuition:[22,28], combos:["A00","A01"],       quota:300 }
{ school:"ute-hcm", major:"ky-thuat-dien",          code:"SUH02", cutoffs:[22.5,22.2,22.0], tuition:[22,28], combos:["A00","A01"],       quota:250 }
{ school:"ute-hcm", major:"thiet-ke-do-hoa",        code:"SUH03", cutoffs:[23.5,23.2,23.0], tuition:[22,28], combos:["V00","A01","D01"], quota:150 }
```

**uit** (ĐH CNTT ĐHQG-HCM):
```
{ school:"uit", major:"cong-nghe-thong-tin",       code:"QTK01", cutoffs:[27.5,27.3,27.0], tuition:[30,38], combos:["A00","A01"],       quota:500 }
{ school:"uit", major:"khoa-hoc-may-tinh",          code:"QTK02", cutoffs:[27.0,26.8,26.5], tuition:[30,38], combos:["A00","A01"],       quota:200 }
{ school:"uit", major:"mang-may-tinh-va-truyen-thong", code:"QTK03", cutoffs:[26.5,26.2,26.0], tuition:[30,38], combos:["A00","A01"],   quota:150 }
{ school:"uit", major:"an-toan-thong-tin",          code:"QTK04", cutoffs:[26.8,26.5,26.2], tuition:[30,38], combos:["A00","A01"],       quota:100 }
```

**agu** (ĐH An Giang):
```
{ school:"agu", major:"cong-nghe-thong-tin", code:"AGU01", cutoffs:[18.5,18.2,18.0], tuition:[12,16], combos:["A00","A01"],       quota:200 }
{ school:"agu", major:"cong-nghe-thuc-pham", code:"AGU02", cutoffs:[16.5,16.2,16.0], tuition:[12,16], combos:["A00","B00","D07"], quota:150 }
{ school:"agu", major:"nuoi-trong-thuy-san", code:"AGU03", cutoffs:[15.0,14.8,14.5], tuition:[12,16], combos:["A00","B00"],       quota:100 }
```

**dlou** (ĐH Đà Lạt):
```
{ school:"dlou", major:"cong-nghe-thong-tin",  code:"DLO01", cutoffs:[20.5,20.2,20.0], tuition:[16,20], combos:["A00","A01"],       quota:200 }
{ school:"dlou", major:"kinh-te-phat-trien",    code:"DLO02", cutoffs:[19.5,19.2,19.0], tuition:[16,20], combos:["A00","A01","D01"], quota:150 }
{ school:"dlou", major:"du-lich-lu-hanh",       code:"DLO03", cutoffs:[19.0,18.8,18.5], tuition:[16,20], combos:["A00","A01","D01"], quota:100 }
```

> **Lưu ý:** `du-lich-lu-hanh` không có trong majors hiện tại — dùng `quan-tri-du-lich` thay thế.

```
{ school:"dlou", major:"quan-tri-du-lich",  code:"DLO03", cutoffs:[19.0,18.8,18.5], tuition:[16,20], combos:["A00","A01","D01"], quota:100 }
```

**hcmiu** (ĐH Quốc tế ĐHQG-HCM):
```
{ school:"hcmiu", major:"cong-nghe-thong-tin",  code:"IUH01", cutoffs:[25.5,25.2,25.0], tuition:[55,65], combos:["A00","A01"],       quota:150, type:"Quốc tế" }
{ school:"hcmiu", major:"ky-thuat-dien",          code:"IUH02", cutoffs:[24.5,24.2,24.0], tuition:[55,65], combos:["A00","A01"],       quota:100, type:"Quốc tế" }
```

**bdu** (ĐH Bình Dương):
```
{ school:"bdu", major:"quan-tri-kinh-doanh", code:"BDU01", cutoffs:[18.0,17.8,17.5], tuition:[18,22], combos:["A00","A01","D01"], quota:400 }
{ school:"bdu", major:"cong-nghe-thong-tin", code:"BDU02", cutoffs:[17.5,17.2,17.0], tuition:[18,22], combos:["A00","A01"],       quota:300 }
```

**hcmcit** (ĐH Công nghiệp HCM):
```
{ school:"hcmcit", major:"cong-nghe-thong-tin",  code:"HTT01", cutoffs:[24.5,24.2,24.0], tuition:[22,28], combos:["A00","A01"],       quota:600 }
{ school:"hcmcit", major:"ky-thuat-dien",          code:"HTT02", cutoffs:[22.0,21.8,21.5], tuition:[22,28], combos:["A00","A01"],       quota:400 }
{ school:"hcmcit", major:"ke-toan",                code:"HTT03", cutoffs:[23.0,22.8,22.5], tuition:[22,28], combos:["A00","A01","D01"], quota:400 }
{ school:"hcmcit", major:"quan-tri-kinh-doanh",    code:"HTT04", cutoffs:[22.5,22.2,22.0], tuition:[22,28], combos:["A00","A01","D01"], quota:500 }
```

**vanlang** (ĐH Văn Lang):
```
{ school:"vanlang", major:"kien-truc",         code:"VLG01", cutoffs:[21.5,21.2,21.0], tuition:[30,40], combos:["V00"],              quota:200, years:5 }
{ school:"vanlang", major:"thiet-ke-do-hoa",   code:"VLG02", cutoffs:[22.0,21.8,21.5], tuition:[30,40], combos:["V00","A01"],        quota:150 }
{ school:"vanlang", major:"cong-nghe-thong-tin", code:"VLG03", cutoffs:[20.5,20.2,20.0], tuition:[30,40], combos:["A00","A01","D01"], quota:300 }
{ school:"vanlang", major:"quan-tri-khach-san", code:"VLG04", cutoffs:[19.5,19.2,19.0], tuition:[30,40], combos:["A00","A01","D01"],  quota:150 }
```

**hutech** (ĐH Hutech):
```
{ school:"hutech", major:"cong-nghe-thong-tin",  code:"HTC01", cutoffs:[21.5,21.2,21.0], tuition:[24,32], combos:["A00","A01","D01"], quota:600 }
{ school:"hutech", major:"thiet-ke-do-hoa",       code:"HTC02", cutoffs:[21.0,20.8,20.5], tuition:[24,32], combos:["V00","A01"],       quota:200 }
{ school:"hutech", major:"quan-tri-kinh-doanh",   code:"HTC03", cutoffs:[20.5,20.2,20.0], tuition:[24,32], combos:["A00","A01","D01"], quota:500 }
```

**vgu** (ĐH Việt – Đức):
```
{ school:"vgu", major:"ky-thuat-phan-mem",    code:"VGU01", cutoffs:[22.0,21.8,21.5], tuition:[65,80], combos:["A00","A01"], quota:100, type:"Quốc tế" }
{ school:"vgu", major:"ky-thuat-co-khi",       code:"VGU02", cutoffs:[21.0,20.8,20.5], tuition:[65,80], combos:["A00","A01"], quota:80,  type:"Quốc tế" }
```

**bentre** (ĐH Bến Tre):
```
{ school:"bentre", major:"cong-nghe-thong-tin", code:"BTR01", cutoffs:[16.5,16.2,16.0], tuition:[12,16], combos:["A00","A01"],       quota:150 }
{ school:"bentre", major:"ke-toan",              code:"BTR02", cutoffs:[16.5,16.2,16.0], tuition:[12,16], combos:["A00","A01","D01"], quota:100 }
```

---

## Bước 4 — Thứ tự thực hiện tránh lỗi TypeScript

TypeScript sẽ báo lỗi nếu `programs.ts` tham chiếu `schoolId` hoặc `majorId` chưa tồn tại trong mảng (hàm `.find()` trả về `undefined` dẫn đến runtime error khi đọc `school.name`, `major.summary`, v.v.).

**Thứ tự bắt buộc:**

```
1. src/data/majors.ts      — thêm tất cả ngành mới trước
2. src/data/schools.ts     — thêm tất cả trường mới
3. src/data/programs.ts    — thêm seeds và bổ sung các Set (HOCBA/DGNL)
```

**Lý do:** `programs.ts` import và dùng cả `majors` lẫn `schools` tại build-time. Nếu program seed tham chiếu `major: "lap-trinh-web"` nhưng major đó chưa có thì `majors.find(x => x.id === "lap-trinh-web")` trả `undefined` → TypeScript không bắt được lúc build (vì `.find()` trả `T | undefined`) nhưng sẽ crash tại runtime khi truy cập `major.name`.

**Kiểm tra sau mỗi bước:**
```bash
cd trovio-web
npx tsc --noEmit
```
Không có output = không có lỗi kiểu. Sau khi sửa cả 3 file, chạy thêm:
```bash
npm run build
```
để xác nhận toàn bộ project compile thành công.

---

## Tổng kết

| Hạng mục | Trước | Sau |
|----------|-------|-----|
| Trường | 16 | 61 |
| Ngành | 21 | 69 |
| Programs (ước tính) | ~55 | ~200 |
| Vùng | Bắc + Trung + Nam | Bắc + Trung + Nam (cân đối hơn) |
| Loại hình | Công lập, tư thục, quốc tế | ✔ đủ 3 loại |

Tất cả dữ liệu mang tính **minh hoạ demo** — không dùng để đăng ký nguyện vọng thật. Điểm chuẩn và học phí có thể điều chỉnh theo thực tế từ đề án tuyển sinh chính thức của từng trường.
