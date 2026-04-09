"use client";

import { useActionState } from "react";
import { registerUser } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { UserPlus } from "lucide-react";

export function RegisterForm({ csrfToken }: { csrfToken: string }) {
  const [state, formAction, pending] = useActionState(registerUser, null);

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-background px-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] ambient-glow bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-transparent" />
      
      <div className="relative z-10 w-full max-w-md glass p-10 rounded-[2.5rem] border border-white/10 shadow-2xl">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
             <UserPlus className="w-8 h-8 text-white/50" />
          </div>
        </div>
        
        <h2 className="text-3xl font-medium tracking-tight mb-2 text-center text-white">Create Account</h2>
        <p className="text-muted-foreground text-center mb-8 text-sm">Join CASIOS for premium checkout.</p>
        
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="_csrf" value={csrfToken} />
          
           {state?.error && (
             <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
               {state.error}
             </div>
           )}

           <div>
             <input type="text" name="name" placeholder="Full Name" required className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-5 py-4 text-sm text-foreground focus:outline-none focus:border-white/30 transition-colors" disabled={pending} />
           </div>
           <div>
             <input type="email" name="email" placeholder="Email Address" required className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-5 py-4 text-sm text-foreground focus:outline-none focus:border-white/30 transition-colors" disabled={pending} />
           </div>
           <div>
             <input type="password" name="password" placeholder="Password (min 8 chars)" required minLength={8} className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-5 py-4 text-sm text-foreground focus:outline-none focus:border-white/30 transition-colors" disabled={pending} />
           </div>
           <Button type="submit" size="lg" className="w-full rounded-xl bg-white text-black hover:bg-zinc-200" disabled={pending}>
             {pending ? "Creating Account..." : "Register"}
           </Button>
           
           <div className="text-center mt-6">
             <p className="text-sm text-muted-foreground">
               Already have an account? <a href="/login" className="text-white hover:underline">Log In</a>
             </p>
           </div>
        </form>
      </div>
    </div>
  );
}
