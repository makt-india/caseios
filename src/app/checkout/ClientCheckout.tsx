"use client";

import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/Motion";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, CreditCard, Apple, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useCart } from "@/components/cart/CartContext";
import { useState, useEffect, useRef } from "react";
import { Loader2, MapPin } from "lucide-react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { INDIAN_STATES, getDistrictsForState } from "@/lib/data/india-regions";
import { type IndianAddress } from "@/lib/services/orderService";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "makt.in.help@gmail.com";
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+91 8883335553";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function ClientCheckout({ user }: { user: { id: string, name: string, email: string } }) {
  const { cartItems, cartTotal, clearCart } = useCart();
  const [method, setMethod] = useState<"card" | "upi">("card");
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadingState, setLoadingState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contactNumber, setContactNumber] = useState(""); // User enters their own number at checkout
  
  // Pre-fill from authenticated user
  const [customerName, setCustomerName] = useState(user.name);
  const [email, setEmail] = useState(user.email);

  // FIX H1: requestId must be STABLE for the entire checkout session.
  // Previously regenerated with Date.now() on every "Pay" click — completely
  // bypassed idempotency protection. Now generated once and stored in sessionStorage
  // so it survives page refreshes within the same session.
  const [requestId] = useState<string>(() => {
    if (typeof window === "undefined") return `${user.id}_ssr`;
    const storageKey = `checkout_rid_${user.id}`;
    const stored = sessionStorage.getItem(storageKey);
    if (stored) return stored;
    const newId = `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(storageKey, newId);
    return newId;
  });

  // Tracks which orderId has already had ondismiss reported (prevents double-fire)
  const failureReportedRef = useRef<Set<string>>(new Set());

  // Structured Address State
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [districts, setDistricts] = useState<string[]>([]);
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);

  // Hybrid Mode States
  const [isManualState, setIsManualState] = useState(false);
  const [isManualDistrict, setIsManualDistrict] = useState(false);

  // Load Razorpay script ONCE on mount — prevents memory leak from re-appending on every retry
  useEffect(() => {
    if (typeof window === "undefined" || window.Razorpay) {
      setRazorpayReady(true);
      return;
    }
    if (document.querySelector('script[src*="razorpay"]')) {
      setRazorpayReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayReady(true);
    script.onerror = () => console.error("[RAZORPAY] Failed to load checkout script");
    document.body.appendChild(script);
  }, []);

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Real-time Validation Logic
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (!customerName.trim()) newErrors.name = "Name is required";
    if (contactNumber.length !== 10) newErrors.phone = "10-digit number required";
    if (!addressLine1.trim()) newErrors.addressLine1 = "Address is required";
    if (!selectedState.trim()) newErrors.state = "State is required";
    if (!selectedDistrict.trim()) newErrors.district = "District is required";
    if (pincode.length !== 6) newErrors.pincode = "6-digit pincode required";
    if (!city.trim()) newErrors.city = "City is required";

    setErrors(newErrors);
    setIsFormValid(Object.keys(newErrors).length === 0);
  }, [customerName, contactNumber, addressLine1, selectedState, selectedDistrict, pincode, city]);

  // Handle State change
  const handleStateChange = (stateName: string) => {
    if (stateName === "MANUAL_ENTRY") {
      setIsManualState(true);
      setSelectedState("");
      setDistricts([]);
      return;
    }
    setIsManualState(false);
    setSelectedState(stateName);
    const newDistricts = getDistrictsForState(stateName);
    setDistricts(newDistricts);
    setSelectedDistrict(""); // Reset district selection when state changes
    setIsManualDistrict(false);
  };

  const handleDistrictChange = (districtName: string) => {
    if (districtName === "MANUAL_ENTRY") {
      setIsManualDistrict(true);
      setSelectedDistrict("");
      return;
    }
    setIsManualDistrict(false);
    setSelectedDistrict(districtName);
  };

  // Hybrid Pincode Lookup
  const handlePincodeChange = async (val: string) => {
    const cleanVal = val.replace(/\D/g, "").slice(0, 6);
    setPincode(cleanVal);

    if (cleanVal.length === 6) {
      setIsPincodeLoading(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleanVal}`);
        const data = await res.json();
        
        if (data?.[0]?.Status === "Success" && data[0].PostOffice?.[0]) {
          const info = data[0].PostOffice[0];
          // Auto-fill logic
          if (!selectedState || isManualState) {
            setIsManualState(false);
            handleStateChange(info.State);
          }
          if (!city) setCity(info.Block !== "NA" ? info.Block : info.District);
          if (!selectedDistrict || isManualDistrict) {
             const stateDistricts = getDistrictsForState(info.State);
             setDistricts(stateDistricts);
             setIsManualDistrict(false);
             setSelectedDistrict(info.District);
          }
        }
      } catch (err) {
        console.error("Pincode lookup failed", err);
      } finally {
        setIsPincodeLoading(false);
      }
    }
  };

  async function handleCheckout() {
    setError(null);

    if (cartItems.length === 0) {
      setError("Your cart is empty");
      return;
    }

    // Validation using state (backup check)
    if (!addressLine1.trim() || !city.trim() || pincode.length !== 6 || contactNumber.length !== 10 || !selectedState || !selectedDistrict) {
      setError("Please complete all required fields correctly.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Use a structured address object
    const structuredAddress: IndianAddress = {
      name: customerName,
      phone: contactNumber,
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || undefined,
      state: selectedState,
      district: selectedDistrict,
      city: city.trim(),
      pincode: pincode.trim()
    };

    try {
      setLoadingState("Creating Payment Gateway...");

      if (!razorpayReady || !window.Razorpay) {
        setLoadingState(null);
        setError("Payment gateway is still loading. Please wait a moment and try again.");
        return;
      }

      // Step 1: Create pending order on backend (price calculated there)
      const orderResponse = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: cartItems.map(item => ({ id: item.id, quantity: item.quantity })),
          address: structuredAddress,
          paymentMethod: "razorpay", // Dynamic method handled by Razorpay modal
          requestId, // Include request ID for idempotency
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to create payment order");
      }

      const { orderId, razorpayOrderId, amount, currency } = orderData;

      // Step 2: Razorpay script already loaded at mount — open modal directly
      (() => {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
          amount,
          currency,
          name: "E-Commerce Store",
          description: `Order #${orderId.slice(0, 8)}`,
          order_id: razorpayOrderId,
          handler: async (response: any) => {
            setLoadingState("Verifying Payment...");

            // Step 3: Verify payment signature on backend
            const verifyResponse = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId, // Our internal order ID
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
                requestId, // Include request ID for idempotency
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              // Clear the session requestId so the next order gets a fresh one
              sessionStorage.removeItem(`checkout_rid_${user.id}`);
              setLoadingState("Finalizing Order...");
              await new Promise((resolve) => setTimeout(resolve, 500));
              clearCart();
              setSubmitted(true);
              setError(null);
            } else {
              setLoadingState(null);
              setError(verifyData.error || "Payment verification failed");
            }
          },
          prefill: {
            name: customerName,
            email: email,
            contact: contactNumber,
          },
          theme: {
            color: "#000000",
          },
          modal: {
            ondismiss: async () => {
              setLoadingState(null);
              setError("Payment cancelled. Your order has been saved — you can retry.");

              // Prevent double-fire (modal can occasionally trigger ondismiss multiple times)
              if (failureReportedRef.current.has(orderId)) return;
              failureReportedRef.current.add(orderId);

              try {
                await fetch("/api/razorpay/payment-failed", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderId, reason: "Payment cancelled by user" }),
                });
              } catch {
                // Non-critical — don't surface to user
              }
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
        setLoadingState(null);
      })();
    } catch (error) {
      setLoadingState(null);
      const msg = error instanceof Error ? error.message : "An error occurred during checkout";
      setError(msg);

      // UX Improvement: If the backend says a product doesn't exist (stale cart), auto-remove it.
      // Message format: "Product(s) not found: cm...xyz, ..."
      if (msg.startsWith("Product(s) not found: ")) {
        const ids = msg.replace("Product(s) not found: ", "").split(",").map(id => id.trim());
        if (ids.length > 0) {
          ids.forEach(id => {
            // Remove the invalid item from context so they can checkout the rest
            const currentCart = JSON.parse(localStorage.getItem("cart") || "[]");
            const newCart = currentCart.filter((i: any) => i.id !== id);
            localStorage.setItem("cart", JSON.stringify(newCart));
          });
          // Refresh the page to reflect the clean cart!
          setError("Some items in your cart were no longer available and have been removed. Please review your order.");
          setTimeout(() => window.location.reload(), 3000);
        }
      }
    }
  }

  if (submitted) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <FadeIn className="flex flex-col items-center">
          <CheckCircle2 className="w-20 h-20 text-emerald-400 mb-6" />
          <h1 className="text-4xl font-medium tracking-tight mb-4">Payment Successful</h1>
          <p className="text-muted-foreground mb-8">Thank you for your order. A receipt has been sent to your email.</p>
          <Link href="/">
            <Button size="lg">Return to Store</Button>
          </Link>
        </FadeIn>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="w-full flex-col flex min-h-screen pt-24 px-6 md:px-12 lg:px-24 bg-background">
      <FadeIn className="mb-12">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors relative z-20">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Keep Shopping
        </Link>
      </FadeIn>

      <div className="flex flex-col lg:flex-row gap-16 lg:gap-32 w-full max-w-6xl mx-auto pb-32">
        {/* Left: Checkout Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleCheckout(); }} className="w-full lg:w-3/5">
          <FadeInStagger className="space-y-12">
            {error && (
              <FadeInStaggerItem>
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              </FadeInStaggerItem>
            )}
            <FadeInStaggerItem>
              <h1 className="text-3xl font-medium tracking-tight mb-8">Checkout</h1>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-4 text-muted-foreground">Contact Information</h3>
                  <div className="space-y-4">
                    <input type="email" name="email" value={email} disabled className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-4 text-sm text-white/50 cursor-not-allowed focus:outline-none transition-colors" />
                  </div>
                </div>
                <div className="pt-4">
                  <h3 className="text-sm font-medium mb-4 text-muted-foreground">Shipping Address</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div className="col-span-2 space-y-2">
                       <input type="text" name="name" value={customerName} disabled className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-4 text-sm text-white/50 cursor-not-allowed focus:outline-none transition-colors" />
                    </div>

                    {/* Phone Number */}
                    <div className="col-span-2 space-y-2">
                      <input 
                        type="tel" 
                        name="contact" 
                        placeholder="Contact Number (10-digit)" 
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                        required 
                        className={`w-full bg-zinc-900 border ${touched.phone && errors.phone ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-white/30 transition-colors`} 
                      />
                      {touched.phone && errors.phone && (
                        <p className="text-[10px] text-red-500/80 ml-1">{errors.phone}</p>
                      )}
                    </div>

                    {/* Address Line 1 */}
                    <div className="col-span-2 space-y-2">
                      <input 
                        type="text" 
                        name="addressLine1"
                        placeholder="Address Line 1 (House No, Building, Street)" 
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.target.value)}
                        onBlur={() => setTouched(prev => ({ ...prev, addressLine1: true }))}
                        required 
                        className={`w-full bg-zinc-900 border ${touched.addressLine1 && errors.addressLine1 ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-white/30 transition-colors`} 
                      />
                      {touched.addressLine1 && errors.addressLine1 && (
                        <p className="text-[10px] text-red-500/80 ml-1">{errors.addressLine1}</p>
                      )}
                    </div>

                    {/* Address Line 2 */}
                    <div className="col-span-2 space-y-2">
                      <input 
                        type="text" 
                        name="addressLine2"
                        placeholder="Address Line 2 (Optional - Area, Landmark)" 
                        value={addressLine2}
                        onChange={(e) => setAddressLine2(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-white/30 transition-colors" 
                      />
                    </div>

                    {/* State: Hybrid Dropdown / Text */}
                    <div className="col-span-1 space-y-2">
                      {isManualState ? (
                        <div className="relative group">
                          <input
                            type="text"
                            name="state"
                            placeholder="Type State"
                            autoFocus
                            value={selectedState}
                            onChange={(e) => setSelectedState(e.target.value)}
                            onBlur={() => setTouched(prev => ({ ...prev, state: true }))}
                            className={`w-full bg-zinc-900 border ${touched.state && errors.state ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-white/30 transition-colors inline-block`}
                          />
                          <button 
                            type="button" 
                            onClick={() => setIsManualState(false)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30 hover:text-white transition-colors"
                          >
                            Use list
                          </button>
                        </div>
                      ) : (
                        <select
                          name="state"
                          value={selectedState}
                          onChange={(e) => handleStateChange(e.target.value)}
                          className={`w-full bg-zinc-900 border ${touched.state && errors.state ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-white/30 transition-colors appearance-none text-white`}
                        >
                          <option value="" disabled>Select State</option>
                          {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                          <option value="MANUAL_ENTRY" className="text-blue-400">+ Manual Entry</option>
                        </select>
                      )}
                    </div>

                    {/* District: Hybrid Dropdown / Text */}
                    <div className="col-span-1 space-y-2">
                      {isManualDistrict ? (
                        <div className="relative group">
                          <input
                            type="text"
                            name="district"
                            placeholder="Type District"
                            autoFocus
                            value={selectedDistrict}
                            onChange={(e) => setSelectedDistrict(e.target.value)}
                            onBlur={() => setTouched(prev => ({ ...prev, district: true }))}
                            className={`w-full bg-zinc-900 border ${touched.district && errors.district ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-white/30 transition-colors`}
                          />
                          <button 
                            type="button" 
                            onClick={() => setIsManualDistrict(false)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30 hover:text-white transition-colors"
                          >
                            Use list
                          </button>
                        </div>
                      ) : (
                        <select
                          name="district"
                          value={selectedDistrict}
                          onChange={(e) => handleDistrictChange(e.target.value)}
                          disabled={!selectedState && !isManualState}
                          className={`w-full bg-zinc-900 border ${touched.district && errors.district ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-white/30 transition-colors appearance-none text-white disabled:opacity-50`}
                        >
                          <option value="" disabled>Select District</option>
                          {districts.map(d => <option key={d} value={d}>{d}</option>)}
                          <option value="MANUAL_ENTRY" className="text-blue-400">+ Manual Entry</option>
                        </select>
                      )}
                    </div>

                    {/* Pincode Moved Here */}
                    <div className="col-span-2 relative space-y-2">
                      <input 
                        type="text" 
                        name="pincode"
                        placeholder="Pincode (6 digits)" 
                        value={pincode}
                        onChange={(e) => handlePincodeChange(e.target.value)}
                        onBlur={() => setTouched(prev => ({ ...prev, pincode: true }))}
                        required 
                        className={`w-full bg-zinc-900 border ${touched.pincode && errors.pincode ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-white/30 transition-colors`} 
                      />
                      {isPincodeLoading && (
                        <Loader2 className="absolute right-4 top-4 w-5 h-5 animate-spin text-white/20" />
                      )}
                      {touched.pincode && errors.pincode && (
                        <p className="text-[10px] text-red-500/80 ml-1">{errors.pincode}</p>
                      )}
                    </div>

                    {/* City/Town */}
                    <div className="col-span-2 space-y-2">
                      <input 
                        type="text" 
                        name="city"
                        placeholder="City/Town" 
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        onBlur={() => setTouched(prev => ({ ...prev, city: true }))}
                        required 
                        className={`w-full bg-zinc-900 border ${touched.city && errors.city ? "border-red-500/50" : "border-white/10"} rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-white/30 transition-colors`} 
                      />
                      {touched.city && errors.city && (
                        <p className="text-[10px] text-red-500/80 ml-1">{errors.city}</p>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </FadeInStaggerItem>

            <FadeInStaggerItem>
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground">Payment Protection</h3>
                  <div className="flex gap-4">
                    <div className="flex items-center text-xs text-blue-400/80 bg-blue-500/10 px-2 py-1 rounded-full">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      100% Secure
                    </div>
                  </div>
                </div>
                
                <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Choose from all available Indian payment methods including **UPI (GPay, PhonePe, Paytm)**, **Netbanking**, **Credit/Debit Cards**, and **Wallets** in the next step.
                  </p>
                  <div className="flex items-center gap-4 text-white/40">
                    <CreditCard className="w-5 h-5" />
                    <ShieldCheck className="w-5 h-5" />
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                {/* Support Info */}
                <div className="mt-8 pt-8 border-t border-white/10">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Support &amp; Enquiries</h4>
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground/80">
                    <p className="flex items-center gap-2">
                       <span className="text-white/50">WhatsApp / Call:</span> {SUPPORT_PHONE}
                    </p>
                    <p className="flex items-center gap-2">
                       <span className="text-white/50">Email:</span>
                       <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white transition-colors">{SUPPORT_EMAIL}</a>
                    </p>
                  </div>
                </div>
              </div>
            </FadeInStaggerItem>

            <FadeInStaggerItem>
              <Button
                size="lg"
                type="submit"
                className={`w-full mt-4 h-14 transition-all duration-300 ${!isFormValid ? "opacity-30 cursor-not-allowed grayscale" : ""}`}
                disabled={cartItems.length === 0 || loadingState !== null || !isFormValid}
              >
                {loadingState ? (
                  <span className="flex items-center">
                    <Loader2 className="w-5 h-5 mr-3 animate-spin text-zinc-400" />
                    {loadingState}
                  </span>
                ) : (
                  `Pay ₹${cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                )}
              </Button>
            </FadeInStaggerItem>
          </FadeInStagger>
        </form>

        {/* Right: Order Summary */}
        <div className="w-full lg:w-2/5">
          <FadeIn delay={0.3}>
            <div className="bg-zinc-950/50 rounded-3xl p-8 sticky top-32 border border-white/5 shadow-2xl">
              <h2 className="text-lg font-medium mb-8 text-white">Order Summary</h2>

              <div className="space-y-6 mb-8 border-b border-white/10 pb-8 max-h-[300px] overflow-y-auto relative">
                {cartItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Your cart is empty.</p>
                ) : (
                  cartItems.map(item => (
                    <div key={item.id} className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white/5 border border-white/5 rounded-xl overflow-hidden relative flex-shrink-0">
                        <Image src={item.image} alt={item.name} fill sizes="64px" className="object-contain p-1" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{item.category}</p>
                        <h4 className="text-sm font-medium text-white">{item.name}</h4>
                        <p className="text-xs text-foreground/60 mt-1">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-sm text-white">₹{(item.price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-white">₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-white">Complimentary</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes</span>
                  <span className="text-white">Included</span>
                </div>
              </div>

              <div className="border-t border-white/10 mt-6 pt-6 flex justify-between items-center">
                <span className="font-medium text-white">Total</span>
                <span className="text-3xl font-bold tracking-tight text-white">₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
