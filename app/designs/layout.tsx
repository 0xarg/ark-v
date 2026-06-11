import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Designs | ARKHV",
  description:
    "ARKHV UI kit — colors, typography, logo, buttons, inputs, selections (Figma-aligned)",
}

export default function DesignsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
