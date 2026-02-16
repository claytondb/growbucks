# GrowBucks - Requirements Document

> **Version:** 1.0  
> **Date:** 2026-02-15  
> **Purpose:** Teach kids about compound interest through hands-on experience

---

## 📋 Overview

GrowBucks is a web application where parents act as a "bank" for their children's money. Children deposit real money (given to the parent), and the app tracks balances with daily compound interest. Kids watch their money grow in real-time and learn the power of saving vs. spending.

**Core Value Proposition:** Make compound interest tangible and exciting for kids by showing them real growth on real money.

---

## 1. User Stories

### 👨‍👩‍👧 Parent Stories

| ID | Story | Priority |
|----|-------|----------|
| P1 | As a parent, I want to create an account so I can set up banking for my kids | Must |
| P2 | As a parent, I want to add multiple children to my account | Must |
| P3 | As a parent, I want to set a custom interest rate per child (0.1% - 5% daily) | Must |
| P4 | As a parent, I want to deposit money into my child's account when they give me cash | Must |
| P5 | As a parent, I want to process withdrawals when my child wants their money | Must |
| P6 | As a parent, I want to see all transaction history for each child | Must |
| P7 | As a parent, I want to receive notifications when my child requests a withdrawal | Should |
| P8 | As a parent, I want to set withdrawal limits (daily/weekly/per-transaction) | Should |
| P9 | As a parent, I want to pause interest accrual if needed | Should |
| P10 | As a parent, I want to see analytics on my child's saving behavior | Nice |
| P11 | As a parent, I want to set up recurring "paycheck" deposits (allowance) | Nice |
| P12 | As a parent, I want to add notes/memos to transactions | Should |
| P13 | As a parent, I want to export transaction history (CSV/PDF) | Nice |

### 👧 Child Stories

| ID | Story | Priority |
|----|-------|----------|
| C1 | As a child, I want to log in with a simple PIN (not a password) | Must |
| C2 | As a child, I want to see my current balance prominently | Must |
| C3 | As a child, I want to watch my money grow in real-time | Must |
| C4 | As a child, I want to see how much interest I earned today | Must |
| C5 | As a child, I want to request a withdrawal from my parent | Must |
| C6 | As a child, I want to see my transaction history | Must |
| C7 | As a child, I want to set a savings goal and track progress | Should |
| C8 | As a child, I want to see projections ("If I save $X more, I'll have $Y in Z days") | Should |
| C9 | As a child, I want fun animations when I earn interest | Should |
| C10 | As a child, I want achievements/badges for saving milestones | Nice |
| C11 | As a child, I want to see a graph of my balance over time | Should |
| C12 | As a child, I want to compare how much I would have if I didn't withdraw | Nice |

---

## 2. Feature Requirements

### ✅ Must-Have (MVP)

1. **User Authentication**
   - Parent account creation (email + password, Google OAuth)
   - Child login via parent-set PIN (4-6 digits)
   - Session management with appropriate timeouts

2. **Account Management**
   - Add/edit/remove children
   - Set child name, avatar, and PIN
   - Configure interest rate per child (default 1% daily, range 0.1% - 5%)

3. **Banking Operations**
   - Parent: Deposit funds to child account
   - Parent: Process withdrawals
   - Child: Request withdrawal (requires parent approval)
   - Transaction history with timestamps

4. **Interest Calculation**
   - Daily compound interest applied automatically
   - Real-time balance display (interpolated for visual effect)
   - Interest earned today/this week/this month/all-time

5. **Dashboard**
   - Parent: Overview of all children's accounts
   - Child: Balance, recent transactions, interest earned

### 📌 Should-Have (Post-MVP)

1. **Withdrawal Controls**
   - Per-transaction limits
   - Daily/weekly withdrawal caps
   - Cooling-off period for large withdrawals

2. **Notifications**
   - Push/email when child requests withdrawal
   - Daily summary of interest earned
   - Goal milestone notifications

3. **Savings Goals**
   - Set target amount and optional deadline
   - Visual progress tracker
   - Goal celebration when reached

4. **Projections Calculator**
   - "What if" scenarios
   - Compound interest visualizations
   - Comparison: saving vs. spending outcomes

5. **Interest Control**
   - Pause/resume interest accrual
   - Schedule interest rate changes
   - Bonus interest events

### 💫 Nice-to-Have (Future)

1. **Gamification**
   - Achievements and badges
   - Saving streaks
   - Leaderboards (opt-in, family only)

2. **Education Module**
   - Compound interest explainers
   - Mini-lessons on financial literacy
   - Quizzes with rewards

3. **Advanced Features**
   - Recurring deposits (allowance automation)
   - Multiple accounts per child (savings vs. spending)
   - Export/reports (PDF/CSV)
   - Family sharing (multiple parents)

4. **Integrations**
   - Calendar reminders
   - Apple/Google Wallet balance cards

---

## 3. Data Model

### 3.1 Entity Relationship Diagram (Conceptual)

```
┌─────────────┐       ┌─────────────┐       ┌──────────────┐
│    User     │──────<│   Child     │──────<│ Transaction  │
│  (Parent)   │ 1   * │             │ 1   * │              │
└─────────────┘       └─────────────┘       └──────────────┘
                             │
                             │ 1
                             ▼
                      ┌─────────────┐
                      │  Settings   │
                      │             │
                      └─────────────┘
```

### 3.2 Tables

#### `users` (Parents)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| password_hash | VARCHAR(255) | NULL | Hashed password (null if OAuth only) |
| name | VARCHAR(100) | NOT NULL | Display name |
| auth_provider | ENUM | NOT NULL | 'email', 'google' |
| google_id | VARCHAR(255) | UNIQUE, NULL | Google OAuth ID |
| email_verified | BOOLEAN | DEFAULT false | Email verification status |
| created_at | TIMESTAMP | NOT NULL | Account creation |
| updated_at | TIMESTAMP | NOT NULL | Last update |
| last_login_at | TIMESTAMP | NULL | Last login time |
| timezone | VARCHAR(50) | DEFAULT 'UTC' | User's timezone |

#### `children`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users.id, NOT NULL | Parent reference |
| name | VARCHAR(50) | NOT NULL | Child's display name |
| pin_hash | VARCHAR(255) | NOT NULL | Hashed 4-6 digit PIN |
| avatar_url | VARCHAR(500) | NULL | Profile picture |
| balance_cents | BIGINT | NOT NULL, DEFAULT 0 | Current balance in cents |
| interest_rate_daily | DECIMAL(5,4) | NOT NULL, DEFAULT 0.0100 | Daily rate (1% = 0.0100) |
| interest_paused | BOOLEAN | DEFAULT false | Whether interest is paused |
| last_interest_at | TIMESTAMP | NOT NULL | Last interest application |
| created_at | TIMESTAMP | NOT NULL | Account creation |
| updated_at | TIMESTAMP | NOT NULL | Last update |

**Indexes:**
- `idx_children_user_id` on `user_id`
- `idx_children_last_interest_at` on `last_interest_at`

#### `transactions`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| child_id | UUID | FK → children.id, NOT NULL | Child reference |
| type | ENUM | NOT NULL | 'deposit', 'withdrawal', 'interest', 'adjustment' |
| amount_cents | BIGINT | NOT NULL | Amount (positive for credit, negative for debit) |
| balance_after_cents | BIGINT | NOT NULL | Balance after transaction |
| description | VARCHAR(255) | NULL | Optional memo/note |
| status | ENUM | NOT NULL | 'pending', 'approved', 'rejected', 'completed' |
| requested_at | TIMESTAMP | NULL | When withdrawal was requested |
| processed_at | TIMESTAMP | NULL | When transaction was processed |
| processed_by | UUID | FK → users.id, NULL | Parent who processed |
| created_at | TIMESTAMP | NOT NULL | Record creation |

**Indexes:**
- `idx_transactions_child_id` on `child_id`
- `idx_transactions_child_created` on `(child_id, created_at DESC)`
- `idx_transactions_type` on `type`

#### `child_settings`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| child_id | UUID | FK → children.id, UNIQUE, NOT NULL | Child reference |
| withdrawal_limit_per_tx_cents | BIGINT | NULL | Max per withdrawal (null = unlimited) |
| withdrawal_limit_daily_cents | BIGINT | NULL | Max daily withdrawals |
| withdrawal_limit_weekly_cents | BIGINT | NULL | Max weekly withdrawals |
| withdrawal_cooldown_hours | INT | DEFAULT 0 | Hours between withdrawals |
| created_at | TIMESTAMP | NOT NULL | Record creation |
| updated_at | TIMESTAMP | NOT NULL | Last update |

#### `savings_goals`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| child_id | UUID | FK → children.id, NOT NULL | Child reference |
| name | VARCHAR(100) | NOT NULL | Goal name (e.g., "New Bike") |
| target_cents | BIGINT | NOT NULL | Target amount |
| target_date | DATE | NULL | Optional deadline |
| achieved_at | TIMESTAMP | NULL | When goal was reached |
| is_active | BOOLEAN | DEFAULT true | Active status |
| created_at | TIMESTAMP | NOT NULL | Record creation |

#### `sessions`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Session identifier |
| user_id | UUID | FK → users.id, NULL | Parent session |
| child_id | UUID | FK → children.id, NULL | Child session |
| token_hash | VARCHAR(255) | NOT NULL | Hashed session token |
| expires_at | TIMESTAMP | NOT NULL | Expiration time |
| created_at | TIMESTAMP | NOT NULL | Session creation |
| ip_address | VARCHAR(45) | NULL | Client IP |
| user_agent | VARCHAR(500) | NULL | Client user agent |

---

## 4. Interest Calculation Logic

### 4.1 Formula

**Daily Compound Interest:**

```
A = P × (1 + r)^n

Where:
  A = Final amount
  P = Principal (starting balance)
  r = Daily interest rate (as decimal, e.g., 0.01 for 1%)
  n = Number of days
```

### 4.2 Implementation Details

#### Interest Application Schedule

- **Calculation Frequency:** Once daily at midnight (user's timezone)
- **Batch Job:** Runs every hour, processes accounts where `last_interest_at < today`
- **Real-time Display:** UI interpolates growth for visual effect (not stored)

#### Calculation Process

```python
def apply_daily_interest(child):
    if child.interest_paused:
        return
    
    if child.last_interest_at.date() >= today():
        return  # Already applied today
    
    # Calculate days since last interest (handles catch-up)
    days_missed = (today() - child.last_interest_at.date()).days
    
    for day in range(days_missed):
        interest_cents = floor(child.balance_cents * child.interest_rate_daily)
        
        if interest_cents > 0:
            child.balance_cents += interest_cents
            create_transaction(
                child_id=child.id,
                type='interest',
                amount_cents=interest_cents,
                balance_after_cents=child.balance_cents,
                description=f"Daily interest ({child.interest_rate_daily * 100}%)"
            )
    
    child.last_interest_at = now()
```

#### Real-Time Display Interpolation

For the "watch money grow" effect, the UI calculates a visual balance:

```javascript
function getDisplayBalance(child) {
    const now = Date.now();
    const lastInterest = new Date(child.last_interest_at).getTime();
    const msInDay = 24 * 60 * 60 * 1000;
    
    // Fraction of day elapsed since last interest
    const dayFraction = (now - lastInterest) / msInDay;
    
    // Today's pending interest (not yet applied)
    const pendingInterest = child.balance_cents * child.interest_rate_daily * dayFraction;
    
    return child.balance_cents + pendingInterest;
}
```

### 4.3 Interest Rate Constraints

| Setting | Value |
|---------|-------|
| Default Rate | 1% daily (0.01) |
| Minimum Rate | 0.1% daily (0.001) |
| Maximum Rate | 5% daily (0.05) |
| Rate Precision | 0.1% increments |

### 4.4 Edge Cases

- **Zero Balance:** No interest generated (0 × r = 0)
- **Sub-cent Interest:** Use `floor()` - fractional cents are lost
- **Rate Change Mid-day:** New rate applies starting next midnight
- **Timezone Handling:** Interest applied at midnight in user's timezone
- **Catch-up Interest:** If server is down, calculate missed days on recovery

---

## 5. UI/UX Requirements

### 5.1 Design Principles

1. **Kid-Friendly First**
   - Large, tappable buttons (min 48px touch targets)
   - Bright, engaging colors
   - Simple language (no financial jargon)
   - Fun animations and celebrations

2. **Mobile-First**
   - Primary target: phones and tablets
   - Responsive design, works on desktop
   - Touch-optimized interactions
   - Works offline (shows cached data)

3. **Visual Learning**
   - Money growth should be *visible* (animations, counters)
   - Charts and graphs over tables
   - Progress bars and visual goals

### 5.2 Color Palette

| Usage | Color | Hex |
|-------|-------|-----|
| Primary (growth/positive) | Green | #22C55E |
| Secondary (action) | Blue | #3B82F6 |
| Accent (celebration) | Gold | #F59E0B |
| Warning (withdrawal) | Orange | #F97316 |
| Error | Red | #EF4444 |
| Background | Light Gray | #F8FAFC |
| Text | Dark Gray | #1E293B |

### 5.3 Key Screens

#### Parent App

1. **Dashboard**
   - List of children with balance summaries
   - Quick actions: Deposit, View History
   - Pending withdrawal requests (prominent)
   - Total family savings

2. **Child Detail**
   - Full transaction history
   - Interest rate settings
   - Withdrawal limits
   - Savings goals

3. **Deposit Flow**
   - Select child
   - Enter amount (large number pad)
   - Optional memo
   - Confirm

4. **Settings**
   - Account management
   - Add/remove children
   - Notification preferences

#### Child App

1. **Home (Balance View)**
   - HUGE balance number (animated counting)
   - "Money growing" animation
   - Today's interest earned
   - Quick actions: Request Withdrawal, View Goals

2. **Growth Visualizer**
   - Real-time counter showing cents accumulating
   - Sparkle/coin animations
   - "You're earning $X per day!"

3. **Savings Goals**
   - Visual progress (piggy bank filling up?)
   - Days until goal (at current rate)
   - Celebration when reached

4. **Transaction History**
   - Simple list with icons
   - Deposits: green + arrow
   - Withdrawals: orange - arrow
   - Interest: gold ✨ sparkle

5. **Calculator/Projector**
   - "If I save $10 more..."
   - "In 30 days I'll have..."
   - Visual comparison charts

### 5.4 Animations & Feedback

| Event | Animation |
|-------|-----------|
| Balance increase | Number counts up smoothly |
| Interest earned | Coins/sparkles rain down |
| Goal progress | Progress bar fills with glow |
| Goal achieved | Confetti explosion |
| Withdrawal approved | Gentle "goodbye" animation |
| Withdrawal denied | Soft bounce back |

### 5.5 Accessibility

- Minimum contrast ratio 4.5:1
- Support for system font scaling
- Screen reader compatible
- Reduced motion option
- Color-blind friendly (don't rely on color alone)

---

## 6. Authentication Requirements

### 6.1 Parent Authentication

#### Email + Password

1. **Registration**
   - Email, password, name
   - Password requirements: 8+ chars, 1 number, 1 letter
   - Email verification required before adding children
   - Send verification email with 24-hour expiry link

2. **Login**
   - Email + password
   - "Remember me" option (extends session to 30 days)
   - Rate limiting: 5 attempts, then 15-minute lockout
   - Account lockout after 10 failed attempts (email unlock)

3. **Password Reset**
   - Email-based reset link
   - 1-hour expiry
   - Invalidate all sessions on password change

#### Google OAuth 2.0

1. **Sign Up / Sign In**
   - Single button: "Continue with Google"
   - Request scopes: `email`, `profile`
   - Create account if email doesn't exist
   - Link to existing account if email matches

2. **Account Linking**
   - Allow adding password to Google-only account
   - Allow linking Google to password account

### 6.2 Child Authentication

Children use a simplified PIN system (no email/password):

1. **PIN Setup**
   - Parent creates 4-6 digit PIN for each child
   - Stored as hash (same as passwords)
   - Parent can reset PIN anytime

2. **Child Login**
   - Select profile picture from parent's children
   - Enter PIN
   - 3 attempts, then 5-minute lockout
   - No "remember me" for children

3. **Session Duration**
   - Child sessions: 24 hours
   - Auto-logout on app close (configurable by parent)

### 6.3 Session Management

| User Type | Session Length | Refresh | Idle Timeout |
|-----------|---------------|---------|--------------|
| Parent (default) | 7 days | Rolling | 30 minutes |
| Parent (remember me) | 30 days | Rolling | None |
| Child | 24 hours | None | 15 minutes |

### 6.4 Security Requirements

- All traffic over HTTPS
- Passwords hashed with bcrypt (cost factor 12)
- PINs hashed with bcrypt (cost factor 10)
- Session tokens: 256-bit random, stored hashed
- CSRF protection on all forms
- Rate limiting on all auth endpoints
- Audit log of all authentication events

---

## 7. Edge Cases & Business Rules

### 7.1 Withdrawal Handling

| Scenario | Behavior |
|----------|----------|
| Withdrawal > balance | Reject with friendly message: "You don't have enough saved yet!" |
| Withdrawal = full balance | Allow, but warn: "This will empty your account" |
| Withdrawal during pending request | Allow new request, queue them |
| Parent rejects withdrawal | Notify child, log reason (optional) |
| Parent approves withdrawal | Deduct immediately, notify child |
| Multiple pending withdrawals | Show all to parent, process in order |

### 7.2 Balance Edge Cases

| Scenario | Behavior |
|----------|----------|
| Balance goes to $0 | Interest = $0, no transactions created |
| Sub-cent balance | Display rounds to 2 decimals, calc uses full precision |
| Very large balance | Use BIGINT (cents), supports up to $92 quadrillion |
| Negative balance | **NOT ALLOWED** - system prevents this |

### 7.3 Interest Edge Cases

| Scenario | Behavior |
|----------|----------|
| Interest paused mid-day | Pause takes effect immediately, no partial interest |
| Rate changed mid-day | New rate applies starting next midnight |
| Account created mid-day | First interest applies next midnight |
| Server downtime | Catch-up calculates missed days on recovery |
| Leap seconds/DST | Use UTC internally, display in user timezone |
| Interest < 1 cent | Rounds down to 0, no transaction created |

### 7.4 Multiple Children

| Scenario | Behavior |
|----------|----------|
| Max children per parent | 10 (soft limit, can increase) |
| Same name for two children | Allowed (use avatars to differentiate) |
| Same PIN for two children | Allowed (login by selecting profile first) |
| Delete child account | Soft delete, data retained 90 days, then purged |
| Transfer money between children | Not supported (use withdrawal + deposit) |

### 7.5 Account Management

| Scenario | Behavior |
|----------|----------|
| Parent deletes account | All children deleted, balances reported (not auto-paid) |
| Parent changes email | Re-verification required |
| Parent changes timezone | Next interest applies at new midnight |
| Forgot PIN (child) | Parent resets from settings |
| Child name change | Update everywhere, history preserved |

### 7.6 Financial Integrity

| Scenario | Behavior |
|----------|----------|
| Concurrent transactions | Use database transactions, row-level locking |
| Failed transaction mid-way | Rollback entirely, retry |
| Duplicate transaction submission | Idempotency key prevents duplicates |
| Audit requirements | All transactions immutable, no hard deletes |
| Currency | USD only (v1), cents stored as integers |

### 7.7 Data Validation

| Field | Validation |
|-------|------------|
| Deposit amount | $0.01 - $10,000 |
| Withdrawal amount | $0.01 - current balance |
| Interest rate | 0.1% - 5.0% daily |
| Child name | 1-50 characters, alphanumeric + spaces |
| PIN | 4-6 digits only |
| Memo/description | 0-255 characters |

---

## 8. Technical Requirements

### 8.1 Performance

- Page load: < 2 seconds on 3G
- Interest calculation batch: < 5 minutes for 100k accounts
- Real-time balance updates: < 100ms perceived latency
- API response times: p99 < 500ms

### 8.2 Scalability

- Support 10,000 families in year 1
- Design for 100,000+ families
- Horizontal scaling for API servers
- Read replicas for dashboard queries

### 8.3 Reliability

- 99.9% uptime SLA
- Daily database backups
- Point-in-time recovery (7 days)
- Interest catch-up handles outages

### 8.4 Compliance

- COPPA considerations (children under 13)
  - Parental consent required
  - Minimal data collection
  - No behavioral advertising
- Data encryption at rest and in transit
- GDPR-ready (data export, deletion)

---

## 9. Success Metrics

### 9.1 North Star Metric

**Weekly Active Families** - Families where at least one child views their balance

### 9.2 Supporting Metrics

| Metric | Target (6 months) |
|--------|-------------------|
| Registered families | 1,000 |
| Weekly active families | 40% of registered |
| Average balance per child | $50 |
| Average days between withdrawals | 14 days |
| Child app opens per week | 5+ per active child |
| Interest rate engagement | 30% customize rate |

---

## 10. Out of Scope (v1)

- Real bank integration
- Multiple currencies
- Sibling money transfers
- Lending/borrowing features
- External sharing/social features
- Actual financial products
- Tax reporting

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Balance | Current amount in child's account (cents) |
| Interest Rate | Daily percentage growth rate |
| Compound Interest | Interest calculated on balance + previous interest |
| Withdrawal | Removing money from the account |
| Deposit | Adding money to the account |
| Principal | Original amount before interest |

---

## Appendix B: Example Calculations

### Example 1: Basic Growth

- Starting balance: $100.00
- Interest rate: 1% daily
- After 7 days:

```
Day 0: $100.00
Day 1: $100.00 × 1.01 = $101.00
Day 2: $101.00 × 1.01 = $102.01
Day 3: $102.01 × 1.01 = $103.03
Day 4: $103.03 × 1.01 = $104.06
Day 5: $104.06 × 1.01 = $105.10
Day 6: $105.10 × 1.01 = $106.15
Day 7: $106.15 × 1.01 = $107.21
```

### Example 2: Withdrawal Impact

- Balance: $100.00 @ 1%/day
- Scenario A: No withdrawal → $107.21 after 7 days
- Scenario B: Withdraw $50 on Day 3:

```
Day 3: $103.03 - $50.00 = $53.03
Day 4: $53.03 × 1.01 = $53.56
Day 5: $53.56 × 1.01 = $54.10
Day 6: $54.10 × 1.01 = $54.64
Day 7: $54.64 × 1.01 = $55.18

Total: $55.18 + $50 cash = $105.18 (lost $2.03 in potential interest)
```

---

*This document is the source of truth for GrowBucks development. All agents should reference this for requirements clarity.*
