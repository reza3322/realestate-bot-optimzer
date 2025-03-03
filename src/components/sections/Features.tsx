
import React from 'react';
import { Brain, Users, Home, Calendar, BellRing, Share2, MessageSquare, Instagram } from 'lucide-react';
import DisplayCards from '@/components/ui/display-cards';

const Features = () => {
  // Define features with proper staggered positions for cascading stacked effect
  const allFeatures = [
    {
      icon: <Users className="size-4 text-primary" />,
      title: "Lead Qualification",
      description: "Automatically qualifies leads",
      date: "24/7 availability",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: "[grid-area:stack] z-[80] grayscale-[100%] hover:grayscale-0 before:absolute before:w-full before:h-full before:content-[''] before:bg-background/50 before:rounded-xl before:top-0 before:left-0 hover:before:opacity-0 before:transition-opacity before:duration-700 hover:-translate-y-10 transition-all duration-500",
    },
    {
      icon: <Home className="size-4 text-primary" />,
      title: "Property Matching",
      description: "Perfect property recommendations",
      date: "AI-powered",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: "[grid-area:stack] translate-x-12 translate-y-10 z-[70] grayscale-[100%] hover:grayscale-0 before:absolute before:w-full before:h-full before:content-[''] before:bg-background/50 before:rounded-xl before:top-0 before:left-0 hover:before:opacity-0 before:transition-opacity before:duration-700 hover:-translate-y-1 transition-all duration-500",
    },
    {
      icon: <MessageSquare className="size-4 text-primary" />,
      title: "24/7 Customer Service",
      description: "Instant customer engagement",
      date: "Always on",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: "[grid-area:stack] translate-x-24 translate-y-20 z-[60] grayscale-[100%] hover:grayscale-0 before:absolute before:w-full before:h-full before:content-[''] before:bg-background/50 before:rounded-xl before:top-0 before:left-0 hover:before:opacity-0 before:transition-opacity before:duration-700 hover:translate-y-10 transition-all duration-500",
    },
    {
      icon: <Calendar className="size-4 text-primary" />,
      title: "Appointment Scheduling",
      description: "Schedule viewings directly",
      date: "Time-saving",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: "[grid-area:stack] translate-x-36 translate-y-30 z-[50] grayscale-[100%] hover:grayscale-0 before:absolute before:w-full before:h-full before:content-[''] before:bg-background/50 before:rounded-xl before:top-0 before:left-0 hover:before:opacity-0 before:transition-opacity before:duration-700 hover:translate-y-20 transition-all duration-500",
    },
    {
      icon: <BellRing className="size-4 text-primary" />,
      title: "Listing Alerts",
      description: "Notifies leads of matching properties",
      date: "Auto notifications",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: "[grid-area:stack] translate-x-48 translate-y-40 z-[40] grayscale-[100%] hover:grayscale-0 before:absolute before:w-full before:h-full before:content-[''] before:bg-background/50 before:rounded-xl before:top-0 before:left-0 hover:before:opacity-0 before:transition-opacity before:duration-700 hover:translate-y-30 transition-all duration-500",
    },
    {
      icon: <Share2 className="size-4 text-primary" />,
      title: "Social Integration",
      description: "Connects with social platforms",
      date: "Multi-channel",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: "[grid-area:stack] translate-x-60 translate-y-50 z-[30] grayscale-[100%] hover:grayscale-0 before:absolute before:w-full before:h-full before:content-[''] before:bg-background/50 before:rounded-xl before:top-0 before:left-0 hover:before:opacity-0 before:transition-opacity before:duration-700 hover:translate-y-40 transition-all duration-500",
    },
    {
      icon: <Instagram className="size-4 text-primary" />,
      title: "Instagram Inquiries",
      description: "Responds to Instagram DMs",
      date: "Social media",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: "[grid-area:stack] translate-x-72 translate-y-60 z-[20] grayscale-[100%] hover:grayscale-0 before:absolute before:w-full before:h-full before:content-[''] before:bg-background/50 before:rounded-xl before:top-0 before:left-0 hover:before:opacity-0 before:transition-opacity before:duration-700 hover:translate-y-50 transition-all duration-500",
    },
    {
      icon: <Brain className="size-4 text-primary" />,
      title: "Analytics Dashboard",
      description: "Tracks listing engagement",
      date: "Data-driven",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: "[grid-area:stack] translate-x-84 translate-y-70 z-[10] grayscale-[100%] hover:grayscale-0 before:absolute before:w-full before:h-full before:content-[''] before:bg-background/50 before:rounded-xl before:top-0 before:left-0 hover:before:opacity-0 before:transition-opacity before:duration-700 hover:translate-y-60 transition-all duration-500",
    },
  ];

  return (
    <section id="features" className="py-12 bg-secondary/50">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
          <p className="text-lg text-muted-foreground">
            Every feature is designed to streamline your real estate operations and enhance customer experience.
          </p>
        </div>

        <div className="flex min-h-[500px] w-full items-center justify-center">
          <div className="w-full max-w-3xl">
            <DisplayCards cards={allFeatures} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
