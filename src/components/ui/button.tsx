import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "accent" | "danger" | "white";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-sm disabled:bg-primary-300",
  secondary: "bg-primary-50 text-primary-700 hover:bg-primary-100",
  outline: "border border-primary-600 text-primary-700 bg-white hover:bg-primary-50",
  ghost: "text-slate-700 hover:bg-slate-100",
  accent: "bg-accent-500 text-slate-900 hover:brightness-105 shadow-sm",
  danger: "bg-danger-700 text-white hover:bg-danger-700/90",
  white: "bg-white text-primary-700 hover:bg-primary-50 shadow-sm",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-lg",
  md: "h-11 px-5 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
};

export function buttonClass(opts: { variant?: ButtonVariant; size?: ButtonSize; full?: boolean; className?: string } = {}) {
  const { variant = "primary", size = "md", full, className } = opts;
  return cn(
    "inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-60",
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
