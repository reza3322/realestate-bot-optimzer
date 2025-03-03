
import { useState, useRef } from 'react';
import { Check, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
}

const pricingPlans: PricingPlan[] = [
  {
    name: "STARTER",
    price: "99",
    yearlyPrice: "89",
    period: "per month",
    features: [
      "AI Chatbot integration",
      "Basic CRM functionality",
      "Lead qualification",
      "Email notifications",
      "Basic analytics dashboard",
    ],
    description: "Perfect for individual agents and small agencies",
    buttonText: "Start Free Trial",
    href: "#",
    isPopular: false,
  },
  {
    name: "PROFESSIONAL",
    price: "299",
    yearlyPrice: "269",
    period: "per month",
    features: [
      "Everything in Starter",
      "AI Agent integration",
      "Advanced CRM functionality",
      "30 qualified leads per month",
      "Automated follow-ups",
      "Property matching engine",
      "Priority support",
    ],
    description: "Ideal for growing teams and established agencies",
    buttonText: "Get Started",
    href: "#",
    isPopular: true,
  },
  {
    name: "ENTERPRISE",
    price: "599",
    yearlyPrice: "539",
    period: "per month",
    features: [
      "Everything in Professional",
      "Social media AI agent",
      "Unlimited qualified leads",
      "Custom integrations",
      "Dedicated account manager",
      "White-label solutions",
      "Advanced analytics",
      "API access",
    ],
    description: "For large agencies with specific needs",
    buttonText: "Contact Sales",
    href: "#",
    isPopular: false,
  },
];

const Cta = () => {
  const [isMonthly, setIsMonthly] = useState(true);
  const switchRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  // Remove clerk auth and use a simple state for auth status
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Check if we're on desktop (for animations)
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

  const handlePlanSelection = (plan: PricingPlan) => {
    if (plan.name === "ENTERPRISE") {
      // Scroll to contact section
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    
    if (isSignedIn) {
      navigate('/dashboard');
      toast.success(`Selected ${plan.name} plan! This would integrate with a payment provider in production.`);
    } else {
      navigate('/auth');
    }
  };

  return (
    <section id="pricing" className="py-20">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Choose the plan that works for you. All plans include access to our platform, lead generation tools, and dedicated support.
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
              Annual billing <span className="text-primary">(Save 10%)</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ y: 50, opacity: 0 }}
              whileInView={
                isDesktop
                  ? {
                      y: plan.isPopular ? -20 : 0,
                      opacity: 1,
                      x: index === 2 ? -30 : index === 0 ? 30 : 0,
                      scale: index === 0 || index === 2 ? 0.94 : 1.0,
                    }
                  : { y: 0, opacity: 1 }
              }
              viewport={{ once: true }}
              transition={{
                duration: 1.6,
                type: "spring",
                stiffness: 100,
                damping: 30,
                delay: index * 0.1 + 0.3,
                opacity: { duration: 0.5 },
              }}
              className={cn(
                "rounded-2xl border p-6 bg-background text-center flex flex-col relative",
                plan.isPopular ? "border-primary border-2" : "border-border",
                !plan.isPopular && "mt-5",
                index === 0 || index === 2
                  ? "z-0 transform-gpu"
                  : "z-10",
                index === 0 && "origin-right",
                index === 2 && "origin-left"
              )}
            >
              {plan.isPopular && (
                <div className="absolute top-0 right-0 bg-primary py-0.5 px-2 rounded-bl-xl rounded-tr-xl flex items-center">
                  <Star className="text-primary-foreground h-4 w-4 fill-current" />
                  <span className="text-primary-foreground ml-1 font-sans font-semibold text-xs">
                    Popular
                  </span>
                </div>
              )}
              <div className="flex-1 flex flex-col">
                <p className="text-base font-semibold text-muted-foreground">
                  {plan.name}
                </p>
                <div className="mt-6 flex items-center justify-center gap-x-2">
                  <span className="text-5xl font-bold tracking-tight text-foreground">
                    €{isMonthly ? plan.price : plan.yearlyPrice}
                  </span>
                  <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">
                    / {plan.period}
                  </span>
                </div>

                <p className="text-xs leading-5 text-muted-foreground mt-1">
                  {isMonthly ? "billed monthly" : "billed annually"}
                </p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-left text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  <Button 
                    variant={plan.isPopular ? "default" : "outline"} 
                    size="lg"
                    className={cn(
                      "w-full group relative overflow-hidden",
                      "transform-gpu transition-all duration-300 ease-out hover:ring-2 hover:ring-primary hover:ring-offset-1 hover:bg-primary hover:text-primary-foreground"
                    )}
                    onClick={() => handlePlanSelection(plan)}
                  >
                    {plan.buttonText}
                  </Button>
                  <p className="mt-4 text-xs leading-5 text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Cta;
