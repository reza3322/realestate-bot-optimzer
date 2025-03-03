
import React from 'react';
import { 
  MessageCircle, 
  Users, 
  Home, 
  BarChart, 
  Calendar, 
  Shield 
} from 'lucide-react';
import { motion } from 'framer-motion';

const Features = () => {
  const features = [
    {
      icon: <Users className="h-10 w-10 text-primary" />,
      title: "Lead Qualification",
      description: "AI-powered system qualifies leads based on behavior and preferences"
    },
    {
      icon: <Home className="h-10 w-10 text-primary" />,
      title: "Property Matching",
      description: "Smart algorithms match buyers with properties that meet their criteria"
    },
    {
      icon: <MessageCircle className="h-10 w-10 text-primary" />,
      title: "24/7 Engagement",
      description: "AI chatbot provides instant support and information at any time"
    },
    {
      icon: <BarChart className="h-10 w-10 text-primary" />,
      title: "Performance Analytics",
      description: "Real-time analytics to track your business growth and opportunities"
    },
    {
      icon: <Calendar className="h-10 w-10 text-primary" />,
      title: "Automated Scheduling",
      description: "Intelligent scheduling system for property viewings and meetings"
    },
    {
      icon: <Shield className="h-10 w-10 text-primary" />,
      title: "Secure Handling",
      description: "Encrypted storage and sharing of sensitive client documents"
    }
  ];

  // Animation variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <section id="features" className="py-16 bg-gradient-to-b from-background to-secondary/5">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">Powerful Features</h2>
          <p className="text-lg text-muted-foreground">
            Every feature is designed to streamline your real estate operations and enhance customer experience
          </p>
        </div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              variants={itemVariants}
            >
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
