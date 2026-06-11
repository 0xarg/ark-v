// ─── Single source of truth for all plan data ───────────────────────────────
// Change prices, seats, storage, or copy here — nowhere else.
// This file is imported by API routes, dashboard, billing page, and the
// landing page pricing section. Keep it free of React / JSX.

export const YEARLY_DISCOUNT = 0.2; // 20% off annual billing

export type PlanConfig = {
  display_name: string;
  /** Monthly price in USD. Used for display AND billing calculations. */
  price_monthly_usd: number;
  /** null = unlimited */
  max_requests_per_period: number | null;
  /** Max concurrently-active requests */
  max_active_requests: number;
  /** Max team seats */
  max_seats: number;
  /** Storage cap in GB (1 TB = 1000 GB, 2 TB = 2000 GB) */
  max_storage_gb: number;
  /** Human-readable storage label shown in UI */
  storage_label: string;
  // ── Landing / pricing card copy ──────────────────────────────────────────
  blurb: string;
  blurb2: string;
  how_it_works: string;
  features: readonly string[];
  /** Show "Most Popular" badge on the pricing card */
  featured: boolean;
};

export const PLAN_TYPES = ['starter', 'growth', 'scale', 'free', 'pro'] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

/** The three primary plans shown in the UI (excludes legacy aliases) */
export const PRIMARY_PLAN_KEYS = ['starter', 'growth', 'scale'] as const;
export type PrimaryPlanKey = (typeof PRIMARY_PLAN_KEYS)[number];

export const PLAN_CONFIG: Record<PlanType, PlanConfig> = {
  starter: {
    display_name: 'Starter',
    price_monthly_usd: 995,
    max_requests_per_period: 30,
    max_active_requests: 1,
    max_seats: 1,
    max_storage_gb: 500,
    storage_label: '500 GB',
    blurb: 'Best for founders who need consistent creative output without hiring.',
    blurb2: 'Less than hiring a freelance designer.',
    how_it_works: 'Submit as many requests as you want. We work through them one at a time.',
    featured: false,
    features: [
      'Up to 30 requests per month',
      '1 active request at a time',
      '1 team seat',
      '500 GB brand asset storage',
      'Social media graphics',
      'Ad creatives',
      'Presentation design',
      'Basic motion graphics',
      'Standard turnaround',
    ],
  },
  growth: {
    display_name: 'Growth',
    price_monthly_usd: 1499,
    max_requests_per_period: null,
    max_active_requests: 2,
    max_seats: 3,
    max_storage_gb: 1000,
    storage_label: '1 TB',
    blurb: 'Best for growing teams that need ongoing creative support.',
    blurb2: 'Your core creative team on demand.',
    how_it_works: 'Submit unlimited requests. We work on two at the same time.',
    featured: true,
    features: [
      'Everything in Starter',
      'Unlimited design requests',
      '2 active requests at a time',
      '3 team seats',
      '1 TB brand asset storage',
      'Motion design',
      'Landing pages',
      'Campaign creatives',
      'Priority turnaround',
    ],
  },
  scale: {
    display_name: 'Scale',
    price_monthly_usd: 1999,
    max_requests_per_period: null,
    max_active_requests: 3,
    max_seats: 5,
    max_storage_gb: 2000,
    storage_label: '2 TB',
    blurb: 'Best for teams that rely heavily on creative output.',
    blurb2: 'For high-volume teams that need speed and consistency.',
    how_it_works: 'Submit unlimited requests. We handle three simultaneously.',
    featured: false,
    features: [
      'Everything in Growth',
      'Unlimited design requests',
      '3 active requests at a time',
      '5 team seats',
      '2 TB brand asset storage',
      'Faster turnaround',
      'Slack communication',
      'Monthly creative planning',
      'Dedicated workflow',
    ],
  },

  // ── Legacy aliases — map to nearest current plan ─────────────────────────
  // Do not change these; they exist so old `plan_type` DB rows still resolve.
  free: {
    display_name: 'Starter',
    price_monthly_usd: 995,
    max_requests_per_period: 30,
    max_active_requests: 1,
    max_seats: 1,
    max_storage_gb: 500,
    storage_label: '500 GB',
    blurb: '',
    blurb2: '',
    how_it_works: '',
    features: [],
    featured: false,
  },
  pro: {
    display_name: 'Growth',
    price_monthly_usd: 1499,
    max_requests_per_period: null,
    max_active_requests: 2,
    max_seats: 3,
    max_storage_gb: 1000,
    storage_label: '1 TB',
    blurb: '',
    blurb2: '',
    how_it_works: '',
    features: [],
    featured: false,
  },
} as const;

export const DEFAULT_PLAN_TYPE: PlanType = 'starter';

// ── Derived helpers ───────────────────────────────────────────────────────────

/** Format a monthly USD price with no cents, e.g. "$995" or "$1,499" */
export function formatPlanPrice(usd: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(usd);
}

/** Yearly total after discount */
export function yearlyPrice(monthlyUsd: number): number {
  return Math.round(monthlyUsd * 12 * (1 - YEARLY_DISCOUNT));
}

/** Request limit label for display */
export function requestLimitLabel(plan: PlanConfig): string {
  return plan.max_requests_per_period == null
    ? 'Unlimited requests'
    : `${plan.max_requests_per_period} requests / month`;
}
