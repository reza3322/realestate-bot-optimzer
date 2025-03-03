
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Users, MessageSquare, Activity } from "lucide-react";

interface MarketingAutomationProps {
  userPlan: string;
  isPremiumFeature: (plan: string) => boolean;
}

const MarketingAutomation = ({ userPlan, isPremiumFeature }: MarketingAutomationProps) => {
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Property Match Alerts</CardTitle>
                  <CardDescription>
                    Send alerts when new properties match lead criteria
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Enable property match alerts</p>
                        <p className="text-sm text-muted-foreground">
                          AI will notify leads about relevant properties
                        </p>
                      </div>
                      <div>
                        <Button variant="outline">Configure</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Drip Campaigns</CardTitle>
                  <CardDescription>
                    Set up automated message sequences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">New lead welcome sequence</p>
                        <p className="text-sm text-muted-foreground">
                          3 messages over 7 days
                        </p>
                      </div>
                      <div>
                        <Button variant="outline">Edit</Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Property viewing follow-up</p>
                        <p className="text-sm text-muted-foreground">
                          2 messages over 3 days
                        </p>
                      </div>
                      <div>
                        <Button variant="outline">Edit</Button>
                      </div>
                    </div>
                    
                    <Button>Create New Campaign</Button>
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
