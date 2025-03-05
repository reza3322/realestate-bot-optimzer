
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import FeatureCarousel from '@/components/ui/feature-carousel';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();

  const handleStartFreeTrial = () => {
    navigate('/auth');
  };

  const handleBookDemo = () => {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
                <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none">
                  Operations With AI
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto mb-10">
                Your 24/7 AI assistant that qualifies leads, engages customers, and recommends properties, so you can focus on closing deals.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                <Button size="lg" className="w-full sm:w-auto" onClick={handleStartFreeTrial}>
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={handleBookDemo}>
                  Book a Demo
                </Button>
              </div>
            </>
          }
        >
          {/* Using a dashboard mockup image showing graphs and features */}
          <div className="relative w-full h-full bg-white dark:bg-zinc-800">
            {/* Dashboard header */}
            <div className="absolute top-0 left-0 right-0 h-12 bg-gray-50 dark:bg-zinc-900 border-b border-border/30 flex items-center px-4">
              <div className="w-32 h-6 bg-primary/20 rounded-md"></div>
              <div className="ml-auto flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-700"></div>
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-700"></div>
              </div>
            </div>
            
            {/* Dashboard content */}
            <div className="absolute top-12 left-0 bottom-0 w-48 bg-gray-50 dark:bg-zinc-900 border-r border-border/30 p-4">
              <div className="space-y-3">
                <div className="w-full h-8 bg-primary/10 rounded-md"></div>
                <div className="w-full h-8 bg-primary/20 rounded-md"></div>
                <div className="w-full h-8 bg-gray-200 dark:bg-zinc-800 rounded-md"></div>
                <div className="w-full h-8 bg-gray-200 dark:bg-zinc-800 rounded-md"></div>
                <div className="w-full h-8 bg-gray-200 dark:bg-zinc-800 rounded-md"></div>
              </div>
            </div>
            
            {/* Main dashboard area */}
            <div className="absolute top-12 left-48 right-0 bottom-0 p-6 overflow-auto">
              {/* Stats row */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-border/50 shadow-sm">
                  <div className="w-12 h-12 rounded-lg mb-2 bg-emerald-100 dark:bg-emerald-900/30"></div>
                  <div className="w-16 h-6 bg-gray-200 dark:bg-zinc-700 rounded mb-1"></div>
                  <div className="w-24 h-8 bg-gray-300 dark:bg-zinc-600 rounded-md"></div>
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-border/50 shadow-sm">
                  <div className="w-12 h-12 rounded-lg mb-2 bg-blue-100 dark:bg-blue-900/30"></div>
                  <div className="w-16 h-6 bg-gray-200 dark:bg-zinc-700 rounded mb-1"></div>
                  <div className="w-24 h-8 bg-gray-300 dark:bg-zinc-600 rounded-md"></div>
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-border/50 shadow-sm">
                  <div className="w-12 h-12 rounded-lg mb-2 bg-purple-100 dark:bg-purple-900/30"></div>
                  <div className="w-16 h-6 bg-gray-200 dark:bg-zinc-700 rounded mb-1"></div>
                  <div className="w-24 h-8 bg-gray-300 dark:bg-zinc-600 rounded-md"></div>
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-border/50 shadow-sm">
                  <div className="w-12 h-12 rounded-lg mb-2 bg-amber-100 dark:bg-amber-900/30"></div>
                  <div className="w-16 h-6 bg-gray-200 dark:bg-zinc-700 rounded mb-1"></div>
                  <div className="w-24 h-8 bg-gray-300 dark:bg-zinc-600 rounded-md"></div>
                </div>
              </div>
              
              {/* Charts row */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-border/50 shadow-sm h-56">
                  <div className="w-40 h-6 bg-gray-200 dark:bg-zinc-700 rounded mb-4"></div>
                  <div className="flex items-end pt-4 justify-around h-36">
                    <div className="w-8 bg-primary/60 rounded-t h-16"></div>
                    <div className="w-8 bg-primary/60 rounded-t h-28"></div>
                    <div className="w-8 bg-primary/60 rounded-t h-20"></div>
                    <div className="w-8 bg-primary/60 rounded-t h-24"></div>
                    <div className="w-8 bg-primary/80 rounded-t h-32"></div>
                    <div className="w-8 bg-primary rounded-t h-24"></div>
                  </div>
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-border/50 shadow-sm h-56">
                  <div className="w-40 h-6 bg-gray-200 dark:bg-zinc-700 rounded mb-4"></div>
                  <div className="flex justify-center items-center h-36">
                    <div className="relative w-32 h-32 rounded-full border-8 border-primary overflow-hidden">
                      <div className="absolute top-0 left-0 w-1/2 h-full bg-primary/20"></div>
                      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-primary/40"></div>
                    </div>
                    <div className="ml-6 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-primary rounded-full"></div>
                        <div className="w-16 h-4 bg-gray-200 dark:bg-zinc-700 rounded"></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-primary/40 rounded-full"></div>
                        <div className="w-16 h-4 bg-gray-200 dark:bg-zinc-700 rounded"></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-primary/20 rounded-full"></div>
                        <div className="w-16 h-4 bg-gray-200 dark:bg-zinc-700 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Recent activity and Leads table */}
              <div className="grid grid-cols-1 gap-6 mb-6">
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-border/50 shadow-sm">
                  <div className="w-40 h-6 bg-gray-200 dark:bg-zinc-700 rounded mb-4"></div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 border-b border-gray-100 dark:border-zinc-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30"></div>
                        <div className="w-32 h-5 bg-gray-200 dark:bg-zinc-700 rounded"></div>
                      </div>
                      <div className="w-24 h-5 bg-gray-200 dark:bg-zinc-700 rounded"></div>
                    </div>
                    <div className="flex justify-between items-center p-2 border-b border-gray-100 dark:border-zinc-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30"></div>
                        <div className="w-32 h-5 bg-gray-200 dark:bg-zinc-700 rounded"></div>
                      </div>
                      <div className="w-24 h-5 bg-gray-200 dark:bg-zinc-700 rounded"></div>
                    </div>
                    <div className="flex justify-between items-center p-2 border-b border-gray-100 dark:border-zinc-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30"></div>
                        <div className="w-32 h-5 bg-gray-200 dark:bg-zinc-700 rounded"></div>
                      </div>
                      <div className="w-24 h-5 bg-gray-200 dark:bg-zinc-700 rounded"></div>
                    </div>
                    <div className="flex justify-between items-center p-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30"></div>
                        <div className="w-32 h-5 bg-gray-200 dark:bg-zinc-700 rounded"></div>
                      </div>
                      <div className="w-24 h-5 bg-gray-200 dark:bg-zinc-700 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ContainerScroll>
        
        {/* Feature Carousel Section */}
        <FeatureCarousel />
      </div>
    </section>
  );
};

export default Hero;
