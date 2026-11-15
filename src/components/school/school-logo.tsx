"use client";

import { useEffect, useRef, useState } from "react";
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
  priority = false,
}: {
  school: SchoolIdentity;
  size?: keyof typeof sizes;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setFailed(false);
    // Ảnh có trong cache có thể tải xong trước khi React gắn onLoad.
    const img = imgRef.current;
    setLoaded(!!img && img.complete && img.naturalWidth > 0);
  }, [school.logoUrl, school.name, school.code]);

  const fallback = school.code.trim().slice(0, 4).toUpperCase() || "TR";
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-primary-50 font-bold text-primary-700 shadow-sm",
        sizes[size],
        className,
      )}
    >
      <span role="img" aria-label={`Mã trường ${fallback}`} className={loaded && !failed ? "sr-only" : undefined}>
        {fallback}
      </span>
      {school.logoUrl && !failed && (
        // Giữ mã trường trong khi tải hoặc khi ảnh không tải được.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={school.logoUrl}
          alt={`Logo ${school.name}`}
          className={cn("absolute inset-0 h-full w-full bg-white object-contain p-0.5", !loaded && "opacity-0")}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={(event) => setLoaded(event.currentTarget.naturalWidth > 0)}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
