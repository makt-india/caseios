"use client";

import { useCart } from "./CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export function GlobalToast() {
  const { toastMessage } = useCart();

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ y: -50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] glass px-6 py-4 rounded-full border border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex items-center gap-3 backdrop-blur-2xl"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <p className="text-sm font-medium text-white tracking-wide">{toastMessage}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
