import { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Home, CreditCard, FileText, MessageCircle } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase, signOut } from '@/lib/supabase';
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

interface LocalNavItem {
  name: string;
  url: string;
  icon: React.ComponentType<any>;
  onClick: () => void;
}

const NavBarIcon = ({ icon: Icon, ...props }: { icon: any }) => (
  <Icon className="h-4 w-4 mr-2" {...props} />
);

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
      name: 'Home', 
      url: '/', 
      icon: Home,
      onClick: () => handleNavigation('/')
    },
    { 
      name: 'Contact', 
      url: '/#demo', 
      icon: MessageCircle,
      onClick: () => handleNavigation('/#demo')
    }
  ];
  
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
              items={navItems.map(item => ({
                name: item.name,
                url: item.url,
                icon: item.icon,
                onClick: item.onClick
              }))} 
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
                      AI
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
