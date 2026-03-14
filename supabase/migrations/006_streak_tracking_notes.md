# Migration 006 — Streak Tracking Notes

## Status: No SQL changes required

The `child_activity` table needed for streak tracking was already created in
`002_achievements_notifications.sql`. No new migrations are needed.

## What changed (code-level, nightly 2026-03-14)

- **`src/lib/streaks.ts`** — New utility library:
  - `calculateConsecutiveStreak(activityDates)` — counts consecutive active days
  - `isStreakActive(lastActivityDate)` — checks if streak is live
  - `daysUntilStreakExpires(lastActivityDate)` — urgency helper
  - 35+ unit tests in `src/lib/streaks.test.ts`

- **`src/app/api/activity/route.ts`** — New POST endpoint:
  - Records today's `child_activity` row for the authenticated child (idempotent upsert)
  - Called automatically when a child views their dashboard

- **`src/app/api/children/[id]/route.ts`** — Enhanced GET response:
  - `total_interest_earned` — from `total_interest_earned_cents` column
  - `goals_created` — count of savings_goals rows
  - `goals_achieved` — count of goals with `achieved_at != null`
  - `days_since_last_withdraw` — days since most recent withdrawal tx
  - `login_streak` — consecutive days from `child_activity`
  - `days_active` — alias for `login_streak` (backward compat)

- **`src/app/dashboard/child/[id]/page.tsx`** — Two changes:
  1. Calls `POST /api/activity` when a child (not parent) loads the page
  2. Passes `login_streak` to `calculateAchievements` so the Week Warrior
     achievement now reflects real consecutive-day logins

## Testing

Run: `npm test` — all tests should pass (streaks.test.ts adds ~35 new tests)
