/**
 * GrowBucks Gift Notification Emails
 *
 * Sends a transactional email to the parent whenever a relative
 * submits a gift via a Gift Link (before the parent approves it).
 *
 * Why this matters:
 *   Parents don't always have the dashboard open. This email lets
 *   them know Grandma sent $25 for Emma's birthday — so they can
 *   review it promptly without leaving the gift-giver waiting.
 *
 * Uses the Resend API (RESEND_API_KEY env var).
 * Falls back gracefully (no error thrown) when the key is absent.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GiftSubmittedInput {
  /** Parent's email address */
  parentEmail: string;
  /** Parent's display name (e.g. "David") */
  parentName: string;
  /** Child's first name */
  childName: string;
  /** Gift amount in cents */
  amountCents: number;
  /** Name entered by the gift giver */
  giverName: string;
  /** Optional message from the giver */
  giverMessage?: string | null;
  /** The gift link label (e.g. "Birthday Gift Link") */
  linkLabel: string;
  /** Base URL for the dashboard (e.g. https://growbucks.app) */
  appBaseUrl?: string;
}

export interface GiftNotificationResult {
  sent: boolean;
  dryRun: boolean;
  subject: string;
  htmlBody: string;
  textBody: string;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cents(n: number): string {
  return '$' + (n / 100).toFixed(2);
}

// ─── Email builder ────────────────────────────────────────────────────────────

/**
 * Build the email content for a gift-submitted notification.
 * Pure function — does not send anything.
 */
export function buildGiftNotificationEmail(
  input: GiftSubmittedInput,
): Pick<GiftNotificationResult, 'subject' | 'htmlBody' | 'textBody'> {
  const { parentName, childName, amountCents, giverName, giverMessage, linkLabel } = input;
  const appUrl = input.appBaseUrl ?? 'https://growbucks.app';
  const dashboardUrl = `${appUrl}/dashboard`;

  const subject = `🎁 ${giverName} sent a gift for ${childName}!`;

  // ─── Plain text ────────────────────────────────────────────────────────────

  const textLines: string[] = [
    `Hi ${parentName}!`,
    '',
    `Great news — ${giverName} just submitted a gift of ${cents(amountCents)} for ${childName} through your "${linkLabel}" link.`,
    '',
    'This gift is currently PENDING — it won\'t be added to their balance until you approve it.',
    '',
    giverMessage ? `Message from ${giverName}: "${giverMessage}"` : null,
    giverMessage ? '' : null,
    `Review and approve here: ${dashboardUrl}`,
    '',
    '— The GrowBucks Team',
    '',
    `Manage your notification preferences at ${dashboardUrl}/settings`,
  ].filter((line): line is string => line !== null);

  const textBody = textLines.join('\n');

  // ─── HTML ──────────────────────────────────────────────────────────────────

  const messageBlock = giverMessage
    ? `
      <div style="background:#F8F9FA;border-left:4px solid #2ECC71;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:14px;color:#5D6D7E;font-style:italic;">"${escapeHtml(giverMessage)}"</p>
        <p style="margin:6px 0 0;font-size:12px;color:#95A5A6;">— ${escapeHtml(giverName)}</p>
      </div>`
    : '';

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#2ECC71;border-radius:14px;padding:10px 14px;">
                    <span style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">🌱 GrowBucks</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);padding:32px;">

              <!-- Gift icon -->
              <p style="text-align:center;font-size:48px;margin:0 0 16px;">🎁</p>

              <!-- Headline -->
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#2C3E50;text-align:center;">
                Gift pending for ${escapeHtml(childName)}!
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#7F8C8D;text-align:center;">
                A gift just arrived through your <strong style="color:#2C3E50;">${escapeHtml(linkLabel)}</strong> link.
              </p>

              <!-- Amount highlight -->
              <div style="background:linear-gradient(135deg,#2ECC71,#27AE60);border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.5px;">Gift Amount</p>
                <p style="margin:0;font-size:36px;font-weight:900;color:#fff;font-family:ui-monospace,'Courier New',monospace;">${cents(amountCents)}</p>
                <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">from ${escapeHtml(giverName)} → ${escapeHtml(childName)}</p>
              </div>

              ${messageBlock}

              <!-- Pending notice -->
              <div style="background:#FFF9E6;border:1px solid #F39C12;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#856404;">
                  ⏳ <strong>Awaiting your approval.</strong> This gift won't be added to ${escapeHtml(childName)}'s balance until you review it.
                </p>
              </div>

              <!-- CTA -->
              <div style="text-align:center;">
                <a href="${dashboardUrl}"
                   style="display:inline-block;background:#2ECC71;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.2px;">
                  Review Gift →
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#BDC3C7;">
                You're receiving this because someone submitted a gift on your GrowBucks account.<br/>
                <a href="${dashboardUrl}/settings" style="color:#95A5A6;">Manage notification preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, htmlBody, textBody };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ─── Email sender ─────────────────────────────────────────────────────────────

/**
 * Send a gift-submitted notification email via Resend.
 * Returns dryRun=true (no error) when RESEND_API_KEY is not configured.
 */
export async function sendGiftNotification(
  input: GiftSubmittedInput,
): Promise<GiftNotificationResult> {
  const { subject, htmlBody, textBody } = buildGiftNotificationEmail(input);

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.GIFT_NOTIFY_FROM_EMAIL
    ?? process.env.DIGEST_FROM_EMAIL
    ?? 'GrowBucks <notifications@growbucks.app>';

  if (!apiKey) {
    return { sent: false, dryRun: true, subject, htmlBody, textBody };
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
        htmlBody,
        textBody,
        error: `Resend API error ${response.status}: ${errorBody}`,
      };
    }

    return { sent: true, dryRun: false, subject, htmlBody, textBody };
  } catch (err) {
    return {
      sent: false,
      dryRun: false,
      subject,
      htmlBody,
      textBody,
      error: err instanceof Error ? err.message : 'Unknown send error',
    };
  }
}
