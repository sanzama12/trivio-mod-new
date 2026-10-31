import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isGoogleConfigured, catalogService } from "@/services";
import { Breadcrumb } from "@/components/ui/misc";
import { ProfileClient } from "@/components/profile/profile-client";

export const metadata: Metadata = { title: "Hồ sơ cá nhân" };

type Props = { searchParams: Promise<{ linked?: string; error?: string }> };

export default async function ProfilePage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap?next=/ho-so");
  const { linked, error } = await searchParams;

  const [combos, subjects, groups, majors] = await Promise.all([
    catalogService.getCombos(),
    catalogService.getSubjects(),
    catalogService.getGroups(),
    catalogService.getMajors(),
  ]);

  return (
    <div className="container-page py-6 sm:py-8 lg:py-10">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Hồ sơ cá nhân" }]} />
      <div className="mt-4 sm:mt-6">
        <ProfileClient
          user={user}
          googleConfigured={isGoogleConfigured()}
          notice={{ linked, error }}
          combos={combos}
          subjects={subjects}
          groups={groups}
          majors={majors.map((m) => ({ id: m.id, name: m.name, groupId: m.groupId }))}
        />
      </div>
    </div>
  );
}
