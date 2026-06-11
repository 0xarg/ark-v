"use client";

import * as React from "react";

import { ArkhvLogo } from "@/components/brand/arkhv-logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlaceholderRow } from "@/components/ui/placeholder-row";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SelectionRow } from "@/components/ui/selection-row";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-8 border-b border-ark-light-grey py-14 last:border-b-0"
    >
      <h2 className="text-2xl font-semibold tracking-tight text-ark-black md:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-3xl text-sm text-ark-muted-blue-grey md:text-base">
          {description}
        </p>
      ) : null}
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Swatch({
  label,
  hex,
  className,
}: {
  label: string;
  hex: string;
  className: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "h-14 w-full rounded-lg border border-ark-blue-200 shadow-sm",
          className,
        )}
      />
      <div>
        <p className="font-mono text-xs text-ark-black">{label}</p>
        <p className="font-mono text-[10px] text-ark-muted-blue-grey">{hex}</p>
      </div>
    </div>
  );
}

const PRIMITIVES: { label: string; hex: string; swatch: string }[] = [
  { label: "Brand red", hex: "#FF0000", swatch: "bg-ark-brand-red" },
  { label: "Dark blue grey", hex: "#2F3744", swatch: "bg-ark-dark-blue-grey" },
  { label: "Black", hex: "#222222", swatch: "bg-ark-black" },
  { label: "White", hex: "#FFFFFF", swatch: "bg-ark-white" },
  { label: "Light grey", hex: "#EAEBEC", swatch: "bg-ark-light-grey" },
  {
    label: "Muted blue grey",
    hex: "#444B57",
    swatch: "bg-ark-muted-blue-grey",
  },
];

const RED_SCALE = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
] as const;

const BLUE_SCALE = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
] as const;

const RED_HEX: Record<(typeof RED_SCALE)[number], string> = {
  "50": "#FFE6E6",
  "100": "#FFB0B0",
  "200": "#FF8A8A",
  "300": "#FF5454",
  "400": "#FF3333",
  "500": "#FF0000",
  "600": "#E80000",
  "700": "#B50000",
  "800": "#8C0000",
  "900": "#6B0000",
};

const BLUE_HEX: Record<(typeof BLUE_SCALE)[number], string> = {
  "50": "#EAEBEC",
  "100": "#BFC1C5",
  "200": "#9FA3A9",
  "300": "#747982",
  "400": "#595F69",
  "500": "#2F3744",
  "600": "#2B323E",
  "700": "#212730",
  "800": "#1A1E25",
  "900": "#14171D",
};

/** Full class strings so Tailwind can see them at build time */
const RED_BG: Record<(typeof RED_SCALE)[number], string> = {
  "50": "bg-ark-red-50",
  "100": "bg-ark-red-100",
  "200": "bg-ark-red-200",
  "300": "bg-ark-red-300",
  "400": "bg-ark-red-400",
  "500": "bg-ark-red-500",
  "600": "bg-ark-red-600",
  "700": "bg-ark-red-700",
  "800": "bg-ark-red-800",
  "900": "bg-ark-red-900",
};

const BLUE_BG: Record<(typeof BLUE_SCALE)[number], string> = {
  "50": "bg-ark-blue-50",
  "100": "bg-ark-blue-100",
  "200": "bg-ark-blue-200",
  "300": "bg-ark-blue-300",
  "400": "bg-ark-blue-400",
  "500": "bg-ark-blue-500",
  "600": "bg-ark-blue-600",
  "700": "bg-ark-blue-700",
  "800": "bg-ark-blue-800",
  "900": "bg-ark-blue-900",
};

const DROPDOWN_OPTIONS = [
  { value: "one", label: "Option one" },
  { value: "two", label: "Option two" },
  { value: "three", label: "Option three" },
];

export default function DesignsPage() {
  const [radio, setRadio] = React.useState("a");
  const [select, setSelect] = React.useState("one");

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-ark-light-grey bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 md:flex-row md:items-end md:justify-between md:py-12">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-ark-muted-blue-grey">
              ARKHV
            </p>
            <h1 className="ark-ds-mega-title mt-1">Designs</h1>
            <p className="mt-3 max-w-xl text-sm text-ark-muted-blue-grey md:text-base">
              Figma-aligned tokens and components in one place. Jump to a
              section below.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            {[
              ["typography", "Typography"],
              ["colors", "Colors"],
              ["logo", "Logo"],
              ["buttons", "Buttons"],
              ["inputs", "Inputs"],
              ["selections", "Selections"],
            ].map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-full border border-ark-blue-200 px-3 py-1.5 text-ark-dark-blue-grey transition-colors hover:bg-ark-light-grey"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <Section
          id="typography"
          title="Typography"
          description="Instrument Sans (UI), Outfit as display (GC Methane stand-in), Inter Bold for buttons. Scale from Figma node 11:39."
        >
          <div className="space-y-10">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-ark-muted-blue-grey">
                Display (Outfit)
              </p>
              <p className="ark-h1 border-l-4 border-ark-red-500 pl-4">
                ark-h1 — The quick brown fox
              </p>
              <p className="ark-h2 mt-6 border-l-4 border-ark-blue-300 pl-4">
                ark-h2 — The quick brown fox
              </p>
              <p className="ark-h3 mt-6 border-l-4 border-ark-blue-300 pl-4">
                ark-h3 — The quick brown fox
              </p>
            </div>
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-ark-muted-blue-grey">
                Body & UI (Instrument Sans)
              </p>
              <p className="ark-subtitle-1 border-l-4 border-ark-blue-200 pl-4">
                ark-subtitle-1 — The quick brown fox jumps over the lazy dog.
              </p>
              <p className="ark-subtitle-2 mt-4 border-l-4 border-ark-blue-200 pl-4">
                ark-subtitle-2 — The quick brown fox jumps over the lazy dog.
              </p>
              <p className="ark-body mt-4 border-l-4 border-ark-blue-200 pl-4">
                ark-body — The quick brown fox jumps over the lazy dog.
              </p>
              <p className="ark-caption mt-4 border-l-4 border-ark-blue-200 pl-4">
                ark-caption — Supporting text and captions.
              </p>
              <p className="ark-overline mt-4 border-l-4 border-ark-blue-200 pl-4">
                ark-overline
              </p>
            </div>
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-ark-muted-blue-grey">
                DS headings
              </p>
              <p className="ark-ds-mega-title text-4xl md:text-6xl">
                ark-ds-mega-title
              </p>
              <p className="ark-ds-category-title mt-6 text-3xl md:text-5xl">
                ark-ds-category-title
              </p>
            </div>
          </div>
        </Section>

        <Section
          id="colors"
          title="Colors"
          description="Primitives and red / blue scales from the ARKHV color system (:root in globals.css)."
        >
          <div className="space-y-10">
            <div>
              <h3 className="text-lg font-semibold text-ark-black">
                Primitives
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {PRIMITIVES.map((p) => (
                  <Swatch
                    key={p.label}
                    label={p.label}
                    hex={p.hex}
                    className={p.swatch}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ark-black">
                Red scale
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
                {RED_SCALE.map((step) => (
                  <Swatch
                    key={step}
                    label={`red-${step}`}
                    hex={RED_HEX[step]}
                    className={RED_BG[step]}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ark-black">
                Blue scale
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
                {BLUE_SCALE.map((step) => (
                  <Swatch
                    key={step}
                    label={`blue-${step}`}
                    hex={BLUE_HEX[step]}
                    className={BLUE_BG[step]}
                  />
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section
          id="logo"
          title="Logo"
          description="Brand wordmarks and marks (public/brand/*.svg). Use ArkhvLogo in product UI."
        >
          <div className="space-y-10">
            <div>
              <h3 className="text-sm font-semibold text-ark-black">
                Wordmarks
              </h3>
              <div className="mt-4 grid gap-6 md:grid-cols-3">
                <div className="rounded-2xl border border-ark-blue-200 p-6">
                  <ArkhvLogo variant="wordmark-default" className="h-7" />
                </div>
                <div className="flex items-center rounded-[20px] bg-ark-dark-blue-grey p-6">
                  <ArkhvLogo variant="wordmark-inverse" className="h-7" />
                </div>
                <div className="rounded-2xl border border-ark-blue-200 p-6">
                  <ArkhvLogo variant="wordmark-mono" className="h-7" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ark-black">
                Icon marks
              </h3>
              <div className="mt-4 grid gap-6 sm:grid-cols-3">
                <div className="flex aspect-square max-w-[200px] items-center justify-center rounded-[20px] bg-ark-dark-blue-grey p-6">
                  <ArkhvLogo variant="mark-white" className="h-24 w-auto" />
                </div>
                <div className="flex aspect-square max-w-[200px] items-center justify-center rounded-2xl border border-ark-blue-200 p-6">
                  <ArkhvLogo variant="mark-red" className="h-24 w-auto" />
                </div>
                <div className="flex aspect-square max-w-[200px] items-center justify-center rounded-2xl border border-ark-blue-200 p-6">
                  <ArkhvLogo variant="mark-navy" className="h-24 w-auto" />
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section
          id="buttons"
          title="Buttons"
          description="Figma UI kit (node 20:1183) — pill buttons, Inter Bold; primary, secondary, text, link, destructive."
        >
          <div className="space-y-10">
            {(
              ["primary", "secondary", "text", "link", "destructive"] as const
            ).map((variant) => (
              <div key={variant}>
                <h3 className="capitalize text-sm font-semibold text-ark-muted-blue-grey">
                  {variant}
                </h3>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {(["sm", "md", "lg"] as const).map((size) => (
                    <Button
                      key={size}
                      variant={variant}
                      size={size}
                      type="button"
                    >
                      Label
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <h3 className="text-sm font-semibold text-ark-muted-blue-grey">
                With arrows
              </h3>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button variant="primary" iconPosition="left" type="button">
                  Back
                </Button>
                <Button variant="primary" iconPosition="right" type="button">
                  Next
                </Button>
                <Button variant="secondary" iconPosition="right" type="button">
                  Continue
                </Button>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ark-muted-blue-grey">
                States
              </h3>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button type="button">Default</Button>
                <Button type="button" disabled>
                  Disabled
                </Button>
              </div>
            </div>
          </div>
        </Section>

        <Section
          id="inputs"
          title="Inputs"
          description="Text fields — 51px min height, 14px radius, Figma-aligned focus ring."
        >
          <div className="grid max-w-md gap-8">
            <div className="grid gap-2">
              <Label htmlFor="ds-email">Email</Label>
              <Input
                id="ds-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ds-disabled">Disabled</Label>
              <Input
                id="ds-disabled"
                placeholder="Read only"
                disabled
                defaultValue="Can't edit"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ds-invalid">Invalid</Label>
              <Input
                id="ds-invalid"
                placeholder="Required"
                defaultValue=""
                aria-invalid
              />
            </div>
          </div>
        </Section>

        <Section
          id="selections"
          title="Selections"
          description="Checkbox, radio group, switch, list rows, and dropdown select (Figma UI kit)."
        >
          <div className="grid max-w-lg gap-10">
            <div>
              <h3 className="text-sm font-semibold text-ark-muted-blue-grey">
                Checkbox
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox id="c1" />
                  <Label htmlFor="c1" className="font-normal">
                    Unchecked
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="c2" defaultChecked />
                  <Label htmlFor="c2" className="font-normal">
                    Checked
                  </Label>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-ark-muted-blue-grey">
                Radio group
              </h3>
              <RadioGroup
                value={radio}
                onValueChange={setRadio}
                className="mt-3 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="a" id="r-a" />
                  <Label htmlFor="r-a" className="font-normal">
                    Option A
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="b" id="r-b" />
                  <Label htmlFor="r-b" className="font-normal">
                    Option B
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-ark-muted-blue-grey">
                Switch
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch id="s1" />
                  <Label htmlFor="s1" className="font-normal">
                    Off
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="s2" defaultChecked />
                  <Label htmlFor="s2" className="font-normal">
                    On
                  </Label>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-ark-muted-blue-grey">
                List rows
              </h3>
              <div className="mt-3 flex max-w-md flex-col gap-2">
                <PlaceholderRow>Default row</PlaceholderRow>
                <PlaceholderRow variant="muted">Muted row</PlaceholderRow>
                <SelectionRow leading={<Checkbox id="sr1" />} variant="muted">
                  <Label htmlFor="sr1" className="font-normal">
                    Row with checkbox
                  </Label>
                </SelectionRow>
              </div>
            </div>

            <div className="max-w-md">
              <h3 className="text-sm font-semibold text-ark-muted-blue-grey">
                Dropdown select
              </h3>
              <div className="mt-3">
                <DropdownSelect
                  value={select}
                  onValueChange={setSelect}
                  options={DROPDOWN_OPTIONS}
                  placeholder="Choose option"
                />
              </div>
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}
