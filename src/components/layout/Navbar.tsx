
import { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Home, Bot, CreditCard, Mail } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { Link } from 'react-router-dom';

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
    { name: 'Product', url: '/product', icon: Home },
    { name: 'Pricing', url: '#pricing', icon: CreditCard },
    { name: 'Resources', url: '/resources', icon: Bot },
    { name: 'Contact', url: '#how-it-works', icon: Mail }
  ];

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
      isScrolled ? "py-3 bg-background/80 backdrop-blur-md shadow-sm" : "py-5"
    )}>
      <div className="container flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <span className="font-bold text-xl">RealHomeAI</span>
        </a>
        
        <NavBar items={navItems} className="hidden md:flex" />
        
        <div className="flex items-center gap-4">
          <Button variant="outline" className="hidden sm:flex">
            Log In
          </Button>
          <Button>Get Started</Button>
        </div>
      </div>
      
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md shadow-lg py-2">
        <div className="container">
          <NavBar items={navItems} />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
