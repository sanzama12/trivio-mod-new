import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: { default: "Trovio – Tìm đúng trường, chọn đúng ngành", template: "%s · Trovio" } };

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="min-h-dvh bg-white">{children}</main>;
}
