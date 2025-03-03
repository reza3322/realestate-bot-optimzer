
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
  onClick?: () => void;
}

interface NavBarProps {
  items: NavItem[];
  className?: string;
}

export function NavBar({ items, className }: NavBarProps) {
  const [activeTab, setActiveTab] = useState(items[0]?.name || '');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex items-center gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.name;

          return (
            <button
              key={item.name}
              onClick={() => {
                setActiveTab(item.name);
                item.onClick && item.onClick();
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md transition-colors",
                "text-foreground/70 hover:text-primary",
                isActive && "bg-muted text-primary font-medium"
              )}
            >
              <Icon size={16} />
              <span className={isMobile ? "hidden" : "inline"}>{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
