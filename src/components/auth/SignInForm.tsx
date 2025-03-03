
import { useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function SignInForm() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoaded) {
      return;
    }

    try {
      setIsLoading(true);
      
      const result = await signIn.create({
        identifier: email,
        password,
      });
      
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        toast.success("Signed in successfully!");
        navigate('/dashboard');
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || "Failed to sign in");
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
    </form>
  );
}
