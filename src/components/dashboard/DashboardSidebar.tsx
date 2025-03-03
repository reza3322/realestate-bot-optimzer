
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Home, 
  Users, 
  MessageSquare, 
  Settings, 
  ChartBar,
  Link as LinkIcon,
  MessageCircle
} from "lucide-react";

interface DashboardSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const DashboardSidebar = ({ activeTab, setActiveTab }: DashboardSidebarProps) => {
  const navItems = [
    {
      name: "Overview",
      icon: LayoutDashboard,
      value: "overview"
    },
    {
      name: "Properties",
      icon: Home,
      value: "properties"
    },
    {
      name: "Leads & CRM",
      icon: Users,
      value: "leads"
    },
    {
      name: "Marketing",
      icon: MessageSquare,
      value: "marketing"
    },
    {
      name: "Chatbot",
      icon: MessageCircle,
      value: "chatbot"
    },
    {
      name: "Integrations",
      icon: LinkIcon,
      value: "integrations"
    },
    {
      name: "Analytics",
      icon: ChartBar,
      value: "analytics"
    },
    {
      name: "Settings",
      icon: Settings,
      value: "settings"
    }
  ];
  
  return (
    <aside className="w-64 border-r bg-muted/10 p-4 hidden md:block">
      <div className="space-y-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Dashboard
          </h2>
          <div className="space-y-1">
            {navItems.map((item) => (
              <Button
                key={item.value}
                variant={activeTab === item.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(item.value)}
                className={cn(
                  "w-full justify-start",
                  activeTab === item.value 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
