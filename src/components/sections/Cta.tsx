
import { useState, useRef } from 'react';
import { Check, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Cta = () => {
  const [isMonthly, setIsMonthly] = useState(true);
  const switchRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const [isSignedIn, setIsSignedIn] = useState(false);
  
  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
    if (checked && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: [
          "hsl(var(--primary))",
          "hsl(var(--accent))",
          "hsl(var(--secondary))",
          "hsl(var(--muted))",
        ],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ["circle"],
      });
    }
  };

  const handlePlanSelection = (event: React.MouseEvent) => {
    // Prevent any default scrolling behavior
    event.preventDefault();
    
    if (isSignedIn) {
      navigate('/dashboard');
      toast.success(`Selected plan! This would integrate with a payment provider in production.`);
    } else {
      navigate('/auth');
    }
  };

  const features = [
    "AI Chatbot integration",
    "Advanced CRM functionality",
    "Unlimited qualified leads",
    "Automated follow-ups",
    "Property matching engine",
    "Priority support",
    "Social media AI agent",
    "Custom integrations",
    "White-label solutions",
    "Advanced analytics",
    "API access"
  ];

  const perks = [
    "24/7 Support",
    "Exclusive Webinars",
    "Priority Assistance",
    "Early Feature Access"
  ];

  return (
    <section id="pricing" className="py-20 relative">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            One ultimate plan with all features included. Get access to our platform, lead generation tools, and dedicated support.
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-3">
            <span className="font-semibold">Monthly</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <Switch
                ref={switchRef as any}
                checked={!isMonthly}
                onCheckedChange={handleToggle}
                className="relative"
              />
            </label>
            <span className="font-semibold">
              Annual billing <span className="text-primary">(Save 15%)</span>
            </span>
          </div>
        </div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: 1.2,
            type: "spring",
            stiffness: 100,
            damping: 30,
            delay: 0.3,
            opacity: { duration: 0.5 },
          }}
          className="max-w-lg mx-auto rounded-2xl border border-border bg-background overflow-hidden"
        >
          {/* Plan header */}
          <div className="p-6 pb-4">
            <h3 className="text-2xl font-bold">Ultimate Plan</h3>
            <p className="text-muted-foreground mt-1">
              Access everything you need to grow your business.
            </p>
            
            <div className="mt-6 flex items-baseline">
              <span className="text-5xl font-bold">
                €{isMonthly ? "199" : "169"}
              </span>
              {isMonthly && (
                <span className="text-muted-foreground ml-2 line-through">€199</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isMonthly ? "per month" : "per month, billed annually"}
            </p>
            
            <Button 
              className="w-full mt-6"
              size="lg"
              onClick={handlePlanSelection}
            >
              Get Started
            </Button>
          </div>
          
          {/* Features section */}
          <div className="border-t bg-muted/40 p-6">
            <h4 className="font-semibold mb-4">Features:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {features.slice(0, 4).map((feature, i) => (
                <div key={`feature-${i}`} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Perks section */}
          <div className="border-t bg-muted/40 p-6">
            <h4 className="font-semibold mb-4">Perks:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {perks.map((perk, i) => (
                <div key={`perk-${i}`} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <span className="text-sm">{perk}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Cta;
