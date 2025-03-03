
import React from 'react';
import { Brain, Users, Home, Calendar, BellRing, Share2, MessageSquare, Instagram } from 'lucide-react';
import DisplayCards from '@/components/ui/display-cards';
import { motion } from 'framer-motion';

const Features = () => {
  // Define offsets for proper stacking
  const cardPositions = [
    { x: 0, y: 0 },     // First card - base position
    { x: 8, y: 15 },    // Second card
    { x: 16, y: 30 },   // Third card
    { x: 24, y: 45 },   // Fourth card
    { x: 32, y: 60 },   // Fifth card
    { x: 40, y: 75 },   // Sixth card
    { x: 48, y: 90 },   // Seventh card
    { x: 56, y: 105 },  // Eighth card
  ];

  // Generate features with staggered positions for stacking
  const allFeatures = [
    {
      icon: <Users className="size-4 text-primary" />,
      title: "Lead Qualification",
      description: "Automatically qualifies leads",
      date: "24/7 availability",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: `[grid-area:stack] translate-x-[${cardPositions[0].x}px] translate-y-[${cardPositions[0].y}px] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0 z-[80]`,
    },
    {
      icon: <Home className="size-4 text-primary" />,
      title: "Property Matching",
      description: "Perfect property recommendations",
      date: "AI-powered",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: `[grid-area:stack] translate-x-[${cardPositions[1].x}px] translate-y-[${cardPositions[1].y}px] hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0 z-[70]`,
    },
    {
      icon: <MessageSquare className="size-4 text-primary" />,
      title: "24/7 Customer Service",
      description: "Instant customer engagement",
      date: "Always on",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: `[grid-area:stack] translate-x-[${cardPositions[2].x}px] translate-y-[${cardPositions[2].y}px] hover:translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0 z-[60]`,
    },
    {
      icon: <Calendar className="size-4 text-primary" />,
      title: "Appointment Scheduling",
      description: "Allows customers to schedule viewings directly",
      date: "Time-saving",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: `[grid-area:stack] translate-x-[${cardPositions[3].x}px] translate-y-[${cardPositions[3].y}px] hover:translate-y-20 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0 z-[50]`,
    },
    {
      icon: <BellRing className="size-4 text-primary" />,
      title: "Listing Alerts",
      description: "Notifies leads when new properties match criteria",
      date: "Auto notifications",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: `[grid-area:stack] translate-x-[${cardPositions[4].x}px] translate-y-[${cardPositions[4].y}px] hover:translate-y-30 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0 z-[40]`,
    },
    {
      icon: <Share2 className="size-4 text-primary" />,
      title: "Social Integration",
      description: "Connects with WhatsApp and Instagram",
      date: "Multi-channel",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: `[grid-area:stack] translate-x-[${cardPositions[5].x}px] translate-y-[${cardPositions[5].y}px] hover:translate-y-40 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0 z-[30]`,
    },
    {
      icon: <Instagram className="size-4 text-primary" />,
      title: "Instagram Inquiries",
      description: "Responds to Instagram DMs and comments",
      date: "Social media",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: `[grid-area:stack] translate-x-[${cardPositions[6].x}px] translate-y-[${cardPositions[6].y}px] hover:translate-y-50 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0 z-[20]`,
    },
    {
      icon: <Brain className="size-4 text-primary" />,
      title: "Analytics Dashboard",
      description: "Tracks which listings get the most engagement",
      date: "Data-driven",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: `[grid-area:stack] translate-x-[${cardPositions[7].x}px] translate-y-[${cardPositions[7].y}px] hover:translate-y-60 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0 z-[10]`,
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

        <div className="flex min-h-[600px] w-full items-center justify-center">
          <div className="w-full max-w-4xl">
            <DisplayCards cards={allFeatures} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
