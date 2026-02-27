# 🌱 GrowBucks

> **Teach kids about compound interest through hands-on experience**

GrowBucks is a family banking web app where parents act as a "bank" for their children's money. Kids deposit real money, and watch it grow with daily compound interest. They learn that saving pays off—literally!

![GrowBucks Screenshot](./docs/screenshot.png)

## ✨ Features

### For Parents
- 👨‍👩‍👧‍👦 **Multiple children** - Up to 10 kids per account
- 💰 **Custom interest rates** - 0.1% to 5% daily per child
- 📊 **Transaction history** - Full audit trail
- ⏸️ **Pause interest** - Temporarily stop growth
- 🔔 **Withdrawal approval** - Kids request, parents approve

### For Kids
- 🔢 **Simple PIN login** - No email/password needed
- 📈 **Real-time balance** - Watch money grow second by second
- ✨ **Fun animations** - Coins, sparkles, celebrations
- 🎯 **Savings goals** - Set targets and track progress
- 📱 **Mobile-first** - Works great on phones and tablets

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Google OAuth credentials (optional)

### Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/yourusername/growbucks.git
   cd growbucks
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the migration: `supabase/migrations/001_initial_schema.sql`
   - Copy your project URL and keys to `.env.local`

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open** http://localhost:3000

## 🏗️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Auth**: NextAuth.js (Google + email/password + child PIN)
- **Charts**: Recharts
- **Animations**: Framer Motion
- **UI Components**: Radix UI primitives

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, signup pages
│   ├── (dashboard)/     # Protected dashboard routes
│   └── api/             # API routes
├── components/
│   ├── ui/              # Reusable UI components
│   ├── charts/          # Chart components
│   └── modals/          # Modal dialogs
├── lib/
│   ├── auth.ts          # NextAuth configuration
│   ├── supabase.ts      # Supabase client
│   └── utils.ts         # Utility functions
└── types/
    └── database.ts      # TypeScript types
```

## 💰 Interest Calculation

GrowBucks uses daily compound interest:

```
A = P × (1 + r)^n

Where:
  A = Final amount
  P = Principal (starting balance)
  r = Daily interest rate (e.g., 0.01 for 1%)
  n = Number of days
```

**Example**: $100 at 1%/day → $107.21 after 1 week!

Interest is calculated by a cron job (`/api/calculate-interest`) that runs daily and handles catch-up for any missed days.

## 🔐 Authentication

- **Parents**: Email/password or Google OAuth
- **Children**: Select profile + 4-6 digit PIN

Child sessions are shorter (24 hours) and can be configured by parents.

## 🎨 Design System

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for:
- Color palette (Sprout Green, Sky Blue, Sunny Gold)
- Typography (Nunito, Inter, DM Mono)
- Component specifications
- Animation guidelines

## 📱 API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/children` | GET/POST | List all / create child |
| `/api/children/[id]` | GET/PATCH/DELETE | Child CRUD |
| `/api/transactions` | POST/PATCH | Create / approve transactions |
| `/api/pending-withdrawals` | GET | Pending withdrawal requests |
| `/api/goals` | GET/POST | Savings goals |
| `/api/notifications` | GET/POST | Notification system |
| `/api/notification-settings` | GET/PUT | Notification preferences |
| `/api/calculate-interest` | POST | Daily interest cron |
| `/api/auth/change-password` | POST | Change parent password |

📚 **Full API documentation:** See [API.md](./API.md) for request/response formats, authentication details, and examples.

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

### Cron Job Setup

Set up a daily cron job to calculate interest:

```bash
# Using Vercel Cron
# Add to vercel.json:
{
  "crons": [{
    "path": "/api/calculate-interest",
    "schedule": "0 0 * * *"
  }]
}
```

## 📄 License

MIT License - feel free to use this for your family!

## 🙏 Acknowledgments

- Inspired by the "Bank of Dad" concept
- Design system influenced by modern fintech apps
- Built with love for teaching kids about money

---

**Made with 🌱 by parents, for parents (and their future millionaires!)**
