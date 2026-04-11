/**
 * Email test script — run with:
 *   node --env-file=.env.local scripts/test-email.mjs
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "makt.in.help@gmail.com";

async function run() {
  console.log("\n══════════════════════════════════════════");
  console.log("       CASIOS — Email Delivery Test");
  console.log("══════════════════════════════════════════");
  console.log(`API Key : ${process.env.RESEND_API_KEY?.slice(0, 10)}...`);
  console.log(`From    : ${process.env.RESEND_FROM}`);
  console.log(`To      : ${TO}`);
  console.log("──────────────────────────────────────────\n");

  // ── Test 1: Payment Success ──────────────────────────────────────────
  console.log("▶ Sending Payment Success email...");
  const t1 = await resend.emails.send({
    from: process.env.RESEND_FROM ?? "CASIOS <onboarding@resend.dev>",
    to: [TO],
    replyTo: TO,
    subject: "✅ [TEST] Payment सफल — Order #TEST1234 Confirmed | CASIOS",
    html: `<!DOCTYPE html><html><body style="background:#0a0a0a;font-family:Arial,sans-serif;padding:40px">
      <div style="max-width:500px;margin:0 auto;background:#111;border-radius:12px;padding:32px;border:1px solid #222">
        <h1 style="color:#4ade80;font-size:20px">✅ Payment Confirmed — Test Email</h1>
        <p style="color:#d1d5db">Hi <strong style="color:#fff">Test User</strong>,</p>
        <p style="color:#9ca3af">This is a test of the CASIOS payment success email.</p>
        <table width="100%" style="margin-top:16px">
          <tr><td style="color:#6b7280;padding:8px 0;border-bottom:1px solid #222">Order</td><td style="color:#e5e7eb;text-align:right">#TEST1234</td></tr>
          <tr><td style="color:#6b7280;padding:8px 0;border-bottom:1px solid #222">Amount</td><td style="color:#e5e7eb;text-align:right">₹4,999</td></tr>
          <tr><td style="color:#6b7280;padding:8px 0">Method</td><td style="color:#e5e7eb;text-align:right">UPI</td></tr>
        </table>
        <p style="color:#4b5563;font-size:12px;margin-top:24px;text-align:center">
          Need help? <a href="mailto:${TO}" style="color:#6366f1">${TO}</a>
        </p>
      </div>
    </body></html>`,
  });

  if (t1.error) {
    console.error("❌ FAILED:", t1.error.message);
  } else {
    console.log(`✅ SUCCESS — messageId: ${t1.data?.id}`);
  }

  // ── Test 2: Payment Failure ──────────────────────────────────────────
  console.log("\n▶ Sending Payment Failure email...");
  const t2 = await resend.emails.send({
    from: process.env.RESEND_FROM ?? "CASIOS <onboarding@resend.dev>",
    to: [TO],
    replyTo: TO,
    subject: "❌ [TEST] Payment Failed — Order #TEST5678 | CASIOS",
    html: `<!DOCTYPE html><html><body style="background:#0a0a0a;font-family:Arial,sans-serif;padding:40px">
      <div style="max-width:500px;margin:0 auto;background:#111;border-radius:12px;padding:32px;border:1px solid #222">
        <h1 style="color:#f87171;font-size:20px">❌ Payment Failed — Test Email</h1>
        <p style="color:#d1d5db">Hi <strong style="color:#fff">Test User</strong>,</p>
        <p style="color:#9ca3af">This is a test of the CASIOS payment failure email.</p>
        <p style="color:#f87171;font-size:13px">Reason: Insufficient funds (test)</p>
        <p style="color:#4b5563;font-size:12px;margin-top:24px;text-align:center">
          Need help? <a href="mailto:${TO}" style="color:#6366f1">${TO}</a>
        </p>
      </div>
    </body></html>`,
  });

  if (t2.error) {
    console.error("❌ FAILED:", t2.error.message);
  } else {
    console.log(`✅ SUCCESS — messageId: ${t2.data?.id}`);
  }

  // ── Test 3: Password Reset ───────────────────────────────────────────
  console.log("\n▶ Sending Password Reset email...");
  const t3 = await resend.emails.send({
    from: process.env.RESEND_FROM ?? "CASIOS <onboarding@resend.dev>",
    to: [TO],
    replyTo: TO,
    subject: "🔐 [TEST] Reset Your CASIOS Password",
    html: `<!DOCTYPE html><html><body style="background:#0a0a0a;font-family:Arial,sans-serif;padding:40px">
      <div style="max-width:500px;margin:0 auto;background:#111;border-radius:12px;padding:32px;border:1px solid #222">
        <h1 style="color:#a5b4fc;font-size:20px">🔐 Password Reset — Test Email</h1>
        <p style="color:#d1d5db">This is a test of the CASIOS password reset email.</p>
        <div style="text-align:center;margin:24px 0">
          <a href="https://casios.vercel.app/reset-password?token=test_token_123"
             style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700">
            Reset My Password
          </a>
        </div>
        <p style="color:#4b5563;font-size:12px;text-align:center">Link expires in 15 minutes</p>
      </div>
    </body></html>`,
  });

  if (t3.error) {
    console.error("❌ FAILED:", t3.error.message);
  } else {
    console.log(`✅ SUCCESS — messageId: ${t3.data?.id}`);
  }

  console.log("\n══════════════════════════════════════════");
  console.log("  Check your inbox at:", TO);
  console.log("  Also check Resend Dashboard → Emails");
  console.log("  https://resend.com/emails");
  console.log("══════════════════════════════════════════\n");
}

run().catch(console.error);
