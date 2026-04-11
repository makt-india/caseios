"use client";

import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/Motion";
import { TiltCard } from "@/components/ui/TiltCard";
import { Button } from "@/components/ui/Button";
import { useState, useCallback } from "react";
import { submitContactMessage } from "@/app/actions";
import { CheckCircle } from "lucide-react";

// ─── Validation Rules ──────────────────────────────────────────────────────────

const RULES = {
  firstName: {
    regex: /^[A-Za-zÀ-ÖØ-öø-ÿ]{2,50}$/,
    message: "2–50 letters only (no numbers or symbols)",
  },
  lastName: {
    regex: /^[A-Za-zÀ-ÖØ-öø-ÿ]{2,50}$/,
    message: "2–50 letters only (no numbers or symbols)",
  },
  email: {
    // RFC 5322 simplified — covers 99.9% of real addresses
    regex: /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,
    message: "Enter a valid email address",
  },
  message: {
    regex: /^[\s\S]{10,2000}$/,
    message: "10–2000 characters required",
  },
} as const;

type FieldName = keyof typeof RULES;

function validate(field: FieldName, value: string): string {
  if (!value.trim()) return "This field is required";
  return RULES[field].regex.test(value.trim()) ? "" : RULES[field].message;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "makt.in.help@gmail.com";

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [values, setValues] = useState({
    firstName: "",
    lastName:  "",
    email:     "",
    message:   "",
  });

  const [errors, setErrors] = useState<Record<FieldName, string>>({
    firstName: "",
    lastName:  "",
    email:     "",
    message:   "",
  });

  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    firstName: false,
    lastName:  false,
    email:     false,
    message:   false,
  });

  // Only show an error once the field has been touched (blurred or submitted)
  const getError = (field: FieldName) => (touched[field] ? errors[field] : "");

  const isValid = Object.values(errors).every((e) => e === "");
  const allTouched = Object.values(touched).every(Boolean);
  const canSubmit = isValid && allTouched && !pending;

  const handleChange = useCallback(
    (field: FieldName, value: string) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: validate(field, value) }));
    },
    []
  );

  const handleBlur = useCallback((field: FieldName) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validate(field, values[field]) }));
  }, [values]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    // Touch all fields so errors become visible
    const allTouchedState = { firstName: true, lastName: true, email: true, message: true };
    setTouched(allTouchedState);

    // Re-validate all
    const newErrors = {
      firstName: validate("firstName", values.firstName),
      lastName:  validate("lastName",  values.lastName),
      email:     validate("email",     values.email),
      message:   validate("message",   values.message),
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some((e) => e !== "")) return;

    setPending(true);
    try {
      const formData = new FormData();
      formData.set("firstName", values.firstName.trim());
      formData.set("lastName",  values.lastName.trim());
      formData.set("email",     values.email.trim().toLowerCase());
      formData.set("message",   values.message.trim());
      await submitContactMessage(formData);
      setIsSubmitted(true);
    } catch (err: any) {
      setServerError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full min-h-screen bg-[#050505] selection:bg-white/30 pt-32 pb-24 relative overflow-hidden flex items-center">
      
      {/* Architectural Blueprint Background */}
      <div className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_60%_100%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* Ambient Studio Glow */}
      <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-white/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 w-full relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">
          
          {/* Left Column: Contact Ethos & Info */}
          <FadeInStagger className="space-y-12">
            <FadeInStaggerItem>
              <span className="text-[10px] md:text-xs tracking-[0.5em] text-neutral-500 uppercase mb-6 block font-bold">
                Direct Line
              </span>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white italic leading-none mb-6">
                SECURE <br /> <span className="font-light not-italic text-neutral-600">CHANNEL.</span>
              </h1>
              <p className="text-base md:text-lg text-neutral-400 font-light leading-relaxed max-w-md">
                Our global concierge team operates with the same precision as our engineering floor. Whether it is an inquiry about metallurgy specifications or an order status, we are standing by.
              </p>
            </FadeInStaggerItem>

            <FadeInStaggerItem>
              <div className="space-y-6 border-l-2 border-white/10 pl-6">
                <div>
                  <h3 className="text-white text-xs tracking-widest uppercase font-bold mb-1">Response Time</h3>
                  <p className="text-neutral-500 font-mono text-sm tracking-wider">{"< 2 Hours (Standard Time)"}</p>
                </div>
                <div>
                  <h3 className="text-white text-xs tracking-widest uppercase font-bold mb-1">Global Headquarters</h3>
                  <p className="text-neutral-500 font-mono text-sm tracking-wider">Tamil Nadu, India</p>
                </div>
                <div>
                  <h3 className="text-white text-xs tracking-widest uppercase font-bold mb-1">Direct Encrypted Email</h3>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="text-neutral-500 font-mono text-sm tracking-wider hover:text-white transition-colors cursor-pointer"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </div>
              </div>
            </FadeInStaggerItem>
          </FadeInStagger>

          {/* Right Column: 3D Form Card */}
          <FadeIn delay={0.2} className="relative w-full max-w-xl mx-auto lg:mx-0 lg:ml-auto">
            <TiltCard tiltAmount={3} className="w-full bg-[#0a0a0a] border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-2xl p-8 md:p-12 shadow-[0_40px_80px_rgba(0,0,0,0.8)] relative group">
              
              {/* Internal Card Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] pointer-events-none group-hover:bg-white/10 transition-colors duration-700" />

              {isSubmitted ? (
                <div className="h-[400px] flex flex-col items-center justify-center text-center relative z-10 animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 rounded-full border border-white/20 bg-white/5 flex items-center justify-center mb-6 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Transmission Received</h2>
                  <p className="text-sm text-neutral-500 tracking-wider">A specialist will initiate contact shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="relative z-10 space-y-6 flex flex-col h-full justify-between">
                  
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-white/40 text-[9px] uppercase tracking-[0.3em] font-bold">Client Intake Form</span>
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  </div>

                  {/* Server error */}
                  {serverError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-xs">
                      {serverError}
                    </div>
                  )}

                  {/* Names */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Field
                      label="First Name"
                      id="firstName"
                      type="text"
                      value={values.firstName}
                      error={getError("firstName")}
                      onChange={(v) => handleChange("firstName", v)}
                      onBlur={() => handleBlur("firstName")}
                      autoComplete="given-name"
                    />
                    <Field
                      label="Last Name"
                      id="lastName"
                      type="text"
                      value={values.lastName}
                      error={getError("lastName")}
                      onChange={(v) => handleChange("lastName", v)}
                      onBlur={() => handleBlur("lastName")}
                      autoComplete="family-name"
                    />
                  </div>

                  {/* Email */}
                  <Field
                    label="Email Address"
                    id="email"
                    type="email"
                    value={values.email}
                    error={getError("email")}
                    onChange={(v) => handleChange("email", v)}
                    onBlur={() => handleBlur("email")}
                    autoComplete="email"
                  />

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label htmlFor="message" className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold ml-1 block">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={values.message}
                      onChange={(e) => handleChange("message", e.target.value)}
                      onBlur={() => handleBlur("message")}
                      className={`w-full bg-[#050505] border rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-neutral-700 min-h-[120px] resize-none focus:outline-none focus:bg-white/5 transition-all ${
                        getError("message")
                          ? "border-red-500/50 focus:border-red-500/70"
                          : touched.message && !errors.message
                          ? "border-emerald-500/40 focus:border-emerald-500/60"
                          : "border-white/10 focus:border-white/40"
                      }`}
                    />
                    <div className="flex items-center justify-between px-1">
                      {getError("message") ? (
                        <p className="text-[10px] text-red-400">{getError("message")}</p>
                      ) : (
                        <span />
                      )}
                      <span className={`text-[10px] tabular-nums ${values.message.length > 1800 ? "text-red-400" : "text-neutral-600"}`}>
                        {values.message.length}/2000
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      size="lg"
                      type="submit"
                      className={`w-full rounded-xl bg-white text-black hover:bg-neutral-200 uppercase tracking-widest text-[10px] font-black h-14 transition-all duration-300 ${
                        !canSubmit && allTouched ? "opacity-40 cursor-not-allowed grayscale" : ""
                      }`}
                      disabled={pending}
                    >
                      {pending ? "Transmitting..." : "Initiate Uplink"}
                    </Button>
                  </div>
                </form>
              )}
            </TiltCard>
          </FadeIn>

        </div>
      </div>
    </div>
  );
}

// ─── Reusable Field Component ─────────────────────────────────────────────────

function Field({
  label, id, type, value, error, onChange, onBlur, autoComplete,
}: {
  label: string;
  id: FieldName;
  type: string;
  value: string;
  error: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  autoComplete?: string;
}) {
  const isValid = value.trim() !== "" && error === "";
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold ml-1 block">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`w-full bg-[#050505] border rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:bg-white/5 transition-all ${
          error
            ? "border-red-500/50 focus:border-red-500/70"
            : isValid
            ? "border-emerald-500/40 focus:border-emerald-500/60"
            : "border-white/10 focus:border-white/40"
        }`}
      />
      {error && (
        <p className="text-[10px] text-red-400 ml-1">{error}</p>
      )}
    </div>
  );
}