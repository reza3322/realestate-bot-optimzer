
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lock, Search, MessageSquare, Bell } from "lucide-react";

interface LeadManagementProps {
  userPlan: string;
  isPremiumFeature: (plan: string) => boolean;
}

const LeadManagement = ({ userPlan, isPremiumFeature }: LeadManagementProps) => {
  const [activeLeadTab, setActiveLeadTab] = useState("all");
  
  const leads = [
    {
      id: 1,
      name: "John Smith",
      email: "john@example.com",
      phone: "+1 (555) 123-4567",
      status: "new",
      source: "AI Chatbot",
      date: "2023-10-15",
      score: 85,
      propertyInterest: "Luxury Villa",
      budget: "€800,000 - €900,000",
      lastContact: "2023-10-15"
    },
    {
      id: 2,
      name: "Sarah Johnson",
      email: "sarah@example.com",
      phone: "+1 (555) 987-6543",
      status: "contacted",
      source: "Website Form",
      date: "2023-10-10",
      score: 92,
      propertyInterest: "City Apartment",
      budget: "€300,000 - €350,000",
      lastContact: "2023-10-12"
    },
    {
      id: 3,
      name: "Michael Brown",
      email: "michael@example.com",
      phone: "+1 (555) 456-7890",
      status: "qualified",
      source: "AI Chatbot",
      date: "2023-10-08",
      score: 65,
      propertyInterest: "Beachfront Property",
      budget: "€500,000 - €600,000",
      lastContact: "2023-10-14"
    },
    {
      id: 4,
      name: "Emily Davis",
      email: "emily@example.com",
      phone: "+1 (555) 321-7654",
      status: "converted",
      source: "Referral",
      date: "2023-10-05",
      score: 78,
      propertyInterest: "Suburban House",
      budget: "€400,000 - €450,000",
      lastContact: "2023-10-13"
    },
    {
      id: 5,
      name: "David Wilson",
      email: "david@example.com",
      phone: "+1 (555) 789-0123",
      status: "new",
      source: "Google Ad",
      date: "2023-10-14",
      score: 45,
      propertyInterest: "Investment Property",
      budget: "€200,000 - €300,000",
      lastContact: "2023-10-14"
    }
  ];

  // Helper function to get badge color based on lead status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="default">New</Badge>;
      case 'contacted':
        return <Badge variant="outline">Contacted</Badge>;
      case 'qualified':
        return <Badge className="bg-green-500">Qualified</Badge>;
      case 'converted':
        return <Badge className="bg-blue-500">Converted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Helper function to get badge color based on lead score
  const getScoreBadge = (score: number) => {
    if (score >= 80) {
      return <Badge className="bg-green-500">{score}%</Badge>;
    } else if (score >= 60) {
      return <Badge className="bg-yellow-500">{score}%</Badge>;
    } else {
      return <Badge variant="outline">{score}%</Badge>;
    }
  };
  
  // Helper function to get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };
  
  // Filter leads based on active tab
  const filteredLeads = leads.filter(lead => {
    if (activeLeadTab === 'all') return true;
    return lead.status === activeLeadTab;
  });
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Lead Management</h2>
        <div className="flex gap-2">
          <Button variant="outline">Export</Button>
          <Button>Add Lead</Button>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <Tabs defaultValue="all" value={activeLeadTab} onValueChange={setActiveLeadTab} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">All Leads</TabsTrigger>
            <TabsTrigger value="new">New</TabsTrigger>
            <TabsTrigger value="contacted">Contacted</TabsTrigger>
            <TabsTrigger value="qualified">Qualified</TabsTrigger>
            <TabsTrigger value="converted">Converted</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex gap-2 items-center">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search leads..." className="w-64" />
        </div>
      </div>
      
      <div className="rounded-md border">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Source</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Score</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <td className="p-4 align-middle">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="" alt={lead.name} />
                        <AvatarFallback>{getInitials(lead.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-middle">{getStatusBadge(lead.status)}</td>
                  <td className="p-4 align-middle">{lead.source}</td>
                  <td className="p-4 align-middle">{new Date(lead.date).toLocaleDateString()}</td>
                  <td className="p-4 align-middle">{getScoreBadge(lead.score)}</td>
                  <td className="p-4 align-middle">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={isPremiumFeature('professional')}>
                        {isPremiumFeature('professional') ? <Lock className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Lead Engagement</CardTitle>
            <CardDescription>View and manage conversations with leads</CardDescription>
          </CardHeader>
          <CardContent>
            {isPremiumFeature('professional') ? (
              <div className="text-center py-6">
                <Lock className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">Upgrade to Professional Plan</h3>
                <p className="text-muted-foreground mb-6">
                  AI chat logs and manual takeover are available on the Professional plan
                </p>
                <Button>Upgrade Now</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border p-4 text-center">
                  <p className="text-muted-foreground">Select a lead to view chat history</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Lead Details</CardTitle>
            <CardDescription>
              Select a lead to view details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-sm text-muted-foreground">-</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Score</p>
                  <p className="text-sm text-muted-foreground">-</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">-</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">-</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeadManagement;
