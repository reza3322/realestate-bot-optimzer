
import { cn } from '@/lib/utils';
import { Settings, Lock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { BotIcon } from './BotIcon';

interface ChatHeaderProps {
  headerStyle: {
    container: string;
    font: string;
  };
  fontStyle?: string;
  botName?: string;
  apiKeyStatus?: 'not-set' | 'set' | 'checking';
  botIconName?: string;
  customStyle?: React.CSSProperties;
}

const ChatHeader = ({ 
  headerStyle, 
  fontStyle,
  botName = "RealHomeAI Demo",
  apiKeyStatus = 'not-set',
  botIconName = 'bot',
  customStyle = {}
}: ChatHeaderProps) => {
  const { toast } = useToast();

  const handleApiKeyCheck = () => {
    if (apiKeyStatus === 'not-set') {
      toast({
        title: "API Key Required",
        description: "For a live demo, this would connect to a secure backend. In a real implementation, you wouldn't store API keys in the browser.",
        duration: 5000,
      });
    } else {
      toast({
        title: "API Key Status",
        description: "API key is configured. In a production app, this would securely connect to OpenAI through a backend service.",
        duration: 3000,
      });
    }
  };

  // Create a gradient background style that works with the base color
  const gradientStyle = {
    ...customStyle,
    backgroundImage: customStyle.backgroundColor ? 
      `linear-gradient(to right, ${customStyle.backgroundColor}, ${adjustColorBrightness(customStyle.backgroundColor as string, 20)})` : 
      undefined
  };

  return (
    <div 
      className={cn(
        "p-4 flex justify-between items-center",
        headerStyle.container
      )}
      style={gradientStyle}
    >
      <div className="flex items-center gap-2">
        <BotIcon iconName={botIconName} className="w-5 h-5" />
        <h3 className={cn("font-medium", headerStyle.font)}>{botName}</h3>
      </div>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={handleApiKeyCheck}
            >
              {apiKeyStatus === 'not-set' ? 
                <Lock className="h-4 w-4" /> : 
                <Settings className="h-4 w-4" />
              }
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>API Configuration</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

// Helper function to adjust color brightness
function adjustColorBrightness(color: string, percent: number): string {
  // Remove the # if it exists
  color = color.replace('#', '');
  
  // Parse the color components
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  // Adjust brightness
  const adjustR = Math.min(255, Math.max(0, r + (r * percent / 100)));
  const adjustG = Math.min(255, Math.max(0, g + (g * percent / 100)));
  const adjustB = Math.min(255, Math.max(0, b + (b * percent / 100)));
  
  // Convert back to hex
  const rHex = Math.round(adjustR).toString(16).padStart(2, '0');
  const gHex = Math.round(adjustG).toString(16).padStart(2, '0');
  const bHex = Math.round(adjustB).toString(16).padStart(2, '0');
  
  return `#${rHex}${gHex}${bHex}`;
}

export default ChatHeader;
