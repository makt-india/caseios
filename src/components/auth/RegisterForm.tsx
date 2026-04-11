"use client";

import { useActionState, useState, useCallback } from "react";
import { registerUser } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { UserPlus } from "lucide-react";

// ─── Validation Rules ──────────────────────────────────────────────────────────

const RULES = {
  name: {
    regex: /^[A-Za-zÀ-ÖØ-öø-ÿ\s]{2,50}$/,
    message: "2–50 letters and spaces only",
  },
  email: {
    regex: /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,
    message: "Enter a valid email address",
  },
  password: {
    regex: /^.{8,100}$/,
    message: "Password must be at least 8 characters",
  },
} as const;

type FieldName = keyof typeof RULES;

function validate(field: FieldName, value: string): string {
  if (!value) return "This field is required";
  // Name trimming for regex
  const valToTest = field === "name" ? value.trim() : value;
  return RULES[field].regex.test(valToTest) ? "" : RULES[field].message;
}

export function RegisterForm({ csrfToken }: { csrfToken: string }) {
  const [state, formAction, pending] = useActionState(registerUser, null);

  const [values, setValues] = useState({
    name:     "",
    email:    "",
    password: "",
  });

  const [errors, setErrors] = useState<Record<FieldName, string>>({
    name:     "",
    email:    "",
    password: "",
  });

  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    name:     false,
    email:    false,
    password: false,
  });

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

  function handleClientValidation(e: React.FormEvent<HTMLFormElement>) {
    // Touch all fields on submit attempt
    const allTouchedState = { name: true, email: true, password: true };
    setTouched(allTouchedState);

    const newErrors = {
      name:     validate("name",     values.name),
      email:    validate("email",    values.email),
      password: validate("password", values.password),
    };
    setErrors(newErrors);

    if (Object.values(newErrors).some((e) => e !== "")) {
      // Prevent server action from firing if client validation fails
      e.preventDefault();
    }
  }

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
        <p className="text-muted-foreground text-center mb-8 text-sm">Join CASEIOS for premium checkout.</p>
        
        <form action={formAction} onSubmit={handleClientValidation} noValidate className="space-y-6">
          <input type="hidden" name="_csrf" value={csrfToken} />
          
           {state?.error && (
             <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
               {state.error}
             </div>
           )}

           <Field
             label="Full Name"
             id="name"
             type="text"
             value={values.name}
             error={getError("name")}
             onChange={(v) => handleChange("name", v)}
             onBlur={() => handleBlur("name")}
             disabled={pending}
           />
           
           <Field
             label="Email Address"
             id="email"
             type="email"
             value={values.email}
             error={getError("email")}
             onChange={(v) => handleChange("email", v)}
             onBlur={() => handleBlur("email")}
             disabled={pending}
           />
           
           <Field
             label="Password"
             id="password"
             type="password"
             value={values.password}
             error={getError("password")}
             onChange={(v) => handleChange("password", v)}
             onBlur={() => handleBlur("password")}
             disabled={pending}
           />

           <Button 
             type="submit" 
             size="lg" 
             className={`w-full rounded-xl bg-white text-black hover:bg-zinc-200 transition-all duration-300 ${
               !canSubmit && allTouched ? "opacity-40 cursor-not-allowed grayscale" : ""
             }`} 
             disabled={pending}
           >
             {pending ? "Creating Account..." : "Register"}
           </Button>
           
           <div className="text-center mt-6">
             <p className="text-sm text-muted-foreground">
               Already have an account? <a href="/login" className="text-white hover:underline transition-colors">Log In</a>
             </p>
           </div>
        </form>
      </div>
    </div>
  );
}

// ─── Reusable Field Component ─────────────────────────────────────────────────

function Field({
  label, id, type, value, error, onChange, onBlur, disabled
}: {
  label: string;
  id: FieldName;
  type: string;
  value: string;
  error: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  disabled?: boolean;
}) {
  const isValid = value.trim() !== "" && error === "";
  return (
    <div className="space-y-1.5 text-left">
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={label}
        disabled={disabled}
        className={`w-full bg-zinc-950 border rounded-2xl px-5 py-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition-all ${
          error
            ? "border-red-500/50 focus:border-red-500/70 bg-red-950/20"
            : isValid
            ? "border-emerald-500/40 focus:border-emerald-500/60"
            : "border-white/10 focus:border-white/30"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      />
      {error && (
        <p className="text-[10px] text-red-400 ml-2 animate-in fade-in slide-in-from-top-1">{error}</p>
      )}
    </div>
  );
}
