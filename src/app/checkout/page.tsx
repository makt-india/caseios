import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientCheckout from "./ClientCheckout";

export default async function CheckoutRoute() {
  let user;
  try {
    user = await requireAuth();
  } catch (error) {
    redirect("/login");
  }

  return <ClientCheckout user={{ id: user.id, name: user.name, email: user.email }} />;
}
