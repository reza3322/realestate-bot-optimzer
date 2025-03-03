
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Auth = () => {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  
  // If user is already signed in, redirect to dashboard
  useEffect(() => {
    if (isSignedIn) {
      navigate('/dashboard');
    }
  }, [isSignedIn, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container px-4 py-8">
        <Button 
          variant="ghost" 
          className="mb-8"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="max-w-md mx-auto w-full space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Welcome to RealHomeAI</h1>
            <p className="text-muted-foreground">
              Sign in to your account or create a new one
            </p>
          </div>
          
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="mt-6">
              <SignInForm />
            </TabsContent>
            
            <TabsContent value="signup" className="mt-6">
              <SignUpForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;
