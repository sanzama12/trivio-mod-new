"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

type SchoolIdentity = {
  name: string;
  code: string;
  logoUrl: string | null;
};

const sizes = {
  xs: "size-10 rounded-lg text-xs",
  sm: "size-11 rounded-xl text-xs",
  md: "size-14 rounded-xl text-xs",
  lg: "size-24 rounded-2xl text-lg",
} as const;

export function SchoolLogo({
  school,
  size = "md",
  className,
}: {
  school: SchoolIdentity;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const fallback = school.code.trim().slice(0, 4).toUpperCase() || "TR";
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const logoUrl = school.logoUrl?.startsWith("https://") ? school.logoUrl : null;
  const showLogo = !!logoUrl && failedUrl !== logoUrl;
  return (
    <span
      role="img"
      aria-label={showLogo ? `Logo ${school.name}` : `Mã trường ${fallback}`}
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 font-bold text-primary-700 shadow-sm",
        showLogo ? "bg-white" : "bg-primary-50",
        sizes[size],
        className,
      )}
    >
      {showLogo ? (
        <Image
          src={logoUrl}
          alt=""
          fill
          unoptimized
          sizes="96px"
          className="object-contain p-0.5"
          onError={() => setFailedUrl(logoUrl)}
        />
      ) : fallback}
    </span>
  );
}
