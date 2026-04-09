"use client";

import Image from "next/image";
import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/Motion";
import { TiltCard } from "@/components/ui/TiltCard";
import { Button } from "@/components/ui/Button";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Product } from "@/lib/types";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ClientHome({ products }: { products: Product[] }) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <ErrorBoundary>
      <div className="w-full flex-col flex overflow-hidden">
      {/* 1. Hero Section with Parallax */}
      <section ref={containerRef} className="relative h-screen flex items-center justify-center overflow-hidden w-full">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] ambient-glow bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-white/10" />
        
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(5,5,5,1)_80%)]" />
        
        <motion.div style={{ y: y1, opacity: opacityHero }} className="relative z-10 w-full max-w-7xl px-6 flex flex-col items-center text-center">
          <FadeInStagger className="space-y-6">
            <FadeInStaggerItem>
              <h1 className="text-6xl md:text-8xl lg:text-[140px] tracking-tighter font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 leading-[1.1] pb-2 text-glow">
                C A S I O S
              </h1>
            </FadeInStaggerItem>
            <FadeInStaggerItem>
              <p className="text-base md:text-xl text-muted-foreground/80 max-w-xl mx-auto font-light tracking-wide">
                The intersection of design and pure performance. Elevate your everyday.
              </p>
            </FadeInStaggerItem>
            <FadeInStaggerItem>
              <div className="flex gap-4 justify-center mt-8">
                <Button size="lg" className="px-8 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                  Explore Collection
                </Button>
                <Button size="lg" variant="secondary" className="px-8 rounded-full border-none bg-white/5 hover:bg-white/10 backdrop-blur-md">
                  View Latest
                </Button>
              </div>
            </FadeInStaggerItem>
          </FadeInStagger>
        </motion.div>

        <motion.div 
          className="absolute z-20 bottom-[-5%] md:bottom-[-20%] w-[130%] md:w-[90%] max-w-6xl pointer-events-none transform-gpu will-change-transform"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image
            src="/images/hero.png"
            alt="Hero Drone"
            width={1800}
            height={1000}
            sizes="(max-width: 768px) 130vw, (max-width: 1200px) 90vw, 1800px"
            className="w-full h-auto drop-shadow-[0_40px_80px_rgba(0,0,0,0.8)] object-contain opacity-90 transform-gpu will-change-transform"
            priority
          />
        </motion.div>
      </section>

      {/* 2. Premium Grid Showcase */}
      <section className="py-32 w-full bg-background relative z-30 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-16 text-center">
              Engineering <span className="text-muted-foreground">Excellence</span>
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.length === 0 ? (
              <div className="col-span-full py-10 text-center text-muted-foreground border border-white/5 glass rounded-3xl">
                No products dropping yet.
              </div>
            ) : (
              products.map((product, index) => (
                <FadeIn delay={0.1 * index} key={product.id} className="perspective-container">
                  <Link href={`/product/${product.id}`} className="block h-full">
                    <TiltCard tiltAmount={12} className="group relative h-[500px] rounded-3xl overflow-hidden glass hover:glass-hover cursor-pointer block">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 pointer-events-none" />
                      <div className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06)_0%,transparent_60%)]" />
                      
                      <motion.div 
                        className="w-full h-full relative z-10 transform-gpu will-change-transform"
                        whileHover={{ scale: 1.08 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <Image
                          src={product.image || "/images/hero.png"}
                          alt={product.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-contain p-12 opacity-80 group-hover:opacity-100 transition-all duration-700 drop-shadow-2xl transform-gpu will-change-transform"
                        />
                      </motion.div>
                      
                      <div className="absolute inset-0 z-20 p-8 flex flex-col justify-end pointer-events-none">
                        <div style={{ transform: 'translateZ(40px)' }}>
                          <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] mb-3 text-white/50">{product.category}</p>
                          <h3 className="text-2xl sm:text-3xl font-semibold mb-4 tracking-tight drop-shadow-md pb-10">{product.name}</h3>
                        </div>
                        <Button variant="ghost" className="absolute bottom-8 left-8 w-fit px-0 py-2 hover:bg-transparent tracking-widest text-[10px] sm:text-xs uppercase opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-4 group-hover:translate-x-0 pointer-events-auto">
                          View details &rarr;
                        </Button>
                      </div>
                    </TiltCard>
                  </Link>
                </FadeIn>
              ))
            )}
          </div>
        </div>
      </section>
      
      {/* 3. Deep Dive / Category Feature */}
      <section className="py-20 w-full min-h-[70vh] flex items-center justify-center border-t border-white/5 relative overflow-hidden">
         <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1618365908648-e71ad8b74681?auto=format&fit=crop&q=80')] bg-cover bg-center grayscale" />
         <div className="absolute inset-0 bg-background/80 backdrop-blur-3xl" />
         
         <div className="relative z-10 text-center max-w-3xl px-6">
            <FadeIn>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8 bg-clip-text text-transparent bg-white drop-shadow-lg">
                Performance Meets Aesthetic.
              </h2>
              <p className="text-lg text-muted-foreground font-light mb-10 leading-relaxed">
                We believe that technology should be an invisible enabler. Our design philosophy
                strips away the unnecessary, leaving only absolute purity in form and function.
              </p>
              <Button size="lg" variant="secondary">Read Our Philosophy</Button>
            </FadeIn>
         </div>
      </section>
    </div>
    </ErrorBoundary>
  );
}
