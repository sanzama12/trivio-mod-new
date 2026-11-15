import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { catalogService, programService } from "@/services";
import { Breadcrumb } from "@/components/ui/misc";
import { SchoolDetailView } from "@/components/school/school-detail-view";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const school = await catalogService.getSchoolBySlug((await params).slug);
  if (!school) return { title: "Không tìm thấy trường" };
  return {
    title: `${school.name} (${school.code})`,
    description: `Giới thiệu ${school.name}, thông tin cơ sở, các ngành đào tạo, điểm chuẩn, học phí và phương thức xét tuyển.`,
  };
}

export default async function SchoolPage({ params }: Props) {
  const { slug } = await params;
  const school = await catalogService.getSchoolBySlug(slug);
  if (!school) notFound();

  const programs = await programService.listBySchool(school.id);

  return (
    <div className="min-h-screen bg-paper-50 pb-20">
      <div className="container-page py-6">
        <Breadcrumb
          items={[
            { label: "Trang chủ", href: "/" },
            { label: "Danh mục trường", href: "/truong" },
            { label: school.shortName || school.name },
          ]}
        />
        <div className="mt-4">
          <SchoolDetailView school={school} programs={programs} />
        </div>
      </div>
    </div>
  );
}
