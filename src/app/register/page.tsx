import { RegisterForm } from "@/components/auth/RegisterForm";
import { generateCSRFToken } from "@/lib/csrf";

export default function RegisterPage() {
  const csrfToken = generateCSRFToken();

  return <RegisterForm csrfToken={csrfToken} />;
}
