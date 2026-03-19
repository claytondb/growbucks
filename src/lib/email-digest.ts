/**
 * GrowBucks Monthly Email Digest
 *
 * Generates and sends a monthly financial summary email to parents.
 * Uses the Resend API (set RESEND_API_KEY env var to enable).
 *
 * The digest includes:
 *   - A per-child month-by-month summary line
 *   - Family totals for the month
 *   - Best-performing child callout
 *   - Total interest earned across all children
 *   - A link back to the dashboard
 *
 * Call `sendMonthlyDigest` from a cron route or admin trigger.
 * Falls back gracefully when RESEND_API_KEY is not set (returns dry-run result).
 */

import {
  computeFamilyMonthlySummary,
  computeChildMonthlySummaries,
  formatMonthlySummaryLine,
  type FamilyMonthlySummary,
  type ChildMonthlySummaries,
  type MonthlySummary,
} from './monthly-summary';
import type { Transaction } from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DigestChild {
  id: string;
  name: string;
  balanceCents: number;
  transactions: Transaction[];
}

export interface DigestInput {
  parentEmail: string;
  parentName: string;
  children: DigestChild[];
  year: number;
  /** 1-indexed month to summarize (1 = January) */
  month: number;
  /** Base URL for the dashboard link (e.g. https://growbucks.app) */
  appBaseUrl?: string;
}

export interface DigestResult {
  sent: boolean;
  dryRun: boolean;
  subject: string;
  previewText: string;
  htmlBody: string;
  textBody: string;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function cents(n: number): string {
  return '$' + (n / 100).toFixed(2);
}

function ratePercent(rate: number): string {
  return (rate * 100).toFixed(1) + '%';
}

// ─── Email generation ─────────────────────────────────────────────────────────

/**
 * Build the email content for a single parent's monthly digest.
 * Pure function — does not send anything.
 */
export function buildDigestEmail(input: DigestInput): Pick<DigestResult, 'subject' | 'previewText' | 'htmlBody' | 'textBody'> {
  const { parentName, children, year, month } = input;
  const monthName = MONTH_NAMES[month - 1];
  const appUrl = input.appBaseUrl ?? 'https://growbucks.app';

  // Build per-child monthly summaries
  // computeChildMonthlySummaries(childId, childName, year, transactions, startingBalance?)
  const childSummaries: Array<{ name: string; summary: MonthlySummary | null; allMonths: ChildMonthlySummaries }> = [];
  for (const child of children) {
    const allMonths = computeChildMonthlySummaries(child.id, child.name, year, child.transactions);
    const monthSummary = allMonths.months.find((m) => m.month === month) ?? null;
    childSummaries.push({ name: child.name, summary: monthSummary, allMonths });
  }

  // Family totals
  // computeFamilyMonthlySummary(year, children, transactionsByChild)
  const transactionsByChild = new Map<string, Transaction[]>();
  for (const child of children) {
    transactionsByChild.set(child.id, child.transactions);
  }
  const familySummary: FamilyMonthlySummary = computeFamilyMonthlySummary(
    year,
    children.map((c) => ({ id: c.id, name: c.name })),
    transactionsByChild,
  );

  // Sum up family-level totals for the target month from children
  const totalInterestCents = childSummaries.reduce((sum, { summary }) => sum + (summary?.interestCents ?? 0), 0);
  const totalDepositCents = childSummaries.reduce((sum, { summary }) => sum + (summary?.totalDepositCents ?? 0), 0);
  const totalBalanceCents = children.reduce((sum, c) => sum + c.balanceCents, 0);

  const subject = `GrowBucks ${monthName} ${year} Summary — ${children.map((c) => c.name).join(', ')}`;
  const previewText = `Your family earned ${cents(totalInterestCents)} in interest last month. Total savings: ${cents(totalBalanceCents)}.`;

  // ─── Text body ───────────────────────────────────────────────────────────

  const textLines: string[] = [
    `Hi ${parentName}!`,
    '',
    `Here's your GrowBucks summary for ${monthName} ${year}.`,
    '',
    '─────────────────────────────────────',
    'FAMILY TOTALS',
    '─────────────────────────────────────',
    `Total interest earned:  ${cents(totalInterestCents)}`,
    `Total deposits:         ${cents(totalDepositCents)}`,
    `Combined balance:       ${cents(totalBalanceCents)}`,
    '',
  ];

  for (const { name, summary } of childSummaries) {
    textLines.push(`── ${name} ──`);
    if (!summary || summary.transactionCount === 0) {
      textLines.push('No activity this month.');
    } else {
      textLines.push(formatMonthlySummaryLine(summary));
      if (summary.choreEarningsCents > 0) {
        textLines.push(`  Chore earnings: ${cents(summary.choreEarningsCents)}`);
      }
      if (summary.donationCents > 0) {
        textLines.push(`  Donated: ${cents(summary.donationCents)}`);
      }
      if (summary.savingsRate > 0) {
        textLines.push(`  Savings rate: ${ratePercent(summary.savingsRate)}`);
      }
      textLines.push(`  Ending balance: ${cents(summary.endingBalanceCents)}`);
    }
    textLines.push('');
  }

  textLines.push(`View your dashboard: ${appUrl}/dashboard`);
  textLines.push('');
  textLines.push('— The GrowBucks Team');
  textLines.push('');
  textLines.push('You are receiving this because you have a GrowBucks account.');
  textLines.push(`Manage your email preferences at ${appUrl}/dashboard/settings`);

  const textBody = textLines.join('\n');

  // ─── HTML body ───────────────────────────────────────────────────────────

  const childRowsHtml = childSummaries.map(({ name, summary }) => {
    if (!summary || summary.transactionCount === 0) {
      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;">
            <strong>${name}</strong>
          </td>
          <td colspan="4" style="padding:12px 16px;border-bottom:1px solid #f0f0f0;color:#999;font-size:14px;">
            No activity this month
          </td>
        </tr>`;
    }

    return `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-weight:600;">${name}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;text-align:right;color:#16a34a;">${cents(summary.interestCents)}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;text-align:right;">${cents(summary.totalDepositCents)}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;text-align:right;color:#2563eb;font-weight:600;">${cents(summary.endingBalanceCents)}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;text-align:right;color:#6b7280;font-size:13px;">${ratePercent(summary.savingsRate)}</td>
      </tr>`;
  }).join('');

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GrowBucks ${monthName} Summary</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 32px 24px;text-align:center;">
              <div style="font-size:32px;margin-bottom:8px;">🌱</div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">GrowBucks</h1>
              <p style="margin:8px 0 0;color:#bbf7d0;font-size:15px;">${monthName} ${year} Family Summary</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 32px 0;">
              <p style="margin:0;font-size:16px;color:#374151;">Hi <strong>${parentName}</strong>! 👋</p>
              <p style="margin:12px 0 0;font-size:15px;color:#6b7280;line-height:1.6;">
                Here's how your family's savings grew in ${monthName} ${year}.
              </p>
            </td>
          </tr>

          <!-- Family totals -->
          <tr>
            <td style="padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;text-align:center;border-right:1px solid #dcfce7;">
                    <div style="font-size:22px;font-weight:700;color:#16a34a;">${cents(totalInterestCents)}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;">Interest Earned</div>
                  </td>
                  <td style="padding:16px 20px;text-align:center;border-right:1px solid #dcfce7;">
                    <div style="font-size:22px;font-weight:700;color:#374151;">${cents(totalDepositCents)}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;">Deposits</div>
                  </td>
                  <td style="padding:16px 20px;text-align:center;">
                    <div style="font-size:22px;font-weight:700;color:#2563eb;">${cents(totalBalanceCents)}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;">Total Balance</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Per-child breakdown -->
          <tr>
            <td style="padding:0 32px 24px;">
              <h2 style="margin:0 0 16px;font-size:16px;font-weight:600;color:#374151;">Per-Child Breakdown</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:14px;">
                <thead>
                  <tr style="background:#f9fafb;">
                    <th style="padding:10px 16px;text-align:left;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Child</th>
                    <th style="padding:10px 16px;text-align:right;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Interest</th>
                    <th style="padding:10px 16px;text-align:right;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Deposits</th>
                    <th style="padding:10px 16px;text-align:right;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Balance</th>
                    <th style="padding:10px 16px;text-align:right;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Savings %</th>
                  </tr>
                </thead>
                <tbody>
                  ${childRowsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 32px;text-align:center;">
              <a href="${appUrl}/dashboard"
                 style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
                View Dashboard →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #f0f0f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                You're receiving this because you have a GrowBucks account.<br/>
                <a href="${appUrl}/dashboard/settings" style="color:#6b7280;">Manage email preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, previewText, htmlBody, textBody };
}

// ─── Email sender ─────────────────────────────────────────────────────────────

/**
 * Send a monthly digest email via Resend.
 * Returns a DigestResult with sent=false and dryRun=true when no API key is set.
 */
export async function sendMonthlyDigest(input: DigestInput): Promise<DigestResult> {
  const { subject, previewText, htmlBody, textBody } = buildDigestEmail(input);

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.DIGEST_FROM_EMAIL ?? 'GrowBucks <digest@growbucks.app>';

  if (!apiKey) {
    return {
      sent: false,
      dryRun: true,
      subject,
      previewText,
      htmlBody,
      textBody,
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [input.parentEmail],
        subject,
        html: htmlBody,
        text: textBody,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        sent: false,
        dryRun: false,
        subject,
        previewText,
        htmlBody,
        textBody,
        error: `Resend API error ${response.status}: ${errorBody}`,
      };
    }

    return {
      sent: true,
      dryRun: false,
      subject,
      previewText,
      htmlBody,
      textBody,
    };
  } catch (err) {
    return {
      sent: false,
      dryRun: false,
      subject,
      previewText,
      htmlBody,
      textBody,
      error: err instanceof Error ? err.message : 'Unknown send error',
    };
  }
}
