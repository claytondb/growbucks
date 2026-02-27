# Changelog

All notable changes to GrowBucks.

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
