
import { Brain, Users, Home, Calendar, BellRing, Share2, MessageSquare, Instagram } from 'lucide-react';
import DisplayCards from '@/components/ui/display-cards';

const Features = () => {
  const featuresCards = [
    {
      icon: <Users className="size-4 text-primary" />,
      title: "Lead Qualification",
      description: "Automatically qualifies leads",
      date: "24/7 availability",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className:
        "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      icon: <Home className="size-4 text-primary" />,
      title: "Property Matching",
      description: "Perfect property recommendations",
      date: "AI-powered",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className:
        "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      icon: <MessageSquare className="size-4 text-primary" />,
      title: "24/7 Customer Service",
      description: "Instant customer engagement",
      date: "Always on",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className:
        "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10",
    },
  ];

  const features = [
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

        <div className="mb-20">
          <div className="flex min-h-[400px] w-full items-center justify-center">
            <div className="w-full max-w-3xl">
              <DisplayCards cards={featuresCards} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="bg-background/60 backdrop-blur-sm border border-border rounded-xl p-6 hover:bg-muted/80 transition-colors duration-300 hover:scale-105 transform transition-transform"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="p-2 rounded-full bg-primary/10 text-primary">
                  <feature.icon className="w-5 h-5" />
                </span>
                <h3 className="font-semibold text-lg">{feature.title}</h3>
              </div>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
