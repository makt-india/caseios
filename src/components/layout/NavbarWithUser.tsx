import { getCurrentUser } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";

/**
 * Server component that reads the current user (cookies → DB) and renders the Navbar.
 * Wrapped in Suspense from the root layout so it can stream in after the static shell.
 * This is the correct pattern with cacheComponents: true — request-time data
 * (cookies) must be isolated from static parts of the layout.
 */
export async function NavbarWithUser() {
  const user = await getCurrentUser();
  return <Navbar user={user} />;
}
