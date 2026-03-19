# Changelog

## [2.8.0] - 2026-03-19

### Added
- **Gift Links** — parents can generate shareable URLs for relatives to send money as gifts to a specific child:
  - Parent creates a gift link with an optional label, welcome message, per-gift cap ($1–$1,000), max uses, and expiry date
  - Shareable `/gift/[token]` page works for anyone — no login required for the giver
  - Giver enters their name, an optional message, and an amount, then submits
  - Gift becomes a **pending deposit** — money doesn't reach the child until the parent approves
  - Parent reviews and approves or rejects from their dashboard (via `GiftLinksManager` collapsible card on the child detail page)
  - One-click copy-to-clipboard and preview link open in new tab
  - Toggle links active/inactive, or delete them entirely
  - Tokens are 128-bit crypto-random (unguessable), stored in new `gift_links` + `gift_link_redemptions` tables (migration 010)
  - `src/lib/gift-links.ts` — 55 unit tests covering validation, status, formatting, and sorting
  - `src/app/api/gift-links/route.ts` — CRUD for parent (GET, POST, PATCH, DELETE)
  - `src/app/api/gift-links/[token]/route.ts` — public GET (gift page info), POST (redeem), PATCH (parent approve/reject)
  - `src/app/gift/[token]/page.tsx` — beautiful public gift-submission page with quick-amount buttons and success animation
  - `src/components/GiftLinksManager.tsx` — collapsible card UI for the parent child detail page



All notable changes to GrowBucks.

## [2.5.0] - 2026-03-19

### Added
- **Monthly Summary utility** — `src/lib/monthly-summary.ts` — pure library for month-by-month financial breakdowns:
  - `computeChildMonthlySummaries` — 12-month view per child with interest, deposits, savings auto-deposits, chore earnings, withdrawals, donations, savings rate, and running balance
  - `computeFamilyMonthlySummary` — aggregates all children with family-wide totals
  - `bestMonth` / `monthsAboveThreshold` — highlight helpers for "best month" badges and email callouts
  - `runningBalances` — chart-ready array of `{ month, monthName, balanceCents }` for growth visualization
  - `formatMonthlySummaryLine` — plain-text one-liner per month (foundation for future email digests)
  - Balance propagation: months with no transactions carry forward the previous month's ending balance
  - Filters out pending transactions and transactions from other years
- **Monthly Summary API** — `GET /api/monthly-summary`:
  - `?year=YYYY` query param (defaults to current year)
  - `?child_id=<uuid>` to scope to a single child (returns `ChildMonthlySummaries`)
  - Omit `child_id` for full family summary (`FamilyMonthlySummary`)
  - Infers per-child starting balance from the last transaction before the year starts
  - Parents only — child sessions receive 403

### Tests
- +36 new unit tests (`src/lib/monthly-summary.test.ts`)
- Total: **670 tests** (was 634)

---

## [2.4.0] - 2026-03-17

### Added
- **Unified Pending Actions API** — `GET /api/pending-actions` aggregates all items needing parent review in a single request: pending withdrawals, chore completion submissions, and charitable donation pledges
  - Returns structured `{ total, withdrawals, choreCompletions, donations }` response
  - Replaces the old `/api/pending-withdrawals`-only approach on the main dashboard
- **Smart dashboard alert card** — parent dashboard now shows a rich breakdown instead of a plain "N withdrawals" message:
  - Color-coded clickable chips: 🟠 withdrawals → `/dashboard/transactions`, 🟣 chores → child detail page, 🩷 donations → child detail page
  - Smart routing: single-child items navigate directly to that child's page; multi-child items go to dashboard
  - Summary text (e.g. "2 withdrawals, 1 chore — tap to review") below the chips
- `src/lib/pending-actions.ts` — utility library with pure functions:
  - `flattenPendingActions` / `groupByChild` / `countByType`
  - `pendingActionsSummary` / `actionTypeIcon` / `actionTypeLabel` / `actionReviewPath`
  - `hasPendingActions` / `oldestPendingAction` / `totalPendingAmountCents` / `emptyPendingActions`

### Tests
- +34 new unit tests (`src/lib/pending-actions.test.ts`)
- Total: **634 tests** (was 600)

---

## [2.3.0] - 2026-03-16

### Added
- **Charitable Giving System** — children propose donations to causes they care about; parents review and approve or reject
  - `src/lib/giving.ts` — full utility library with types, validation, balance helpers, milestone messages, and suggested causes
  - `supabase/migrations/009_giving.sql` — new `donation_pledges` table with RLS; tracks cause name, message, amount, status, reviewer, and linked transaction
  - `GET /api/giving` — parents see all children's pledges (filterable); children see only their own
  - `POST /api/giving` — child submits a donation pledge; validates against spend balance; max 3 pending at a time
  - `GET /api/giving/[id]` — view a single pledge
  - `PATCH /api/giving/[id]` — parent approves (deducts balance + creates transaction) or rejects (records reason)
  - `DELETE /api/giving/[id]` — child cancels a pending pledge
  - `DonationPledge` interface added to `src/types/database.ts`
  - Added `donation` to `Transaction.type` union
  - `src/components/TransactionList.tsx` — donation entries render with a Heart icon (pink theme)

### Tests
- +51 new unit tests (`src/lib/giving.test.ts`)
- Total: **600 tests** (was 549)

---

## [2.0.0] - 2026-03-14

### Fixed
- **Build error in split-savings route** — Updated `GET`, `POST`, and `PATCH` handlers in `/api/children/[id]/split-savings/route.ts` to use Next.js 15+ async params pattern (`context.params: Promise<{ id: string }>`) instead of the deprecated synchronous destructuring. This was causing TypeScript compilation to fail.

### Added
- **Sibling Leaderboard** — family ranking system for parents with 2+ children
  - `src/lib/leaderboard.ts` — pure ranking engine with four categories:
    - 💰 **Biggest Saver** — ranked by total balance
    - 📈 **Top Earner This Month** — ranked by interest earned this month
    - 🏦 **Best Saver %** — ranked by savings bucket percentage (split-savings)
    - 🚀 **Fastest Growing** — ranked by % balance growth this month
  - Tie detection: tied entries share the same rank and are marked `(tied)`
  - Medal helpers: 🥇🥈🥉 for ranks 1-3
  - `featuredLeaderboard()` — picks the most motivating category to spotlight
  - `GET /api/leaderboard` — fetches children's stats from Supabase, builds and returns all non-tied leaderboards; returns empty for families with <2 children
  - `src/components/LeaderboardCard.tsx` — animated parent-dashboard card with:
    - Category selector tabs (only shown when multiple categories available)
    - Animated entry rows with medals, child initials/avatar, name, and score
    - AnimatePresence transitions when switching categories
    - Auto-hides when no meaningful leaderboard exists
  - Wired into parent dashboard (`/dashboard/page.tsx`) below children grid, only rendered for families with 2+ children

### Tests
- +29 new unit tests for leaderboard library (`src/lib/leaderboard.test.ts`)
- Total: **432 tests** (was 403)

---

## [1.8.0] - 2026-03-14

### Added
- **Virtual Chores/Jobs System** — parents create chores with rewards, children complete them, parents approve and earnings are automatically deposited
  - `supabase/migrations/006_chores.sql` — new `chores` and `chore_completions` tables with RLS, indexes, cascade deletes
  - `src/lib/chores.ts` — full type definitions (`Chore`, `ChoreCompletion`, `ChoreFrequency`, etc.), validation (`validateCreateChore`, `validateUpdateChore`, `validateSubmitCompletion`), business logic (`canSubmitCompletion`, `calculateTotalEarnings`, `sortChores`, `getPendingCompletions`), and formatting utilities
  - **API routes:**
    - `GET/POST /api/chores` — list chores for a child; create new chore (parent only)
    - `GET/PATCH/DELETE /api/chores/[id]` — view, update, or archive a chore
    - `POST /api/chores/[id]/complete` — child submits chore for parent review
    - `GET /api/chores/completions` — parent views pending/all completions
    - `PATCH /api/chores/completions/[id]` — parent approves or rejects a completion
  - On approval: deposit transaction created, child balance updated; one_time chores auto-archived after completion

### Tests
- +68 new unit tests for chores library (`src/lib/chores.test.ts`)
- Total: **357 tests** (was 289)

## [1.7.0] - 2026-03-14

### Added
- **Consecutive-day streak tracking** — `src/lib/streaks.ts` with full utility library:
  - `calculateConsecutiveStreak()` — computes real consecutive login days from DB
  - `isStreakActive()` — checks if streak is live (today or yesterday)
  - `daysUntilStreakExpires()` — urgency helper for future UI nudges
- **POST /api/activity** — Idempotent endpoint that records daily child activity in `child_activity` table; called automatically on child dashboard load
- **Enhanced children API** — `GET /api/children/[id]` now returns:
  - `total_interest_earned`, `goals_created`, `goals_achieved`, `days_since_last_withdraw`, `login_streak`, `days_active`
  - All data the achievement system needs was previously missing from the API response

### Fixed
- **Week Warrior achievement** now reflects real consecutive login days (was using a placeholder fallback of `days_active: 1`)
- Achievement system now has full data: balances, goals, interest, and login streaks all properly wired from the API

### Tests
- +26 new unit tests for streak logic (29 total across 5 describe blocks)
- Total: **289 tests** (was 263)

## [1.6.5] - 2026-03-12

### Improved
- **Notification History View** - The notification bell now has Unread / History tabs
  - **Unread tab**: Shows only unread notifications (existing behavior) with a green dot indicator
  - **History tab**: Shows last 40 notifications (read + unread) so nothing gets lost
  - Read notifications shown at reduced opacity to distinguish from new ones
  - "Mark all read" button in history footer when unread items exist
  - Empty unread state now includes a "View history →" shortcut
  - API updated to accept `?include_read=true&limit=N` for history fetches
- Build verified clean ✅, all 191 tests passing

---

## [1.6.4] - 2026-03-12

### Improved
- **Global Notification Bell** - NotificationCenter is now persistent across all dashboard pages
  - Desktop: Bell appears at the bottom of the sidebar (previously only on home page)
  - Mobile: New compact top bar shows GrowBucks logo + notification bell on every page
  - Eliminates the UX gap where Growth, Goals, Settings, and Allowances pages had no way to access notifications
  - Build verified clean ✅

---

## [1.6.3] - 2026-03-10

### Fixed
- **Avatar image eslint** - Added eslint-disable comment for Avatar img element (OAuth provider profile images require flexibility)

## [1.6.2] - 2026-03-09

### Fixed
- **Lint Cleanup** - Resolved all 31 ESLint errors
  - Added proper TypeScript types for API route database entities
  - Fixed CustomTooltip component recreation during render
  - Fixed Math.random purity issues in Confetti and LoadingStates
  - Fixed setState-in-effect patterns for valid hydration use cases
  - Fixed unescaped apostrophe in homepage copy
  - Fixed reserved 'children' prop name usage
- **Build Fix** - Resolved TypeScript errors in GrowthChart tooltip types
  - Updated CustomTooltip to match recharts TooltipContentProps types
  - Removed unused @ts-expect-error directives in auth.ts

### Infrastructure
- ESLint: Reduced from 69 problems (31 errors, 38 warnings) to 32 warnings (0 errors)
- Build: All TypeScript errors resolved, clean production build

## [1.6.1] - 2026-03-09

### Added
- **Notifications Utility Library** - Reusable notification helpers
  - `NotificationSettings` and `Notification` types
  - `DEFAULT_NOTIFICATION_SETTINGS` for new users
  - `NOTIFICATION_TYPE_CONFIG` with title, description, emoji, color per type
  - `parseTimeToMinutes` and `formatTimeForDisplay` for quiet hours
  - `isWithinQuietHours` handling overnight periods (e.g., 21:00-07:00)
  - `shouldSendNotification` checking global, type-specific, and quiet hours settings
  - `generateNotificationTitle` and `generateNotificationMessage` for child-friendly content
  - `validateQuietHoursTime` for time format validation
  - `getNotificationEmoji` and `getNotificationColor` helpers

### Infrastructure
- Tests: 148 → 191 passing tests (+43 for notifications)
- New utility library: `src/lib/notifications.ts`

## [1.6.0] - 2026-03-06

### Added
- **Allowances UI** - Parent interface for managing recurring deposits
  - New `/dashboard/allowances` page
  - Full CRUD interface for creating, editing, and deleting allowances
  - Visual grouping of allowances by child
  - Pause/resume toggle for each allowance
  - Day-of-week picker for weekly/biweekly schedules
  - Day-of-month picker for monthly schedules
  - Accessible from Settings → Allowances

### Improved
- Settings page now links to Allowances management

## [1.5.0] - 2026-03-05

### Added
- **Recurring Deposits API** - Backend for automated allowance feature (HIGH priority item!)
  - Weekly, biweekly, or monthly schedules
  - Day-of-week selection for weekly/biweekly
  - Day-of-month selection for monthly (1-28)
  - Up to 5 recurring deposits per child
  - API routes: `/api/recurring-deposits` (CRUD) and `/api/recurring-deposits/process` (cron)
  - Database migration: `004_recurring_deposits.sql`
  - Utility library with validation functions
  - 35 new unit tests for recurring deposits logic

### Infrastructure
- Tests: 84 → 148 passing tests
- New utility library: `src/lib/recurring-deposits.ts`
- Export utilities test coverage: `src/lib/export.test.ts` (29 tests)

## [1.4.0] - 2026-03-04

### Added
- **Unit Testing Framework** - Vitest test suite with 84 passing tests
  - `utils.test.ts` (60 tests) - Money formatting, validation, date formatting, interest calculations
  - `interest.test.ts` (24 tests) - Compound interest, projections, interpolated balances
  - Full coverage for PIN validation, amount validation, interest rate validation
  - Time-based tests with mocked system time for reliability

### Infrastructure
- Added `vitest.config.ts` for test configuration
- Added `npm test` and `npm test:watch` scripts

## [1.3.1] - 2026-02-28

### Added
- **DEPLOYMENT.md** - Comprehensive deployment guide for Vercel + Supabase setup

## [1.3.0] - 2026-02-27

### Added
- **Financial Tip of the Day** - Daily rotating educational tips about saving and compound interest
  - 20 kid-friendly tips covering patience, needs vs wants, compound interest, and more
  - Dismissible card on child dashboard
  - Changes daily to keep content fresh

## [1.2.0] - 2026-02-23

### Added
- **Password Change API** - Real password update for email accounts
- **Pending Withdrawals API** - Dashboard shows actual pending requests
- Security page now uses real API instead of placeholder

## [1.1.0] - 2026-02-20

### Added
- **Vercel Cron** - Daily interest calculation via `/api/calculate-interest`
- **PWA Support** - Installable on mobile devices
- **Notification Settings** - Persist user notification preferences

## [1.0.0] - 2026-02-17

### Added
- **Achievements System** - Unlock badges for saving milestones
- **Interest Notifications** - Real-time toast notifications when interest accrues
- **Growth Projections** - Visual chart showing balance growth over time
- **Mobile-First Design** - Responsive layout for all screen sizes
- **Celebrations** - Confetti and animations for achievements
- **Data Export** - Download transaction history as CSV

### Improved
- Visual wallet display with animated balance
- Better dashboard with stats cards
- Goals tracking with progress bars

## [0.2.0] - 2026-02-16

### Added
- **Goals API** - Set and track savings goals per child
- **Growth Page** - Visualize interest earned over time
- **Profile Page** - Child can view their own stats
- **Notifications Page** - View interest and activity alerts
- **Security Page** - Account security settings
- **Appearance Page** - Theme preferences
- **Devices Page** - Connected devices list

### Fixed
- Routing structure (moved pages under /dashboard/)
- Settings page links
- Child card navigation

## [0.1.0] - 2026-02-15

### Added
- **Initial Release**
- Parent/child account system
- Child PIN login (no email required)
- Google OAuth for parents
- Daily compound interest calculation
- Deposit and withdrawal transactions
- Withdrawal approval flow (parent approves child requests)
- Real-time balance display
- Transaction history
- Interest rate per child (0.1% - 5% daily)
- Pause interest feature
- Fun facts about compound interest
