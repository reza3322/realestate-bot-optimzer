
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lock, Search, MessageSquare, Bell, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface LeadManagementProps {
  userPlan: string;
  isPremiumFeature: (plan: string) => boolean;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  source: string;
  date: string;
  score: number;
  propertyInterest: string | null;
  budget: string | null;
  lastContact: string;
  conversation_id?: string;
  user_id?: string;
}

const LeadManagement = ({ userPlan, isPremiumFeature }: LeadManagementProps) => {
  const [activeLeadTab, setActiveLeadTab] = useState("all");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in to view leads");
        return;
      }

      // Get leads from the database
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching leads:", error);
        toast.error("Failed to load leads");
        return;
      }

      // Transform the leads data to match our component's expected format
      const formattedLeads = data.map(lead => ({
        id: lead.id,
        name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown',
        email: lead.email || 'No email provided',
        phone: lead.phone,
        status: lead.status || 'new',
        source: lead.source || 'AI Chatbot',
        date: new Date(lead.created_at).toISOString().split('T')[0],
        score: calculateLeadScore(lead), // Calculate a score based on data completeness
        propertyInterest: lead.property_interest,
        budget: lead.budget ? `€${lead.budget.toLocaleString()}` : null,
        lastContact: new Date(lead.created_at).toISOString().split('T')[0],
        conversation_id: lead.conversation_id
      }));

      setLeads(formattedLeads);
    } catch (error) {
      console.error("Error in fetchLeads:", error);
      toast.error("Failed to load leads data");
    } finally {
      setLoading(false);
    }
  };

  // Calculate a lead score based on the completeness of lead information
  const calculateLeadScore = (lead: any): number => {
    let score = 40; // Base score
    
    if (lead.email) score += 10;
    if (lead.phone) score += 10;
    if (lead.property_interest) score += 15;
    if (lead.budget) score += 15;
    if (lead.status === 'qualified') score += 10;
    if (lead.status === 'converted') score += 20;
    
    return Math.min(score, 100); // Cap at 100
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId)
        .select();

      if (error) {
        console.error("Error updating lead status:", error);
        toast.error("Failed to update lead status");
        return;
      }

      // Update the leads list with the new status
      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ));

      // Update selected lead if it's currently selected
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }

      toast.success(`Lead status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error in updateLeadStatus:", error);
      toast.error("Failed to update lead status");
    }
  };

  const fetchLeadConversations = async (lead: Lead) => {
    try {
      if (!lead.conversation_id) {
        setChatHistory([]);
        return;
      }

      const { data, error } = await supabase
        .from('chatbot_conversations')
        .select('*')
        .eq('conversation_id', lead.conversation_id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching chat history:", error);
        toast.error("Failed to load chat history");
        return;
      }

      setChatHistory(data || []);
    } catch (error) {
      console.error("Error in fetchLeadConversations:", error);
      setChatHistory([]);
    }
  };

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead);
    fetchLeadConversations(lead);
  };

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
  
  // Filter leads based on active tab and search query
  const filteredLeads = leads.filter(lead => {
    const matchesTab = activeLeadTab === 'all' || lead.status === activeLeadTab;
    const matchesSearch = searchQuery === '' || 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.propertyInterest && lead.propertyInterest.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesTab && matchesSearch;
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
          <Input 
            placeholder="Search leads..." 
            className="w-64" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="rounded-md border">
        <div className="relative w-full overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin h-6 w-6 border-t-2 border-primary rounded-full"></div>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
              <p className="mb-2">No leads found</p>
              <p className="text-sm">Leads will appear here when website visitors interact with your chatbot</p>
            </div>
          ) : (
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
                  <tr 
                    key={lead.id} 
                    className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${selectedLead?.id === lead.id ? 'bg-muted' : ''}`}
                    onClick={() => handleLeadSelect(lead)}
                    style={{ cursor: 'pointer' }}
                  >
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
                        <Button variant="ghost" size="icon" onClick={(e) => {
                          e.stopPropagation();
                          handleLeadSelect(lead);
                        }}>
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
          )}
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
            ) : selectedLead ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">{selectedLead.name}</h3>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateLeadStatus(selectedLead.id, 'contacted')}
                      disabled={selectedLead.status === 'contacted'}
                    >
                      Mark as Contacted
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateLeadStatus(selectedLead.id, 'qualified')}
                      disabled={selectedLead.status === 'qualified'}
                      className="bg-green-500/10"
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Qualify
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateLeadStatus(selectedLead.id, 'converted')}
                      disabled={selectedLead.status === 'converted'}
                      className="bg-blue-500/10"
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Convert
                    </Button>
                  </div>
                </div>
                
                <div className="rounded-md border p-4 max-h-[300px] overflow-y-auto">
                  {chatHistory.length > 0 ? (
                    <div className="space-y-3">
                      {chatHistory.map((msg, index) => (
                        <div key={index} className="rounded-lg p-3 mb-2" style={{ 
                          backgroundColor: msg.message === msg.message ? '#f1f5f9' : '#e2e8f0',
                        }}>
                          <p className="text-xs text-muted-foreground mb-1">
                            {msg.message === msg.message ? 'Lead:' : 'Chatbot:'}
                            <span className="ml-2 text-xs">
                              {new Date(msg.created_at).toLocaleString()}
                            </span>
                          </p>
                          <p>{msg.message === msg.message ? msg.message : msg.response}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">
                      {selectedLead.conversation_id 
                        ? "Loading conversation history..." 
                        : "No conversation history available for this lead"}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-md border p-4 text-center">
                <p className="text-muted-foreground">Select a lead to view chat history</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Lead Details</CardTitle>
            <CardDescription>
              {selectedLead ? selectedLead.name : "Select a lead to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedLead ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-sm text-muted-foreground">{selectedLead.status}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Score</p>
                    <p className="text-sm text-muted-foreground">{selectedLead.score}%</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{selectedLead.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{selectedLead.email}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium">Property Interest</p>
                    <p className="text-sm text-muted-foreground">{selectedLead.propertyInterest || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium">Budget</p>
                    <p className="text-sm text-muted-foreground">{selectedLead.budget || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium">Source</p>
                    <p className="text-sm text-muted-foreground">{selectedLead.source}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium">First Contact</p>
                    <p className="text-sm text-muted-foreground">{new Date(selectedLead.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ) : (
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
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeadManagement;
