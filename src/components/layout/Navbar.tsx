
import { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Home, User, MessageSquare, Phone } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Home', url: '#', icon: Home },
    { name: 'About', url: '#about', icon: User },
    { name: 'Features', url: '#features', icon: MessageSquare },
    { name: 'Contact', url: '#contact', icon: Phone }
  ];

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isScrolled ? "py-3 bg-background/80 backdrop-blur-md shadow-sm" : "py-5"
    )}>
      <div className="container flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <img 
            src="/lovable-uploads/654f67aa-52f1-4e55-9489-935a9e4f500e.png" 
            alt="RealHomeAI Logo" 
            className="h-10"
          />
        </a>
        
        <div className="hidden md:flex">
          <NavBar items={navItems} className="relative mb-0 pt-0" />
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="outline" className="hidden sm:flex">
            Log In
          </Button>
          <Button>Get Started</Button>
        </div>
      </div>
      
      <div className="md:hidden">
        <NavBar items={navItems} />
      </div>
    </header>
  );
};

export default Navbar;
