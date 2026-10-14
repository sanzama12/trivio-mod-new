/** 34 tỉnh, thành phố sau sắp xếp đơn vị hành chính (từ 01/7/2025). */
export const PROVINCES = [
  "An Giang", "Bắc Ninh", "Cà Mau", "Cao Bằng", "Cần Thơ", "Đà Nẵng", "Đắk Lắk", "Điện Biên", "Đồng Nai",
  "Đồng Tháp", "Gia Lai", "Hà Nội", "Hà Tĩnh", "Hải Phòng", "Huế", "Hưng Yên", "Khánh Hòa", "Lai Châu",
  "Lạng Sơn", "Lào Cai", "Lâm Đồng", "Nghệ An", "Ninh Bình", "Phú Thọ", "Quảng Ngãi", "Quảng Ninh",
  "Quảng Trị", "Sơn La", "Tây Ninh", "Thái Nguyên", "Thanh Hóa", "TP. Hồ Chí Minh", "Tuyên Quang", "Vĩnh Long",
] as const;

import type { Region } from "./types";

/** Miền của từng tỉnh/thành (dùng cho gợi ý "gần nơi bạn học"). */
export const PROVINCE_REGION: Record<(typeof PROVINCES)[number], Region> = {
  "Hà Nội": "bac", "Hải Phòng": "bac", "Quảng Ninh": "bac", "Bắc Ninh": "bac", "Hưng Yên": "bac", "Ninh Bình": "bac",
  "Phú Thọ": "bac", "Thái Nguyên": "bac", "Tuyên Quang": "bac", "Lào Cai": "bac", "Lai Châu": "bac", "Điện Biên": "bac",
  "Sơn La": "bac", "Lạng Sơn": "bac", "Cao Bằng": "bac",
  "Thanh Hóa": "trung", "Nghệ An": "trung", "Hà Tĩnh": "trung", "Quảng Trị": "trung", "Huế": "trung", "Đà Nẵng": "trung",
  "Quảng Ngãi": "trung", "Gia Lai": "trung", "Đắk Lắk": "trung", "Khánh Hòa": "trung", "Lâm Đồng": "trung",
  "TP. Hồ Chí Minh": "nam", "Đồng Nai": "nam", "Tây Ninh": "nam", "Cần Thơ": "nam", "Vĩnh Long": "nam", "Đồng Tháp": "nam",
  "Cà Mau": "nam", "An Giang": "nam",
};

export const regionOfProvince = (p: string | null | undefined): Region | null =>
  p && p in PROVINCE_REGION ? PROVINCE_REGION[p as keyof typeof PROVINCE_REGION] : null;

export const ROLE_LABELS = { student: "Học sinh", parent: "Phụ huynh", teacher: "Giáo viên", school: "Cán bộ tuyển sinh" } as const;

/** Năm tốt nghiệp THPT cho phép chọn (năm hiện tại → +3). */
export function gradYearOptions(now = new Date()): number[] {
  const y = now.getFullYear();
  return [y, y + 1, y + 2, y + 3];
}
