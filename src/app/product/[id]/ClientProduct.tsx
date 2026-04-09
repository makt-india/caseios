"use client";

import Image from "next/image";
import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/Motion";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { Product } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ClientProduct({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image || "/images/hero.png",
      category: product.category,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (!product) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center pt-24 px-6 md:px-12 lg:px-24">
        <h1 className="text-4xl">Product not found</h1>
        <Link href="/" className="mt-4 text-muted-foreground hover:text-foreground">
          &larr; Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full flex-col flex min-h-screen pt-24 px-6 md:px-12 lg:px-24">
      <FadeIn className="mb-8">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Discover
        </Link>
      </FadeIn>

      <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 mb-32 relative">
        {/* Left: Sticky Image Preview */}
        <div className="w-full lg:w-1/2">
          <div className="sticky top-32 glass rounded-[2.5rem] p-12 aspect-square flex items-center justify-center relative overflow-visible border-white/[0.05]">
             {/* Subdued glow behind product */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] ambient-glow bg-white/5 rounded-full blur-[80px]" />
             <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent z-10 rounded-[2.5rem]" />
             
             <FadeIn delay={0.2} className="relative z-20 w-full h-full transform-gpu will-change-transform">
                <Image
                  src={product.image || "/images/hero.png"}
                  alt={product.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.9)] scale-110 group-hover:scale-125 transition-transform duration-700 transform-gpu will-change-transform"
                />
             </FadeIn>
          </div>
        </div>

        {/* Right: Product Details Panel */}
        <div className="w-full lg:w-1/2 pt-10">
          <FadeInStagger className="space-y-10 max-w-md">
            <FadeInStaggerItem>
              <p className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase opacity-70 mb-4">
                {product.category}
              </p>
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter mt-2 mb-6 leading-none">
                {product.name}
              </h1>
              <p className="text-3xl font-light text-white/90">₹{product.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </FadeInStaggerItem>

            <FadeInStaggerItem>
              <p className="text-base text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </FadeInStaggerItem>

            <FadeInStaggerItem>
              <div className="border-t border-white/10 pt-8 mt-8">
                <h3 className="text-sm font-medium uppercase tracking-wider mb-4">Tech Specs</h3>
                <ul className="space-y-3">
                  <li className="flex items-center text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 bg-white/20 rounded-full mr-3" />
                    Premium Build Quality
                  </li>
                  <li className="flex items-center text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 bg-white/20 rounded-full mr-3" />
                    Advanced Engineering
                  </li>
                </ul>
              </div>
            </FadeInStaggerItem>

            <FadeInStaggerItem className="pt-10">
              <Button 
                size="lg" 
                className={`w-full rounded-2xl h-16 text-lg tracking-wide transition-all duration-500 overflow-hidden relative group ${added ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]'}`}
                onClick={handleAddToCart}
                disabled={added}
              >
                <div className={`absolute inset-0 bg-white/20 transition-transform duration-500 origin-left ${added ? "scale-x-100" : "scale-x-0"}`} />
                <span className="relative z-10 flex items-center justify-center font-medium">
                  {added ? (
                    <>
                      <Check className="w-5 h-5 mr-3" />
                      Added to Cart
                    </>
                  ) : (
                    "Add to Bag"
                  )}
                </span>
              </Button>
            </FadeInStaggerItem>

            <FadeInStaggerItem className="pt-6">
              <div className="flex flex-col gap-3 py-4 text-sm text-emerald-400/90 font-medium bg-emerald-400/10 rounded-2xl px-6 border border-emerald-400/20">
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Free Express Delivery across India 🇮🇳
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  Cash on Delivery Available
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  100% Encrypted Payment Gateway
                </div>
              </div>
            </FadeInStaggerItem>

            {/* Spec / Trust Accordions */}
            <FadeInStaggerItem className="pt-12 border-t border-white/10 mt-12 space-y-6">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold tracking-widest uppercase text-white mb-2">Technical Specifications</h4>
                <p className="text-sm text-muted-foreground/80 leading-relaxed font-light">
                  Engineered with an ultra-lightweight aerospace-grade chassis. Equipped with next-generation neural processing arrays and dual solid-state energy cells for limitless endurance.
                </p>
              </div>
              <div className="space-y-2 pt-6 border-t border-white/10">
                <h4 className="text-sm font-semibold tracking-widest uppercase text-white mb-2">Warranty & Support</h4>
                <p className="text-sm text-muted-foreground/80 leading-relaxed font-light">
                  Includes 2-year CASIOS India Protection+. Complete replacement guarantees against all manufacturer anomalies with 24/7 priority encrypted support.
                </p>
              </div>
            </FadeInStaggerItem>
          </FadeInStagger>
        </div>
      </div>
    </div>
  );
}
