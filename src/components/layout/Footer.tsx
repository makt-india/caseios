import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/5 bg-[#030303] pt-24 pb-12 text-muted-foreground text-sm relative overflow-hidden">
      {/* Subtle bottom glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[800px] h-[300px] ambient-glow bg-white/5" />

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-16 relative z-10">
        
        {/* Brand & Newsletter */}
        <div className="col-span-1 md:col-span-5">
          <Link href="/" className="font-extrabold tracking-[0.2em] text-2xl text-white mb-6 block">
            CASIOS
          </Link>
          <p className="max-w-sm text-sm text-muted-foreground/80 leading-relaxed mb-8">
            The intersection of pure performance and relentless design. We engineer the artifacts of tomorrow, today.
          </p>
          
          <h4 className="text-white font-medium mb-4 text-xs tracking-widest uppercase">Join the Insider List</h4>
          <div className="flex items-center gap-2 max-w-sm">
             <input type="email" placeholder="Email address" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 transition-colors" />
             <button className="bg-white text-black p-3 hover:bg-zinc-200 rounded-xl transition-colors">
               <ArrowRight className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Links */}
        <div className="col-span-1 md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-10">
          <div>
            <h4 className="text-white font-medium mb-6 text-xs tracking-[0.2em] uppercase">Hardware</h4>
            <ul className="space-y-4 text-sm text-muted-foreground/80">
              <li><Link href="/shop" className="hover:text-white transition-colors">Pro Series</Link></li>
              <li><Link href="/shop" className="hover:text-white transition-colors">Audio Ecosystem</Link></li>
              <li><Link href="/shop" className="hover:text-white transition-colors">Charging Arrays</Link></li>
              <li><Link href="/shop" className="hover:text-white transition-colors">Limited Editions</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-6 text-xs tracking-[0.2em] uppercase">Company</h4>
            <ul className="space-y-4 text-sm text-muted-foreground/80">
              <li><Link href="/about" className="hover:text-white transition-colors">Our Vision</Link></li>
              <li><Link href="/categories" className="hover:text-white transition-colors">Design Systems</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Press</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-6 text-xs tracking-[0.2em] uppercase">Support</h4>
            <ul className="space-y-4 text-sm text-muted-foreground/80">
              <li className="text-white/50">+91 8883335553</li>
              <li className="text-white/50">makt.in.help@gmail.com</li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Shipping Returns</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-6 mt-24 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-xs relative z-10 text-muted-foreground/60">
        <p>&copy; {new Date().getFullYear()} CASIOS Corporation. All rights reserved.</p>
        <div className="flex items-center gap-6 mt-6 md:mt-0">
          <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="#" className="hover:text-white transition-colors">Legal</Link>
        </div>
        <div className="flex space-x-6 mt-6 md:mt-0 text-white/50">
           <Link href="#" className="hover:text-white transition-colors">X (Twitter)</Link>
           <Link href="#" className="hover:text-white transition-colors">Instagram</Link>
           <Link href="#" className="hover:text-white transition-colors">LinkedIn</Link>
        </div>
      </div>
    </footer>
  );
}
