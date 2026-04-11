"use client";

import { useCart } from "./CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function CartDrawer() {
  const { cartItems, isOpen, setIsOpen, updateQuantity, cartTotal, cartReady } = useCart();

  // Don't render drawer content until cart is hydrated from localStorage
  if (!cartReady) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
            className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-zinc-950 border-l border-white/10 z-[101] shadow-2xl flex flex-col"
          >
            <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-medium tracking-tight text-white">Your Cart</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                  <ShoppingBag className="w-12 h-12 opacity-20" />
                  <p>Your cart is empty.</p>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:underline text-sm"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-24 h-24 bg-white/5 rounded-xl border border-white/10 relative flex-shrink-0 overflow-hidden flex items-center justify-center p-2">
                      <Image src={item.image || "/images/hero.png"} alt={item.name} fill sizes="96px" className="object-contain" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">{item.category}</p>
                            <h3 className="font-medium text-white">{item.name}</h3>
                          </div>
                          <p className="font-medium text-white/80">₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center border border-white/10 rounded-lg overflow-hidden bg-white/5">
                          <button
                            className="p-2 hover:bg-white/10 text-muted-foreground transition-colors"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm text-white">{item.quantity}</span>
                          <button
                            className="p-2 hover:bg-white/10 text-muted-foreground transition-colors"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => updateQuantity(item.id, 0)}
                          className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="p-6 border-t border-white/10 bg-black/50 backdrop-blur-xl">
                <div className="flex justify-between items-center mb-6 text-lg">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-bold tracking-tight text-white">₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <Link href="/checkout" onClick={() => setIsOpen(false)}>
                  <button className="w-full bg-white text-black hover:bg-white/90 py-4.5 rounded-2xl font-semibold tracking-tight transition-all duration-300 transform active:scale-[0.98]">
                    Checkout Now
                  </button>
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
