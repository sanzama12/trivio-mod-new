import type { MajorGroup } from '@/domain/types';

export const majorGroups: MajorGroup[] = [
  { id: 'cntt', slug: 'cong-nghe-cntt', name: 'Công nghệ & CNTT', icon: 'code', tone: 'primary', description: 'Phần mềm, dữ liệu, trí tuệ nhân tạo và các hệ thống số.', position: 1, featured: true },
  { id: 'kinh-te', slug: 'kinh-te-quan-tri', name: 'Kinh tế & Quản trị', icon: 'chart', tone: 'accent', description: 'Kinh doanh, tài chính, marketing, quản trị và thương mại.', position: 2, featured: true },
  { id: 'y-duoc', slug: 'y-duoc-suc-khoe', name: 'Y Dược & Sức khỏe', icon: 'heart', tone: 'danger', description: 'Chăm sóc sức khỏe, dược học, y khoa và khoa học sự sống.', position: 3, featured: true },
  { id: 'ky-thuat', slug: 'ky-thuat-cong-nghe', name: 'Kỹ thuật & Công nghệ', icon: 'gear', tone: 'teal', description: 'Cơ khí, điện, tự động hóa, xây dựng và công nghệ sản xuất.', position: 4, featured: true },
  { id: 'xa-hoi', slug: 'khoa-hoc-xa-hoi', name: 'Khoa học Xã hội', icon: 'users', tone: 'violet', description: 'Luật, truyền thông, ngôn ngữ, tâm lý và nghiên cứu xã hội.', position: 5, featured: true },
  { id: 'nghe-thuat', slug: 'nghe-thuat-thiet-ke', name: 'Nghệ thuật & Thiết kế', icon: 'pen', tone: 'pink', description: 'Thiết kế, mỹ thuật, kiến trúc sáng tạo và nghệ thuật ứng dụng.', position: 6, featured: true },
  { id: 'giao-duc', slug: 'giao-duc-su-pham', name: 'Giáo dục & Sư phạm', icon: 'book', tone: 'success', description: 'Giảng dạy, quản lý giáo dục và phát triển người học.', position: 7, featured: true },
  { id: 'nong-lam', slug: 'nong-lam-moi-truong', name: 'Nông Lâm & Môi trường', icon: 'leaf', tone: 'slate', description: 'Nông nghiệp, lâm nghiệp, tài nguyên và phát triển bền vững.', position: 8, featured: true },
];
