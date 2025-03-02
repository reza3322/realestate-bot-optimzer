
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const Cta = () => {
  const features = [
    "Unlimited leads qualification",
    "WhatsApp & Instagram integration",
    "24/7 customer engagement",
    "Property recommendation engine",
    "Appointment scheduling",
    "Analytics dashboard"
  ];

  return (
    <section id="pricing" className="py-20">
      <div className="container px-4 mx-auto">
        <div className="max-w-5xl mx-auto">
          <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              <div className="w-full lg:w-1/2 p-8 md:p-12">
                <h2 className="text-3xl font-bold mb-4">Ready to transform your real estate business?</h2>
                <p className="text-muted-foreground mb-6">
                  Start automating your lead qualification and customer engagement today.
                </p>

                <div className="space-y-3 mb-8">
                  {features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="w-full sm:w-auto">
                    Start Free Trial
                  </Button>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Schedule Demo
                  </Button>
                </div>
              </div>

              <div className="w-full lg:w-1/2 bg-primary/5 p-8 md:p-12 flex flex-col justify-center">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                  <div className="flex items-baseline mb-4">
                    <span className="text-4xl font-bold">$299</span>
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>
                  <h3 className="text-xl font-medium mb-2">Professional Plan</h3>
                  <p className="text-muted-foreground mb-6">
                    Everything you need to automate your real estate operations.
                  </p>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>All features included</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Unlimited user accounts</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Priority support</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Custom branding</span>
                    </li>
                  </ul>
                  <div className="text-xs text-muted-foreground">
                    14-day free trial, no credit card required
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Cta;
