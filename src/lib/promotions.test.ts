/**
 * Tests for src/lib/promotions.ts
 *
 * Covers: validation (create + update), status/timing helpers, best-promotion
 * selection, effective rate calculation, and display formatting.
 */
import { describe, it, expect } from 'vitest';
import {
  validateCreatePromotion,
  validateUpdatePromotion,
  getPromotionStatus,
  getDaysRemaining,
  annotatePromotions,
  selectBestPromotion,
  getEffectiveRate,
  formatBonusRate,
  formatBaseRate,
  formatEffectiveRateDisplay,
  MAX_BONUS_RATE,
  MAX_NAME_LENGTH,
  MAX_DURATION_DAYS,
  type InterestPromotion,
  type CreatePromotionInput,
} from './promotions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NOW = new Date('2026-03-14T10:00:00Z');

function makePromotion(overrides: Partial<InterestPromotion> = {}): InterestPromotion {
  return {
    id: 'promo-1',
    user_id: 'user-1',
    child_id: null,
    name: 'Summer Bonus',
    bonus_rate_daily: 0.005,
    starts_at: '2026-03-01T00:00:00Z',
    ends_at: '2026-04-01T00:00:00Z',
    created_at: '2026-02-28T00:00:00Z',
    updated_at: '2026-02-28T00:00:00Z',
    ...overrides,
  };
}

function makeInput(overrides: Partial<CreatePromotionInput> = {}): CreatePromotionInput {
  return {
    name: 'Summer Bonus',
    bonus_rate_daily: 0.005,
    starts_at: '2026-03-20T00:00:00Z',
    ends_at: '2026-04-20T00:00:00Z', // 31 days
    ...overrides,
  };
}

// ─── validateCreatePromotion ──────────────────────────────────────────────────

describe('validateCreatePromotion', () => {
  it('returns no errors for a valid input', () => {
    expect(validateCreatePromotion(makeInput())).toHaveLength(0);
  });

  // name
  it('errors when name is missing', () => {
    const errs = validateCreatePromotion(makeInput({ name: '' }));
    expect(errs.some((e) => e.field === 'name')).toBe(true);
  });

  it('errors when name is only whitespace', () => {
    const errs = validateCreatePromotion(makeInput({ name: '   ' }));
    expect(errs.some((e) => e.field === 'name')).toBe(true);
  });

  it(`errors when name exceeds ${MAX_NAME_LENGTH} chars`, () => {
    const errs = validateCreatePromotion(makeInput({ name: 'x'.repeat(MAX_NAME_LENGTH + 1) }));
    expect(errs.some((e) => e.field === 'name')).toBe(true);
  });

  it(`accepts name at exactly ${MAX_NAME_LENGTH} chars`, () => {
    const errs = validateCreatePromotion(makeInput({ name: 'x'.repeat(MAX_NAME_LENGTH) }));
    expect(errs.some((e) => e.field === 'name')).toBe(false);
  });

  // bonus_rate_daily
  it('errors when bonus_rate_daily is 0', () => {
    const errs = validateCreatePromotion(makeInput({ bonus_rate_daily: 0 }));
    expect(errs.some((e) => e.field === 'bonus_rate_daily')).toBe(true);
  });

  it('errors when bonus_rate_daily is negative', () => {
    const errs = validateCreatePromotion(makeInput({ bonus_rate_daily: -0.01 }));
    expect(errs.some((e) => e.field === 'bonus_rate_daily')).toBe(true);
  });

  it(`errors when bonus_rate_daily exceeds ${MAX_BONUS_RATE}`, () => {
    const errs = validateCreatePromotion(makeInput({ bonus_rate_daily: MAX_BONUS_RATE + 0.001 }));
    expect(errs.some((e) => e.field === 'bonus_rate_daily')).toBe(true);
  });

  it(`accepts bonus_rate_daily at exactly ${MAX_BONUS_RATE}`, () => {
    const errs = validateCreatePromotion(makeInput({ bonus_rate_daily: MAX_BONUS_RATE }));
    expect(errs.some((e) => e.field === 'bonus_rate_daily')).toBe(false);
  });

  it('errors when bonus_rate_daily is not a number', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errs = validateCreatePromotion(makeInput({ bonus_rate_daily: 'high' as any }));
    expect(errs.some((e) => e.field === 'bonus_rate_daily')).toBe(true);
  });

  // starts_at
  it('errors when starts_at is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errs = validateCreatePromotion(makeInput({ starts_at: undefined as any }));
    expect(errs.some((e) => e.field === 'starts_at')).toBe(true);
  });

  it('errors when starts_at is not a valid date', () => {
    const errs = validateCreatePromotion(makeInput({ starts_at: 'not-a-date' }));
    expect(errs.some((e) => e.field === 'starts_at')).toBe(true);
  });

  // ends_at
  it('errors when ends_at is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errs = validateCreatePromotion(makeInput({ ends_at: undefined as any }));
    expect(errs.some((e) => e.field === 'ends_at')).toBe(true);
  });

  it('errors when ends_at is not a valid date', () => {
    const errs = validateCreatePromotion(makeInput({ ends_at: 'not-a-date' }));
    expect(errs.some((e) => e.field === 'ends_at')).toBe(true);
  });

  // period
  it('errors when ends_at is before starts_at', () => {
    const errs = validateCreatePromotion(
      makeInput({ starts_at: '2026-04-01T00:00:00Z', ends_at: '2026-03-01T00:00:00Z' })
    );
    expect(errs.some((e) => e.field === 'ends_at')).toBe(true);
  });

  it('errors when ends_at equals starts_at (0-day duration)', () => {
    const errs = validateCreatePromotion(
      makeInput({ starts_at: '2026-03-20T00:00:00Z', ends_at: '2026-03-20T00:00:00Z' })
    );
    expect(errs.some((e) => e.field === 'ends_at')).toBe(true);
  });

  it(`errors when duration exceeds ${MAX_DURATION_DAYS} days`, () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date(start.getTime() + (MAX_DURATION_DAYS + 1) * 24 * 60 * 60 * 1000);
    const errs = validateCreatePromotion(
      makeInput({ starts_at: start.toISOString(), ends_at: end.toISOString() })
    );
    expect(errs.some((e) => e.field === 'ends_at')).toBe(true);
  });

  it(`accepts duration of exactly ${MAX_DURATION_DAYS} days`, () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date(start.getTime() + MAX_DURATION_DAYS * 24 * 60 * 60 * 1000);
    const errs = validateCreatePromotion(
      makeInput({ starts_at: start.toISOString(), ends_at: end.toISOString() })
    );
    expect(errs.some((e) => e.field === 'ends_at')).toBe(false);
  });

  it('accepts child_id as optional', () => {
    const errs = validateCreatePromotion(makeInput({ child_id: 'child-abc' }));
    expect(errs).toHaveLength(0);
  });

  it('collects multiple validation errors at once', () => {
    const errs = validateCreatePromotion({
      name: '',
      bonus_rate_daily: -1,
      starts_at: 'bad',
      ends_at: 'bad',
    });
    expect(errs.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── validateUpdatePromotion ──────────────────────────────────────────────────

describe('validateUpdatePromotion', () => {
  const existing = makePromotion();

  it('returns no errors for valid partial update', () => {
    const errs = validateUpdatePromotion({ name: 'New Name' }, existing);
    expect(errs).toHaveLength(0);
  });

  it('validates name when provided', () => {
    const errs = validateUpdatePromotion({ name: '   ' }, existing);
    expect(errs.some((e) => e.field === 'name')).toBe(true);
  });

  it('validates bonus_rate_daily when provided', () => {
    const errs = validateUpdatePromotion({ bonus_rate_daily: 0 }, existing);
    expect(errs.some((e) => e.field === 'bonus_rate_daily')).toBe(true);
  });

  it('merges with existing when partial fields provided', () => {
    // Only updating ends_at — starts_at should stay valid
    const errs = validateUpdatePromotion({ ends_at: '2026-04-15T00:00:00Z' }, existing);
    expect(errs).toHaveLength(0);
  });

  it('errors if updated ends_at creates invalid period', () => {
    const errs = validateUpdatePromotion(
      { ends_at: '2026-02-01T00:00:00Z' }, // before existing starts_at
      existing
    );
    expect(errs.some((e) => e.field === 'ends_at')).toBe(true);
  });
});

// ─── getPromotionStatus ───────────────────────────────────────────────────────

describe('getPromotionStatus', () => {
  it('returns "upcoming" when now is before starts_at', () => {
    const p = makePromotion({ starts_at: '2026-03-20T00:00:00Z', ends_at: '2026-04-20T00:00:00Z' });
    expect(getPromotionStatus(p, NOW)).toBe('upcoming');
  });

  it('returns "active" when now is within the window', () => {
    const p = makePromotion({ starts_at: '2026-03-01T00:00:00Z', ends_at: '2026-04-01T00:00:00Z' });
    expect(getPromotionStatus(p, NOW)).toBe('active');
  });

  it('returns "ended" when now is after ends_at', () => {
    const p = makePromotion({ starts_at: '2026-01-01T00:00:00Z', ends_at: '2026-02-01T00:00:00Z' });
    expect(getPromotionStatus(p, NOW)).toBe('ended');
  });

  it('returns "ended" when now equals ends_at exactly', () => {
    const p = makePromotion({ starts_at: '2026-03-01T00:00:00Z', ends_at: NOW.toISOString() });
    expect(getPromotionStatus(p, NOW)).toBe('ended');
  });

  it('returns "active" when now equals starts_at exactly', () => {
    const p = makePromotion({ starts_at: NOW.toISOString(), ends_at: '2026-04-01T00:00:00Z' });
    expect(getPromotionStatus(p, NOW)).toBe('active');
  });
});

// ─── getDaysRemaining ─────────────────────────────────────────────────────────

describe('getDaysRemaining', () => {
  it('returns null for upcoming promotions', () => {
    const p = makePromotion({ starts_at: '2026-03-20T00:00:00Z', ends_at: '2026-04-20T00:00:00Z' });
    expect(getDaysRemaining(p, NOW)).toBeNull();
  });

  it('returns null for ended promotions', () => {
    const p = makePromotion({ starts_at: '2026-01-01T00:00:00Z', ends_at: '2026-02-01T00:00:00Z' });
    expect(getDaysRemaining(p, NOW)).toBeNull();
  });

  it('returns positive day count for active promotions', () => {
    // ends in about 18 days from NOW (2026-03-14)
    const p = makePromotion({ starts_at: '2026-03-01T00:00:00Z', ends_at: '2026-04-01T00:00:00Z' });
    const days = getDaysRemaining(p, NOW);
    expect(days).not.toBeNull();
    expect(days!).toBeGreaterThan(0);
    expect(days!).toBeLessThanOrEqual(18);
  });

  it('returns 1 when less than a day remains', () => {
    const endsAt = new Date(NOW.getTime() + 30 * 60 * 1000); // 30 min from now
    const p = makePromotion({ starts_at: '2026-03-01T00:00:00Z', ends_at: endsAt.toISOString() });
    expect(getDaysRemaining(p, NOW)).toBe(1);
  });
});

// ─── annotatePromotions ───────────────────────────────────────────────────────

describe('annotatePromotions', () => {
  it('attaches status and days_remaining to each promotion', () => {
    const active = makePromotion({ id: 'p1', starts_at: '2026-03-01T00:00:00Z', ends_at: '2026-04-01T00:00:00Z' });
    const ended = makePromotion({ id: 'p2', starts_at: '2026-01-01T00:00:00Z', ends_at: '2026-02-01T00:00:00Z' });
    const result = annotatePromotions([active, ended], NOW);

    expect(result[0].status).toBe('active');
    expect(result[0].days_remaining).not.toBeNull();
    expect(result[1].status).toBe('ended');
    expect(result[1].days_remaining).toBeNull();
  });

  it('returns empty array for empty input', () => {
    expect(annotatePromotions([])).toHaveLength(0);
  });
});

// ─── selectBestPromotion ──────────────────────────────────────────────────────

describe('selectBestPromotion', () => {
  it('returns null when no promotions', () => {
    expect(selectBestPromotion('child-1', [], NOW)).toBeNull();
  });

  it('returns null when all promotions are inactive', () => {
    const ended = makePromotion({ ends_at: '2026-01-01T00:00:00Z' });
    const upcoming = makePromotion({ starts_at: '2026-04-01T00:00:00Z', ends_at: '2026-05-01T00:00:00Z' });
    expect(selectBestPromotion('child-1', [ended, upcoming], NOW)).toBeNull();
  });

  it('returns the single active promotion when present', () => {
    const active = makePromotion({ id: 'p-active' });
    expect(selectBestPromotion('child-1', [active], NOW)?.id).toBe('p-active');
  });

  it('prefers child-specific over family-wide promotion', () => {
    const familyWide = makePromotion({ id: 'family', child_id: null, bonus_rate_daily: 0.02 });
    const childSpecific = makePromotion({ id: 'child', child_id: 'child-1', bonus_rate_daily: 0.005 });
    // Child-specific wins even with a lower bonus
    expect(selectBestPromotion('child-1', [familyWide, childSpecific], NOW)?.id).toBe('child');
  });

  it('family-wide applies to all children when no child-specific exists', () => {
    const familyWide = makePromotion({ id: 'family', child_id: null });
    expect(selectBestPromotion('child-999', [familyWide], NOW)?.id).toBe('family');
  });

  it('child-specific for a different child does not apply', () => {
    const otherChild = makePromotion({ id: 'other', child_id: 'child-2', bonus_rate_daily: 0.05 });
    expect(selectBestPromotion('child-1', [otherChild], NOW)).toBeNull();
  });

  it('among multiple child-specific promotions, picks the highest bonus', () => {
    const lowBonus = makePromotion({ id: 'low', child_id: 'child-1', bonus_rate_daily: 0.005 });
    const highBonus = makePromotion({ id: 'high', child_id: 'child-1', bonus_rate_daily: 0.02 });
    const midBonus = makePromotion({ id: 'mid', child_id: 'child-1', bonus_rate_daily: 0.01 });
    expect(selectBestPromotion('child-1', [lowBonus, highBonus, midBonus], NOW)?.id).toBe('high');
  });

  it('among multiple family-wide promotions, picks the highest bonus', () => {
    const a = makePromotion({ id: 'a', child_id: null, bonus_rate_daily: 0.003 });
    const b = makePromotion({ id: 'b', child_id: null, bonus_rate_daily: 0.008 });
    const c = makePromotion({ id: 'c', child_id: null, bonus_rate_daily: 0.001 });
    expect(selectBestPromotion('child-1', [a, b, c], NOW)?.id).toBe('b');
  });

  it('ignores ended promotions in selection', () => {
    const ended = makePromotion({ id: 'ended', child_id: null, ends_at: '2026-02-01T00:00:00Z' });
    const active = makePromotion({ id: 'active', child_id: null, bonus_rate_daily: 0.001 });
    expect(selectBestPromotion('child-1', [ended, active], NOW)?.id).toBe('active');
  });
});

// ─── getEffectiveRate ─────────────────────────────────────────────────────────

describe('getEffectiveRate', () => {
  it('returns baseRate when promotion is null', () => {
    expect(getEffectiveRate(0.01, null)).toBe(0.01);
  });

  it('adds bonus_rate_daily to base rate', () => {
    const promo = makePromotion({ bonus_rate_daily: 0.005 });
    expect(getEffectiveRate(0.01, promo)).toBeCloseTo(0.015, 7);
  });

  it('handles small bonus rates without floating point drift', () => {
    const promo = makePromotion({ bonus_rate_daily: 0.001 });
    const effective = getEffectiveRate(0.01, promo);
    // Should be 0.011 exactly (rounded to 7 decimal places)
    expect(effective).toBe(0.011);
  });

  it('works with a zero base rate (edge case)', () => {
    const promo = makePromotion({ bonus_rate_daily: 0.005 });
    expect(getEffectiveRate(0, promo)).toBeCloseTo(0.005, 7);
  });
});

// ─── formatBonusRate ──────────────────────────────────────────────────────────

describe('formatBonusRate', () => {
  it('formats a simple rate without unnecessary decimals', () => {
    expect(formatBonusRate(0.01)).toBe('+1%/day');
  });

  it('formats a fractional rate', () => {
    expect(formatBonusRate(0.005)).toBe('+0.5%/day');
  });

  it('formats a rate with two meaningful decimal places', () => {
    expect(formatBonusRate(0.0015)).toBe('+0.15%/day');
  });

  it('trims trailing zeros', () => {
    expect(formatBonusRate(0.02)).toBe('+2%/day');
  });
});

// ─── formatBaseRate ───────────────────────────────────────────────────────────

describe('formatBaseRate', () => {
  it('formats integer percent correctly', () => {
    expect(formatBaseRate(0.01)).toBe('1%/day');
  });

  it('formats fractional percent correctly', () => {
    expect(formatBaseRate(0.005)).toBe('0.5%/day');
  });

  it('trims trailing zeros', () => {
    expect(formatBaseRate(0.02)).toBe('2%/day');
  });
});

// ─── formatEffectiveRateDisplay ───────────────────────────────────────────────

describe('formatEffectiveRateDisplay', () => {
  it('shows only base label when no promotion', () => {
    const result = formatEffectiveRateDisplay(0.01, null);
    expect(result.baseLabel).toBe('1%/day');
    expect(result.bonusLabel).toBeNull();
    expect(result.effectiveLabel).toBe('1%/day');
  });

  it('shows all three labels with a promotion', () => {
    const promo = makePromotion({ bonus_rate_daily: 0.005 });
    const result = formatEffectiveRateDisplay(0.01, promo);
    expect(result.baseLabel).toBe('1%/day');
    expect(result.bonusLabel).toBe('+0.5%/day');
    expect(result.effectiveLabel).toBe('1.5%/day');
  });

  it('reflects the promotion bonus in the effective label', () => {
    const promo = makePromotion({ bonus_rate_daily: 0.02 });
    const result = formatEffectiveRateDisplay(0.01, promo);
    expect(result.effectiveLabel).toBe('3%/day');
  });
});
