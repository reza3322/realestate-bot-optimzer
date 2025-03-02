
import { useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Hero from '@/components/sections/Hero';
import Features from '@/components/sections/Features';
import Benefits from '@/components/sections/Benefits';
import Demo from '@/components/sections/Demo';
import Cta from '@/components/sections/Cta';
import Footer from '@/components/sections/Footer';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';

const Index = () => {
  // Back to top button visibility control
  useEffect(() => {
    const handleScroll = () => {
      const backToTopButton = document.getElementById('back-to-top');
      if (backToTopButton) {
        if (window.scrollY > 500) {
          backToTopButton.classList.remove('opacity-0', 'invisible');
          backToTopButton.classList.add('opacity-100', 'visible');
        } else {
          backToTopButton.classList.remove('opacity-100', 'visible');
          backToTopButton.classList.add('opacity-0', 'invisible');
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Benefits />
        <Demo />
        <Cta />
      </main>
      <Footer />
      
      {/* Back to top button */}
      <Button
        id="back-to-top"
        variant="secondary"
        size="icon"
        className="fixed bottom-6 right-6 opacity-0 invisible transition-all duration-300 shadow-lg z-50"
        onClick={scrollToTop}
        aria-label="Back to top"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default Index;
