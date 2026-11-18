import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: { default: "Trovio – Tra cứu tuyển sinh và định hướng ngành", template: "%s · Trovio" } };

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="min-h-dvh bg-white">{children}</main>;
}
