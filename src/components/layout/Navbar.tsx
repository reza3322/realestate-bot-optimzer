
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 w-full",
        isScrolled 
          ? "py-3 glass-morphism" 
          : "py-5 bg-transparent"
      )}
    >
      <div className="container px-4 mx-auto flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <span className="text-primary font-semibold text-xl">RealAssist.AI</span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {['Features', 'Benefits', 'How it Works', 'Pricing'].map((item) => (
            <a 
              key={item} 
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors focus-ring rounded-md px-1 py-0.5"
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Button variant="outline" className="shadow-none">
            Log in
          </Button>
          <Button>Get Started</Button>
        </div>

        <button 
          className="md:hidden focus-ring rounded-md p-1"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      <div className={cn(
        "md:hidden fixed inset-x-0 top-[57px] bg-background border-b border-border shadow-lg transition-all duration-300 ease-in-out",
        isMobileMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0 pointer-events-none"
      )}>
        <div className="container px-4 py-5 mx-auto flex flex-col gap-5">
          <nav className="flex flex-col gap-4">
            {['Features', 'Benefits', 'How it Works', 'Pricing'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-base font-medium text-foreground/80 hover:text-primary transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex flex-col gap-3 mt-2">
            <Button variant="outline" className="w-full justify-center shadow-none">
              Log in
            </Button>
            <Button className="w-full justify-center">
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
