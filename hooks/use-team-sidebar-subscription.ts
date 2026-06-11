"use client"

import type { SupabaseClient } from "@supabase/supabase-js"
import * as React from "react"

import { DEFAULT_PLAN_TYPE, PLAN_CONFIG, type PlanType } from "@/lib/config/plans"
import { apiGet } from "@/lib/http/request"

export type SidebarSubscriptionState = {
  planLabel: string
  activeConcurrency: number
  maxActiveRequests: number
  loading: boolean
}

async function resolvePrimaryTeamId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: memberRow } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()
  if (memberRow?.team_id && typeof memberRow.team_id === "string") {
    return memberRow.team_id
  }
  const { data: owned } = await supabase
    .from("teams")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle()
  return owned?.id && typeof owned.id === "string" ? owned.id : null
}

/**
 * Plan + active request usage for the sidebar card (first team membership or owned team).
 */
export function useTeamSidebarSubscription(
  supabase: SupabaseClient,
  userId: string | undefined
): SidebarSubscriptionState {
  const [state, setState] = React.useState<SidebarSubscriptionState>({
    planLabel: "—",
    activeConcurrency: 0,
    maxActiveRequests: 0,
    loading: true,
  })

  React.useEffect(() => {
    if (!userId) {
      setState({
        planLabel: "—",
        activeConcurrency: 0,
        maxActiveRequests: 0,
        loading: true,
      })
      return
    }

    let cancelled = false

    void (async () => {
      if (!cancelled) {
        setState((s) => ({ ...s, loading: true }))
      }
      try {
        const teamId = await resolvePrimaryTeamId(supabase, userId)
        if (!teamId || cancelled) {
          setState({
            planLabel: PLAN_CONFIG[DEFAULT_PLAN_TYPE].display_name,
            activeConcurrency: 0,
            maxActiveRequests: PLAN_CONFIG[DEFAULT_PLAN_TYPE].max_active_requests,
            loading: false,
          })
          return
        }

        const [usageData, subRes] = await Promise.all([
          apiGet<{
            active_concurrency: number
            limits: { max_active_requests: number; max_requests_per_period: number | null }
          }>(`/api/teams/${teamId}/usage`),
          supabase
            .from("subscriptions")
            .select("plan_type")
            .eq("team_id", teamId)
            .maybeSingle(),
        ])

        const planType = (subRes.data?.plan_type as PlanType | undefined) ?? DEFAULT_PLAN_TYPE
        const planLabel = PLAN_CONFIG[planType]?.display_name ?? planType

        if (!cancelled) {
          setState({
            planLabel,
            activeConcurrency: usageData?.active_concurrency ?? 0,
            maxActiveRequests:
              usageData?.limits.max_active_requests ??
              PLAN_CONFIG[planType].max_active_requests,
            loading: false,
          })
        }
      } catch {
        if (!cancelled) {
          setState({
            planLabel: "—",
            activeConcurrency: 0,
            maxActiveRequests: 0,
            loading: false,
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [supabase, userId])

  return state
}
