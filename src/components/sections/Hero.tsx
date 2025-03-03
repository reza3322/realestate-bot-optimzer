
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';

const Hero = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] rounded-full bg-primary/5 -translate-y-1/2"></div>
        <div className="absolute top-1/3 right-0 w-96 h-96 rounded-full bg-primary/10 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-primary/5 translate-y-1/2 -translate-x-1/3"></div>
      </div>

      <div className="container px-4 mx-auto">
        <ContainerScroll
          titleComponent={
            <>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance mb-8 leading-tight">
                Automate Your Real Estate <br />
                <span className="text-4xl md:text-[5rem] font-bold mt-1 leading-none">
                  Operations With AI
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto mb-10">
                Your 24/7 AI assistant that qualifies leads, engages customers, and recommends properties, so you can focus on closing deals.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Book a Demo
                </Button>
              </div>
            </>
          }
        >
          <img 
            src="https://images.unsplash.com/photo-1586880244406-556ebe35f282?q=80&w=2574&auto=format&fit=crop" 
            alt="RealAssist.AI Dashboard" 
            className="w-full h-full object-cover object-left-top rounded-xl"
          />
        </ContainerScroll>
      </div>
    </section>
  );
};

export default Hero;
