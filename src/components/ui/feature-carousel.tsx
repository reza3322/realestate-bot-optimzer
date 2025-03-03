
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
}

// Feature data array
const features: Feature[] = [
  {
    id: 1,
    icon: <Users className="h-10 w-10 text-primary" />,
    title: "Lead Qualification",
    description: "AI-powered system automatically qualifies leads based on behavior and profile data."
  },
  {
    id: 2,
    icon: <Home className="h-10 w-10 text-primary" />,
    title: "Property Matching",
    description: "Smart algorithm matches potential buyers with properties that meet their preferences."
  },
  {
    id: 3,
    icon: <MessageCircle className="h-10 w-10 text-primary" />,
    title: "24/7 Customer Service",
    description: "AI chatbot provides instant support and information to clients at any time of day."
  },
  {
    id: 4,
    icon: <BarChart className="h-10 w-10 text-primary" />,
    title: "Performance Analytics",
    description: "Real-time analytics and reports to track your business performance and growth."
  },
  {
    id: 5,
    icon: <Clock className="h-10 w-10 text-primary" />,
    title: "Automated Scheduling",
    description: "Intelligent scheduling system for property viewings and client meetings."
  },
  {
    id: 6,
    icon: <Lock className="h-10 w-10 text-primary" />,
    title: "Secure Document Handling",
    description: "Encrypted storage and sharing of sensitive client and property documents."
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
                className="flex flex-col items-center text-center w-full md:w-1/2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: {
                    delay: idx * 0.2, // Staggered animation with small delay
                    duration: 0.5
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  y: -20,
                  transition: {
                    delay: idx * 0.1,
                    duration: 0.3
                  }
                }}
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground text-lg">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center space-x-2 mt-8">
        {Array.from({ length: dotCount }).map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index * 2);
            }}
            className={`h-2 rounded-full transition-all ${
              index === activeDot ? 'w-8 bg-primary' : 'w-2 bg-primary/30'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default FeatureCarousel;
