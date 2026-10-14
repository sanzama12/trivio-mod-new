import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { Providers } from "./providers";
import { NavProgress } from "@/components/layout/nav-progress";
import "./globals.css";

const font = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Trovio – Tìm đúng trường, chọn đúng ngành", template: "%s · Trovio" },
  description: "Cổng định hướng đại học: tra cứu chương trình đào tạo, so sánh điểm chuẩn, học phí và trắc nghiệm sở thích nghề nghiệp RIASEC.",
  icons: { icon: "/logo-mark.svg" },
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const session = user ? { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } : null;
  return (
    <html lang="vi" className={font.variable} data-scroll-behavior="smooth">
      <body>
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <Providers user={session}>{children}</Providers>
      </body>
    </html>
  );
}
