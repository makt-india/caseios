"use client";

import Link from "next/link";
import { ShoppingBag, Search, Menu, X } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { useCart } from "@/components/cart/CartContext";
import { UserNav } from "./UserNav";

interface NavbarProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

const navLinks = [
  { href: "/shop", label: "Products" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar({ user = null }: NavbarProps) {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { cartItems, setIsOpen } = useCart();

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 150) {
      setHidden(true);
      setMobileOpen(false); // close mobile menu on scroll down
    } else {
      setHidden(false);
    }
    setScrolled(latest > 50);
  });

  return (
    <>
      <motion.header
        variants={{
          visible: { y: 0 },
          hidden: { y: "-100%" },
        }}
        animate={hidden ? "hidden" : "visible"}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b border-transparent",
          scrolled ? "glass border-b-white/5" : "bg-transparent py-2"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile menu toggle */}
            <button
              className="md:hidden text-foreground/80 hover:text-foreground p-1 -ml-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/" className="flex items-center gap-4 drop-shadow-lg">
              <Image
                src="/images/logo1.png"
                alt="CASEIOS Logo"
                width={80}
                height={80}
                style={{ width: 'auto', height: '80px' }}
                className="object-contain"
                priority
              />
              <span className="font-extrabold tracking-[0.2em] text-2xl text-white mt-1">
                CASEIOS
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-foreground transition-colors tracking-wide"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-5 text-foreground/80">
            <button className="hover:text-foreground transition-colors hidden sm:block" aria-label="Search">
              <Search className="w-5 h-5" />
            </button>
            <button
              className="hover:text-foreground transition-colors relative min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={() => setIsOpen(true)}
              aria-label={`Cart (${totalItems} items)`}
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black border border-black shadow">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </button>
            <UserNav user={user} />
          </div>
        </div>
      </motion.header>

      {/* Mobile slide-down navigation panel */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="fixed top-24 inset-x-0 z-40 md:hidden glass border-b border-white/10 overflow-hidden"
          >
            <nav className="flex flex-col px-6 py-4 gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-3 px-4 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl transition-all tracking-wide min-h-[44px] flex items-center"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay backdrop for mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 md:hidden bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
