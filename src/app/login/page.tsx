import { LoginForm } from "@/components/auth/LoginForm";
import { generateCSRFToken } from "@/lib/csrf";

export default function LoginPage() {
  const csrfToken = generateCSRFToken();

  return <LoginForm csrfToken={csrfToken} />;
}
