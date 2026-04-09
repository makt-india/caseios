"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  quantity: number;
};

type CartContextType = {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  cartTotal: number;
  cartCount: number; // total item count for badge
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;
  clearCart: () => void;
  cartReady: boolean; // true once localStorage has been hydrated
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // cartReady: false until localStorage is read — used to gate cart-specific UI only
  const [cartReady, setCartReady] = useState(false);

  // Hydrate from localStorage after mount — this is the only place we read storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cart");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCartItems(parsed);
        }
      }
    } catch (e) {
      console.warn("[Cart] Failed to load cart from localStorage:", e);
    } finally {
      setCartReady(true);
    }
  }, []);

  // Persist cart to localStorage whenever it changes (skip before hydration)
  useEffect(() => {
    if (!cartReady) return;
    try {
      localStorage.setItem("cart", JSON.stringify(cartItems));
    } catch (e) {
      console.warn("[Cart] Failed to persist cart to localStorage:", e);
    }
  }, [cartItems, cartReady]);

  const addToCart = useCallback((item: Omit<CartItem, "quantity">) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setIsOpen(true);
    setToastMessage(`Added ${item.name} to your bag`);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    setCartItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // INTENTIONALLY always render children — never return null here.
  // Blocking the entire tree caused a full-page flash on every SSR render.
  // Cart-specific UI (drawer, badge) should check `cartReady` independently.
  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        cartTotal,
        cartCount,
        isOpen,
        setIsOpen,
        toastMessage,
        setToastMessage,
        clearCart,
        cartReady,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
