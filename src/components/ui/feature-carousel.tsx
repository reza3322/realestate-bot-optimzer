
"use client";

import React, { useState, useEffect } from 'react';
import { Users, Home, MessageCircle, BarChart, Clock, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GradientHeading } from '@/components/ui/gradient-heading';

// Feature type definition
interface Feature {
  id: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  date: string;
}

// Feature data array
const features: Feature[] = [
  {
    id: 1,
    icon: <Users className="h-10 w-10 text-primary" />,
    title: "Lead Qualification",
    description: "AI-powered system automatically qualifies leads based on behavior and profile data.",
    date: "24/7 availability"
  },
  {
    id: 2,
    icon: <Home className="h-10 w-10 text-primary" />,
    title: "Property Matching",
    description: "Smart algorithm matches potential buyers with properties that meet their preferences.",
    date: "AI-powered"
  },
  {
    id: 3,
    icon: <MessageCircle className="h-10 w-10 text-primary" />,
    title: "24/7 Customer Service",
    description: "AI chatbot provides instant support and information to clients at any time of day.",
    date: "Always on"
  },
  {
    id: 4,
    icon: <BarChart className="h-10 w-10 text-primary" />,
    title: "Performance Analytics",
    description: "Real-time analytics and reports to track your business performance and growth.",
    date: "Data-driven"
  },
  {
    id: 5,
    icon: <Clock className="h-10 w-10 text-primary" />,
    title: "Automated Scheduling",
    description: "Intelligent scheduling system for property viewings and client meetings.",
    date: "Time-saving"
  },
  {
    id: 6,
    icon: <Lock className="h-10 w-10 text-primary" />,
    title: "Secure Document Handling",
    description: "Encrypted storage and sharing of sensitive client and property documents.",
    date: "Enterprise-grade"
  }
];

const FeatureCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 2) % features.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Display two features at a time
  const currentFeatures = [
    features[currentIndex],
    features[(currentIndex + 1) % features.length]
  ];

  const dotCount = Math.ceil(features.length / 2);
  const activeDot = Math.floor(currentIndex / 2);

  return (
    <div className="w-full max-w-6xl mx-auto py-16">
      <div className="text-center mb-12">
        <GradientHeading size="lg" variant="secondary">
          Our Best Solutions For You
        </GradientHeading>
        <p className="text-xl text-muted-foreground mt-4 max-w-3xl mx-auto">
          Every feature is designed to streamline your real estate operations and enhance customer experience.
        </p>
      </div>

      <div className="overflow-hidden py-8 px-4">
        <AnimatePresence mode="wait">
          <div className="flex flex-col md:flex-row justify-center gap-12">
            {currentFeatures.map((feature, idx) => (
              <motion.div 
                key={`${currentIndex}-${feature.id}`}
                className="relative flex h-auto w-full -skew-y-[4deg] select-none flex-col justify-between rounded-xl border border-border bg-background/70 backdrop-blur-sm px-5 py-4 transition-all duration-500"
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: {
                    delay: idx * 0.2, // Staggered animation with 200ms delay
                    duration: 0.5
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  y: -20,
                  transition: {
                    delay: idx * 0.1, // 100ms delay for exit animation
                    duration: 0.3
                  }
                }}
                whileHover={{ y: -5 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="relative inline-block rounded-full bg-primary/20 p-3">
                    {feature.icon}
                  </span>
                  <p className="text-xl font-medium">{feature.title}</p>
                </div>
                <p className="whitespace-normal text-muted-foreground mb-3">{feature.description}</p>
                <p className="text-sm text-muted-foreground">{feature.date}</p>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center space-x-2 mt-8">
        {Array.from({ length: dotCount }).map((_, index) => (
          <motion.button
            key={index}
            onClick={() => {
              setCurrentIndex(index * 2);
            }}
            className={`h-2 rounded-full transition-all ${
              index === activeDot ? 'w-8 bg-primary' : 'w-2 bg-primary/30'
            }`}
            aria-label={`Go to slide ${index + 1}`}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          />
        ))}
      </div>
    </div>
  );
};

export default FeatureCarousel;
