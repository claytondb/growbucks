/**
 * GrowBucks Interest Rate Promotions
 *
 * Parents can create limited-time bonus interest rate periods ("promotions")
 * to incentivise saving. A promotion adds bonus_rate_daily on top of a child's
 * existing interest_rate_daily for the duration of the window.
 *
 * Rules:
 *   - bonus_rate_daily: 0 < rate ≤ 0.10 (max +10%/day)
 *   - Duration: ends_at must be at least 1 day after starts_at
 *   - Max duration: 90 days
 *   - Name: 1–100 non-whitespace characters
 *   - child_id: null = applies to all of the parent's children
 *   - A child-specific promotion wins over a family-wide one (higher specificity)
 *   - If multiple active promotions match, the one with the highest bonus wins
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const MIN_BONUS_RATE = 0.0001; // just above zero; practical floor ~0.001
export const MAX_BONUS_RATE = 0.10;   // +10%/day maximum
export const MAX_NAME_LENGTH = 100;
export const MIN_DURATION_DAYS = 1;
export const MAX_DURATION_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InterestPromotion {
  id: string;
  user_id: string;
  /** null → applies to all of the parent's children */
  child_id: string | null;
  name: string;
  /** Bonus daily rate, e.g. 0.005 = +0.5%/day */
  bonus_rate_daily: number;
  starts_at: string; // ISO string
  ends_at: string;   // ISO string
  created_at: string;
  updated_at: string;
}

export type PromotionStatus = 'upcoming' | 'active' | 'ended';

export interface PromotionWithStatus extends InterestPromotion {
  status: PromotionStatus;
  days_remaining: number | null; // null when ended/upcoming
}

export interface CreatePromotionInput {
  child_id?: string | null;
  name: string;
  bonus_rate_daily: number;
  starts_at: string; // ISO string
  ends_at: string;   // ISO string
}

export interface UpdatePromotionInput {
  name?: string;
  bonus_rate_daily?: number;
  starts_at?: string;
  ends_at?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a CreatePromotionInput.
 * Returns an array of validation errors (empty = valid).
 */
export function validateCreatePromotion(input: CreatePromotionInput): ValidationError[] {
  const errors: ValidationError[] = [];

  // name
  if (!input.name || typeof input.name !== 'string') {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (input.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name cannot be blank' });
  } else if (input.name.length > MAX_NAME_LENGTH) {
    errors.push({ field: 'name', message: `Name must be ${MAX_NAME_LENGTH} characters or less` });
  }

  // bonus_rate_daily
  if (
    typeof input.bonus_rate_daily !== 'number' ||
    !isFinite(input.bonus_rate_daily) ||
    isNaN(input.bonus_rate_daily)
  ) {
    errors.push({ field: 'bonus_rate_daily', message: 'Bonus rate must be a number' });
  } else if (input.bonus_rate_daily <= 0) {
    errors.push({ field: 'bonus_rate_daily', message: 'Bonus rate must be greater than 0' });
  } else if (input.bonus_rate_daily > MAX_BONUS_RATE) {
    errors.push({
      field: 'bonus_rate_daily',
      message: `Bonus rate cannot exceed ${(MAX_BONUS_RATE * 100).toFixed(0)}% per day`,
    });
  }

  // starts_at
  let startsDate: Date | null = null;
  if (!input.starts_at || typeof input.starts_at !== 'string') {
    errors.push({ field: 'starts_at', message: 'Start date is required' });
  } else {
    startsDate = new Date(input.starts_at);
    if (isNaN(startsDate.getTime())) {
      errors.push({ field: 'starts_at', message: 'Start date is not a valid date' });
      startsDate = null;
    }
  }

  // ends_at
  let endsDate: Date | null = null;
  if (!input.ends_at || typeof input.ends_at !== 'string') {
    errors.push({ field: 'ends_at', message: 'End date is required' });
  } else {
    endsDate = new Date(input.ends_at);
    if (isNaN(endsDate.getTime())) {
      errors.push({ field: 'ends_at', message: 'End date is not a valid date' });
      endsDate = null;
    }
  }

  // Period validation (requires both dates to be valid)
  if (startsDate && endsDate) {
    const durationDays = (endsDate.getTime() - startsDate.getTime()) / MS_PER_DAY;

    if (durationDays < MIN_DURATION_DAYS) {
      errors.push({
        field: 'ends_at',
        message: `Promotion must run for at least ${MIN_DURATION_DAYS} day`,
      });
    } else if (durationDays > MAX_DURATION_DAYS) {
      errors.push({
        field: 'ends_at',
        message: `Promotion cannot run longer than ${MAX_DURATION_DAYS} days`,
      });
    }
  }

  return errors;
}

/**
 * Validate an UpdatePromotionInput (partial — only validates provided fields).
 */
export function validateUpdatePromotion(
  input: UpdatePromotionInput,
  existing: InterestPromotion
): ValidationError[] {
  // Build a merged input and reuse create validation on the fields we care about
  const merged: CreatePromotionInput = {
    name: input.name ?? existing.name,
    bonus_rate_daily: input.bonus_rate_daily ?? existing.bonus_rate_daily,
    starts_at: input.starts_at ?? existing.starts_at,
    ends_at: input.ends_at ?? existing.ends_at,
    child_id: existing.child_id,
  };
  return validateCreatePromotion(merged);
}

// ─── Status & Timing Helpers ──────────────────────────────────────────────────

/**
 * Determine whether a promotion is upcoming, active, or ended at a given time.
 */
export function getPromotionStatus(
  promotion: Pick<InterestPromotion, 'starts_at' | 'ends_at'>,
  now: Date = new Date()
): PromotionStatus {
  const start = new Date(promotion.starts_at);
  const end = new Date(promotion.ends_at);
  if (now < start) return 'upcoming';
  if (now >= end) return 'ended';
  return 'active';
}

/**
 * Returns the number of whole days remaining in an active promotion.
 * Returns null if the promotion is not currently active.
 */
export function getDaysRemaining(
  promotion: Pick<InterestPromotion, 'starts_at' | 'ends_at'>,
  now: Date = new Date()
): number | null {
  const status = getPromotionStatus(promotion, now);
  if (status !== 'active') return null;
  const end = new Date(promotion.ends_at);
  return Math.ceil((end.getTime() - now.getTime()) / MS_PER_DAY);
}

/**
 * Attach status + days_remaining to a list of promotions.
 */
export function annotatePromotions(
  promotions: InterestPromotion[],
  now: Date = new Date()
): PromotionWithStatus[] {
  return promotions.map((p) => ({
    ...p,
    status: getPromotionStatus(p, now),
    days_remaining: getDaysRemaining(p, now),
  }));
}

// ─── Effective Rate Logic ─────────────────────────────────────────────────────

/**
 * Given a list of active promotions for a child, select the one to apply.
 *
 * Priority rules (applied in order):
 *   1. Child-specific promotion beats family-wide (null child_id)
 *   2. Among same-specificity promotions, the highest bonus wins
 *   3. Returns null if no active promotions match
 */
export function selectBestPromotion(
  childId: string,
  promotions: InterestPromotion[],
  now: Date = new Date()
): InterestPromotion | null {
  const active = promotions.filter((p) => getPromotionStatus(p, now) === 'active');
  if (active.length === 0) return null;

  // Separate child-specific from family-wide
  const childSpecific = active.filter((p) => p.child_id === childId);
  const familyWide = active.filter((p) => p.child_id === null);

  const pool = childSpecific.length > 0 ? childSpecific : familyWide;
  if (pool.length === 0) return null;

  // Pick highest bonus
  return pool.reduce((best, p) =>
    p.bonus_rate_daily > best.bonus_rate_daily ? p : best
  );
}

/**
 * Return the effective daily interest rate for a child, applying any active
 * promotion bonus on top of the base rate.
 *
 * @param baseRate   The child's base interest_rate_daily
 * @param promotion  The active promotion to apply (or null for none)
 * @returns Effective daily rate (base + bonus, rounded to 7 decimal places)
 */
export function getEffectiveRate(
  baseRate: number,
  promotion: InterestPromotion | null
): number {
  if (!promotion) return baseRate;
  return Math.round((baseRate + promotion.bonus_rate_daily) * 1e7) / 1e7;
}

// ─── Display Helpers ──────────────────────────────────────────────────────────

/**
 * Format a bonus rate as a human-readable string, e.g. "+0.5%/day"
 */
export function formatBonusRate(bonusRateDaily: number): string {
  const percent = bonusRateDaily * 100;
  // Trim trailing zeros but keep enough precision
  const formatted = percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(2).replace(/\.?0+$/, '');
  return `+${formatted}%/day`;
}

/**
 * Format a base rate as a percentage string, e.g. "1.5%/day"
 */
export function formatBaseRate(dailyRate: number): string {
  const percent = dailyRate * 100;
  const formatted = percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(2).replace(/\.?0+$/, '');
  return `${formatted}%/day`;
}

/**
 * Format the effective rate with promotion context for display.
 * Returns an object suitable for rendering in a UI tooltip or summary.
 */
export function formatEffectiveRateDisplay(
  baseRate: number,
  promotion: InterestPromotion | null
): { baseLabel: string; bonusLabel: string | null; effectiveLabel: string } {
  const effective = getEffectiveRate(baseRate, promotion);
  return {
    baseLabel: formatBaseRate(baseRate),
    bonusLabel: promotion ? formatBonusRate(promotion.bonus_rate_daily) : null,
    effectiveLabel: formatBaseRate(effective),
  };
}
