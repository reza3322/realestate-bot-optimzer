
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

interface PricingPlan {
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
}

const pricingPlan: PricingPlan = {
  price: "199",
  yearlyPrice: "169", // 15% discount for annual payment
  period: "per month",
  features: [
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
  ],
  description: "All features included for real estate professionals",
  buttonText: "Get Started",
  href: "#",
};

const Cta = () => {
  const [isMonthly, setIsMonthly] = useState(true);
  const switchRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const [isSignedIn, setIsSignedIn] = useState(false);
  
  const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(false);
    
    useState(() => {
      const media = window.matchMedia(query);
      if (media.matches !== matches) {
        setMatches(media.matches);
      }
      
      const listener = () => setMatches(media.matches);
      window.addEventListener("resize", listener);
      return () => window.removeEventListener("resize", listener);
    });
    
    return matches;
  };
  
  const isDesktop = useMediaQuery("(min-width: 768px)");

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

  const handlePlanSelection = () => {
    // Prevent any default scrolling behavior
    event?.preventDefault();
    
    if (isSignedIn) {
      navigate('/dashboard');
      toast.success(`Selected plan! This would integrate with a payment provider in production.`);
    } else {
      navigate('/auth');
    }
  };

  return (
    <section id="pricing" className="py-20 relative">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            One plan with all features included. Get access to our platform, lead generation tools, and dedicated support.
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

        <div className="max-w-lg mx-auto">
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
            className="rounded-2xl border-2 border-primary p-6 bg-background text-center flex flex-col relative"
          >
            <div className="absolute top-0 right-0 bg-primary py-0.5 px-2 rounded-bl-xl rounded-tr-xl flex items-center">
              <Star className="text-primary-foreground h-4 w-4 fill-current" />
              <span className="text-primary-foreground ml-1 font-sans font-semibold text-xs">
                All Features
              </span>
            </div>
            <div className="flex-1 flex flex-col">
              <p className="text-base font-semibold text-muted-foreground">
                COMPLETE SOLUTION
              </p>
              <div className="mt-6 flex items-center justify-center gap-x-2">
                <span className="text-5xl font-bold tracking-tight text-foreground">
                  €{isMonthly ? pricingPlan.price : pricingPlan.yearlyPrice}
                </span>
                <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">
                  / {pricingPlan.period}
                </span>
              </div>

              <p className="text-xs leading-5 text-muted-foreground mt-1">
                {isMonthly ? "billed monthly" : "billed annually"}
              </p>

              <ul className="mt-6 space-y-3">
                {pricingPlan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                    <span className="text-left text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-8">
                <Button 
                  variant="default" 
                  size="lg"
                  className={cn(
                    "w-full group relative overflow-hidden",
                    "transform-gpu transition-all duration-300 ease-out hover:ring-2 hover:ring-primary hover:ring-offset-1 hover:bg-primary hover:text-primary-foreground"
                  )}
                  onClick={handlePlanSelection}
                >
                  {pricingPlan.buttonText}
                </Button>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  {pricingPlan.description}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Cta;
