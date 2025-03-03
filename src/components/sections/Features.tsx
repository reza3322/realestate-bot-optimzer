
import React from 'react';
import { Sparkles } from 'lucide-react';
import DisplayCards from '@/components/ui/display-cards';

const Features = () => {
  // Define cards to match the provided image
  const featureCards = [
    {
      icon: <Sparkles className="size-4 text-gray-400" />,
      title: "Featured",
      description: "Discover amazing content",
      date: "Just now",
      titleClassName: "text-gray-400",
      highlightColor: "bg-gray-800",
      className: "[grid-area:stack] z-30",
    },
    {
      icon: <Sparkles className="size-4 text-gray-400" />,
      title: "Popular",
      description: "Trending this week",
      date: "2 days ago",
      titleClassName: "text-gray-400",
      highlightColor: "bg-gray-800",
      className: "[grid-area:stack] translate-x-16 translate-y-10 z-20",
    },
    {
      icon: <Sparkles className="size-4 text-white" />,
      title: "New",
      description: "Latest updates and features",
      date: "Today",
      titleClassName: "text-white",
      highlightColor: "bg-blue-700",
      className: "[grid-area:stack] translate-x-32 translate-y-20 z-10",
    },
  ];

  return (
    <section id="features" className="py-8 bg-gradient-to-b from-gray-900 to-black">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-2 text-white">Powerful Features</h2>
          <p className="text-lg text-gray-400">
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
