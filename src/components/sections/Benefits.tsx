
import BenefitCard from '@/components/ui/BenefitCard';
import { useEffect } from 'react';

const Benefits = () => {
  const benefits = [
    {
      title: 'Increased Lead Conversion',
      description: 'Convert more website visitors into qualified leads with instant 24/7 engagement.',
      stat: '35%',
      statLabel: 'Higher Conversion Rate'
    },
    {
      title: 'Time Saved on Qualification',
      description: 'Let AI handle initial lead qualification so your team can focus on closing deals.',
      stat: '15h',
      statLabel: 'Saved Weekly'
    },
    {
      title: 'Improved Customer Experience',
      description: 'Provide instant responses to inquiries, even outside business hours.',
      stat: '92%',
      statLabel: 'Customer Satisfaction'
    },
    {
      title: 'Higher Engagement Rate',
      description: 'Keep leads engaged with personalized property recommendations and updates.',
      stat: '3.8x',
      statLabel: 'More Engagement'
    },
    {
      title: 'Reduced Response Time',
      description: 'Eliminate waiting periods for customers with instantaneous AI responses.',
      stat: '<1m',
      statLabel: 'Average Response Time'
    },
    {
      title: 'Better Data Insights',
      description: 'Gain valuable insights on customer preferences and popular listings.',
      stat: '100%',
      statLabel: 'Data-Driven Decisions'
    },
  ];

  return (
    <section id="benefits" className="py-20">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Business Benefits</h2>
          <p className="text-lg text-muted-foreground">
            RealAssist.AI delivers measurable benefits to your real estate business.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <BenefitCard 
              key={benefit.title}
              title={benefit.title}
              description={benefit.description}
              stat={benefit.stat}
              statLabel={benefit.statLabel}
              index={index}
              className="animate-fade-in-up"
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
