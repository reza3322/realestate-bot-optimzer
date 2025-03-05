
import { FC } from 'react';
import { 
  Bot, 
  MessageCircle, 
  Headphones, 
  MessageSquare, 
  BrainCircuit,
  LucideIcon
} from 'lucide-react';

interface BotIconProps {
  iconName: string;
  className?: string;
}

// Map of icon names to their components
const iconMap: Record<string, LucideIcon> = {
  'bot': Bot,
  'message-circle': MessageCircle,
  'headphones': Headphones,
  'message-square': MessageSquare,
  'brain': BrainCircuit,
};

export const BotIcon: FC<BotIconProps> = ({ iconName, className }) => {
  // Get the icon component from the map, or use Bot as fallback
  const IconComponent = iconMap[iconName] || Bot;
  
  return <IconComponent className={className} />;
};
