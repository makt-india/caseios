"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, Package, Settings, LogIn, UserPlus } from "lucide-react";
import { logoutUserAction } from "@/app/actions";
import { cn } from "@/lib/utils";

interface UserNavProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export function UserNav({ user }: UserNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 group"
      >
        <User className={cn("w-5 h-5 transition-colors", isOpen ? "text-white" : "text-white/70 group-hover:text-white")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 mt-3 w-64 glass rounded-3xl border border-white/10 shadow-2xl overflow-hidden z-[60]"
          >
            {user ? (
              <>
                <div className="px-6 py-5 border-b border-white/5">
                  <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                  <p className="text-xs text-white/50 truncate mt-0.5">{user.email}</p>
                  <span className="inline-block px-2 py-0.5 bg-white/10 border border-white/10 rounded-full text-[10px] text-white/70 mt-2 uppercase tracking-wider font-bold">
                    {user.role}
                  </span>
                </div>
                <div className="p-2">
                  <Link
                    href="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white/70 hover:text-white hover:bg-white/5 transition-colors group"
                  >
                    <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">My Profile</span>
                  </Link>
                  <Link
                    href="/profile#orders"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white/70 hover:text-white hover:bg-white/5 transition-colors group"
                  >
                    <Package className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">My Orders</span>
                  </Link>
                  {user.role === "admin" && (
                    <Link
                      href="/admin"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white/70 hover:text-white hover:bg-white/5 transition-colors group"
                    >
                      <Settings className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span className="text-sm">Admin Dashboard</span>
                    </Link>
                  )}
                </div>
                <div className="p-2 border-t border-white/5">
                  <button
                    onClick={async () => {
                      setIsOpen(false);
                      await logoutUserAction();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors group text-left"
                  >
                    <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="p-2">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white/70 hover:text-white hover:bg-white/5 transition-colors group"
                >
                  <LogIn className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">Sign In</span>
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white/70 hover:text-white hover:bg-white/5 transition-colors group"
                >
                  <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">Create Account</span>
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
