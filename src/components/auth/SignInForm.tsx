import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { signIn, signInWithGoogle, getUserRole } from '@/lib/supabase';

export function SignInForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      const { error, data } = await signIn(email, password);
      
      if (error) {
        console.error("Sign in error:", error);
        toast.error(error.message || "Failed to sign in");
        return;
      }
      
      // If login successful, check user role
      if (data?.user) {
        console.log("Sign in successful, user:", data.user);
        
        try {
          const role = await getUserRole(data.user.id);
          console.log("User role retrieved:", role);
          
          // Store role in localStorage for immediate availability
          localStorage.setItem('userRole', role || 'user');
          
          // Show success message
          if (role === 'admin') {
            toast.success("Welcome back, Admin!");
            navigate('/admin', { replace: true });
          } else {
            toast.success("Signed in successfully!");
            navigate('/dashboard', { replace: true });
          }
          
        } catch (roleError) {
          console.error("Error getting user role:", roleError);
          toast.success("Signed in successfully!");
          localStorage.setItem('userRole', 'user');
          navigate('/dashboard', { replace: true });
        }
      } else {
        console.warn("Sign in succeeded but no user data returned");
        toast.success("Signed in successfully!");
        localStorage.setItem('userRole', 'user');
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      console.error("Unexpected error during sign in:", error);
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      const { error } = await signInWithGoogle();
      
      if (error) {
        console.error("Google sign in error:", error);
        toast.error(error.message || "Failed to sign in with Google");
      }
      
      // Google sign-in will be handled by the callback and router
    } catch (error: any) {
      console.error("Unexpected error during Google sign in:", error);
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="hello@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Button 
            variant="link" 
            className="p-0 h-auto text-sm"
            onClick={() => navigate('/reset-password')}
            type="button"
          >
            Forgot password?
          </Button>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign In"}
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-800 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <Button 
        type="button" 
        variant="outline" 
        className="w-full flex items-center justify-center gap-2"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {isGoogleLoading ? "Signing in..." : "Sign in with Google"}
      </Button>
    </form>
  );
}
