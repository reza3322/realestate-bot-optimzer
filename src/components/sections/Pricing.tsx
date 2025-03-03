
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingTier {
  name: string;
  price: number;
  annualDiscount: number;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    price: 99,
    annualDiscount: 10,
    description: 'For small agencies getting started with AI',
    features: [
      'AI Chatbot for your website',
      'Basic CRM integration',
      'Email notifications',
      'Up to 10 active listings',
      '5/7 customer support',
    ],
    cta: 'Start Free Trial'
  },
  {
    name: 'Professional',
    price: 299,
    annualDiscount: 10,
    description: 'For growing agencies that need more automation',
    features: [
      'Everything in Starter',
      'Advanced AI Agent',
      'Full CRM integration',
      '30 qualified leads per month',
      'Automated follow-ups',
      'Property matching',
      '24/7 customer support',
    ],
    cta: 'Get Started',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 599,
    annualDiscount: 10,
    description: 'For large agencies with advanced needs',
    features: [
      'Everything in Professional',
      'Social media AI agent',
      'Unlimited qualified leads',
      'Custom integrations',
      'Dedicated account manager',
      'Advanced analytics',
      'White-label solution',
    ],
    cta: 'Contact Sales'
  }
];

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const calculatePrice = (basePrice: number, discount: number) => {
    if (isAnnual) {
      return basePrice * (1 - discount / 100);
    }
    return basePrice;
  };

  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Transparent Pricing for Every Agency</h2>
          <p className="text-lg text-muted-foreground">
            Choose the plan that fits your business needs.
            All plans include our core AI technology and regular updates.
          </p>
          
          <div className="flex items-center justify-center mt-8 gap-4">
            <span className={`text-sm ${!isAnnual ? 'font-bold' : 'text-muted-foreground'}`}>Monthly</span>
            <Switch 
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <span className={`text-sm ${isAnnual ? 'font-bold' : 'text-muted-foreground'}`}>
              Annual <span className="text-primary">(Save 10%)</span>
            </span>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {pricingTiers.map((tier, index) => (
            <div 
              key={index}
              className={cn(
                "relative rounded-xl overflow-hidden transition-all hover:shadow-lg",
                tier.popular 
                  ? "border-2 border-primary shadow-md scale-105 my-4" 
                  : "border border-border"
              )}
            >
              {tier.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                  Most Popular
                </div>
              )}
              
              <div className="p-8">
                <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                <div className="flex items-baseline mb-1">
                  <span className="text-4xl font-bold">€{Math.round(calculatePrice(tier.price, tier.annualDiscount))}</span>
                  <span className="text-muted-foreground ml-2">/ month</span>
                </div>
                <p className="text-xs text-muted-foreground mb-6">
                  {isAnnual ? 'Billed annually' : 'Billed monthly'}
                </p>
                
                <p className="text-sm mb-6">{tier.description}</p>
                
                <ul className="space-y-4 mb-8">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  variant={tier.popular ? "default" : "outline"}
                  className="w-full"
                >
                  {tier.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="max-w-2xl mx-auto mt-16 text-center">
          <h3 className="text-xl font-bold mb-4">Need a custom solution?</h3>
          <p className="text-muted-foreground mb-6">
            Our enterprise plan is flexible and can be tailored to your specific requirements.
            Contact our sales team to discuss how we can help your business.
          </p>
          <Button variant="outline" size="lg">
            Request Custom Quote
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
