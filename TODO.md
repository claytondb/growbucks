# GrowBucks - Task List

Last updated: 2026-03-09

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
- [ ] Grandparents can contribute
- [ ] Family member invites
- [ ] Gift deposits from relatives

### Gamification
- [x] **Streak tracking** (2026-03-14) — consecutive login days via child_activity; Week Warrior achievement now uses real streak count
- [x] **Sibling leaderboard** (2026-03-14) — 4 categories (balance, interest, savings rate, growth %); ranked with medals 🥇🥈🥉; tie detection; animated tabbed UI on parent dashboard; 29 tests
- [ ] Seasonal challenges

### Advanced Features
- [x] **Interest rate promotions** (2026-03-14) — parents create limited-time bonus rate windows; child-specific beats family-wide; highest bonus wins; 59 tests (008_promotions.sql migration)
- [x] **Virtual jobs/chores system** (2026-03-14) — parents create chores with rewards, children submit completions, parents approve → earnings deposited; one_time vs recurring; full API with 68 tests (006_chores.sql migration)
- [x] **Split savings** (2026-03-14) — parent sets 0–90% auto-save on each deposit; separate spend/save buckets displayed on child detail page; parent can release savings back to spending; savings_deposit + savings_release transaction types; 007_split_savings.sql migration (46 tests)
- [ ] Charitable giving/donations feature

### Reporting
- [ ] Monthly summary emails
- [ ] Year-end interest statement
- [ ] Tax year export

---

## 🐛 Known Issues

- None currently tracked

---

## 📊 Stats

- **Version:** 2.1.0
- **Tests:** 491 passing
- **Build:** Clean ✅ (zero TS errors)
- **Last nightly work:** 2026-03-14 — Interest rate promotions system: bonus rate windows, child-specific vs family-wide priority, 59 tests (008_promotions.sql migration)
