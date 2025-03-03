
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSession, getUserRole } from '@/lib/supabase';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';

const Auth = () => {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('signin');
  
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const type = searchParams.get('type');
    if (type === 'signup') {
      setActiveTab('signup');
    }
  }, [location]);
  
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await getSession();
        setSession(session);
        
        if (session) {
          // If user is authenticated, check role and redirect accordingly
          try {
            const role = await getUserRole(session.user.id);
            if (role === 'admin') {
              navigate('/admin', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          } catch (error) {
            console.error("Error getting user role:", error);
            // Default to dashboard if role check fails
            navigate('/dashboard', { replace: true });
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const handleStorageChange = () => {
      checkAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [navigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-300 ${
      activeTab === 'signin' 
        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800' 
        : 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800'
    }`}>
      <div className="container px-4 py-8">
        <Button 
          variant="ghost" 
          className="mb-8"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
        
        <div className="flex flex-col md:flex-row max-w-5xl mx-auto w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
            <div className="text-center space-y-2 mb-6">
              <h1 className="text-3xl font-bold">Welcome to RealHomeAI</h1>
              <p className="text-muted-foreground">
                Sign in to your account or create a new one
              </p>
            </div>
            
            <Tabs 
              defaultValue={activeTab} 
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="mt-0">
                <SignInForm />
              </TabsContent>
              
              <TabsContent value="signup" className="mt-0">
                <SignUpForm />
              </TabsContent>
            </Tabs>
          </div>
          
          <div className={`hidden md:flex md:w-1/2 p-12 items-center justify-center transition-colors duration-300 ${
            activeTab === 'signin' 
              ? 'bg-primary text-white' 
              : 'bg-emerald-600 text-white'
          }`}>
            <div className="text-center space-y-4">
              {activeTab === 'signin' ? (
                <>
                  <h2 className="text-3xl font-bold">New Here?</h2>
                  <p className="text-white/90">
                    Sign up and discover a great amount of new opportunities with RealHomeAI!
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4 bg-transparent text-white border-white hover:bg-white/10"
                    onClick={() => setActiveTab('signup')}
                  >
                    Create Account
                  </Button>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-bold">Already Have an Account?</h2>
                  <p className="text-white/90">
                    Sign in to access your dashboard and continue your journey with RealHomeAI.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4 bg-transparent text-white border-white hover:bg-white/10"
                    onClick={() => setActiveTab('signin')}
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
