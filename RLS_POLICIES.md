# RLS Policies (Supabase)

Row Level Security policy model for ARKHV.

All data is scoped by `team_id` and access is enforced by RLS.

## Roles

- **Platform role** (`profiles.app_role`): `client` | `team` | `admin`
- **Team role** (`team_members.role`): `owner` | `admin` | `member` | `operator`

## Key principles

- **Isolation**: users can only access rows for teams they belong to.
- **Least privilege**: only allow the minimal actions needed.
- **No policy recursion**: `team_members` policies never query `team_members`.

## Helper function

One helper function. No others.

```sql
public.current_profile_app_role()  -- returns 'client' | 'team' | 'admin'
```

`SECURITY DEFINER` + `row_security = off`. Safe to call from any policy.

---

## Table policies

### `public.profiles`

| Action | Who |
|--------|-----|
| SELECT | Own row (`id = auth.uid()`) |
| UPDATE | Own row |

### `public.teams`

No `team_members` reference (avoids cross-table loops).

| Action | Who |
|--------|-----|
| SELECT | Owner or platform admin |
| INSERT | Owner + app_role in (`client`, `admin`) |
| UPDATE | Owner or platform admin |
| DELETE | Owner or platform admin |

### `public.team_members`

**No self-reference** — prevents infinite recursion.

| Action | Who |
|--------|-----|
| SELECT | Own row (`user_id = auth.uid()`), team owner (`teams.owner_id`), or platform admin |
| INSERT | Team owner or platform admin |
| UPDATE | Team owner or platform admin |
| DELETE | Team owner or platform admin |

### `public.requests`

| Action | Who |
|--------|-----|
| SELECT | Platform admin, creator, assignee, or any team member |
| INSERT | `created_by = auth.uid()`, `team_id` set, and (platform admin or team owner or team member) |
| UPDATE | Platform admin, creator, or team member with role `operator`/`admin`/`owner` |

### `public.comments`

| Action | Who |
|--------|-----|
| SELECT | If user can see the parent request |
| INSERT | Own comment (`user_id = auth.uid()`) + can see parent request |

### `public.files`

| Action | Who |
|--------|-----|
| SELECT | If user can see the parent request |
| INSERT | Own upload (`uploaded_by = auth.uid()`) + can see parent request |
| UPDATE | Own upload or platform admin |
| DELETE | Own upload or platform admin |

### `public.subscriptions`

| Action | Who |
|--------|-----|
| SELECT | Team owner or platform admin |
| INSERT | Team owner or platform admin |
| UPDATE | Team owner or platform admin |

### `public.usage`

| Action | Who |
|--------|-----|
| SELECT | Platform admin, team owner, or team member |
| INSERT | Platform admin, team owner, or team member |
| UPDATE | Platform admin, team owner, or team member |

### `public.activity_logs`

| Action | Who |
|--------|-----|
| SELECT | Platform admin, team owner, or team member |
| INSERT | Own row (`user_id = auth.uid()`) + (platform admin, team owner, or team member) |

### `public.user_notifications`

| Action | Who |
|--------|-----|
| SELECT | Own row (`user_id = auth.uid()`) |
| UPDATE | Own row |

---

## Debugging RLS

```sql
-- Inspect all active policies
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- Check for duplicates (should be 1 per table/cmd)
select tablename, cmd, count(*) as n
from pg_policies
where schemaname = 'public'
group by tablename, cmd
having count(*) > 1
order by tablename, cmd;
```

Common errors:
- **"infinite recursion … team_members"**: a `team_members` policy queries `team_members`. Fix: only reference `teams.owner_id`.
- **"new row violates row-level security"**: missing INSERT WITH CHECK policy for that table.
