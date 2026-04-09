"use client";

import { FadeIn } from "@/components/ui/Motion";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { submitContactMessage } from "@/app/actions";
import { CheckCircle } from "lucide-react";

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    await submitContactMessage(formData);
    setPending(false);
    setIsSubmitted(true);
  }

  return (
    <div className="flex-1 w-full pt-32 pb-24 px-6 max-w-3xl mx-auto min-h-screen">
      <FadeIn>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 text-center">Contact Us</h1>
        <p className="text-xl text-muted-foreground mb-16 text-center font-light">
          Have a question about your order or our products? We're here to help.
        </p>

        {isSubmitted ? (
           <div className="glass p-16 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center">
              <CheckCircle className="w-16 h-16 text-emerald-400 mb-6" />
              <h2 className="text-2xl font-semibold mb-2">Message Received</h2>
              <p className="text-muted-foreground">Our concierge team will get back to you shortly.</p>
           </div>
        ) : (
          <form action={handleSubmit} className="glass p-10 rounded-3xl space-y-6 border border-white/5">
            <div className="grid grid-cols-2 gap-6">
              <input type="text" name="firstName" placeholder="First Name" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-white/30" />
              <input type="text" name="lastName" placeholder="Last Name" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-white/30" />
            </div>
            <input type="email" name="email" placeholder="Email Address" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-white/30" />
            <textarea name="message" placeholder="Your Message" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm min-h-[150px] focus:outline-none focus:border-white/30" />
            <Button size="lg" className="w-full" disabled={pending}>
              {pending ? "Sending..." : "Send Message"}
            </Button>
          </form>
        )}
      </FadeIn>
    </div>
  );
}
