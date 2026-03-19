/**
 * Tests for src/lib/email-digest.ts
 *
 * Covers:
 *   buildDigestEmail:
 *     - Subject line includes month name and child names
 *     - Preview text includes total interest and balance
 *     - HTML body contains greeting, family totals, per-child rows
 *     - Text body contains formatted summary lines
 *     - Handles children with no activity gracefully
 *     - Chore earnings, donations, savings rate shown when non-zero
 *     - Multiple children all appear in output
 *
 *   sendMonthlyDigest:
 *     - Returns dryRun=true when RESEND_API_KEY is not set
 *     - Returns sent=true on successful Resend API call
 *     - Returns error string on Resend API failure
 *     - Returns error string on network failure
 *     - Passes correct from/to/subject to Resend
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildDigestEmail, sendMonthlyDigest, type DigestInput } from './email-digest';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeTx(overrides: Partial<{
  id: string;
  child_id: string;
  type: string;
  amount_cents: number;
  balance_after: number;
  status: string;
  created_at: string;
  description: string;
}> = {}): import('@/types/database').Transaction {
  return {
    id: overrides.id ?? 'tx-1',
    child_id: overrides.child_id ?? 'child-1',
    type: overrides.type ?? 'interest',
    amount_cents: overrides.amount_cents ?? 100,
    balance_after: overrides.balance_after ?? 10100,
    status: overrides.status ?? 'completed',
    created_at: overrides.created_at ?? '2026-03-15T10:00:00.000Z',
    description: overrides.description ?? null,
  } as never;
}

const baseInput: DigestInput = {
  parentEmail: 'parent@example.com',
  parentName: 'Alice',
  children: [
    {
      id: 'child-1',
      name: 'Emma',
      balanceCents: 15000,
      transactions: [
        makeTx({ type: 'interest', amount_cents: 250, balance_after: 10250 }),
        makeTx({ id: 'tx-2', type: 'deposit', amount_cents: 5000, balance_after: 15250 }),
      ],
    },
  ],
  year: 2026,
  month: 3, // March
};

const twoChildInput: DigestInput = {
  ...baseInput,
  children: [
    baseInput.children[0],
    {
      id: 'child-2',
      name: 'Liam',
      balanceCents: 8000,
      transactions: [
        makeTx({ id: 'tx-3', child_id: 'child-2', type: 'interest', amount_cents: 80, balance_after: 8080 }),
      ],
    },
  ],
};

// ─── buildDigestEmail ────────────────────────────────────────────────────────

describe('buildDigestEmail', () => {
  describe('subject line', () => {
    it('includes the month name', () => {
      const { subject } = buildDigestEmail(baseInput);
      expect(subject).toContain('March');
    });

    it('includes the year', () => {
      const { subject } = buildDigestEmail(baseInput);
      expect(subject).toContain('2026');
    });

    it('includes the child name', () => {
      const { subject } = buildDigestEmail(baseInput);
      expect(subject).toContain('Emma');
    });

    it('includes all child names when multiple children', () => {
      const { subject } = buildDigestEmail(twoChildInput);
      expect(subject).toContain('Emma');
      expect(subject).toContain('Liam');
    });
  });

  describe('preview text', () => {
    it('mentions interest earned', () => {
      const { previewText } = buildDigestEmail(baseInput);
      expect(previewText).toMatch(/interest/i);
    });

    it('mentions total balance', () => {
      const { previewText } = buildDigestEmail(baseInput);
      expect(previewText).toMatch(/savings|balance/i);
    });
  });

  describe('HTML body', () => {
    it('includes greeting with parent name', () => {
      const { htmlBody } = buildDigestEmail(baseInput);
      expect(htmlBody).toContain('Alice');
    });

    it('includes month and year in header', () => {
      const { htmlBody } = buildDigestEmail(baseInput);
      expect(htmlBody).toContain('March 2026');
    });

    it('includes child name in breakdown table', () => {
      const { htmlBody } = buildDigestEmail(baseInput);
      expect(htmlBody).toContain('Emma');
    });

    it('includes dashboard link', () => {
      const { htmlBody } = buildDigestEmail(baseInput);
      expect(htmlBody).toContain('dashboard');
    });

    it('uses custom appBaseUrl when provided', () => {
      const { htmlBody } = buildDigestEmail({ ...baseInput, appBaseUrl: 'https://myapp.com' });
      expect(htmlBody).toContain('myapp.com');
    });

    it('falls back to growbucks.app when no appBaseUrl', () => {
      const { htmlBody } = buildDigestEmail(baseInput);
      expect(htmlBody).toContain('growbucks.app');
    });

    it('includes all children in breakdown table', () => {
      const { htmlBody } = buildDigestEmail(twoChildInput);
      expect(htmlBody).toContain('Emma');
      expect(htmlBody).toContain('Liam');
    });

    it('shows "No activity" for child with no transactions', () => {
      const noActivityInput: DigestInput = {
        ...baseInput,
        children: [{ id: 'child-1', name: 'Emma', balanceCents: 5000, transactions: [] }],
      };
      const { htmlBody } = buildDigestEmail(noActivityInput);
      expect(htmlBody).toMatch(/no activity/i);
    });

    it('is valid HTML with doctype', () => {
      const { htmlBody } = buildDigestEmail(baseInput);
      expect(htmlBody.trimStart()).toMatch(/^<!DOCTYPE html>/i);
    });
  });

  describe('text body', () => {
    it('includes parent name greeting', () => {
      const { textBody } = buildDigestEmail(baseInput);
      expect(textBody).toContain('Alice');
    });

    it('includes month name', () => {
      const { textBody } = buildDigestEmail(baseInput);
      expect(textBody).toContain('March');
    });

    it('includes child name', () => {
      const { textBody } = buildDigestEmail(baseInput);
      expect(textBody).toContain('Emma');
    });

    it('includes family totals section', () => {
      const { textBody } = buildDigestEmail(baseInput);
      expect(textBody).toMatch(/family totals/i);
    });

    it('includes dashboard URL', () => {
      const { textBody } = buildDigestEmail(baseInput);
      expect(textBody).toMatch(/dashboard/i);
    });

    it('includes settings unsubscribe link', () => {
      const { textBody } = buildDigestEmail(baseInput);
      expect(textBody).toMatch(/settings/i);
    });

    it('shows no activity for child with no transactions', () => {
      const noActivityInput: DigestInput = {
        ...baseInput,
        children: [{ id: 'child-1', name: 'Emma', balanceCents: 5000, transactions: [] }],
      };
      const { textBody } = buildDigestEmail(noActivityInput);
      expect(textBody).toMatch(/no activity/i);
    });
  });

  describe('chore earnings and donations', () => {
    it('shows chore earnings when non-zero', () => {
      const choreInput: DigestInput = {
        ...baseInput,
        children: [{
          ...baseInput.children[0],
          transactions: [
            // isChoreEarning checks description for 'chore', 'job', or 'earn'
            makeTx({ type: 'deposit', amount_cents: 500, balance_after: 15500, description: 'Chore reward: dishes' }),
          ],
        }],
      };
      const { textBody } = buildDigestEmail(choreInput);
      expect(textBody).toMatch(/chore earnings/i);
    });

    it('shows donation when non-zero', () => {
      const donationInput: DigestInput = {
        ...baseInput,
        children: [{
          ...baseInput.children[0],
          transactions: [
            makeTx({ type: 'donation', amount_cents: -300, balance_after: 9700 }),
          ],
        }],
      };
      const { textBody } = buildDigestEmail(donationInput);
      expect(textBody).toMatch(/donat/i);
    });
  });

  describe('month edge cases', () => {
    it('generates January subject correctly', () => {
      const { subject } = buildDigestEmail({ ...baseInput, month: 1 });
      expect(subject).toContain('January');
    });

    it('generates December subject correctly', () => {
      const { subject } = buildDigestEmail({ ...baseInput, month: 12 });
      expect(subject).toContain('December');
    });
  });
});

// ─── sendMonthlyDigest ───────────────────────────────────────────────────────

describe('sendMonthlyDigest', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it('returns dryRun=true and sent=false when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendMonthlyDigest(baseInput);
    expect(result.dryRun).toBe(true);
    expect(result.sent).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns built email content even in dry-run mode', async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendMonthlyDigest(baseInput);
    expect(result.subject).toContain('March');
    expect(result.textBody).toContain('Alice');
    expect(result.htmlBody).toBeTruthy();
  });

  it('returns sent=true on successful Resend API call', async () => {
    process.env.RESEND_API_KEY = 'test-key-123';
    vi.mocked(fetch).mockResolvedValue(new Response('{"id":"email-1"}', { status: 200 }));

    const result = await sendMonthlyDigest(baseInput);
    expect(result.sent).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it('calls Resend API with correct endpoint', async () => {
    process.env.RESEND_API_KEY = 'test-key-123';
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }));

    await sendMonthlyDigest(baseInput);

    expect(fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.any(Object)
    );
  });

  it('sends Authorization header with Bearer token', async () => {
    process.env.RESEND_API_KEY = 'test-key-abc';
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }));

    await sendMonthlyDigest(baseInput);

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-key-abc');
  });

  it('sends to correct recipient email', async () => {
    process.env.RESEND_API_KEY = 'test-key-123';
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }));

    await sendMonthlyDigest(baseInput);

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.to).toContain('parent@example.com');
  });

  it('returns sent=false and error on Resend API failure', async () => {
    process.env.RESEND_API_KEY = 'test-key-123';
    vi.mocked(fetch).mockResolvedValue(new Response('Invalid API key', { status: 401 }));

    const result = await sendMonthlyDigest(baseInput);
    expect(result.sent).toBe(false);
    expect(result.error).toMatch(/401/);
  });

  it('returns sent=false and error on network failure', async () => {
    process.env.RESEND_API_KEY = 'test-key-123';
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await sendMonthlyDigest(baseInput);
    expect(result.sent).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('uses DIGEST_FROM_EMAIL env var for from address', async () => {
    process.env.RESEND_API_KEY = 'test-key-123';
    process.env.DIGEST_FROM_EMAIL = 'noreply@custom.com';
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }));

    await sendMonthlyDigest(baseInput);

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.from).toContain('custom.com');

    delete process.env.DIGEST_FROM_EMAIL;
  });

  it('falls back to default from address when DIGEST_FROM_EMAIL not set', async () => {
    process.env.RESEND_API_KEY = 'test-key-123';
    delete process.env.DIGEST_FROM_EMAIL;
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }));

    await sendMonthlyDigest(baseInput);

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.from).toContain('growbucks');
  });
});
