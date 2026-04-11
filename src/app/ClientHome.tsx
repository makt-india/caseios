"use client";

import Image from "next/image";
import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/Motion";
import { Button } from "@/components/ui/Button";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Product } from "@/lib/types";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function ClientHome({ products }: { products: Product[] }) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 80, damping: 25 });

  // Hero Text Animations
  const y1 = useTransform(smoothProgress, [0, 1], [0, 300]);
  const opacityHero = useTransform(smoothProgress, [0, 0.5], [1, 0]);
  const scaleHero = useTransform(smoothProgress, [0, 1], [1, 0.9]);
  
  // Phone Image Animations (Scales and moves up as you scroll)
  const phoneScale = useTransform(smoothProgress, [0, 1], [1, 1.2]);
  const phoneY = useTransform(smoothProgress, [0, 1], [0, -100]);
  const phoneRotate = useTransform(smoothProgress, [0, 1], [-10, 0]);

  return (
    <ErrorBoundary>
      <div className="w-full flex-col flex bg-[#050505] selection:bg-white/30 overflow-x-hidden">
        
        {/* 1. HERO SECTION */}
        <section ref={containerRef} className="relative min-h-[100svh] md:h-[120vh] flex items-center justify-center overflow-hidden w-full">
          {/* Studio Lighting Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[70vw] max-w-[900px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
          
          <motion.div 
            style={{ y: y1, opacity: opacityHero, scale: scaleHero }} 
            className="relative z-20 w-full max-w-7xl px-4 flex flex-col items-center text-center -mt-32 md:-mt-20"
          >
            <FadeInStagger className="flex flex-col items-center">
              <FadeInStaggerItem>
                <h1 className="text-[16vw] sm:text-8xl md:text-9xl lg:text-[160px] tracking-tight md:tracking-normal font-black 
                               bg-gradient-to-b from-[#ffffff] via-[#e2e2e2] to-[#333333] 
                               bg-clip-text text-transparent drop-shadow-[0_10px_40px_rgba(255,255,255,0.1)]
                               leading-[0.85] select-none pl-4">
                  AEROCASE
                </h1>
              </FadeInStaggerItem>
              
              <FadeInStaggerItem>
                <div className="flex items-center justify-center gap-2 sm:gap-6 my-8 w-full max-w-2xl mx-auto opacity-90">
                  <div className="hidden sm:block flex-1 h-px bg-gradient-to-r from-transparent to-white/40" />
                  <p className="text-[9px] sm:text-xs md:text-sm text-neutral-300 font-medium tracking-[0.3em] md:tracking-[0.4em] uppercase text-center px-4">
                    Aero-Grade Polymer <span className="text-white/50 mx-2 hidden sm:inline">•</span> Tactical Grip <span className="text-white/50 mx-2 hidden sm:inline">•</span> Pro Max Series
                  </p>
                  <div className="hidden sm:block flex-1 h-px bg-gradient-to-l from-transparent to-white/40" />
                </div>
              </FadeInStaggerItem>

              <FadeInStaggerItem>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6 md:mt-12 w-full max-w-xs sm:max-w-none">
                  <Button size="lg" className="w-full sm:w-auto px-10 rounded-full bg-white text-black hover:bg-neutral-200 transition-all duration-300 tracking-[0.15em] uppercase text-xs font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                    Shop Collection
                  </Button>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto px-10 rounded-full border border-white/20 bg-black/20 text-white hover:bg-white/10 hover:text-white backdrop-blur-md tracking-[0.15em] uppercase text-xs font-bold">
                    Tech Specs
                  </Button>
                </div>
              </FadeInStaggerItem>
            </FadeInStagger>
          </motion.div>

          {/* REALISTIC 3D RENDER IMAGE - UPGRADED */}
          <motion.div 
            style={{ 
              scale: phoneScale,
              y: phoneY,
              rotate: phoneRotate,
              perspective: "1200px" // Added for 3D depth perspective
            }}
            className="absolute z-10 bottom-[-5%] md:bottom-[-10%] w-[80%] max-w-[600px] pointer-events-none"
          >
            {/* Ambient Base Glow (matches the orange device lighting to seat the render perfectly) */}
            <div className="absolute inset-0 top-[20%] bg-gradient-to-t from-orange-600/15 via-white/5 to-transparent blur-[100px] rounded-full scale-125 -z-20 mix-blend-screen" />

            <motion.div
              animate={{ 
                y: [0, -20, 0],
                rotateX: [2, -2, 2], // Subtle parallax vertical tilt
                rotateY: [-3, 3, -3] // Subtle parallax horizontal tilt
              }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Soft Ground Reflection Layer */}
              <div className="absolute -bottom-[20%] left-0 w-full opacity-[0.35] blur-[8px] scale-y-[-1] pointer-events-none -z-10 [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_0%,rgba(0,0,0,0)_40%)]">
                <Image 
                  src="/images/iphone.png" 
                  alt="Aerocase Reflection"
                  width={1200}
                  height={1600}
                  className="w-full h-auto brightness-[0.3] contrast-150 saturate-50"
                />
              </div>

              {/* Main High-Res Render with Complex Studio Lighting Shadows */}
              <Image 
                src="/images/iphone.png" 
                alt="Aerocase iPhone Pro Max Orange"
                width={1200}
                height={1600}
                priority
                quality={100} // Forced ultra high-res Next Image optimization
                className="w-full h-auto relative z-10 
                           drop-shadow-[0_-2px_4px_rgba(255,255,255,0.4)]  /* Subtle Top Rim Light */
                           drop-shadow-[0_45px_80px_rgba(0,0,0,0.9)]       /* Deep Gravity Shadow */
                           drop-shadow-[0_20px_40px_rgba(255,100,0,0.15)]  /* Ambient Orange Bounce Light */
                           drop-shadow-[0_0_15px_rgba(255,255,255,0.08)]"  /* Specular Highlight Glow */
              />
            </motion.div>
          </motion.div>
        </section>

        {/* 2. PREMIUM GRID SHOWCASE */}
        <section className="py-24 md:py-40 w-full bg-[#050505] relative z-30 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col items-start mb-16 md:mb-24 border-l-2 border-white/10 pl-6 md:pl-8">
              <span className="text-[10px] md:text-xs tracking-[0.5em] text-neutral-500 uppercase mb-4">Structural Enclosures</span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-white italic">
                Device <span className="font-black not-italic text-neutral-500">Armor</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 border border-white/5">
              {products.map((product, index) => (
                <FadeIn delay={0.1 * index} key={product.id} className="bg-[#050505]">
                  <Link href={`/product/${product.id}`} className="group relative block aspect-[4/5] overflow-hidden">
                    <div className="absolute inset-0 bg-neutral-900/20 group-hover:bg-transparent transition-colors duration-700 z-10 pointer-events-none" />
                    
                    <motion.div 
                      className="w-full h-full p-8 md:p-12 flex items-center justify-center"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 100, damping: 30 }}
                    >
                      <Image
                        src={product.image || "/images/case-placeholder.png"} 
                        alt={product.name}
                        width={600}
                        height={800}
                        className="object-contain grayscale group-hover:grayscale-0 transition-all duration-1000 opacity-60 group-hover:opacity-100 drop-shadow-2xl"
                      />
                    </motion.div>

                    <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 z-20">
                      <p className="text-[9px] md:text-[10px] tracking-[0.3em] text-neutral-500 uppercase mb-2">{product.category} Series</p>
                      <h3 className="text-lg md:text-xl font-medium text-white tracking-tight">{product.name}</h3>
                      <div className="h-px w-0 group-hover:w-full bg-white transition-all duration-700 mt-4" />
                    </div>
                  </Link>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* 3. BRAND STATEMENT */}
        <section className="relative py-32 md:py-40 w-full overflow-hidden border-t border-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <FadeIn>
              <h2 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter mb-8 md:mb-12 text-white italic">
                FORM IS <span className="text-neutral-700">FUNCTION.</span>
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl text-neutral-400 font-extralight leading-relaxed max-w-3xl mx-auto">
                We don't build plastic shells. We engineer structural armor. 
                Stripping away the excess until only the <span className="text-white font-medium">Essential Silver</span> remains, protecting your device without hiding its native design.
              </p>
              <div className="mt-12 md:mt-16 inline-block group">
                 <Link href="/about" className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase text-white flex items-center gap-4">
                    Our Metallurgy Process 
                    <span className="w-8 md:w-12 h-px bg-white group-hover:w-16 md:group-hover:w-20 transition-all duration-500" />
                 </Link>
              </div>
            </FadeIn>
          </div>
        </section>
      </div>
    </ErrorBoundary>
  );
}