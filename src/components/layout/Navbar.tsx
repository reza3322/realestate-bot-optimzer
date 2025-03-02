
import { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Home, User, Briefcase, FileText } from "lucide-react";
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
    { name: 'Projects', url: '#', icon: Briefcase },
    { name: 'Resume', url: '#', icon: FileText }
  ];

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
      isScrolled ? "py-3 bg-background/80 backdrop-blur-md shadow-sm" : "py-5"
    )}>
      <div className="container flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 z-50">
          <span className="font-bold text-xl">RealHomeAI</span>
        </a>
        
        <div className="hidden md:flex items-center z-50">
          <NavBar items={navItems} className="relative mb-0 pt-0 static translate-x-0 left-0" />
        </div>
        
        <div className="flex items-center gap-4 z-50">
          <Button variant="outline" className="hidden sm:flex">
            Log In
          </Button>
          <Button>Get Started</Button>
        </div>
      </div>
      
      <div className="md:hidden fixed bottom-0 left-0 right-0 flex justify-center pb-6 z-50">
        <NavBar items={navItems} className="relative mb-0 w-auto" />
      </div>
    </header>
  );
};

export default Navbar;
