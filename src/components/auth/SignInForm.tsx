
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { signIn } from '@/lib/supabase';

export function SignInForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      const { error } = await signIn(email, password);
      
      if (error) {
        toast.error(error.message || "Failed to sign in");
        return;
      }
      
      toast.success("Signed in successfully!");
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
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

      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">Or sign in with</p>
        <div className="flex justify-center gap-4 mt-3">
          <Button type="button" variant="outline" size="icon" className="rounded-full">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </Button>
          <Button type="button" variant="outline" size="icon" className="rounded-full">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" fill="#1877F2"/>
            </svg>
          </Button>
          <Button type="button" variant="outline" size="icon" className="rounded-full">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.94 5.00002C8.48 5.00002 9.73 6.24002 9.73 7.79002C9.73 9.34002 8.48 10.58 6.94 10.58C5.4 10.58 4.15 9.34002 4.15 7.79002C4.15 6.24002 5.4 5.00002 6.94 5.00002ZM6.94 13.58C10 13.58 13.44 15.07 13.44 16.08V16.72H0.44V16.08C0.44 15.07 3.88 13.58 6.94 13.58ZM16.73 5.75002C17.99 5.75002 19 6.76002 19 8.01002C19 9.26002 17.99 10.27 16.73 10.27C15.48 10.27 14.46 9.26002 14.46 8.01002C14.46 6.76002 15.48 5.75002 16.73 5.75002ZM16.73 11.38C18.55 11.38 20.73 12.28 20.73 12.94V13.44H12.73V12.94C12.73 12.28 14.91 11.38 16.73 11.38Z" fill="#333333"/>
            </svg>
          </Button>
        </div>
      </div>
    </form>
  );
}
