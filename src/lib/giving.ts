/**
 * GrowBucks Charitable Giving Utilities
 *
 * Lets children propose charitable donations from their spend balance.
 * Parents review requests and approve or reject them. On approval,
 * a `donation` transaction is recorded and the balance is reduced.
 *
 * This mirrors the chore-completion approval flow and the withdrawal flow.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type DonationStatus = 'pending' | 'approved' | 'rejected';

export interface DonationPledge {
  id: string;
  child_id: string;
  /** Name of the cause / charity (e.g. "Animal Shelter", "School Supplies Drive") */
  cause_name: string;
  /** Optional short message from the child explaining why */
  message?: string | null;
  amount_cents: number;
  status: DonationStatus;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  rejection_reason?: string | null;
  /** Linked transaction id created on approval */
  transaction_id?: string | null;
  created_at: string;
}

export interface CreateDonationInput {
  child_id: string;
  cause_name: string;
  message?: string;
  amount_cents: number;
}

export interface ReviewDonationInput {
  approved: boolean;
  rejection_reason?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const CAUSE_NAME_MAX_LENGTH = 100;
export const MESSAGE_MAX_LENGTH = 500;
export const REJECTION_REASON_MAX_LENGTH = 255;

/** Minimum donation: 1 cent */
export const DONATION_MIN_CENTS = 1;
/** Maximum single donation: $1,000 */
export const DONATION_MAX_CENTS = 100_000;

/** Suggested causes to spark ideas */
export const SUGGESTED_CAUSES = [
  { label: 'Animal Shelter', emoji: '🐾' },
  { label: 'Hunger Relief', emoji: '🍎' },
  { label: 'School Supplies Drive', emoji: '📚' },
  { label: 'Environmental Cleanup', emoji: '🌍' },
  { label: 'Children\'s Hospital', emoji: '🏥' },
  { label: 'Disaster Relief', emoji: '🆘' },
  { label: 'Local Food Bank', emoji: '🥫' },
  { label: 'Clean Water Initiative', emoji: '💧' },
];

export const DONATION_STATUS_LABELS: Record<DonationStatus, string> = {
  pending: 'Awaiting Parent Review',
  approved: 'Approved & Donated',
  rejected: 'Not Approved',
};

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a new donation pledge submission.
 */
export function validateCreateDonation(input: CreateDonationInput): ValidationResult {
  const errors: string[] = [];

  if (!input.cause_name || input.cause_name.trim().length === 0) {
    errors.push('Cause name is required');
  } else if (input.cause_name.trim().length > CAUSE_NAME_MAX_LENGTH) {
    errors.push(`Cause name must be ${CAUSE_NAME_MAX_LENGTH} characters or fewer`);
  }

  if (input.message && input.message.length > MESSAGE_MAX_LENGTH) {
    errors.push(`Message must be ${MESSAGE_MAX_LENGTH} characters or fewer`);
  }

  if (!input.amount_cents || typeof input.amount_cents !== 'number') {
    errors.push('Donation amount is required');
  } else if (!Number.isInteger(input.amount_cents)) {
    errors.push('Donation amount must be a whole number of cents');
  } else if (input.amount_cents < DONATION_MIN_CENTS) {
    errors.push('Donation must be at least $0.01');
  } else if (input.amount_cents > DONATION_MAX_CENTS) {
    errors.push(`Donation cannot exceed $${(DONATION_MAX_CENTS / 100).toFixed(2)}`);
  }

  if (!input.child_id || input.child_id.trim().length === 0) {
    errors.push('Child ID is required');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a review (approve/reject) action.
 */
export function validateReviewDonation(input: ReviewDonationInput): ValidationResult {
  const errors: string[] = [];

  if (typeof input.approved !== 'boolean') {
    errors.push('Approved status must be a boolean');
  }

  if (!input.approved && input.rejection_reason && input.rejection_reason.length > REJECTION_REASON_MAX_LENGTH) {
    errors.push(`Rejection reason must be ${REJECTION_REASON_MAX_LENGTH} characters or fewer`);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Business Logic ───────────────────────────────────────────────────────────

/**
 * Check whether a child has sufficient spendable balance for a donation.
 *
 * Donations come from the spend bucket (balance_cents - save_balance_cents),
 * not from the locked savings bucket.
 *
 * @param spendBalanceCents  Child's spendable balance (balance_cents - save_balance_cents)
 * @param donationCents      Requested donation amount
 */
export function hasSufficientBalance(spendBalanceCents: number, donationCents: number): boolean {
  return spendBalanceCents >= donationCents;
}

/**
 * Calculate the remaining spend balance after a donation.
 */
export function balanceAfterDonation(spendBalanceCents: number, donationCents: number): number {
  return spendBalanceCents - donationCents;
}

/**
 * Format a donation amount in cents to a display string.
 *
 * @example formatDonationAmount(500) // "$5.00"
 */
export function formatDonationAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Get a friendly label for a donation status with an appropriate emoji.
 */
export function getDonationStatusBadge(status: DonationStatus): { label: string; emoji: string; color: string } {
  switch (status) {
    case 'pending':
      return { label: 'Waiting for parent', emoji: '⏳', color: '#F39C12' };
    case 'approved':
      return { label: 'Donated!', emoji: '💚', color: '#27AE60' };
    case 'rejected':
      return { label: 'Not approved', emoji: '❌', color: '#E74C3C' };
  }
}

/**
 * Sort donation pledges: pending first, then by most recent submitted_at.
 */
export function sortDonations(pledges: DonationPledge[]): DonationPledge[] {
  return [...pledges].sort((a, b) => {
    // Pending first
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    // Then newest first
    return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
  });
}

/**
 * Count pending donations for a child.
 */
export function countPendingDonations(pledges: DonationPledge[]): number {
  return pledges.filter((p) => p.status === 'pending').length;
}

/**
 * Calculate total amount donated (approved pledges only).
 */
export function totalDonatedCents(pledges: DonationPledge[]): number {
  return pledges
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + p.amount_cents, 0);
}

/**
 * Get a motivational message based on total donated.
 */
export function getGivingMilestoneMessage(totalCents: number): string | null {
  if (totalCents >= 10_000) return "🌟 Amazing! You've donated over $100! You're making a real difference!";
  if (totalCents >= 5_000)  return "🎉 Incredible! Over $50 donated — you're a true helper!";
  if (totalCents >= 2_500)  return "💚 Wow, $25 donated! That's really something to be proud of!";
  if (totalCents >= 1_000)  return "✨ You've donated $10! Every dollar helps someone!";
  if (totalCents >= 100)    return "🌱 You've made your first dollar in donations!";
  return null;
}
