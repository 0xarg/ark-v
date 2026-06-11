import * as React from "react";

import { cn } from "@/lib/utils";

const ASSETS = {
  "wordmark-default": "/brand/logo-wordmark-color.svg",
  "wordmark-light": "/brand/logo-wordmark-light.png",
  "wordmark-inverse": "/brand/logo-wordmark-on-dark.svg",
  "wordmark-mono": "/brand/logo-wordmark-mono.svg",
  "mark-white": "/brand/logo-variant-1.svg",
  "mark-red": "/brand/logo-variant-2.svg",
  "mark-navy": "/brand/logo-variant-3.svg",
} as const;

export type ArkhvLogoVariant = keyof typeof ASSETS;

export type ArkhvLogoProps = Omit<
  React.ComponentPropsWithoutRef<"img">,
  "src"
> & {
  variant: ArkhvLogoVariant;
};

/**
 * ARKHV brand marks from Figma (frame 1:2 — Logo section).
 * Wordmarks: default (red + navy), inverse (white), mono (navy only).
 * Marks: large icon for dark / red / navy backgrounds.
 */
export function ArkhvLogo({
  variant,
  alt = "ARKHV",
  className,
  ...props
}: ArkhvLogoProps) {
  return (
    <img
      alt={alt}
      src={ASSETS[variant]}
      draggable={false}
      className={cn("h-auto max-w-full select-none", className)}
      {...props}
    />
  );
}
