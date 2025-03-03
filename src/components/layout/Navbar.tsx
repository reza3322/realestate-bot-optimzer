
import { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Home, CreditCard, FileText, Mail } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Product', url: '/product', icon: Home },
    { name: 'Pricing', url: '/#pricing', icon: CreditCard },
    { name: 'Resources', url: '/resources', icon: FileText },
    { name: 'Contact', url: '/#how-it-works', icon: Mail }
  ];

  const scrollToSection = (id: string) => {
    if (location.pathname !== '/') {
      // If not on homepage, navigate to home and then scroll after a delay
      window.location.href = `/${id}`;
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
    }
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
          <Button 
            variant="outline" 
            className="hidden sm:flex"
            onClick={() => window.location.href = '/product#signup'}
          >
            Log In
          </Button>
          <Button onClick={() => window.location.href = '/product#signup'}>
            Get Started
          </Button>
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
