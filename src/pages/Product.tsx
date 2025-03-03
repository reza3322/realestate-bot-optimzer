
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/sections/Footer';
import Features from '@/components/sections/Features';
import Benefits from '@/components/sections/Benefits';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';
import ContactForm from '@/components/sections/ContactForm';

const Product = () => {
  // Scroll to section function
  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
              <Button size="lg" onClick={scrollToFeatures}>
                Learn More <ArrowDown className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
        
        <div id="features">
          <Features />
        </div>
        <Benefits />
        
        {/* Contact section for the product page */}
        <section id="signup" className="py-20 bg-secondary/10">
          <div className="container px-4 mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Real Estate Business?</h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Get started with RealHomeAI today and see how our AI-powered solutions can help you:
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">✓</div>
                    <span>Qualify leads 24/7 without human intervention</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">✓</div>
                    <span>Match properties to client preferences automatically</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">✓</div>
                    <span>Schedule viewings and follow-up appointments</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">✓</div>
                    <span>Generate detailed reports on customer interactions</span>
                  </li>
                </ul>
              </div>
              <div>
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Product;
