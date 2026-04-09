import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/Motion";
import Link from "next/link";

export default function CategoriesPage() {
  const categories = [
    { name: "Audio", desc: "Studio-grade sound architecture." },
    { name: "Power", desc: "Next-gen charging capabilities." },
    { name: "Wearables", desc: "Precision engineered timepieces." },
    { name: "Accessories", desc: "Essential add-ons for your ecosystem." },
  ];

  return (
    <div className="flex-1 w-full pt-32 pb-24 px-6 max-w-7xl mx-auto min-h-screen">
      <FadeIn>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">Categories</h1>
        <p className="text-xl text-muted-foreground mb-16 max-w-2xl font-light">
          Browse our curated collections crafted for the modern individual.
        </p>
      </FadeIn>

      <FadeInStagger className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {categories.map((cat, i) => (
          <FadeInStaggerItem key={i}>
            <Link href="/shop">
              <div className="group h-64 rounded-3xl glass hover:glass-hover transition-all duration-500 p-10 flex flex-col justify-end cursor-pointer overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <h3 className="text-3xl font-bold mb-2 text-white relative z-10">{cat.name}</h3>
                <p className="text-muted-foreground relative z-10">{cat.desc}</p>
              </div>
            </Link>
          </FadeInStaggerItem>
        ))}
      </FadeInStagger>
    </div>
  );
}
