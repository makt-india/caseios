"use client";

import Link from "next/link";
import { ShoppingBag, Search, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
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

export function Navbar({ user = null }: NavbarProps) {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cartItems, setIsOpen } = useCart();
  
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
    setScrolled(latest > 50);
  });

  return (
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
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button className="md:hidden text-foreground/80 hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" className="font-extrabold tracking-[0.2em] text-xl ml-2 md:ml-0 text-white drop-shadow-md">
            CASIOS
          </Link>
        </div>

        <nav className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
          <Link href="/shop" className="hover:text-foreground transition-colors tracking-wide">Products</Link>
          <Link href="/categories" className="hover:text-foreground transition-colors tracking-wide">Categories</Link>
          <Link href="/about" className="hover:text-foreground transition-colors tracking-wide">About</Link>
          <Link href="/contact" className="hover:text-foreground transition-colors tracking-wide">Contact</Link>
        </nav>

        <div className="flex items-center gap-5 text-foreground/80">
          <button className="hover:text-foreground transition-colors hidden sm:block">
            <Search className="w-5 h-5" />
          </button>
          <button 
            className="hover:text-foreground transition-colors relative"
            onClick={() => setIsOpen(true)}
          >
            <ShoppingBag className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black border border-black shadow">
                {totalItems}
              </span>
            )}
          </button>
          <UserNav user={user} />
        </div>
      </div>
    </motion.header>
  );
}
