"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type SchoolIdentity = {
  name: string;
  code: string;
  logoUrl: string | null;
};

const sizes = {
  xs: "size-10 rounded-lg text-[10px]",
  sm: "size-11 rounded-xl text-[11px]",
  md: "size-14 rounded-xl text-xs",
  lg: "size-24 rounded-2xl text-lg",
} as const;

export function SchoolLogo({
  school,
  size = "md",
  className,
  priority = false,
}: {
  school: SchoolIdentity;
  size?: keyof typeof sizes;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [school.logoUrl, school.name, school.code]);

  const fallback = school.code.trim().slice(0, 4).toUpperCase() || "TR";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white font-extrabold text-primary-700 shadow-sm",
        sizes[size],
        className,
      )}
    >
      {school.logoUrl && !failed ? (
        // Dùng img để logo quản trị nhập có thể đến từ bất kỳ CDN HTTPS nào.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={school.logoUrl}
          alt={`Logo ${school.name}`}
          className="h-full w-full object-contain p-0.5"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span role="img" aria-label={`Mã trường ${fallback}`}>
          {fallback}
        </span>
      )}
    </span>
  );
}
