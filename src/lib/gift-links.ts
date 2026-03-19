/**
 * GrowBucks Gift Links Utilities
 *
 * Gift Links let parents create shareable URLs that allow relatives
 * (grandparents, aunts/uncles, family friends) to send money as gifts
 * to a specific child — no account required for the giver.
 *
 * Flow:
 *   1. Parent creates a gift link tied to one child (optional: label, expiry,
 *      per-gift cap, max uses, personal message)
 *   2. Parent copies the link and shares it with family
 *   3. Giver visits the link, enters their name, a message, and an amount
 *   4. A **pending** deposit is created — money doesn't land until approved
 *   5. Parent reviews and approves (or rejects) in the dashboard
 *
 * Security model:
 *   - Tokens are 32-character crypto-random hex strings (128 bits of entropy)
 *   - Links are public: anyone with the token can submit a gift
 *   - The actual deposit is always *pending*, so the parent has final say
 *   - Parents can deactivate any link at any time
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GiftLink {
  id: string;
  token: string;
  child_id: string;
  created_by: string;
  /** Human-readable name for the link, e.g. "Birthday 2026" */
  label: string;
  /** Optional welcome message displayed to the giver */
  message?: string | null;
  /** Maximum number of times this link can be used (null = unlimited) */
  max_uses?: number | null;
  use_count: number;
  /** Per-gift maximum in cents (null = no cap, hard max $1,000 enforced by API) */
  max_amount_per_gift_cents?: number | null;
  expires_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GiftLinkRedemption {
  id: string;
  gift_link_id: string;
  child_id: string;
  giver_name: string;
  giver_message?: string | null;
  amount_cents: number;
  transaction_id?: string | null;
  status: RedemptionStatus;
  redeemed_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export type RedemptionStatus = 'pending' | 'approved' | 'rejected';

export interface CreateGiftLinkInput {
  child_id: string;
  label?: string;
  message?: string;
  max_uses?: number;
  max_amount_per_gift_cents?: number;
  expires_at?: string; // ISO-8601
}

export interface RedeemGiftLinkInput {
  giver_name: string;
  giver_message?: string;
  amount_cents: number;
}

export interface GiftLinkPublicInfo {
  child_name: string;
  label: string;
  message?: string | null;
  max_amount_per_gift_cents?: number | null;
  is_active: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const GIFT_LINK_LABEL_MAX_LENGTH = 100;
export const GIFT_LINK_MESSAGE_MAX_LENGTH = 500;
export const GIVER_NAME_MAX_LENGTH = 100;
export const GIVER_MESSAGE_MAX_LENGTH = 300;

/** Minimum gift: $1.00 */
export const GIFT_MIN_CENTS = 100;
/** Maximum gift: $1,000.00 */
export const GIFT_MAX_CENTS = 100_000;
/** Maximum max_uses value */
export const MAX_USES_LIMIT = 1000;

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * Validate input for creating a gift link.
 */
export function validateCreateGiftLink(input: CreateGiftLinkInput): ValidationResult {
  const errors: string[] = [];

  if (!input.child_id || typeof input.child_id !== 'string' || input.child_id.trim() === '') {
    errors.push('child_id is required');
  }

  const label = input.label ?? 'Gift';
  if (label.trim() === '') {
    errors.push('label cannot be blank');
  } else if (label.length > GIFT_LINK_LABEL_MAX_LENGTH) {
    errors.push(`label must be at most ${GIFT_LINK_LABEL_MAX_LENGTH} characters`);
  }

  if (input.message !== undefined && input.message.length > GIFT_LINK_MESSAGE_MAX_LENGTH) {
    errors.push(`message must be at most ${GIFT_LINK_MESSAGE_MAX_LENGTH} characters`);
  }

  if (input.max_uses !== undefined) {
    if (!Number.isInteger(input.max_uses) || input.max_uses < 1) {
      errors.push('max_uses must be a positive integer');
    } else if (input.max_uses > MAX_USES_LIMIT) {
      errors.push(`max_uses cannot exceed ${MAX_USES_LIMIT}`);
    }
  }

  if (input.max_amount_per_gift_cents !== undefined) {
    if (!Number.isInteger(input.max_amount_per_gift_cents) || input.max_amount_per_gift_cents < GIFT_MIN_CENTS) {
      errors.push(`max_amount_per_gift_cents must be at least ${GIFT_MIN_CENTS} (= $1.00)`);
    } else if (input.max_amount_per_gift_cents > GIFT_MAX_CENTS) {
      errors.push(`max_amount_per_gift_cents cannot exceed ${GIFT_MAX_CENTS} (= $1,000.00)`);
    }
  }

  if (input.expires_at !== undefined) {
    const d = new Date(input.expires_at);
    if (isNaN(d.getTime())) {
      errors.push('expires_at must be a valid ISO-8601 date string');
    } else if (d <= new Date()) {
      errors.push('expires_at must be in the future');
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Validate input when a giver redeems a gift link.
 */
export function validateRedeemGiftLink(
  input: RedeemGiftLinkInput,
  link: Pick<GiftLink, 'max_amount_per_gift_cents'>,
): ValidationResult {
  const errors: string[] = [];

  if (!input.giver_name || input.giver_name.trim() === '') {
    errors.push('giver_name is required');
  } else if (input.giver_name.length > GIVER_NAME_MAX_LENGTH) {
    errors.push(`giver_name must be at most ${GIVER_NAME_MAX_LENGTH} characters`);
  }

  if (input.giver_message !== undefined && input.giver_message.length > GIVER_MESSAGE_MAX_LENGTH) {
    errors.push(`giver_message must be at most ${GIVER_MESSAGE_MAX_LENGTH} characters`);
  }

  if (!Number.isInteger(input.amount_cents) || input.amount_cents < GIFT_MIN_CENTS) {
    errors.push(`amount_cents must be at least ${GIFT_MIN_CENTS} (= $1.00)`);
  } else if (input.amount_cents > GIFT_MAX_CENTS) {
    errors.push(`amount_cents cannot exceed ${GIFT_MAX_CENTS} (= $1,000.00)`);
  } else if (
    link.max_amount_per_gift_cents != null &&
    input.amount_cents > link.max_amount_per_gift_cents
  ) {
    errors.push(
      `amount_cents cannot exceed the per-gift cap of ${link.max_amount_per_gift_cents} (= ${formatGiftAmount(link.max_amount_per_gift_cents)})`,
    );
  }

  return { ok: errors.length === 0, errors };
}

// ─── Token Helpers ────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random 32-character hex token.
 * Works in both Node.js (crypto) and browser (Web Crypto) environments.
 */
export function generateGiftToken(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Browser / Edge runtime
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Node.js fallback (tests, server-side)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('crypto') as typeof import('crypto');
  return nodeCrypto.randomBytes(16).toString('hex');
}

/**
 * Returns true if the token format is valid (32 hex chars).
 */
export function isValidTokenFormat(token: string): boolean {
  return /^[0-9a-f]{32}$/.test(token);
}

// ─── Link Status Helpers ──────────────────────────────────────────────────────

export type LinkStatusReason = 'active' | 'expired' | 'max_uses_reached' | 'deactivated';

export interface LinkStatus {
  usable: boolean;
  reason: LinkStatusReason;
  label: string;
}

/**
 * Determine whether a gift link is currently usable.
 */
export function getLinkStatus(link: GiftLink): LinkStatus {
  if (!link.is_active) {
    return { usable: false, reason: 'deactivated', label: 'Deactivated' };
  }
  if (link.expires_at && new Date(link.expires_at) <= new Date()) {
    return { usable: false, reason: 'expired', label: 'Expired' };
  }
  if (link.max_uses != null && link.use_count >= link.max_uses) {
    return { usable: false, reason: 'max_uses_reached', label: 'Max uses reached' };
  }
  return { usable: true, reason: 'active', label: 'Active' };
}

/**
 * How many more redemptions the link allows (null = unlimited).
 */
export function remainingUses(link: GiftLink): number | null {
  if (link.max_uses == null) return null;
  return Math.max(0, link.max_uses - link.use_count);
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

/**
 * Format a gift amount in cents as a dollar string, e.g. "$25.00".
 */
export function formatGiftAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Build the full public URL for a gift link.
 */
export function buildGiftUrl(token: string, baseUrl: string = ''): string {
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/gift/${token}`;
}

/**
 * Return a short human-readable expiry string, e.g. "Expires Dec 31, 2026".
 * Returns null if the link has no expiry.
 */
export function formatExpiry(link: GiftLink): string | null {
  if (!link.expires_at) return null;
  const d = new Date(link.expires_at);
  return `Expires ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

// ─── Sorting / Grouping ───────────────────────────────────────────────────────

/**
 * Sort gift links: active first, then by creation date (newest first).
 */
export function sortGiftLinks(links: GiftLink[]): GiftLink[] {
  return [...links].sort((a, b) => {
    const aActive = getLinkStatus(a).usable;
    const bActive = getLinkStatus(b).usable;
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/**
 * Sort redemptions: pending first, then by most recent.
 */
export function sortRedemptions(redemptions: GiftLinkRedemption[]): GiftLinkRedemption[] {
  return [...redemptions].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime();
  });
}

/**
 * Count pending redemptions across all gift links.
 */
export function countPendingRedemptions(redemptions: GiftLinkRedemption[]): number {
  return redemptions.filter((r) => r.status === 'pending').length;
}

/**
 * Total amount gifted so far (approved only) for a set of redemptions.
 */
export function totalApprovedGiftCents(redemptions: GiftLinkRedemption[]): number {
  return redemptions
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + r.amount_cents, 0);
}

/**
 * Returns a badge object for a redemption status.
 */
export function redemptionStatusBadge(status: RedemptionStatus): {
  label: string;
  emoji: string;
  color: string;
} {
  switch (status) {
    case 'pending':
      return { label: 'Awaiting approval', emoji: '⏳', color: '#F39C12' };
    case 'approved':
      return { label: 'Gifted!', emoji: '🎁', color: '#27AE60' };
    case 'rejected':
      return { label: 'Declined', emoji: '❌', color: '#E74C3C' };
  }
}

/**
 * Suggested gift link labels to get parents started quickly.
 */
export const SUGGESTED_LABELS = [
  { label: 'Birthday Gift Link', emoji: '🎂' },
  { label: 'Holiday Gifts', emoji: '🎄' },
  { label: 'Graduation Gift', emoji: '🎓' },
  { label: 'Tooth Fairy Fund', emoji: '🧚' },
  { label: 'Family Contributions', emoji: '👨‍👩‍👧‍👦' },
] as const;
