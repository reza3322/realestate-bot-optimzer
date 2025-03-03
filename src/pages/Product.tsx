
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/sections/Footer';
import Features from '@/components/sections/Features';
import Benefits from '@/components/sections/Benefits';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';

const Product = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <main className="pt-24">
        <section className="py-20 bg-gradient-to-b from-background to-secondary/10">
          <div className="container px-4 mx-auto">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Discover RealHomeAI</h1>
              <p className="text-xl text-muted-foreground mb-8">
                The most advanced AI-powered real estate assistant that automates lead qualification,
                property matching, and appointment scheduling.
              </p>
              <Button size="lg" className="animate-pulse">
                Get Started <ArrowDown className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
        
        <Features />
        <Benefits />
      </main>
      
      <Footer />
    </div>
  );
};

export default Product;
