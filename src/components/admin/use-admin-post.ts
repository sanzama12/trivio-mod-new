"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/toast";

export type PostResult = { ok: boolean; message?: string; field?: string } & Record<string, unknown>;

/** Gửi thao tác quản trị (JSON), báo lỗi bằng toast, tải lại dữ liệu server khi thành công. */
export function useAdminPost() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const post = useCallback(
    async (url: string, body: unknown, opts: { success?: string; refresh?: boolean } = {}): Promise<PostResult> => {
      setBusy(true);
      try {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = (await res.json().catch(() => ({ ok: false, message: "Phản hồi không hợp lệ." }))) as PostResult;
        if (res.status === 401) {
          toast("Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.", "warning");
          return { ok: false, message: "Phiên đã hết." };
        }
        if (!data.ok) {
          if (!data.field) toast(data.message ?? "Không thực hiện được thao tác.", "warning");
          return data;
        }
        if (opts.success) toast(opts.success, "success");
        if (opts.refresh !== false) router.refresh();
        return data;
      } catch {
        toast("Không kết nối được máy chủ. Thử lại sau.", "warning");
        return { ok: false, message: "Lỗi mạng." };
      } finally {
        setBusy(false);
      }
    },
    [router, toast],
  );
  return { post, busy, refresh: router.refresh, toast };
}
