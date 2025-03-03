
import React from 'react';
import { Brain, Users, Home, Sparkles } from 'lucide-react';
import DisplayCards from '@/components/ui/display-cards';

const Features = () => {
  // Define cards exactly as shown in the provided image
  const featureCards = [
    {
      icon: <Sparkles className="size-4 text-primary" />,
      title: "Featured",
      description: "Discover amazing content",
      date: "Just now",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: "[grid-area:stack] z-30 grayscale-[100%] hover:grayscale-0 hover:-translate-y-10 transition-all duration-500 before:absolute before:w-full before:h-full before:content-[''] before:bg-background/50 before:rounded-xl before:top-0 before:left-0 hover:before:opacity-0 before:transition-opacity before:duration-700",
    },
    {
      icon: <Sparkles className="size-4 text-primary" />,
      title: "Popular",
      description: "Trending this week",
      date: "2 days ago",
      iconClassName: "text-primary",
      titleClassName: "text-primary",
      className: "[grid-area:stack] translate-x-16 translate-y-10 z-20 grayscale-[100%] hover:grayscale-0 hover:-translate-y-1 transition-all duration-500 before:absolute before:w-full before:h-full before:content-[''] before:bg-background/50 before:rounded-xl before:top-0 before:left-0 hover:before:opacity-0 before:transition-opacity before:duration-700",
    },
    {
      icon: <Sparkles className="size-4 text-blue-500" />,
      title: "New",
      description: "Latest updates and features",
      date: "Today",
      iconClassName: "text-blue-500",
      titleClassName: "text-blue-500",
      className: "[grid-area:stack] translate-x-32 translate-y-20 z-10 grayscale-[100%] hover:grayscale-0 hover:translate-y-10 transition-all duration-500 before:absolute before:w-full before:h-full before:content-[''] before:bg-background/50 before:rounded-xl before:top-0 before:left-0 hover:before:opacity-0 before:transition-opacity before:duration-700",
    },
  ];

  return (
    <section id="features" className="py-8 bg-secondary/50">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Powerful Features</h2>
          <p className="text-lg text-muted-foreground">
            Every feature is designed to streamline your real estate operations
          </p>
        </div>

        <div className="flex w-full items-center justify-center mt-6">
          <div className="w-full max-w-3xl">
            <DisplayCards cards={featureCards} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
