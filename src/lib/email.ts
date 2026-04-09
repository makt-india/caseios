/**
 * Dummy email sending utility for CASIOS framework.
 * In a real application, you would hook this to SendGrid, Resend, or AWS SES.
 */

export async function sendResetPasswordEmail(email: string, resetUrl: string) {
  // In production, we send an actual email containing the resetUrl.
  
  console.log("=========================================");
  console.log("        [MOCK EMAIL DISPATCHER]        ");
  console.log("=========================================");
  console.log(`To: ${email}`);
  console.log(`Subject: Reset your CASIOS password`);
  console.log(`Body:`);
  console.log(`We received a request to reset your password.`);
  console.log(`Please click the link below to securely reset it:`);
  console.log(`${resetUrl}`);
  console.log(`\nIf you did not request this, you can safely ignore this email.`);
  console.log("=========================================");

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  return true;
}

export async function sendPaymentSuccessEmail(email: string, name: string, orderId: string, amount: number, paymentMethod: string) {
  console.log(`[MOCK EMAIL] Success Email sent to ${email} for order ${orderId} (₹${amount}) via ${paymentMethod}`);
  return true;
}

export async function sendPaymentFailureEmail(email: string, name: string, orderId: string, amount: number, reason: string) {
  console.log(`[MOCK EMAIL] Failure Email sent to ${email} for order ${orderId} (₹${amount}). Reason: ${reason}`);
  return true;
}
