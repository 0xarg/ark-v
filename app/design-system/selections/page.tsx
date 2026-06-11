import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Selections — Input Field | ARKHV",
  description: "Design system: Input Field section (Figma node 76:2445)",
}

/**
 * Figma frame “Selections” (76:2445) — category heading for Input Field components.
 */
export default function SelectionsInputFieldPage() {
  return (
    <main className="min-h-screen bg-white">
      <h1 className="ark-ds-category-title px-8 pt-10 md:px-[min(15vw,7.5rem)] md:pt-[min(10vh,10.5rem)]">
        Input Field
      </h1>
    </main>
  )
}
