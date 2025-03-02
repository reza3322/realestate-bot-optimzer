
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Hero = () => {
  const benefits = [
    "24/7 Lead Qualification",
    "Instant Customer Engagement",
    "Personalized Property Recommendations"
  ];

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] rounded-full bg-primary/5 -translate-y-1/2"></div>
        <div className="absolute top-1/3 right-0 w-96 h-96 rounded-full bg-primary/10 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-primary/5 translate-y-1/2 -translate-x-1/3"></div>
      </div>

      <div className="container px-4 mx-auto">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-flex items-center justify-center px-4 py-1.5 mb-6 border border-border rounded-full bg-background/70 backdrop-blur-sm">
            <span className="text-xs font-medium text-primary mr-2">NEW</span>
            <span className="text-xs">AI-Powered Real Estate Assistant</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance mb-6 leading-tight">
            Automate Your Real Estate Operations With Intelligent AI
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto mb-8">
            Your 24/7 AI assistant that qualifies leads, engages customers, and recommends properties, so you can focus on closing deals.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Button size="lg" className="w-full sm:w-auto">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Book a Demo
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            {benefits.map((benefit, i) => (
              <div 
                key={benefit} 
                className="flex items-center gap-2 text-sm"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative max-w-3xl mx-auto animate-float">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1586880244406-556ebe35f282?q=80&w=2574&auto=format&fit=crop" 
            alt="RealAssist.AI Dashboard" 
            className="w-full h-auto rounded-xl shadow-xl border border-border"
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
