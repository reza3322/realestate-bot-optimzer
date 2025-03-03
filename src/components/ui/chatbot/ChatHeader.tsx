
import { cn } from '@/lib/utils';
import { Settings, Lock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';

interface ChatHeaderProps {
  headerStyle: string;
  apiKeyStatus: 'not-set' | 'set' | 'checking';
}

const ChatHeader = ({ headerStyle, apiKeyStatus }: ChatHeaderProps) => {
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

  return (
    <div className={cn(
      "p-4 flex justify-between items-center",
      headerStyle
    )}>
      <h3 className="font-medium text-center flex-1">RealHomeAI Demo</h3>
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

export default ChatHeader;
