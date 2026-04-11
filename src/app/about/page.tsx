"use client";

import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/Motion";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="w-full min-h-screen bg-[#050505] selection:bg-white/30 pt-32 pb-24 relative overflow-hidden">
      
      {/* Architectural Blueprint Background */}
      <div className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_60%_100%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* Ambient Studio Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-white/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative z-10 flex flex-col items-center">
        
        {/* Page Header */}
        <FadeIn className="text-center w-full mt-12 md:mt-24 mb-24 md:mb-32">
          <span className="text-[10px] md:text-xs tracking-[0.5em] text-neutral-500 uppercase mb-6 block font-bold">
            The Foundry
          </span>
          <h1 className="text-5xl md:text-8xl lg:text-[120px] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-[#d1d1d1] to-[#333] italic leading-none mb-12 drop-shadow-[0_10px_30px_rgba(255,255,255,0.1)]">
            FORGED IN <br /> <span className="font-light not-italic text-neutral-500">SILVER.</span>
          </h1>
        </FadeIn>

        {/* Brand Ethos Dossier */}
        <FadeInStagger className="w-full max-w-3xl space-y-16 md:space-y-24">
          
          <FadeInStaggerItem>
            <div className="border-l-2 border-white/20 pl-6 md:pl-10 group hover:border-white transition-colors duration-500">
              <span className="text-[9px] text-neutral-600 tracking-[0.3em] font-mono mb-2 block">// 01</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">The Vision</h2>
              <p className="text-base md:text-lg text-neutral-400 font-light leading-relaxed">
                CASEIOS was founded on a singular engineering principle: Absolute device protection should not compromise original hardware design. We saw an industry saturated with bulky plastics, cheap rubber, and planned obsolescence. We chose a different path.
              </p>
            </div>
          </FadeInStaggerItem>

          <FadeInStaggerItem>
            <div className="border-l-2 border-white/20 pl-6 md:pl-10 group hover:border-white transition-colors duration-500">
              <span className="text-[9px] text-neutral-600 tracking-[0.3em] font-mono mb-2 block">// 02</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">The Metallurgy</h2>
              <p className="text-base md:text-lg text-neutral-400 font-light leading-relaxed">
                We don't mold shells; we forge armor. Utilizing aerospace-grade aluminum, Grade 5 Titanium, and CNC-machined 316L stainless steel, every CASEIOS enclosure is milled to a strict tolerance of 0.1mm. Cold to the touch, impenetrable by design.
              </p>
            </div>
          </FadeInStaggerItem>
          
          <FadeInStaggerItem>
            <div className="border-l-2 border-white/20 pl-6 md:pl-10 group hover:border-white transition-colors duration-500">
              <span className="text-[9px] text-neutral-600 tracking-[0.3em] font-mono mb-2 block">// 03</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">The Architecture</h2>
              <p className="text-base md:text-lg text-neutral-400 font-light leading-relaxed">
                Our rimless exoskeleton designs maximize heat dissipation while defending the most vulnerable impact points of your device. Kinetic dispersal technology routes shockwaves entirely through the metallic frame, bypassing the fragile glass chassis of your iPhone.
              </p>
            </div>
          </FadeInStaggerItem>

        </FadeInStagger>

        {/* CTA Footer */}
        <FadeIn className="mt-32 pt-16 border-t border-white/10 w-full text-center">
          <Link href="/shop" className="inline-flex flex-col items-center group cursor-pointer">
             <span className="text-white text-xs tracking-[0.4em] uppercase font-bold mb-4 group-hover:text-neutral-300 transition-colors">
               View The Arsenal
             </span>
             <div className="w-px h-12 bg-white/20 group-hover:bg-white group-hover:h-24 transition-all duration-500" />
          </Link>
        </FadeIn>
        
      </div>
    </div>
  );
}