# Changelog

All notable changes to GrowBucks.

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
