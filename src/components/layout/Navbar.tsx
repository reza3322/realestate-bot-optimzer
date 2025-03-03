
import { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Home, CreditCard, FileText, Mail } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase, signOut } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    
    getUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        toast.error(error.message || "Failed to sign out");
        return;
      }
      
      toast.success("Signed out successfully");
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
    }
  };

  const navItems = [
    { name: 'Product', url: '/product', icon: Home },
    { name: 'Pricing', url: '/#pricing', icon: CreditCard },
    { name: 'Resources', url: '/resources', icon: FileText },
    { name: 'Contact', url: '/#contact', icon: Mail }
  ];

  const scrollToSection = (id: string) => {
    if (location.pathname !== '/') {
      // If not on homepage, navigate to home and then scroll after a delay
      navigate(`/${id ? '#' + id : ''}`);
      return;
    }
    
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavigation = (url: string) => {
    if (url.startsWith('/#')) {
      const id = url.substring(2);
      scrollToSection(id);
    } else {
      navigate(url);
    }
  };

  const getUserInitials = () => {
    if (!user || !user.user_metadata) return '?';
    
    const firstName = user.user_metadata.first_name || '';
    const lastName = user.user_metadata.last_name || '';
    
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  };

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
      isScrolled ? "py-3 bg-background/80 backdrop-blur-md shadow-sm" : "py-5"
    )}>
      <div className="container flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-bold text-xl">RealHomeAI</span>
        </Link>
        
        <NavBar 
          items={navItems.map(item => ({
            ...item,
            onClick: () => handleNavigation(item.url)
          }))} 
          className="hidden md:flex" 
        />
        
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard')}
                className="hidden sm:flex"
              >
                Dashboard
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="cursor-pointer">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate('/dashboard')}>
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/profile')}>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleSignOut}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                className="hidden sm:flex"
                onClick={() => navigate('/dashboard')}
              >
                Sign In
              </Button>
              <Button onClick={() => navigate('/auth')}>
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
      
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md shadow-lg py-2">
        <div className="container">
          <NavBar 
            items={navItems.map(item => ({
              ...item,
              onClick: () => handleNavigation(item.url)
            }))}
          />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
