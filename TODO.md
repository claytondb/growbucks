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
- [ ] Learning UI - `/dashboard/learn` page using the lessons library
- [ ] Achievement badges for completing lessons
- [ ] Age-appropriate content tiers (foundation built, needs UI wiring)

---

## 🎯 Future Enhancements

### Multiple Family Support
- [ ] Grandparents can contribute
- [ ] Family member invites
- [ ] Gift deposits from relatives

### Gamification
- [ ] Streak tracking (consecutive days saving)
- [ ] Leaderboards (opt-in, among siblings)
- [ ] Seasonal challenges

### Advanced Features
- [ ] Interest rate "promotions" (bonus rate periods)
- [ ] Virtual "jobs" system (chores → earnings)
- [ ] Split savings (portion to spend, portion to save)
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

- **Version:** 1.6.5
- **Tests:** 191 passing
- **Build:** Clean ✅
