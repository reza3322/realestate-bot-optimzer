
import { cn } from '@/lib/utils';

interface BenefitCardProps {
  title: string;
  description: string;
  stat: string;
  statLabel: string;
  index: number;
  className?: string;
}

const BenefitCard = ({ title, description, stat, statLabel, index, className }: BenefitCardProps) => {
  return (
    <div 
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
          <p className="text-3xl font-semibold text-primary">{stat}</p>
          <p className="text-sm text-muted-foreground">{statLabel}</p>
        </div>
      </div>
      <div className="pr-24">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};

export default BenefitCard;
