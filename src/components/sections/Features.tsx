
import { Brain, Users, Home, Calendar, BellRing, Share2, MessageSquare, Instagram } from 'lucide-react';
import DisplayCards from '@/components/ui/display-cards';
import { motion } from 'framer-motion';

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

  // Convert the remaining features to the floating card style
  const additionalFeatures = [
    {
      icon: <Calendar className="size-4 text-primary" />,
      title: "Appointment Scheduling",
      description: "Allows customers to schedule viewings directly with your calendar, reducing booking friction.",
      date: "Time-saving",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
    },
    {
      icon: <BellRing className="size-4 text-primary" />,
      title: "Listing Alerts",
      description: "Notifies leads when new properties matching their criteria are listed, keeping them engaged.",
      date: "Auto notifications",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
    },
    {
      icon: <Share2 className="size-4 text-primary" />,
      title: "Social Integration",
      description: "Connects with WhatsApp and Instagram to capture and qualify leads from social media.",
      date: "Multi-channel",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
    },
    {
      icon: <Instagram className="size-4 text-primary" />,
      title: "Instagram Inquiries",
      description: "Responds to Instagram DMs and comments about properties, capturing interest 24/7.",
      date: "Social media",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
    },
    {
      icon: <Brain className="size-4 text-primary" />,
      title: "Analytics Dashboard",
      description: "Tracks which listings get the most engagement to optimize your marketing strategy.",
      date: "Data-driven",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          {additionalFeatures.map((feature, index) => (
            <motion.div 
              key={feature.title}
              className="relative flex h-36 w-full -skew-y-[4deg] select-none flex-col justify-between rounded-xl border border-border bg-background/70 backdrop-blur-sm px-4 py-3 transition-all duration-500"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ 
                opacity: 1, 
                y: 0,
                transition: { delay: index * 0.1, duration: 0.5 }
              }}
              viewport={{ once: true, margin: "-100px" }}
              whileHover={{ 
                y: -5, 
                transition: { duration: 0.2 } 
              }}
            >
              <div className="flex items-center gap-3">
                <span className="relative inline-block rounded-full bg-primary/20 p-3">
                  {React.cloneElement(feature.icon, { className: "w-5 h-5" })}
                </span>
                <p className="text-lg font-medium">{feature.title}</p>
              </div>
              <p className="whitespace-normal text-muted-foreground">{feature.description}</p>
              <p className="text-sm text-muted-foreground">{feature.date}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
