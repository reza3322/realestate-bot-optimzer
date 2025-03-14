
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface IntegrationsProps {
  userPlan: string;
  isPremiumFeature: (plan: string) => boolean;
}

const Integrations = ({ userPlan, isPremiumFeature }: IntegrationsProps) => {
  const integrations = [
    {
      name: "WhatsApp Business",
      description: "Connect to send messages and notifications",
      status: "Not connected",
      icon: "📱"
    },
    {
      name: "Google Calendar",
      description: "Sync appointments and property viewings",
      status: "Not connected",
      icon: "📅"
    },
    {
      name: "Instagram",
      description: "Pull leads from Instagram DMs",
      status: "Not connected",
      icon: "📷"
    },
    {
      name: "MLS Integration",
      description: "Sync with multiple listing services",
      status: "Not connected",
      icon: "🏠"
    },
    {
      name: "Zapier",
      description: "Connect with 3,000+ other apps",
      status: "Not connected",
      icon: "⚡"
    },
    {
      name: "Custom Webhook",
      description: "Send data to external systems",
      status: "Not connected",
      icon: "🔗"
    }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Integrations & API</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {integrations.map((integration, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-xl">{integration.icon}</span>
                    {integration.name}
                  </CardTitle>
                  <CardDescription>{integration.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Status: <span className="text-foreground">{integration.status}</span>
                </div>
                <Button variant="outline" className="w-full">Connect</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Custom API Credentials</CardTitle>
          <CardDescription>
            Use these credentials to access your data programmatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="flex gap-2">
                <Input id="api-key" value="••••••••••••••••••••••••••••••" readOnly />
                <Button variant="outline">Show</Button>
                <Button variant="outline">Regenerate</Button>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="api-docs">API Documentation</Label>
              <Button variant="outline" className="w-full text-left justify-start">
                View Documentation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Integrations;
