import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "accent" | "danger" | "white";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const secondary = "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-sm disabled:bg-primary-300",
  secondary,
  outline: secondary,
  ghost: "text-slate-700 hover:bg-slate-100",
  accent: "bg-accent-500 text-slate-900 hover:brightness-105 shadow-sm",
  danger: "bg-danger-700 text-white hover:bg-danger-700/90",
  white: "bg-white text-primary-700 hover:bg-primary-50 shadow-sm",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-11 sm:min-h-0 sm:h-9 px-3.5 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-5 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-base gap-2 rounded-lg",
  icon: "size-11 sm:size-10 rounded-lg",
};

export function buttonClass(opts: { variant?: ButtonVariant; size?: ButtonSize; full?: boolean; className?: string } = {}) {
  const { variant = "primary", size = "md", full, className } = opts;
  return cn(
    "inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60",
    variants[variant],
    sizes[size],
    full && "w-full",
    className,
  );
}

type Common = { variant?: ButtonVariant; size?: ButtonSize; full?: boolean };

export function Button({ variant, size, full, className, type = "button", ...rest }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonClass({ variant, size, full, className })} {...rest} />;
}

export function ButtonLink({ variant, size, full, className, ...rest }: Common & ComponentProps<typeof Link>) {
  return <Link className={buttonClass({ variant, size, full, className })} {...rest} />;
}
