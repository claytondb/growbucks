/**
 * Tests for src/lib/gift-notification.ts
 *
 * Covers:
 *   buildGiftNotificationEmail:
 *     - Subject includes giver name and child name
 *     - HTML body contains gift amount, giver name, child name
 *     - HTML body contains pending-approval notice
 *     - HTML body shows giver message block when provided
 *     - HTML body omits message block when giverMessage is null/undefined
 *     - Text body contains review dashboard link
 *     - Text body includes giver message when provided
 *     - Text body omits giver message line when absent
 *     - Correctly formats cents as dollar strings
 *     - Escapes HTML special characters safely
 *
 *   sendGiftNotification:
 *     - Returns dryRun=true when RESEND_API_KEY is not set
 *     - Returns sent=true on successful Resend call
 *     - Returns error string on Resend API failure
 *     - Returns error string on network failure
 *     - Uses GIFT_NOTIFY_FROM_EMAIL when set
 *     - Falls back to DIGEST_FROM_EMAIL when GIFT_NOTIFY_FROM_EMAIL absent
 *     - Falls back to default from address when neither env var is set
 *     - Passes correct to/subject/html/text to Resend
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildGiftNotificationEmail,
  sendGiftNotification,
  type GiftSubmittedInput,
} from './gift-notification';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseInput: GiftSubmittedInput = {
  parentEmail: 'parent@example.com',
  parentName: 'David',
  childName: 'Emma',
  amountCents: 2500,
  giverName: 'Grandma',
  linkLabel: 'Birthday Gift Link',
  appBaseUrl: 'https://growbucks.app',
};

// ─── buildGiftNotificationEmail ───────────────────────────────────────────────

describe('buildGiftNotificationEmail', () => {
  it('subject includes giver name and child name', () => {
    const { subject } = buildGiftNotificationEmail(baseInput);
    expect(subject).toContain('Grandma');
    expect(subject).toContain('Emma');
  });

  it('subject includes gift emoji', () => {
    const { subject } = buildGiftNotificationEmail(baseInput);
    expect(subject).toContain('🎁');
  });

  it('HTML body contains formatted gift amount', () => {
    const { htmlBody } = buildGiftNotificationEmail(baseInput);
    expect(htmlBody).toContain('$25.00');
  });

  it('HTML body contains giver name', () => {
    const { htmlBody } = buildGiftNotificationEmail(baseInput);
    expect(htmlBody).toContain('Grandma');
  });

  it('HTML body contains child name', () => {
    const { htmlBody } = buildGiftNotificationEmail(baseInput);
    expect(htmlBody).toContain('Emma');
  });

  it('HTML body contains link label', () => {
    const { htmlBody } = buildGiftNotificationEmail(baseInput);
    expect(htmlBody).toContain('Birthday Gift Link');
  });

  it('HTML body contains pending-approval notice', () => {
    const { htmlBody } = buildGiftNotificationEmail(baseInput);
    expect(htmlBody.toLowerCase()).toContain('pending');
    expect(htmlBody.toLowerCase()).toContain('approval');
  });

  it('HTML body contains review CTA button', () => {
    const { htmlBody } = buildGiftNotificationEmail(baseInput);
    expect(htmlBody).toContain('Review Gift');
    expect(htmlBody).toContain('https://growbucks.app/dashboard');
  });

  it('HTML body includes message block when giverMessage is provided', () => {
    const input: GiftSubmittedInput = { ...baseInput, giverMessage: 'Happy birthday sweetie!' };
    const { htmlBody } = buildGiftNotificationEmail(input);
    expect(htmlBody).toContain('Happy birthday sweetie!');
  });

  it('HTML body omits message block when giverMessage is null', () => {
    const input: GiftSubmittedInput = { ...baseInput, giverMessage: null };
    const { htmlBody } = buildGiftNotificationEmail(input);
    expect(htmlBody).not.toContain('font-style:italic');
  });

  it('HTML body omits message block when giverMessage is undefined', () => {
    const { htmlBody } = buildGiftNotificationEmail(baseInput); // no giverMessage
    expect(htmlBody).not.toContain('font-style:italic');
  });

  it('text body contains gift amount', () => {
    const { textBody } = buildGiftNotificationEmail(baseInput);
    expect(textBody).toContain('$25.00');
  });

  it('text body contains review link', () => {
    const { textBody } = buildGiftNotificationEmail(baseInput);
    expect(textBody).toContain('https://growbucks.app/dashboard');
  });

  it('text body includes giver message when provided', () => {
    const input: GiftSubmittedInput = { ...baseInput, giverMessage: 'Love you!' };
    const { textBody } = buildGiftNotificationEmail(input);
    expect(textBody).toContain('Love you!');
  });

  it('text body omits message line when giverMessage is absent', () => {
    const { textBody } = buildGiftNotificationEmail(baseInput);
    expect(textBody).not.toContain('Message from');
  });

  it('correctly formats $1.00', () => {
    const { htmlBody } = buildGiftNotificationEmail({ ...baseInput, amountCents: 100 });
    expect(htmlBody).toContain('$1.00');
  });

  it('correctly formats $1,000.00', () => {
    const { htmlBody } = buildGiftNotificationEmail({ ...baseInput, amountCents: 100_000 });
    expect(htmlBody).toContain('$1000.00');
  });

  it('escapes HTML special chars in giverName', () => {
    const input: GiftSubmittedInput = { ...baseInput, giverName: '<script>alert(1)</script>' };
    const { htmlBody } = buildGiftNotificationEmail(input);
    expect(htmlBody).not.toContain('<script>');
    expect(htmlBody).toContain('&lt;script&gt;');
  });

  it('escapes HTML special chars in giverMessage', () => {
    const input: GiftSubmittedInput = { ...baseInput, giverMessage: '<b>test</b>' };
    const { htmlBody } = buildGiftNotificationEmail(input);
    expect(htmlBody).not.toContain('<b>test</b>');
    expect(htmlBody).toContain('&lt;b&gt;test&lt;/b&gt;');
  });

  it('uses default app URL when appBaseUrl is not provided', () => {
    const { htmlBody, textBody } = buildGiftNotificationEmail({
      ...baseInput,
      appBaseUrl: undefined,
    });
    expect(htmlBody).toContain('https://growbucks.app');
    expect(textBody).toContain('https://growbucks.app');
  });

  it('uses custom appBaseUrl when provided', () => {
    const { htmlBody } = buildGiftNotificationEmail({
      ...baseInput,
      appBaseUrl: 'https://staging.growbucks.app',
    });
    expect(htmlBody).toContain('https://staging.growbucks.app');
  });
});

// ─── sendGiftNotification ─────────────────────────────────────────────────────

describe('sendGiftNotification', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('returns dryRun=true and sent=false when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendGiftNotification(baseInput);
    expect(result.dryRun).toBe(true);
    expect(result.sent).toBe(false);
    expect(result.subject).toContain('Grandma');
  });

  it('returns dryRun=false and sent=true on successful Resend call', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: async () => '' } as Response),
    );

    const result = await sendGiftNotification(baseInput);
    expect(result.sent).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it('returns error string on Resend API failure', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => 'Invalid email',
      } as unknown as Response),
    );

    const result = await sendGiftNotification(baseInput);
    expect(result.sent).toBe(false);
    expect(result.dryRun).toBe(false);
    expect(result.error).toContain('422');
    expect(result.error).toContain('Invalid email');
  });

  it('returns error string on network failure', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await sendGiftNotification(baseInput);
    expect(result.sent).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('sends to the correct email address', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '' } as Response);
    vi.stubGlobal('fetch', mockFetch);

    await sendGiftNotification(baseInput);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.to).toEqual(['parent@example.com']);
  });

  it('passes correct subject to Resend', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '' } as Response);
    vi.stubGlobal('fetch', mockFetch);

    await sendGiftNotification(baseInput);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subject).toContain('Grandma');
    expect(body.subject).toContain('Emma');
  });

  it('uses GIFT_NOTIFY_FROM_EMAIL when set', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.GIFT_NOTIFY_FROM_EMAIL = 'gifts@myapp.com';
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '' } as Response);
    vi.stubGlobal('fetch', mockFetch);

    await sendGiftNotification(baseInput);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.from).toBe('gifts@myapp.com');

    delete process.env.GIFT_NOTIFY_FROM_EMAIL;
  });

  it('falls back to DIGEST_FROM_EMAIL when GIFT_NOTIFY_FROM_EMAIL is absent', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    delete process.env.GIFT_NOTIFY_FROM_EMAIL;
    process.env.DIGEST_FROM_EMAIL = 'digest@myapp.com';
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '' } as Response);
    vi.stubGlobal('fetch', mockFetch);

    await sendGiftNotification(baseInput);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.from).toBe('digest@myapp.com');

    delete process.env.DIGEST_FROM_EMAIL;
  });

  it('uses default from address when no env vars are set', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    delete process.env.GIFT_NOTIFY_FROM_EMAIL;
    delete process.env.DIGEST_FROM_EMAIL;
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '' } as Response);
    vi.stubGlobal('fetch', mockFetch);

    await sendGiftNotification(baseInput);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.from).toContain('GrowBucks');
  });

  it('includes html and text bodies in the Resend payload', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '' } as Response);
    vi.stubGlobal('fetch', mockFetch);

    await sendGiftNotification(baseInput);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.html).toBeTruthy();
    expect(body.text).toBeTruthy();
  });
});
