
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

interface BenefitCardProps {
  title: string;
  description: string;
  stat: string;
  statLabel: string;
  index: number;
  className?: string;
}

const BenefitCard = ({ title, description, stat, statLabel, index, className }: BenefitCardProps) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px 0px" });
  
  // Parse the stat value to handle different formats
  const parseStatValue = () => {
    // Handle percentage values
    if (stat.includes('%')) {
      return parseInt(stat);
    }
    // Handle hour values (e.g., 15h)
    else if (stat.includes('h')) {
      return parseInt(stat);
    }
    // Handle "less than" values (e.g., <1m)
    else if (stat.includes('<')) {
      return 1;
    }
    // Handle multiplication values (e.g., 3.8x)
    else if (stat.includes('x')) {
      return parseFloat(stat) * 10;
    }
    // Default case
    return parseInt(stat) || 0;
  };
  
  const targetValue = parseStatValue();
  const statDisplay = () => {
    if (stat.includes('%')) {
      return `${count}%`;
    } else if (stat.includes('h')) {
      return `${count}h`;
    } else if (stat.includes('<')) {
      return `<${count}m`;
    } else if (stat.includes('x')) {
      return `${(count/10).toFixed(1)}x`;
    }
    return `${count}%`;
  };

  useEffect(() => {
    let animationFrame: number;
    let startTime: number | null = null;
    const duration = 1500; // Animation duration in ms
    
    if (isInView && !hasAnimated) {
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const currentCount = Math.floor(progress * targetValue);
        
        setCount(currentCount);
        
        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        } else {
          setHasAnimated(true);
        }
      };
      
      animationFrame = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isInView, targetValue, hasAnimated]);

  return (
    <div 
      ref={ref}
      className={cn(
        "relative overflow-hidden bg-card border border-border rounded-xl p-6 transition-all duration-300 shadow-sm",
        className
      )}
      style={{ 
        animationDelay: `${index * 0.1}s`,
      }}
    >
      <div className="absolute top-0 right-0 p-4">
        <div className="text-right">
          <p className="text-3xl font-semibold text-primary">{isInView ? statDisplay() : stat}</p>
          <p className="text-sm text-muted-foreground">{statLabel}</p>
        </div>
      </div>
      <div className="pr-24 space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};

export default BenefitCard;
