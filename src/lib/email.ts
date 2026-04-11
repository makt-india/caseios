/**
 * CASEIOS — Production Email Service (Resend)
 *
 * All functions:
 *  - Return { success: boolean; messageId?: string; error?: string }
 *  - Never throw — errors are caught, logged, and returned as failure status
 *  - Retry up to MAX_RETRIES times with exponential backoff on transient failures
 *  - Are safe to call fire-and-forget via .catch() in API routes
 *
 * Required env:
 *   RESEND_API_KEY   — Resend API key (re_xxxx)
 *   RESEND_FROM      — Sender address, e.g. "CASEIOS <orders@yourdomain.com>"
 *                      Falls back to "CASEIOS <onboarding@resend.dev>" for dev/test
 */

import { Resend } from "resend";

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500; // doubles each retry: 500ms → 1s → 2s

/** NON-RETRIABLE Resend HTTP status codes */
const FATAL_STATUS_CODES = new Set([400, 401, 403, 422]);

// ─── Support contact (read once at module init) ───────────────────────────────

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "makt.in.help@gmail.com";
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+91 8883335553";

// ─── Singleton ────────────────────────────────────────────────────────────────

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("[EMAIL CONFIG] RESEND_API_KEY is not set. Emails cannot be sent.");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

function getFrom(): string {
  return process.env.RESEND_FROM ?? "CASEIOS <onboarding@resend.dev>";
}

// ─── Return type ──────────────────────────────────────────────────────────────

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Retry engine ─────────────────────────────────────────────────────────────

/**
 * Sends one email payload through Resend with automatic exponential-backoff
 * retries for transient failures (5xx, network errors).
 * Fatal HTTP errors (4xx) are NOT retried.
 */
async function sendWithRetry(payload: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<EmailResult> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resend = getResend();
      const { data, error } = await resend.emails.send({
        ...payload,
        replyTo: payload.replyTo ?? SUPPORT_EMAIL,
      });

      if (error) {
        // Resend returns structured errors — check if retriable
        const statusCode = (error as any).statusCode ?? 0;

        if (FATAL_STATUS_CODES.has(statusCode)) {
          console.error(
            `[EMAIL FATAL] Non-retriable error (HTTP ${statusCode}) sending to ${payload.to[0]}:`,
            { message: error.message, name: error.name }
          );
          return { success: false, error: error.message };
        }

        // Transient — fall through to retry
        lastError = error;
        console.warn(
          `[EMAIL RETRY] Attempt ${attempt}/${MAX_RETRIES} failed for ${payload.to[0]} (HTTP ${statusCode}): ${error.message}`
        );
      } else if (data?.id) {
        if (attempt > 1) {
          console.info(
            `[EMAIL OK] Sent after ${attempt} attempts — messageId: ${data.id} → ${payload.to[0]}`
          );
        } else {
          console.info(`[EMAIL OK] messageId: ${data.id} → ${payload.to[0]}`);
        }
        return { success: true, messageId: data.id };
      } else {
        // No error, no data — unexpected; treat as transient
        lastError = new Error("Resend returned neither data nor error");
        console.warn(`[EMAIL RETRY] Attempt ${attempt}/${MAX_RETRIES}: empty response for ${payload.to[0]}`);
      }
    } catch (err) {
      lastError = err;
      console.warn(
        `[EMAIL RETRY] Attempt ${attempt}/${MAX_RETRIES} threw for ${payload.to[0]}:`,
        { message: (err as Error)?.message }
      );
    }

    // Exponential backoff (skip delay after the final attempt)
    if (attempt < MAX_RETRIES) {
      const delayMs = BASE_DELAY_MS * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // All retries exhausted
  const errMsg = lastError instanceof Error
    ? lastError.message
    : String(lastError);

  console.error(
    `[EMAIL FAILED] Exhausted ${MAX_RETRIES} attempts for ${payload.to[0]}: ${errMsg}`
  );

  return { success: false, error: errMsg };
}

// ─── Shared HTML primitives ────────────────────────────────────────────────────

function wrapHtml(bodyContent: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CASEIOS</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111111;border-radius:16px;overflow:hidden;border:1px solid #1f1f1f;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:32px 40px;text-align:center;border-bottom:1px solid #1f2940;">
              <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:4px;text-transform:uppercase;">CASEIOS</span>
              <p style="margin:6px 0 0;font-size:12px;color:#6b7280;letter-spacing:2px;text-transform:uppercase;">Premium Watches</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0d0d0d;padding:24px 40px;text-align:center;border-top:1px solid #1f1f1f;">
              <p style="margin:0;font-size:12px;color:#4b5563;">
                © ${new Date().getFullYear()} CASEIOS. All rights reserved.
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#4b5563;">
                You received this email because an action was taken on your CASEIOS account.
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#374151;">
                Need help? &nbsp;
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#6366f1;text-decoration:none;">${SUPPORT_EMAIL}</a>
                &nbsp;|&nbsp; ${SUPPORT_PHONE}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function badge(text: string, bg: string, color: string): string {
  return `<span style="display:inline-block;background:${bg};color:${color};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 12px;border-radius:999px;">${text}</span>`;
}

function infoRow(label: string, value: string): string {
  return /* html */ `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #1f1f1f;">
      <span style="font-size:13px;color:#6b7280;">${label}</span>
      <span style="float:right;font-size:13px;font-weight:600;color:#e5e7eb;">${value}</span>
    </td>
  </tr>`;
}

// ─── 1. Payment Success Email ─────────────────────────────────────────────────

export async function sendPaymentSuccessEmail(
  email: string,
  name: string,
  orderId: string,
  amount: number,
  paymentMethod: string
): Promise<EmailResult> {
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

  const shortOrderId = orderId.slice(-8).toUpperCase();
  const method = paymentMethod === "upi" ? "UPI" : paymentMethod === "card" ? "Card" : paymentMethod;

  const html = wrapHtml(/* html */ `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:56px;height:56px;background:#052e16;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:28px;line-height:56px;">✅</div>
      ${badge("Payment Confirmed", "#052e16", "#4ade80")}
      <h1 style="margin:16px 0 6px;font-size:24px;font-weight:700;color:#ffffff;">भुगतान सफल!</h1>
      <p style="margin:0;font-size:15px;color:#9ca3af;">Your order has been confirmed and is being prepared.</p>
    </div>

    <p style="font-size:15px;color:#d1d5db;margin:0 0 24px;">
      Hi <strong style="color:#ffffff;">${name}</strong>, thank you for your purchase. Here is your order summary:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${infoRow("Order Reference", `#${shortOrderId}`)}
      ${infoRow("Amount Paid", formattedAmount)}
      ${infoRow("Payment Method", method)}
      ${infoRow("Status", '<span style="color:#4ade80;font-weight:700;">Confirmed ✓</span>')}
    </table>

    <div style="background:#0f1f0f;border:1px solid #166534;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0;font-size:14px;color:#86efac;">
        🚚 <strong>What's next?</strong> Your order is now being processed. You will receive a shipping notification once your watch is dispatched.
      </p>
    </div>

    <p style="font-size:13px;color:#6b7280;margin:0;">
      Order ID: <code style="font-family:monospace;color:#9ca3af;">${orderId}</code>
    </p>
  `);

  return sendWithRetry({
    from: getFrom(),
    to: [email],
    subject: `✅ Payment सफल — Order #${shortOrderId} Confirmed | CASEIOS`,
    html,
  });
}

// ─── 2. Payment Failure Email ─────────────────────────────────────────────────

export async function sendPaymentFailureEmail(
  email: string,
  name: string,
  orderId: string,
  amount: number,
  reason: string
): Promise<EmailResult> {
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

  const shortOrderId = orderId.slice(-8).toUpperCase();
  const safeReason = reason.length > 200 ? reason.slice(0, 200) + "…" : reason;

  const html = wrapHtml(/* html */ `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:56px;height:56px;background:#2d0a0a;border-radius:50%;margin:0 auto 16px;line-height:56px;font-size:28px;">❌</div>
      ${badge("Payment Failed", "#2d0a0a", "#f87171")}
      <h1 style="margin:16px 0 6px;font-size:24px;font-weight:700;color:#ffffff;">Payment Unsuccessful</h1>
      <p style="margin:0;font-size:15px;color:#9ca3af;">Don't worry — your money has not been deducted.</p>
    </div>

    <p style="font-size:15px;color:#d1d5db;margin:0 0 24px;">
      Hi <strong style="color:#ffffff;">${name}</strong>, unfortunately your payment could not be processed.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${infoRow("Order Reference", `#${shortOrderId}`)}
      ${infoRow("Amount", formattedAmount)}
      ${infoRow("Reason", `<span style="color:#f87171;">${safeReason}</span>`)}
    </table>

    <div style="background:#1a0a0a;border:1px solid #7f1d1d;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0 0 8px;font-size:14px;color:#fca5a5;font-weight:600;">What can you do?</p>
      <ul style="margin:0;padding-left:20px;font-size:13px;color:#f87171;line-height:1.8;">
        <li>Check your card/UPI app for sufficient balance</li>
        <li>Ensure your bank hasn't blocked the transaction</li>
        <li>Try a different payment method</li>
        <li>Contact your bank if the issue persists</li>
      </ul>
    </div>

    <div style="text-align:center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://caseios.com"}/checkout"
         style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
        Retry Payment
      </a>
    </div>

    <p style="font-size:13px;color:#6b7280;margin:24px 0 0;text-align:center;">
      Order ID: <code style="font-family:monospace;color:#9ca3af;">${orderId}</code>
    </p>
  `);

  return sendWithRetry({
    from: getFrom(),
    to: [email],
    subject: `❌ Payment Failed — Order #${shortOrderId} | CASEIOS`,
    html,
  });
}

// ─── 3. Password Reset Email ──────────────────────────────────────────────────

export async function sendResetPasswordEmail(
  email: string,
  resetUrl: string
): Promise<EmailResult> {
  const expiryMinutes = 15;

  const html = wrapHtml(/* html */ `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:56px;height:56px;background:#1e1b4b;border-radius:50%;margin:0 auto 16px;line-height:56px;font-size:28px;">🔐</div>
      ${badge("Security", "#1e1b4b", "#a5b4fc")}
      <h1 style="margin:16px 0 6px;font-size:24px;font-weight:700;color:#ffffff;">Reset Your Password</h1>
      <p style="margin:0;font-size:15px;color:#9ca3af;">We received a request to reset your CASEIOS account password.</p>
    </div>

    <p style="font-size:15px;color:#d1d5db;margin:0 0 28px;">
      Click the button below to securely reset your password. This link expires in
      <strong style="color:#ffffff;">${expiryMinutes} minutes</strong>.
    </p>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="${resetUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;font-size:15px;font-weight:700;padding:16px 40px;border-radius:10px;text-decoration:none;letter-spacing:0.5px;">
        Reset My Password
      </a>
    </div>

    <div style="background:#111827;border:1px solid #1f2937;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#9ca3af;">
        If the button above doesn't work, paste this URL in your browser:
      </p>
      <p style="margin:8px 0 0;font-size:12px;color:#6366f1;word-break:break-all;font-family:monospace;">
        ${resetUrl}
      </p>
    </div>

    <div style="background:#2d1900;border:1px solid #92400e;border-radius:10px;padding:16px 20px;">
      <p style="margin:0;font-size:13px;color:#fbbf24;">
        ⚠️ <strong>Security notice:</strong> If you did not request a password reset, please ignore this email. Your account remains secure.
      </p>
    </div>
  `);

  return sendWithRetry({
    from: getFrom(),
    to: [email],
    subject: "🔐 Reset Your CASEIOS Password",
    html,
  });
}

// ─── 4. Contact Form Auto-Reply ───────────────────────────────────────────────

export async function sendContactUserAutoReply(
  email: string,
  firstName: string
): Promise<EmailResult> {
  const html = wrapHtml(/* html */ `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="width:56px;height:56px;background:#172554;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:28px;">📩</div>
      ${badge("Transmission Received", "#172554", "#93c5fd")}
      <h1 style="margin:16px 0 6px;font-size:24px;font-weight:700;color:#ffffff;">Message Received</h1>
      <p style="margin:0;font-size:15px;color:#9ca3af;">Thank you for reaching out to CASEIOS.</p>
    </div>

    <p style="font-size:15px;color:#d1d5db;margin:0 0 24px;">
      Hi <strong style="color:#ffffff;">${firstName}</strong>,
    </p>

    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0;font-size:14px;color:#cbd5e1;line-height:1.6;">
        This is an automated confirmation that our concierge team has received your inquiry. We typically respond within <strong style="color:#ffffff;">2 hours</strong> during standard global operating times.
      </p>
    </div>

    <p style="font-size:14px;color:#9ca3af;margin:0 0 24px;line-height:1.6;">
      If you need immediate assistance regarding an order, please reply directly to this email or contact us at <strong style="color:#ffffff;">${SUPPORT_PHONE}</strong>.
    </p>
  `);

  return sendWithRetry({
    from: getFrom(),
    to: [email],
    subject: "CASEIOS — Inquiry Received",
    html,
  });
}

// ─── 5. Contact Form Admin Notification ───────────────────────────────────────

export async function sendContactAdminNotification(
  firstName: string,
  lastName: string,
  email: string,
  message: string
): Promise<EmailResult> {
  const html = wrapHtml(/* html */ `
    <div style="text-align:center;margin-bottom:28px;">
      ${badge("New Inquiry", "#450a0a", "#fca5a5")}
      <h1 style="margin:16px 0 6px;font-size:24px;font-weight:700;color:#ffffff;">New Contact Request</h1>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${infoRow("Name", `${firstName} ${lastName}`)}
      ${infoRow("Email", email)}
    </table>

    <div style="background:#111827;border:1px solid #1f2937;border-radius:10px;padding:16px 20px;">
      <p style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Message Content</p>
      <p style="margin:0;font-size:14px;color:#d1d5db;line-height:1.6;white-space:pre-wrap;">${message}</p>
    </div>
  `);

  return sendWithRetry({
    from: getFrom(),
    to: [SUPPORT_EMAIL], // send to our own support inbox
    replyTo: email,      // so support can hit 'Reply' and talk to the customer
    subject: `[Lead] Inquiry from ${firstName} ${lastName}`,
    html,
  });
}
