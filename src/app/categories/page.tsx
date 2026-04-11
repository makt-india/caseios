"use client";

import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/Motion";
import { TiltCard } from "@/components/ui/TiltCard";
import Link from "next/link";

export default function CategoriesPage() {
  // Updated categories to fit the "Premium iPhone Case" brand
  const categories = [
    { 
      name: "Titanium Forge", 
      desc: "Grade 5 aerospace alloy. The absolute pinnacle of strength-to-weight ratio.", 
      id: "01", 
      tag: "Maximum Armor" 
    },
    { 
      name: "Aero-Aluminum", 
      desc: "CNC-machined aircraft-grade aluminum with ion-plated, fingerprint-resistant finishes.", 
      id: "02", 
      tag: "Everyday Carry" 
    },
    { 
      name: "Rimless Exoskeleton", 
      desc: "Minimalist architectural designs maximizing original hardware exposure and heat dissipation.", 
      id: "03", 
      tag: "Ultra-Minimalist" 
    },
    { 
      name: "Carbon Matrix", 
      desc: "Ultra-light tactical carbon fiber weaves engineered for advanced kinetic impact dispersal.", 
      id: "04", 
      tag: "Tactical Hybrid" 
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[#050505] selection:bg-white/30 pt-40 pb-32 px-6 relative overflow-hidden">
      
      {/* Background Architectural Grid */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Page Header */}
        <FadeIn className="mb-24 md:mb-32">
          <div className="flex flex-col items-start border-l-2 border-white/20 pl-8">
            <span className="text-[10px] md:text-xs tracking-[0.5em] text-neutral-500 uppercase mb-4 font-bold">
              Material Index
            </span>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white italic leading-none">
              THE <span className="font-light not-italic text-neutral-600">ARCHIVES.</span>
            </h1>
            <p className="mt-8 text-sm md:text-base text-neutral-400 font-light tracking-widest max-w-xl leading-relaxed uppercase">
              Select your chassis. Every collection is engineered to exacting tolerances for specific environmental demands.
            </p>
          </div>
        </FadeIn>

        {/* 3D Category Grid */}
        <FadeInStagger className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {categories.map((cat) => (
            <FadeInStaggerItem key={cat.id}>
              <Link href={`/shop?category=${cat.name.toLowerCase().replace(' ', '-')}`} className="block group">
                <TiltCard 
                  tiltAmount={4} 
                  className="relative h-[380px] rounded-[32px] bg-[#0a0a0a] border border-white/5 overflow-hidden flex flex-col justify-between p-10 md:p-12 transition-all duration-700 hover:border-white/20"
                >
                  {/* Hover Glow Effect */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] group-hover:bg-white/10 transition-colors duration-700 pointer-events-none" />
                  
                  {/* Large Background Number */}
                  <div className="absolute bottom-[-10%] right-[-5%] text-[200px] font-black italic text-white/[0.02] pointer-events-none select-none group-hover:scale-110 transition-transform duration-1000">
                    {cat.id}
                  </div>

                  {/* Top Section: Tag & ID */}
                  <div className="flex justify-between items-start w-full relative z-10">
                    <span className="px-3 py-1 border border-white/20 rounded-full text-[9px] tracking-[0.2em] text-white uppercase backdrop-blur-md">
                      {cat.tag}
                    </span>
                    <span className="text-neutral-600 font-mono text-sm tracking-widest">
                      // {cat.id}
                    </span>
                  </div>

                  {/* Bottom Section: Title & Description */}
                  <div className="relative z-10 transform group-hover:-translate-y-2 transition-transform duration-500">
                    <h3 className="text-3xl md:text-4xl font-bold mb-4 text-white tracking-tight">
                      {cat.name}
                    </h3>
                    <p className="text-neutral-500 text-sm md:text-base leading-relaxed font-light max-w-md">
                      {cat.desc}
                    </p>
                    
                    {/* Animated "Explore" Link */}
                    <div className="mt-8 flex items-center gap-4 text-white text-[10px] tracking-[0.3em] font-bold uppercase opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                      Explore Collection <span className="h-px w-12 bg-white" />
                    </div>
                  </div>
                </TiltCard>
              </Link>
            </FadeInStaggerItem>
          ))}
        </FadeInStagger>
        
      </div>
    </div>
  );
}