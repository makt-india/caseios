import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartProvider } from "@/components/cart/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { GlobalToast } from "@/components/cart/GlobalToast";
import { getCurrentUser } from "@/lib/auth";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CASEIOS | Premium Commerce",
  description: "Next generation digital checkout & shopping experience.",
  openGraph: {
    title: "CASEIOS | Premium Commerce",
    description: "Next generation digital checkout & shopping experience.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // React cache() in getCurrentUser() deduplicates this across all
  // server components in the same request (admin page, checkout, etc.)
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${inter.variable} dark`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col">
        <CartProvider>
          <Navbar user={user} />
          <GlobalToast />
          <CartDrawer />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
