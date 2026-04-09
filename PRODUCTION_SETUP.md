# Production-Grade Payment System Setup Guide

This guide covers the security-hardened payment system with all production best practices implemented.

---

## 🔐 Phase 1: Initial Setup

### 1. Install Dependencies

```bash
npm install
npm install bcrypt
```

### 2. Generate Admin Password Hash

Before running the app, you need to hash your admin password:

```bash
node -e "
const bcrypt = require('bcrypt');
const password = 'your-admin-password';
bcrypt.hash(password, 12).then(hash => {
  console.log('ADMIN_PASSWORD_HASH:', hash);
}).catch(err => console.error(err));
"
```

This will output a bcrypt hash like: `$2b$12$...`

### 3. Configure Environment Variables

Create `.env.local` with:

```bash
# DATABASE (PostgreSQL recommended for production)
DATABASE_URL="postgresql://user:password@localhost:5432/ecommerce"
# DATABASE_URL="sqlite:file:./dev.db"  # For development only

# RAZORPAY (Test Mode)
NEXT_PUBLIC_RAZORPAY_KEY="rzp_test_SasofZJlcAyB8"
RAZORPAY_SECRET="2zAJpm5RqA0ZY0fi8aQ"

# ADMIN AUTHENTICATION (Secure)
ADMIN_EMAIL="admin@yoursite.com"
ADMIN_PASSWORD_HASH="$2b$12$..."  # Paste the hash from step 2
ADMIN_SESSION_TOKEN="your-secure-session-token"

# NODE ENVIRONMENT
NODE_ENV="development"  # Set to "production" when deploying

# EMAIL SERVICE (Optional)
EMAIL_PROVIDER="console"  # Options: console, resend, sendgrid, nodemailer
EMAIL_FROM="noreply@yoursite.com"
EMAIL_API_KEY=""  # Set if using Resend or SendGrid

# Nodemailer (if EMAIL_PROVIDER="nodemailer")
# SMTP_HOST="smtp.gmail.com"
# SMTP_PORT="587"
# SMTP_USER="your-email@gmail.com"
# SMTP_PASS="your-app-password"
# SMTP_SECURE="false"
```

### 4. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Migrate (only for PostgreSQL)
npx prisma migrate dev --name init

# For SQLite (development only)
npx prisma db push
```

---

## 💳 Phase 2: Payment Gateway Configuration

### Razorpay Test Mode (Development)

1. Sign up at https://razorpay.com
2. Go to **Settings → API Keys**
3. Copy **Test Key ID** and **Test Key Secret**
4. Paste into `.env.local` as shown above

**Test Credentials:**
- UPI: `success@razorpay` (will auto-succeed)
- Card: `4111 1111 1111 1111` (any expiry, any CVV)
- Amount: Any value (no real money transferred)

### Razorpay Live Mode (Production)

When ready to accept real payments:

1. Complete KYC in your Razorpay dashboard
2. Add bank account for settlements
3. Go to **Settings → API Keys → Live**
4. Copy **Live Key ID** and **Live Key Secret**
5. Update `.env.local`:
   ```bash
   NEXT_PUBLIC_RAZORPAY_KEY="rzp_live_..."
   RAZORPAY_SECRET="..."
   ```

⚠️ **WARNING**: Live keys process real money. Test thoroughly in test mode first.

---

## 🛡️ Phase 3: Security Hardening

### Rate Limiting

The system implements rate limiting on:
- **Login**: 5 attempts per 5 minutes per email
- **Order Creation**: 50 requests per 5 minutes per IP
- **Payment Verification**: 100 requests per 5 minutes per IP

Adjust limits in:
- `src/app/actions.ts` (admin login)
- `src/app/api/razorpay/create-order/route.ts` (order API)
- `src/app/api/razorpay/verify-payment/route.ts` (verification API)

### Authentication

- Passwords hashed with bcrypt (12 rounds - OWASP standard)
- Secure session tokens (64-char hex, cryptographically random)
- HttpOnly, secure cookies with SameSite=Lax
- Session expiration: 7 days

### Payment Security

- Signature verification with HMAC-SHA256
- Order state machine (pending → paid only)
- Idempotency protection via requestId
- IP logging for fraud detection
- Payment verification logs for audit trail

---

## 📨 Phase 4: Email Notifications (Optional)

### Option A: Console (Development)

```bash
EMAIL_PROVIDER="console"
```

Emails print to terminal.

### Option B: Resend (Recommended for Startups)

```bash
npm install resend

# .env.local
EMAIL_PROVIDER="resend"
EMAIL_FROM="noreply@yourdomain.com"
EMAIL_API_KEY="re_..."  # From https://resend.com
```

### Option C: SendGrid

```bash
npm install @sendgrid/mail

# .env.local
EMAIL_PROVIDER="sendgrid"
EMAIL_FROM="noreply@yourdomain.com"
EMAIL_API_KEY="SG...."  # From https://sendgrid.com
```

### Option D: Nodemailer (Gmail, etc.)

```bash
npm install nodemailer

# .env.local
EMAIL_PROVIDER="nodemailer"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-specific-password"  # NOT your Gmail password
SMTP_SECURE="false"
```

[How to generate Gmail App Password](https://support.google.com/accounts/answer/185833)

---

## 🚀 Phase 5: Deployment

### Pre-Deployment Checklist

- [ ] Database migrated to PostgreSQL (not SQLite)
- [ ] All environment variables configured
- [ ] Payment system tested in test mode with real UPI/card
- [ ] Admin dashboard login works
- [ ] Email notifications configured
- [ ] Rate limiting tested
- [ ] Error handling reviewed
- [ ] Logs reviewed for security issues

### Deploy to Vercel

```bash
git push origin main
```

Vercel will:
1. Detect Next.js app
2. Install dependencies
3. Run `npm run build`
4. Deploy automatically

**Important**: Set environment variables in Vercel dashboard under **Settings → Environment Variables**.

### Deploy to Self-Hosted

```bash
npm run build
npm start
```

Ensure:
- Node.js 18+
- PostgreSQL running
- Environment variables set
- HTTPS enabled (required for Razorpay)

---

## 🔍 Phase 6: Monitoring & Maintenance

### Check Payment Logs

```bash
# View recent orders
SELECT * FROM "Order" ORDER BY "createdAt" DESC LIMIT 10;

# View payment verification logs
SELECT * FROM "PaymentLog" ORDER BY "createdAt" DESC LIMIT 20;

# Find failed payments
SELECT * FROM "PaymentLog" WHERE status = 'failed';

# Check for duplicate attempts
SELECT requestId, COUNT(*) FROM "PaymentLog"
GROUP BY requestId HAVING COUNT(*) > 1;
```

### Key Metrics to Monitor

- **Payment Success Rate**: `completed / (completed + failed)`
- **Failed Payments**: Track via PaymentLog table
- **Average Order Value**: `SUM(amount) / COUNT(*)`
- **Revenue (Paid Only)**: `SUM(amount) WHERE paymentStatus = 'completed'`
- **Login Attempts**: Check logs for brute-force attacks

### Security Best Practices

1. **Rotate Secrets Regularly**
   ```bash
   # Generate new admin password hash
   node -e "const bcrypt = require('bcrypt');
            bcrypt.hash('new-password', 12).then(h => console.log(h));"
   ```

2. **Monitor Logs**
   - Watch for failed payment attempts
   - Alert on multiple failed logins from same IP
   - Log all admin actions

3. **Database Backups**
   ```bash
   # PostgreSQL
   pg_dump ecommerce > backup.sql
   ```

4. **Keep Dependencies Updated**
   ```bash
   npm outdated
   npm update
   ```

---

## 🐛 Troubleshooting

### "Payment gateway not configured"

- Check `NEXT_PUBLIC_RAZORPAY_KEY` is set correctly
- Verify Razorpay keys are not env variables with typos
- Restart dev server

### "Admin login not working"

- Verify `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` are in `.env.local`
- Check password hash is valid bcrypt format (`$2b$...`)
- Try regenerating password hash

### "Database connection failed"

- PostgreSQL: Ensure server is running
- Check `DATABASE_URL` connection string
- Run `npx prisma db push` to sync schema

### "Payment verification failed"

- Confirm test/live mode consistency
- Check signature mismatch in logs
- Verify Razorpay Order ID matches database

---

## 📚 API Endpoints

### Public APIs

#### `POST /api/razorpay/create-order`
Creates a pending order and Razorpay order.

**Request:**
```json
{
  "cartItems": [{"id": "product-1", "quantity": 2}],
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "address": "123 Main St, City, 12345",
  "paymentMethod": "card|upi",
  "requestId": "unique-id"  // Optional, for idempotency
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "order-id",
  "razorpayOrderId": "order_xxx",
  "amount": 50000,  // In paise
  "currency": "INR"
}
```

#### `POST /api/razorpay/verify-payment`
Verifies signature and marks order as paid.

**Request:**
```json
{
  "orderId": "order-id",
  "razorpayPaymentId": "pay_xxx",
  "razorpayOrderId": "order_xxx",
  "razorpaySignature": "signature",
  "requestId": "unique-id"  // Optional, for idempotency
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "order-id",
  "message": "Payment verified"
}
```

---

## 📞 Support

For issues:
1. Check logs: `npm run dev`
2. Review PaymentLog table for details
3. Contact Razorpay support: https://razorpay.com/support
4. Check Next.js docs: https://nextjs.org/docs
