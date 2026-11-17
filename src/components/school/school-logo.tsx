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
  return (
    <span
      role="img"
      aria-label={school.logoUrl ? `Logo ${school.name}` : `Mã trường ${fallback}`}
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 font-bold text-primary-700 shadow-sm",
        school.logoUrl ? "bg-white" : "bg-primary-50",
        sizes[size],
        className,
      )}
    >
      {school.logoUrl ? (
        <span
          aria-hidden="true"
          className="absolute inset-0.5 bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${JSON.stringify(school.logoUrl)})` }}
        />
      ) : fallback}
    </span>
  );
}
