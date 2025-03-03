
import { Button } from "@/components/ui/button";
import { signInAsTestUser } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function TestUserSignIn() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<{
    starter: boolean;
    professional: boolean;
    enterprise: boolean;
  }>({
    starter: false,
    professional: false,
    enterprise: false
  });

  const handleTestUserSignIn = async (planType: 'starter' | 'professional' | 'enterprise') => {
    try {
      setIsLoading({ ...isLoading, [planType]: true });
      const { error } = await signInAsTestUser(planType);
      
      if (!error) {
        navigate('/dashboard');
      }
    } finally {
      setIsLoading({ ...isLoading, [planType]: false });
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-800 text-muted-foreground">Test User Accounts</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        <Button 
          variant="outline" 
          onClick={() => handleTestUserSignIn('starter')}
          disabled={isLoading.starter}
          className="justify-between"
        >
          <span>Starter Plan Test User</span>
          {isLoading.starter ? <span className="text-xs">Loading...</span> : null}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => handleTestUserSignIn('professional')}
          disabled={isLoading.professional}
          className="justify-between"
        >
          <span>Professional Plan Test User</span>
          {isLoading.professional ? <span className="text-xs">Loading...</span> : null}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => handleTestUserSignIn('enterprise')}
          disabled={isLoading.enterprise}
          className="justify-between"
        >
          <span>Enterprise Plan Test User</span>
          {isLoading.enterprise ? <span className="text-xs">Loading...</span> : null}
        </Button>
      </div>
      
      <p className="text-xs text-center text-muted-foreground">
        These accounts are for testing purposes only.
      </p>
    </div>
  );
}
