"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuShieldCheck } from "react-icons/lu";
import type { PublicUser } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProfileFields, type ProfileFormValue } from "./profile-fields";

/** Bước "làm quen" sau khi tạo tài khoản — mọi trường đều tuỳ chọn, có thể bỏ qua. */
export function OnboardingForm({ user }: { user: PublicUser }) {
  const router = useRouter();
  const [value, setValue] = useState<ProfileFormValue>({
    role: user.role,
    gradYear: user.gradYear,
    province: user.province,
    under16: user.under16,
    parentConsent: user.parentConsent,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const first = user.name.split(" ").slice(-1)[0];

  const submit = async (skip: boolean) => {
    if (!skip && value.under16 && !value.parentConsent) {
      setError("Người dùng dưới 16 tuổi cần có sự đồng ý của cha mẹ hoặc người giám hộ.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(skip ? { onboarded: true } : { ...value, onboarded: true }),
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) return setError(data.message);
    router.refresh();
  };

  return (
    <Card className="mx-auto max-w-2xl p-6 md:p-10">
      <p className="text-sm font-semibold text-primary-600">Bước cuối · tuỳ chọn</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Chào {first}! Cho Trovio biết thêm một chút về bạn</h1>
      <p className="mt-2 text-sm text-slate-600">
        Giúp gợi ý trường, ngành sát với bạn hơn. Bạn có thể bỏ qua và cập nhật sau trong <strong>Hồ sơ cá nhân</strong>.
      </p>
      <div className="mt-6">
        <ProfileFields value={value} onChange={(v) => (setValue(v), setError(null))} error={error} />
      </div>
      <p className="mt-5 flex items-start gap-2 text-xs text-slate-500">
        <LuShieldCheck className="mt-0.5 size-4 shrink-0 text-success-500" aria-hidden />
        Trovio không thu thập số điện thoại, ngày sinh hay số CCCD. Điểm thi bạn nhập chỉ dùng để tính mức phù hợp.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={() => submit(true)} disabled={loading}>
          Bỏ qua
        </Button>
        <Button onClick={() => submit(false)} disabled={loading}>
          {loading ? "Đang lưu…" : "Lưu và tiếp tục →"}
        </Button>
      </div>
    </Card>
  );
}
