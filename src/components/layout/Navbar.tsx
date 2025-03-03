import { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Home, CreditCard, FileText, MessageCircle } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut, getSession } from '@/lib/supabase';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger, 
  DropdownMenuGroup 
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';

interface LocalNavItem {
  name: string;
  url: string;
  icon: LucideIcon;
  onClick: () => void;
}

const NavBarIcon = ({ icon: Icon, ...props }: { icon: LucideIcon }) => (
  <Icon className="h-4 w-4 mr-2" {...props} />
);

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setScrolled(offset > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    // Check active session on component mount
    const checkAuth = async () => {
      const { data: { session } } = await getSession();
      if (session) {
        setIsLoggedIn(true);
        setUserProfile(session.user);
      } else {
        setIsLoggedIn(false);
        setUserProfile(null);
      }
    };
    
    checkAuth();
    
    // Listen for auth state changes using local storage events
    const handleStorageChange = () => {
      checkAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  const handleNavigation = (path: string) => {
    if (path.startsWith('/#') && location.pathname === '/') {
      const element = document.getElementById(path.substring(2));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(path);
    }
  };
  
  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) throw error;
      
      toast.success('Signed out successfully');
      setIsLoggedIn(false);
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Error signing out');
    }
  };
  
  const navItems: LocalNavItem[] = [
    { 
      name: 'Product', 
      url: '/product', 
      icon: CreditCard,
      onClick: () => handleNavigation('/product')
    },
    { 
      name: 'Resources', 
      url: '/resources', 
      icon: FileText,
      onClick: () => handleNavigation('/resources')
    },
    { 
      name: 'Pricing', 
      url: '/#pricing', 
      icon: Home,
      onClick: () => handleNavigation('/#pricing')
    },
    { 
      name: 'Contact', 
      url: '/#demo', 
      icon: MessageCircle,
      onClick: () => handleNavigation('/#demo')
    }
  ];

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!userProfile) return 'U';
    
    const firstName = userProfile.user_metadata?.first_name || '';
    const lastName = userProfile.user_metadata?.last_name || '';
    
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    } else if (firstName) {
      return firstName[0].toUpperCase();
    } else if (userProfile.email) {
      return userProfile.email[0].toUpperCase();
    }
    
    return 'U';
  };
  
  return (
    <header className={cn(
      "sticky top-0 z-50 w-full transition-all duration-300",
      scrolled ? "bg-background/95 backdrop-blur-sm shadow-sm" : "bg-transparent"
    )}>
      <div className="container px-4 mx-auto">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              RealHomeAI
            </span>
          </Link>
          
          <div className="hidden md:flex md:items-center md:space-x-1">
            <NavBar 
              items={navItems} 
              className={cn(
                "ml-auto mr-4",
                scrolled ? "bg-white/20 dark:bg-gray-800/30" : "bg-white/10 dark:bg-gray-800/20"
              )}
            />
            
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <span className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {getUserInitials()}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex space-x-2">
                <Button variant="ghost" onClick={() => navigate('/auth?type=signin')}>
                  Sign in
                </Button>
                <Button onClick={() => navigate('/auth?type=signup')}>
                  Get Started
                </Button>
              </div>
            )}
          </div>
          
          <div className="md:hidden">
            <Button size="sm" onClick={() => navigate('/auth?type=signup')}>
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
