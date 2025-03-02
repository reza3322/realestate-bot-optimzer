
import { Brain, Users, Home, Calendar, BellRing, Share2, MessageSquare, Instagram, MessageCircle } from 'lucide-react';
import FeatureCard from '@/components/ui/FeatureCard';

const Features = () => {
  const features = [
    {
      title: 'Lead Qualification',
      description: 'Automatically engages with website visitors and qualifies leads based on budget, preferences, and timeline.',
      icon: Users
    },
    {
      title: 'Property Recommendations',
      description: 'Analyzes customer preferences to recommend the perfect properties, increasing conversion rates.',
      icon: Home
    },
    {
      title: 'Appointment Scheduling',
      description: 'Allows customers to schedule viewings directly with your calendar, reducing booking friction.',
      icon: Calendar
    },
    {
      title: 'Listing Alerts',
      description: 'Notifies leads when new properties matching their criteria are listed, keeping them engaged.',
      icon: BellRing
    },
    {
      title: 'Social Integration',
      description: 'Connects with WhatsApp and Instagram to capture and qualify leads from social media.',
      icon: Share2
    },
    {
      title: 'WhatsApp Engagement',
      description: 'Engages with customers on WhatsApp to answer questions and provide property information.',
      icon: MessageSquare
    },
    {
      title: 'Instagram Inquiries',
      description: 'Responds to Instagram DMs and comments about properties, capturing interest 24/7.',
      icon: Instagram
    },
    {
      title: 'Analytics Dashboard',
      description: 'Tracks which listings get the most engagement to optimize your marketing strategy.',
      icon: Brain
    },
  ];

  return (
    <section id="features" className="py-20 bg-secondary/50">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
          <p className="text-lg text-muted-foreground">
            Every feature is designed to streamline your real estate operations and enhance customer experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard 
              key={feature.title}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              index={index}
              className="animate-fade-in-up"
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
