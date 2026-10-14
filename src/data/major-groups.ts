import type { MajorGroup } from "../domain/types";

export const majorGroups: MajorGroup[] = [
  { id: "cntt", slug: "cong-nghe-cntt", name: "Công nghệ & CNTT", icon: "code", tone: "primary" },
  { id: "kinh-te", slug: "kinh-te-quan-tri", name: "Kinh tế & Quản trị", icon: "chart", tone: "accent" },
  { id: "y-duoc", slug: "y-duoc-suc-khoe", name: "Y Dược & Sức khỏe", icon: "heart", tone: "danger" },
  { id: "ky-thuat", slug: "ky-thuat-cong-nghe", name: "Kỹ thuật & Công nghệ", icon: "gear", tone: "teal" },
  { id: "xa-hoi", slug: "khoa-hoc-xa-hoi", name: "Khoa học Xã hội", icon: "users", tone: "violet" },
  { id: "nghe-thuat", slug: "nghe-thuat-thiet-ke", name: "Nghệ thuật & Thiết kế", icon: "pen", tone: "pink" },
  { id: "giao-duc", slug: "giao-duc-su-pham", name: "Giáo dục & Sư phạm", icon: "book", tone: "success" },
  { id: "nong-lam", slug: "nong-lam-moi-truong", name: "Nông Lâm & Môi trường", icon: "leaf", tone: "slate" },
];
