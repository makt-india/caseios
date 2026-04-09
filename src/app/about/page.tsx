import { FadeIn } from "@/components/ui/Motion";

export default function AboutPage() {
  return (
    <div className="flex-1 w-full pt-32 pb-24 px-6 max-w-4xl mx-auto min-h-screen text-center">
      <FadeIn>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">About CASIOS</h1>
        <div className="space-y-6 text-lg text-muted-foreground font-light leading-relaxed">
          <p>
            CASIOS was founded on a singular vision: to strip away the unnecessary and leave only pure,
            unadulterated technology. 
          </p>
          <p>
            We believe that hardware and software should blend seamlessly into your daily life. 
            No loud branding. No cheap materials. Only glass, aluminum, and precision engineering.
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
