
import React from 'react';
import { cn } from "@/lib/utils";
import { 
  MessageCircle, 
  Users, 
  Home, 
  BarChart, 
  Calendar, 
  Shield 
} from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: <Users className="h-6 w-6" />,
      title: "Lead Qualification",
      description: "AI-powered system qualifies leads based on behavior and preferences"
    },
    {
      icon: <Home className="h-6 w-6" />,
      title: "Property Matching",
      description: "Smart algorithms match buyers with properties that meet their criteria"
    },
    {
      icon: <MessageCircle className="h-6 w-6" />,
      title: "24/7 Engagement",
      description: "AI chatbot provides instant support and information at any time"
    },
    {
      icon: <BarChart className="h-6 w-6" />,
      title: "Performance Analytics",
      description: "Real-time analytics to track your business growth and opportunities"
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Automated Scheduling",
      description: "Intelligent scheduling system for property viewings and meetings"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Handling",
      description: "Encrypted storage and sharing of sensitive client documents"
    }
  ];

  return (
    <section id="features" className="py-16 bg-gradient-to-b from-background to-secondary/5">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">Powerful Features</h2>
          <p className="text-lg text-muted-foreground">
            Every feature is designed to streamline your real estate operations and enhance customer experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 relative z-10 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <Feature key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature dark:border-neutral-800",
        (index === 0 || index === 3) && "lg:border-l dark:border-neutral-800",
        index < 3 && "lg:border-b dark:border-neutral-800"
      )}
    >
      {index < 3 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-secondary/20 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      {index >= 3 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-secondary/20 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-muted-foreground">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-secondary dark:bg-neutral-700 group-hover/feature:bg-primary transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-foreground dark:text-neutral-100">
          {title}
        </span>
      </div>
      <p className="text-sm text-muted-foreground dark:text-neutral-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};

export default Features;
