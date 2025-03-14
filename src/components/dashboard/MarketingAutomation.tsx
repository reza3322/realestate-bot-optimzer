
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Users, MessageSquare, Activity, Plus, Trash2, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

interface MarketingAutomationProps {
  userPlan: string;
  isPremiumFeature: (plan: string) => boolean;
}

const MarketingAutomation = ({ userPlan, isPremiumFeature }: MarketingAutomationProps) => {
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAutomation, setNewAutomation] = useState({
    name: "",
    type: "follow-up",
    content: "Thank you for your interest in our properties. Would you like to schedule a viewing?",
    active: true
  });
  const [leads, setLeads] = useState<any[]>([]);
  const [automationHistory, setAutomationHistory] = useState<any[]>([]);
  const [selectedAutomation, setSelectedAutomation] = useState<any>(null);
  
  useEffect(() => {
    if (!isPremiumFeature('professional')) {
      fetchAutomations();
      fetchLeads();
      fetchAutomationHistory();
    }
  }, [isPremiumFeature]);
  
  const fetchAutomations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('marketing_automations')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching automations:", error);
        toast.error("Failed to load automation data");
        return;
      }
      
      setAutomations(data || []);
    } catch (error) {
      console.error("Error in fetchAutomations:", error);
      toast.error("An error occurred while fetching automations");
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching leads:", error);
        return;
      }
      
      setLeads(data || []);
    } catch (error) {
      console.error("Error in fetchLeads:", error);
    }
  };
  
  const fetchAutomationHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_history')
        .select(`
          *,
          automation:marketing_automations(name, type),
          lead:leads(first_name, last_name, email)
        `)
        .order('sent_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching automation history:", error);
        return;
      }
      
      setAutomationHistory(data || []);
    } catch (error) {
      console.error("Error in fetchAutomationHistory:", error);
    }
  };
  
  const handleCreateAutomation = async () => {
    try {
      if (!newAutomation.name.trim()) {
        toast.error("Please provide a name for the automation");
        return;
      }
      
      const { data, error } = await supabase
        .from('marketing_automations')
        .insert({
          name: newAutomation.name,
          type: newAutomation.type,
          content: newAutomation.content,
          active: newAutomation.active
        })
        .select();
        
      if (error) {
        console.error("Error creating automation:", error);
        toast.error("Failed to create automation");
        return;
      }
      
      toast.success("Automation created successfully");
      setNewAutomation({
        name: "",
        type: "follow-up",
        content: "Thank you for your interest in our properties. Would you like to schedule a viewing?",
        active: true
      });
      
      // Refresh the list
      fetchAutomations();
      
    } catch (error) {
      console.error("Error in handleCreateAutomation:", error);
      toast.error("An error occurred while creating the automation");
    }
  };
  
  const handleDeleteAutomation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('marketing_automations')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error("Error deleting automation:", error);
        toast.error("Failed to delete automation");
        return;
      }
      
      toast.success("Automation deleted successfully");
      fetchAutomations();
      
    } catch (error) {
      console.error("Error in handleDeleteAutomation:", error);
      toast.error("An error occurred while deleting the automation");
    }
  };
  
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('marketing_automations')
        .update({ active: !currentActive })
        .eq('id', id);
        
      if (error) {
        console.error("Error updating automation:", error);
        toast.error("Failed to update automation");
        return;
      }
      
      toast.success(`Automation ${currentActive ? 'paused' : 'activated'}`);
      fetchAutomations();
      
    } catch (error) {
      console.error("Error in handleToggleActive:", error);
      toast.error("An error occurred while updating the automation");
    }
  };
  
  const sendAutomationToLead = async (leadId: string, automationId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("You must be logged in to send follow-ups");
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('send-lead-followup', {
        body: {
          leadId,
          automationId,
          userId: userData.user.id
        }
      });
      
      if (error) {
        console.error("Error sending follow-up:", error);
        toast.error("Failed to send follow-up");
        return;
      }
      
      toast.success("Follow-up sent successfully");
      fetchAutomationHistory();
      fetchLeads();
      
    } catch (error) {
      console.error("Error in sendAutomationToLead:", error);
      toast.error("An error occurred while sending the follow-up");
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Marketing Automation</h2>
      </div>
      
      <Tabs defaultValue="follow-ups">
        <TabsList className="grid grid-cols-3 w-full max-w-2xl">
          <TabsTrigger value="follow-ups">
            {isPremiumFeature('professional') && <Lock className="mr-2 h-4 w-4" />}
            Automated Follow-Ups
          </TabsTrigger>
          <TabsTrigger value="visitors">
            {isPremiumFeature('professional') && <Lock className="mr-2 h-4 w-4" />}
            Visitor Tracking
          </TabsTrigger>
          <TabsTrigger value="chatbot">
            {isPremiumFeature('professional') && <Lock className="mr-2 h-4 w-4" />}
            AI Chatbot Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="follow-ups">
          {isPremiumFeature('professional') ? (
            <div className="text-center py-12">
              <Lock className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold mb-2">Upgrade to Professional Plan</h3>
              <p className="text-muted-foreground mb-6">
                Automated follow-ups are available on the Professional plan and above
              </p>
              <Button>Upgrade Now</Button>
            </div>
          ) : (
            <div className="space-y-6 mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Follow-up Automations</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Automation
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Automation</DialogTitle>
                      <DialogDescription>
                        Set up an automated message to send to your leads
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Automation Name</Label>
                        <Input 
                          id="name" 
                          value={newAutomation.name} 
                          onChange={(e) => setNewAutomation({...newAutomation, name: e.target.value})}
                          placeholder="e.g. Initial Property Inquiry Follow-up" 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <select 
                          id="type"
                          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={newAutomation.type}
                          onChange={(e) => setNewAutomation({...newAutomation, type: e.target.value})}
                        >
                          <option value="follow-up">Follow-up Message</option>
                          <option value="property-alert">Property Alert</option>
                          <option value="viewing-reminder">Viewing Reminder</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="content">Message Content</Label>
                        <textarea 
                          id="content"
                          className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={newAutomation.content}
                          onChange={(e) => setNewAutomation({...newAutomation, content: e.target.value})}
                          placeholder="Enter your message content..."
                        />
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button onClick={handleCreateAutomation}>Create Automation</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">
                          <div className="flex justify-center">
                            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : automations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                          No automations created yet. Create your first automation to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      automations.map((automation) => (
                        <TableRow key={automation.id}>
                          <TableCell className="font-medium">{automation.name}</TableCell>
                          <TableCell>
                            {automation.type === 'follow-up' && 'Follow-up Message'}
                            {automation.type === 'property-alert' && 'Property Alert'}
                            {automation.type === 'viewing-reminder' && 'Viewing Reminder'}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${automation.active ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {automation.active ? 'Active' : 'Paused'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleActive(automation.id, automation.active)}
                              >
                                {automation.active ? 'Pause' : 'Activate'}
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" onClick={() => setSelectedAutomation(automation)}>
                                    Send
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Send {automation?.name}</DialogTitle>
                                    <DialogDescription>
                                      Select a lead to send this follow-up message to
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="max-h-[300px] overflow-y-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Lead</TableHead>
                                          <TableHead>Email</TableHead>
                                          <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {leads.length === 0 ? (
                                          <TableRow>
                                            <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                              No leads found. Create leads first.
                                            </TableCell>
                                          </TableRow>
                                        ) : (
                                          leads.map((lead) => (
                                            <TableRow key={lead.id}>
                                              <TableCell className="font-medium">{lead.first_name} {lead.last_name}</TableCell>
                                              <TableCell>{lead.email || 'No email'}</TableCell>
                                              <TableCell className="text-right">
                                                <Button 
                                                  variant="outline" 
                                                  size="sm"
                                                  disabled={!lead.email}
                                                  onClick={() => {
                                                    sendAutomationToLead(lead.id, selectedAutomation?.id);
                                                  }}
                                                >
                                                  <CheckCircle className="h-4 w-4 mr-1" />
                                                  Send
                                                </Button>
                                              </TableCell>
                                            </TableRow>
                                          ))
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAutomation(automation.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Automation History</CardTitle>
                  <CardDescription>
                    Recent follow-ups sent to leads
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {automationHistory.length === 0 ? (
                      <div className="text-center text-muted-foreground py-4">
                        No automation history yet. Send your first follow-up to see it here.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {automationHistory.slice(0, 5).map((history) => (
                          <div key={history.id} className="flex items-center justify-between border-b border-border pb-2">
                            <div>
                              <p className="font-medium">{history.automation?.name || 'Unknown Automation'}</p>
                              <p className="text-sm text-muted-foreground">
                                Sent to {history.lead?.first_name} {history.lead?.last_name} ({history.lead?.email})
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(history.sent_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="visitors">
          {isPremiumFeature('professional') ? (
            <div className="text-center py-12">
              <Lock className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold mb-2">Upgrade to Professional Plan</h3>
              <p className="text-muted-foreground mb-6">
                Website visitor tracking is available on the Professional plan and above
              </p>
              <Button>Upgrade Now</Button>
            </div>
          ) : (
            <div className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Live Visitors</CardTitle>
                  <CardDescription>
                    See who is browsing your website right now
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center">
                    <Activity className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Visit History</CardTitle>
                  <CardDescription>
                    Track returning visitors and their activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button className="w-full">Generate Visitor Report</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="chatbot">
          {isPremiumFeature('professional') ? (
            <div className="text-center py-12">
              <Lock className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold mb-2">Upgrade to Professional Plan</h3>
              <p className="text-muted-foreground mb-6">
                AI Chatbot customization is available on the Professional plan and above
              </p>
              <Button>Upgrade Now</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Chatbot Performance</CardTitle>
                  <CardDescription>
                    Analytics on how your AI assistant is performing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border rounded-md p-4 text-center">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="font-medium">245</p>
                        <p className="text-sm text-muted-foreground">Conversations</p>
                      </div>
                      
                      <div className="border rounded-md p-4 text-center">
                        <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="font-medium">42</p>
                        <p className="text-sm text-muted-foreground">Leads Generated</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Chatbot Settings</CardTitle>
                  <CardDescription>
                    Customize how your AI assistant interacts with visitors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Welcome Message</p>
                        <p className="text-sm text-muted-foreground">
                          Customize the initial greeting
                        </p>
                      </div>
                      <div>
                        <Button variant="outline">Edit</Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Lead Qualification</p>
                        <p className="text-sm text-muted-foreground">
                          Set questions to qualify leads
                        </p>
                      </div>
                      <div>
                        <Button variant="outline">Configure</Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Property Suggestions</p>
                        <p className="text-sm text-muted-foreground">
                          How AI recommends properties
                        </p>
                      </div>
                      <div>
                        <Button variant="outline">Settings</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketingAutomation;
