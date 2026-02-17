// Database Types for GrowBucks
// Mirrors the Supabase database schema

export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  auth_provider: 'email' | 'google';
  google_id: string | null;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  timezone: string;
}

export interface Child {
  id: string;
  user_id: string;
  name: string;
  pin_hash: string;
  avatar_url: string | null;
  balance_cents: number;
  interest_rate_daily: number; // e.g., 0.01 for 1%
  interest_paused: boolean;
  locked_percentage: number; // 0-100, percentage of balance that can't be withdrawn
  last_interest_at: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  child_id: string;
  type: 'deposit' | 'withdrawal' | 'interest' | 'adjustment';
  amount_cents: number;
  balance_after_cents: number;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requested_at: string | null;
  processed_at: string | null;
  processed_by: string | null;
  created_at: string;
}

export interface ChildSettings {
  id: string;
  child_id: string;
  withdrawal_limit_per_tx_cents: number | null;
  withdrawal_limit_daily_cents: number | null;
  withdrawal_limit_weekly_cents: number | null;
  withdrawal_cooldown_hours: number;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  child_id: string;
  name: string;
  target_cents: number;
  target_date: string | null;
  achieved_at: string | null;
  is_active: boolean;
  emoji: string;
  created_at: string;
}

// Achievement stored in database
export interface ChildAchievement {
  id: string;
  child_id: string;
  achievement_id: string;
  unlocked_at: string;
  notified: boolean;
}

// In-app notification
export interface Notification {
  id: string;
  user_id: string;
  child_id: string | null;
  type: 'interest' | 'deposit' | 'withdrawal' | 'goal' | 'achievement' | 'milestone';
  title: string;
  message: string;
  emoji: string | null;
  amount_cents: number | null;
  read_at: string | null;
  created_at: string;
}

// Child activity for streak tracking
export interface ChildActivity {
  id: string;
  child_id: string;
  activity_date: string;
  login_count: number;
}

// Frontend-friendly types (with computed properties)
export interface ChildWithStats extends Child {
  interest_earned_today: number;
  interest_earned_this_month: number;
  growth_percentage: number;
  pending_withdrawals: number;
  display_balance: number; // Interpolated real-time balance
}

export interface TransactionWithMeta extends Transaction {
  child_name?: string;
  formatted_amount: string;
  formatted_date: string;
}

// API Request/Response types
export interface CreateChildRequest {
  name: string;
  pin: string;
  avatar_url?: string;
  interest_rate_daily?: number;
}

export interface UpdateChildRequest {
  name?: string;
  pin?: string;
  avatar_url?: string;
  interest_rate_daily?: number;
  interest_paused?: boolean;
}

export interface DepositRequest {
  child_id: string;
  amount_cents: number;
  description?: string;
}

export interface WithdrawRequest {
  child_id: string;
  amount_cents: number;
  description?: string;
}

export interface WithdrawalApprovalRequest {
  transaction_id: string;
  approved: boolean;
  reason?: string;
}

// Supabase Database type helpers
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id'>>;
      };
      children: {
        Row: Child;
        Insert: Omit<Child, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Child, 'id'>>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at'>;
        Update: Partial<Omit<Transaction, 'id'>>;
      };
      child_settings: {
        Row: ChildSettings;
        Insert: Omit<ChildSettings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChildSettings, 'id'>>;
      };
      savings_goals: {
        Row: SavingsGoal;
        Insert: Omit<SavingsGoal, 'id' | 'created_at'>;
        Update: Partial<Omit<SavingsGoal, 'id'>>;
      };
      achievements: {
        Row: ChildAchievement;
        Insert: Omit<ChildAchievement, 'id' | 'unlocked_at'>;
        Update: Partial<Omit<ChildAchievement, 'id'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Omit<Notification, 'id'>>;
      };
      child_activity: {
        Row: ChildActivity;
        Insert: Omit<ChildActivity, 'id'>;
        Update: Partial<Omit<ChildActivity, 'id'>>;
      };
    };
  };
}
