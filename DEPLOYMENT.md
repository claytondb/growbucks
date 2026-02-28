# GrowBucks Deployment Guide

This guide covers deploying GrowBucks to production using Vercel (frontend) and Supabase (database).

## Prerequisites

- [Vercel account](https://vercel.com)
- [Supabase account](https://supabase.com)
- [GitHub repository](https://github.com) with this code
- [Google OAuth credentials](https://console.cloud.google.com) (optional, for parent login)

## Part 1: Supabase Setup

### 1.1 Create a New Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New project**
3. Choose your organization
4. Set:
   - **Name**: `growbucks` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click **Create new project**

### 1.2 Run Database Migrations

After the project is ready:

1. Go to **SQL Editor** in the Supabase dashboard
2. Open `supabase/migrations/` files from this repo
3. Run each migration in order:
   - `001_initial_schema.sql`
   - `002_transactions.sql`
   - (etc.)

Or use the Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

### 1.3 Get Connection Details

1. Go to **Settings** → **Database**
2. Copy the **Connection string** (URI format)
3. Note your **Project URL** and **anon key** from **Settings** → **API**

## Part 2: Vercel Deployment

### 2.1 Import Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Select the GrowBucks repo
4. Framework preset should auto-detect **Next.js**

### 2.2 Configure Environment Variables

Add these environment variables in Vercel:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | From Supabase connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | From Supabase API settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` | From Supabase API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | From Supabase API settings (keep secret!) |
| `NEXTAUTH_SECRET` | Random 32+ char string | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Your production URL |
| `GOOGLE_CLIENT_ID` | (optional) | For Google OAuth |
| `GOOGLE_CLIENT_SECRET` | (optional) | For Google OAuth |

### 2.3 Deploy

1. Click **Deploy**
2. Wait for build to complete (~2-3 minutes)
3. Your app is live!

## Part 3: Post-Deployment Setup

### 3.1 Set Up Cron Jobs

GrowBucks uses daily interest calculation. Configure in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/calculate-interest",
      "schedule": "0 0 * * *"
    }
  ]
}
```

This runs daily at midnight UTC. Vercel Cron requires a Pro plan or higher.

### 3.2 Google OAuth (Optional)

For parent login with Google:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project or select existing
3. Enable **Google+ API** and **Google Identity**
4. Configure **OAuth consent screen**
5. Create **OAuth 2.0 credentials**:
   - Type: Web application
   - Authorized origins: `https://your-domain.vercel.app`
   - Authorized redirect URIs: `https://your-domain.vercel.app/api/auth/callback/google`
6. Copy Client ID and Secret to Vercel env vars

### 3.3 Custom Domain (Optional)

1. In Vercel project settings → **Domains**
2. Add your domain
3. Configure DNS as instructed
4. Update `NEXTAUTH_URL` env var

## Part 4: Testing Production

### 4.1 Create Test Accounts

1. Sign up as a parent (Google or email)
2. Add a test child
3. Test transactions (deposit, withdraw)
4. Verify interest calculation

### 4.2 Check Logs

- Vercel: **Functions** tab for API logs
- Supabase: **Logs** section for database activity

## Troubleshooting

### "Invalid database connection"

- Check `DATABASE_URL` format
- Ensure IP restrictions allow Vercel (Settings → Database → Network)
- Try the pooler connection string for serverless

### "NEXTAUTH_URL mismatch"

- Ensure it matches your actual domain exactly
- Include `https://` prefix
- No trailing slash

### "Google OAuth error"

- Verify redirect URIs match exactly
- Check both client ID and secret are set
- Ensure OAuth consent screen is configured

### Interest not calculating

- Verify cron is set up in `vercel.json`
- Check Vercel plan supports crons (Pro+)
- Manually test: `GET /api/calculate-interest`

## Monitoring

### Recommended Setup

1. **Vercel Analytics** - Enable in project settings
2. **Sentry** - Add error tracking (optional)
3. **Supabase Dashboard** - Monitor database usage

### Key Metrics to Watch

- API response times
- Database connections
- Error rates
- Daily active users

## Scaling Considerations

### Database

- Supabase free tier: Sufficient for ~500 users
- Upgrade to Pro for more connections and storage
- Consider read replicas for heavy read workloads

### Vercel

- Hobby: Good for development
- Pro: Required for crons, more bandwidth
- Enterprise: For high-traffic apps

## Backup Strategy

### Database Backups

Supabase provides:
- **Daily backups** on paid plans
- **Point-in-time recovery** on Pro+

### Manual Backup

```bash
# Using pg_dump
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

## Security Checklist

- [ ] Strong database password
- [ ] `SUPABASE_SERVICE_ROLE_KEY` only in server env (never expose to client)
- [ ] `NEXTAUTH_SECRET` is random and unique
- [ ] Row Level Security enabled in Supabase
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] Rate limiting on sensitive endpoints

## Support

- **GrowBucks Issues**: [GitHub Issues](https://github.com/claytondb/growbucks/issues)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
