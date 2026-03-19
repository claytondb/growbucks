# GrowBucks - Task List

Last updated: 2026-03-19

## ✅ Completed

### Core Features
- [x] Parent/child account system
- [x] Child PIN login
- [x] Google OAuth for parents
- [x] Daily compound interest calculation
- [x] Deposit and withdrawal transactions
- [x] Withdrawal approval flow
- [x] Real-time balance display
- [x] Transaction history
- [x] Configurable interest rates (0.1% - 5% daily)
- [x] Pause interest feature
- [x] Achievements system
- [x] Growth projections chart
- [x] Goals tracking
- [x] PWA support
- [x] Financial tips of the day

### Testing & Documentation
- [x] Unit testing with Vitest (191 tests)
- [x] API documentation (API.md)
- [x] Deployment guide (DEPLOYMENT.md)
- [x] Design system documentation
- [x] **Notifications utility library** (2026-03-09) - types, helpers, quiet hours logic (43 tests)

---

## 🔥 Priority Features

### 1. Notifications Improvements
**Priority:** MEDIUM

- [ ] Push notifications for interest earned
- [ ] Email digest option for parents
- [x] **In-app notification center improvements** (2026-03-12) - Added Unread/History tabs, read state indicators

### 2. Recurring Deposits ✅ DONE (2026-03-06)
**Priority:** HIGH

- [x] Weekly allowance auto-deposit
- [x] Custom recurring schedules (weekly, biweekly, monthly)
- [x] Parent-controlled automation
- [x] API routes for CRUD operations
- [x] Cron-triggerable process endpoint
- [x] Database migration (004_recurring_deposits.sql)
- [x] Utility library with validation (recurring-deposits.ts)
- [x] Unit tests (35 tests)
- [x] **Parent UI** - `/dashboard/allowances` page (2026-03-06)

### 3. Learning Content
**Priority:** MEDIUM

- [x] **Learning library foundation** (2026-03-12) - `src/lib/lessons.ts` with 6 lessons, age-group tiers, quiz engine, XP rewards, progress helpers (54 tests)
- [x] **Learning UI** (2026-03-13) - `/dashboard/learn` listing page + `/dashboard/learn/[id]` lesson reader with paginated content, quiz flow, instant feedback, XP celebration, localStorage progress
- [x] **Achievement badges for completing lessons** (2026-03-13) — 5 new "Learning" achievements (Brain Spark, Knowledge Seeker, Money Master, Quiz Champion, XP Collector); child detail page fetches lesson progress and passes to calculateAchievements
- [x] **Per-child progress API** (2026-03-13) — `/api/lesson-progress` GET+POST, Supabase migration 005, cross-device sync with localStorage fallback (18 tests)

---

## 🎯 Future Enhancements

### Multiple Family Support
- [x] **Gift Links** (2026-03-19) — parents generate shareable links; relatives submit gifts (pending deposit); parent approves/rejects; full UI in GiftLinksManager.tsx; 55 tests
- [ ] Gift history / total gifted summary per child
- [ ] Email notification to parent when a gift is submitted

### Gamification
- [x] **Streak tracking** (2026-03-14) — consecutive login days via child_activity; Week Warrior achievement now uses real streak count
- [x] **Sibling leaderboard** (2026-03-14) — 4 categories (balance, interest, savings rate, growth %); ranked with medals 🥇🥈🥉; tie detection; animated tabbed UI on parent dashboard; 29 tests
- [ ] Seasonal challenges

### Advanced Features
- [x] **Interest rate promotions** (2026-03-14) — parents create limited-time bonus rate windows; child-specific beats family-wide; highest bonus wins; 59 tests (008_promotions.sql migration)
- [x] **Virtual jobs/chores system** (2026-03-14) — parents create chores with rewards, children submit completions, parents approve → earnings deposited; one_time vs recurring; full API with 68 tests (006_chores.sql migration)
- [x] **ChoresManager UI** (2026-03-19) — `src/components/ChoresManager.tsx`; collapsible card on child detail page; emoji picker, create form, approve/reject pending completions with inline rejection reason; archive button; lazy data fetch on expand
- [x] **Split savings** (2026-03-14) — parent sets 0–90% auto-save on each deposit; separate spend/save buckets displayed on child detail page; parent can release savings back to spending; savings_deposit + savings_release transaction types; 007_split_savings.sql migration (46 tests)
- [x] **Charitable giving** (2026-03-16) — children propose donations to causes; parents approve or reject; approved pledges deduct from spend balance and create a `donation` transaction; giving milestones celebrate generosity; 51 tests (009_giving.sql migration)

### Reporting
- [x] **Monthly summary utility + API** (2026-03-19) — `src/lib/monthly-summary.ts` + `GET /api/monthly-summary`; 12-month breakdown per child/family; foundation for email digests; 36 tests
- [x] **Monthly summary emails** (2026-03-19) — `src/lib/email-digest.ts` + `POST /api/email-digest`; beautiful HTML + plain-text digest; dry-run mode; Resend integration; 36 tests
- [ ] Year-end interest statement
- [x] **Tax year export** (2026-03-14) — `GET /api/export/[year]`; JSON + CSV download; per-child monthly breakdown (interest, deposits, withdrawals, chore earnings, savings auto-deposits, starting/ending/peak balance); family totals; 58 tests

---

## 🐛 Known Issues

- None currently tracked

---

## 📊 Stats

- **Version:** 2.8.0
- **Tests:** 761 passing
- **Build:** Clean ✅ (zero TS errors)
- **Last nightly work:** 2026-03-19 — Gift Links system; shareable URLs for relatives to deposit money; pending approval flow; GiftLinksManager UI component; 55 new tests
