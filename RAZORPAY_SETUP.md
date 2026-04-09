# Razorpay Integration Setup Guide

## Current Status
- ✅ CoD (Cash on Delivery) removed
- ✅ Only Card & UPI payment methods enabled
- ✅ Currency: Indian Rupee (₹)

## Test vs Live Mode

### 🟡 TEST MODE (Sandbox - Current Setup)
**API Keys in .env.local:**
```
NEXT_PUBLIC_RAZORPAY_KEY="rzp_test_SasofZJlcAyB8"
RAZORPAY_SECRET="2zAJpm5RqA0ZY0fi8aQ"
```

**Which Account Receives Money:**
- **Your Razorpay Test Account** (no real money transfers)
- Money is FAKE/SIMULATED
- For testing & development only

**How to Test with Dummy UPI:**
1. At Razorpay checkout, select **UPI**
2. Enter any test UPI ID: `success@razorpay` or `failure@razorpay`
3. Complete payment - it will succeed automatically in test mode
4. Check admin panel - order appears with payment status

**Test Card Numbers:**
- Visa: `4111 1111 1111 1111`
- Mastercard: `5555 5555 5555 4444`
- Any expiry, any CVV works

---

### 🟢 LIVE MODE (Real Payments)
To switch to LIVE mode:

1. **Get Live API Keys from Razorpay Dashboard:**
   - Copy Live Key ID (starts with `rzp_live_`)
   - Copy Live Secret

2. **Update .env.local:**
   ```
   NEXT_PUBLIC_RAZORPAY_KEY="rzp_live_xxxxxxxxxxxxx"
   RAZORPAY_SECRET="yyyyyyyyyyyyyyyyy"
   ```

3. **Which Account Gets Money:**
   - Your **Razorpay Business Bank Account**
   - Razorpay transfers money to your linked bank account
   - Usually settles within 24-48 hours

4. **Real UPI Testing (Before Going Live):**
   - Razorpay recommends testing with a small amount (₹1)
   - Use your own UPI ID (Google Pay, PhonePe, etc.)
   - Real money will be deducted but Razorpay handles refunds
   - **Do NOT go full live without testing with real UPI**

---

## Razorpay Account Setup (From Your Screenshot)

Your account details:
- **Merchant**: sankar
- **Status**: Onboarding → Complete KYC (step 3)
- **Account type**: Test mode (prefixed with `rzp_test_`)

**Next Steps to Go Live:**
1. ✅ Complete KYC details in Razorpay dashboard
2. ✅ Add bank account for settlements
3. ✅ Get Live API keys
4. Update .env.local with live keys
5. Test with real ₹1 payment to your UPI
6. Deploy with live keys

---

## Current Payment Flow

```
User Checkout
  ↓
Select Payment (Card or UPI)
  ↓
Click "Pay ₹XXX"
  ↓
Razorpay Checkout Modal Opens
  ↓
Complete Payment (Test UPI: success@razorpay)
  ↓
Signature Verified
  ↓
Order Saved to Database
  ↓
Success Screen + Email
  ↓
Admin Panel Shows Payment Status ✅
```

---

## Testing Checklist

- [ ] Add product to cart
- [ ] Go to checkout
- [ ] Select **UPI** payment
- [ ] Enter test UPI: `success@razorpay`
- [ ] View success screen
- [ ] Check admin panel for order with ✅ completed status
- [ ] Verify Razorpay Order ID is saved
- [ ] Try Card payment (4111 1111 1111 1111)

---

## Security Notes

⚠️ **Never commit real API keys to git**
- Keep secrets in `.env.local` (already in .gitignore)
- Download secrets from Razorpay dashboard
- Rotate keys if compromised
- Test mode keys are safe to share for debugging

