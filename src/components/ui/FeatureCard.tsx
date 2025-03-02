
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  index: number;
  className?: string;
}

const FeatureCard = ({ title, description, icon: Icon, index, className }: FeatureCardProps) => {
  return (
    <div 
      className={cn(
        "group relative bg-card hover:bg-card/80 border border-border rounded-xl p-6 transition-all duration-300 shadow-sm hover:shadow-md",
        "hover:translate-y-[-3px]",
        className
      )}
      style={{ 
        animationDelay: `${index * 0.1}s`,
      }}
    >
      <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default FeatureCard;
