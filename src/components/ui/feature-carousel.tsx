
"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Users, Home, MessageCircle, BarChart, Clock, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GradientHeading } from '@/components/ui/gradient-heading';
import { Button } from '@/components/ui/button';

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
    icon: <Users className="h-8 w-8 text-primary" />,
    title: "Lead Qualification",
    description: "AI-powered system automatically qualifies leads based on behavior and profile data."
  },
  {
    id: 2,
    icon: <Home className="h-8 w-8 text-primary" />,
    title: "Property Matching",
    description: "Smart algorithm matches potential buyers with properties that meet their preferences."
  },
  {
    id: 3,
    icon: <MessageCircle className="h-8 w-8 text-primary" />,
    title: "24/7 Customer Service",
    description: "AI chatbot provides instant support and information to clients at any time of day."
  },
  {
    id: 4,
    icon: <BarChart className="h-8 w-8 text-primary" />,
    title: "Performance Analytics",
    description: "Real-time analytics and reports to track your business performance and growth."
  },
  {
    id: 5,
    icon: <Clock className="h-8 w-8 text-primary" />,
    title: "Automated Scheduling",
    description: "Intelligent scheduling system for property viewings and client meetings."
  },
  {
    id: 6,
    icon: <Lock className="h-8 w-8 text-primary" />,
    title: "Secure Document Handling",
    description: "Encrypted storage and sharing of sensitive client and property documents."
  }
];

const FeatureCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    if (!autoplay) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 2) % features.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoplay]);

  // Display two features at a time
  const currentFeatures = [
    features[currentIndex],
    features[(currentIndex + 1) % features.length]
  ];

  const nextSlide = () => {
    setAutoplay(false);
    setCurrentIndex((prevIndex) => (prevIndex + 2) % features.length);
  };

  const prevSlide = () => {
    setAutoplay(false);
    setCurrentIndex((prevIndex) => (prevIndex - 2 + features.length) % features.length);
  };

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

      <div className="relative px-4 sm:px-6">
        <div className="flex justify-between absolute top-1/2 -translate-y-1/2 w-full px-4 z-10">
          <Button 
            onClick={prevSlide} 
            size="icon" 
            variant="secondary" 
            className="rounded-full shadow-lg"
            aria-label="Previous features"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button 
            onClick={nextSlide} 
            size="icon" 
            variant="secondary" 
            className="rounded-full shadow-lg"
            aria-label="Next features"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        <div className="overflow-hidden py-8">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentIndex} 
              className="flex flex-col md:flex-row justify-center gap-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {currentFeatures.map((feature) => (
                <motion.div 
                  key={feature.id}
                  className="bg-white/50 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-100 flex flex-col items-center text-center w-full md:w-1/2"
                  whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="bg-primary/10 p-4 rounded-full mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-center space-x-2 mt-6">
          {Array.from({ length: dotCount }).map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setAutoplay(false);
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
    </div>
  );
};

export default FeatureCarousel;
