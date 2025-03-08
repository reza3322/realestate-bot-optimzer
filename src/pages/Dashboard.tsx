
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/sections/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { getSession, getUserProfile, getUserRole, getLeads, getProperties, getRecentActivities, supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import QuickStats from '@/components/dashboard/QuickStats';
import RecentActivity from '@/components/dashboard/RecentActivity';
import PropertyListings from '@/components/dashboard/PropertyListings';
import LeadManagement from '@/components/dashboard/LeadManagement';
import MarketingAutomation from '@/components/dashboard/MarketingAutomation';
import Integrations from '@/components/dashboard/Integrations';
import AccountSettings from '@/components/dashboard/AccountSettings';
import ChatbotSettings from '@/components/dashboard/ChatbotSettings';
import ChatConversations from "@/components/dashboard/ChatConversations";
import { PlusCircle, Upload, FileSpreadsheet, Users, Bell, Lock } from 'lucide-react';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userPlan, setUserPlan] = useState('starter');
  const [userProfile, setUserProfile] = useState(null);
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeConversations: 0,
    chatbotInteractions: 0,
    totalProperties: 0,
    featuredProperties: 0
  });
  const [activities, setActivities] = useState([]);
  const navigate = useNavigate();

  // Set up real-time subscriptions
  useEffect(() => {
    let leadsSubscription;
    let conversationsSubscription;
    let propertiesSubscription;
    let trainingDataSubscription;

    const setupRealtimeSubscriptions = async () => {
      if (!user) return;

      // Subscribe to leads changes
      leadsSubscription = supabase
        .channel('leads-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'leads', filter: `user_id=eq.${user.id}` },
          () => fetchStats(user.id)
        )
        .subscribe();

      // Subscribe to chatbot_conversations changes  
      conversationsSubscription = supabase
        .channel('conversations-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'chatbot_conversations', filter: `user_id=eq.${user.id}` },
          () => {
            fetchStats(user.id);
            fetchActivities(user.id);
          }
        )
        .subscribe();

      // Subscribe to properties changes
      propertiesSubscription = supabase
        .channel('properties-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'properties', filter: `user_id=eq.${user.id}` },
          () => fetchStats(user.id)
        )
        .subscribe();
        
      // Subscribe to training data changes
      trainingDataSubscription = supabase
        .channel('training-data-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'chatbot_training_data', filter: `user_id=eq.${user.id}` },
          () => fetchActivities(user.id)
        )
        .subscribe();
    };

    if (user) {
      setupRealtimeSubscriptions();
    }

    // Clean up subscriptions on unmount
    return () => {
      if (leadsSubscription) supabase.removeChannel(leadsSubscription);
      if (conversationsSubscription) supabase.removeChannel(conversationsSubscription);
      if (propertiesSubscription) supabase.removeChannel(propertiesSubscription);
      if (trainingDataSubscription) supabase.removeChannel(trainingDataSubscription);
    };
  }, [user]);

  useEffect(() => {
    const getUser = async () => {
      try {
        setLoading(true);
        
        const { data: { session } } = await getSession();
        
        if (!session) {
          navigate('/auth');
          return;
        }
        
        setUser(session.user);
        
        if (session.user) {
          const { data: profileData, error: profileError } = await getUserProfile(session.user.id);
          
          if (profileError) {
            console.error('Error fetching profile:', profileError);
          } else if (profileData) {
            setUserProfile(profileData);
            setUserPlan(profileData.plan || 'starter');
          }
          
          const role = await getUserRole(session.user.id);
          if (role === 'admin') {
            navigate('/admin');
            return;
          }
          
          await fetchStats(session.user.id);
          await fetchActivities(session.user.id);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };
    
    getUser();
  }, [navigate]);
  
  const fetchStats = async (userId) => {
    try {
      console.log("Fetching updated stats...");
      
      // Get leads
      const { data: leadsData } = await getLeads();
      
      // Get property-related chatbot questions as potential leads
      const { count: chatLeadsCount, error: chatLeadsError } = await supabase
        .from('chatbot_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .ilike('message', '%property%');
        
      if (chatLeadsError) {
        console.error('Error fetching chat leads:', chatLeadsError);
      }
      
      // Get properties
      const { data: propertiesData } = await getProperties();
      
      // Get chatbot interactions - count unique conversations
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('chatbot_conversations')
        .select('conversation_id')
        .eq('user_id', userId);
        
      if (conversationsError) {
        console.error('Error fetching conversations:', conversationsError);
      }
      
      // Count total messages for interaction count
      const { count: totalInteractions, error: countError } = await supabase
        .from('chatbot_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
        
      if (countError) {
        console.error('Error counting interactions:', countError);
      }
      
      // Count unique conversation IDs for active conversations
      const uniqueConversations = conversationsData ? 
        [...new Set(conversationsData.map(c => c.conversation_id))].length : 0;
      
      const totalLeads = (leadsData?.length || 0) + (chatLeadsCount || 0);
      const totalProperties = propertiesData?.length || 0;
      const featuredProperties = propertiesData?.filter(p => p.featured)?.length || 0;
      
      setStats({
        totalLeads,
        activeConversations: uniqueConversations,
        chatbotInteractions: totalInteractions || 0,
        totalProperties,
        featuredProperties
      });
      
      console.log("Stats updated:", {
        totalLeads,
        activeConversations: uniqueConversations,
        chatbotInteractions: totalInteractions || 0,
        totalProperties,
        featuredProperties
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  
  const fetchActivities = async (userId) => {
    try {
      // Get real activities from the database
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (activitiesError) {
        console.error('Error fetching activities:', activitiesError);
        return;
      }
      
      // If no activities found, check for recent chatbot conversations
      if (!activitiesData || activitiesData.length === 0) {
        const { data: chatData, error: chatError } = await supabase
          .from('chatbot_conversations')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (chatError) {
          console.error('Error fetching chatbot conversations:', chatError);
          setActivities([]);
          return;
        }
        
        // Convert chat data to activity format
        const chatActivities = chatData?.map(chat => ({
          id: chat.id,
          type: 'message',
          description: 'Chatbot conversation',
          created_at: chat.created_at,
          user_id: userId,
          target_id: chat.conversation_id,
          target_type: 'chat'
        })) || [];
        
        setActivities(chatActivities);
      } else {
        setActivities(activitiesData);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <div className="flex justify-center items-center h-screen">You need to be logged in to access this page</div>;
  }

  const firstName = userProfile?.first_name || user.user_metadata?.first_name || user.email?.split('@')[0] || 'there';
  
  const isPremiumFeature = (requiredPlan) => {
    const planLevels = {
      'starter': 1,
      'professional': 2,
      'enterprise': 3
    };
    
    return planLevels[userPlan] < planLevels[requiredPlan];
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      
      <div className="flex flex-1 flex-col md:flex-row">
        <DashboardSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <header className="pb-4 md:pb-6 mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {firstName}!
            </p>
          </header>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
            <TabsList className="hidden">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
              <TabsTrigger value="chatbot">Chatbot</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4 md:space-y-6">
              <QuickStats stats={stats} userPlan={userPlan} isPremiumFeature={isPremiumFeature} userId={user.id} />
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest updates on your platform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentActivity activities={activities} />
                  </CardContent>
                </Card>
                
                <Card className="col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle>Quick Actions</CardTitle>
                      <CardDescription>Common tasks you might want to perform</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button 
                          onClick={() => setActiveTab('properties')} 
                          className="flex justify-start items-center h-auto py-2"
                          variant="outline" 
                          size="sm">
                          <PlusCircle className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span className="truncate">Add Property</span>
                        </Button>
                        
                        <Button 
                          onClick={() => setActiveTab('properties')} 
                          className="flex justify-start items-center h-auto py-2"
                          variant="outline" 
                          size="sm">
                          <Upload className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span className="truncate">Upload Images</span>
                        </Button>
                        
                        <Button 
                          onClick={() => setActiveTab('properties')} 
                          className="flex justify-start items-center h-auto py-2"
                          variant="outline" 
                          size="sm">
                          <FileSpreadsheet className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span className="truncate">Import Properties</span>
                        </Button>
                        
                        <Button 
                          onClick={() => setActiveTab('leads')} 
                          className="flex justify-start items-center h-auto py-2"
                          variant="outline" 
                          size="sm">
                          <Users className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span className="truncate">View Leads</span>
                        </Button>
                        
                        <Button 
                          onClick={() => setActiveTab('marketing')} 
                          className="flex justify-start items-center h-auto py-2 w-full"
                          variant={isPremiumFeature('professional') ? "outline" : "outline"}
                          size="sm">
                          {isPremiumFeature('professional') && <Lock className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />}
                          {!isPremiumFeature('professional') && <Bell className="mr-2 h-4 w-4 flex-shrink-0" />}
                          <span className="truncate">
                            {isPremiumFeature('professional') ? 'AI Follow-ups (Pro)' : 'AI Follow-ups'}
                          </span>
                        </Button>
                        
                        <Button 
                          onClick={() => setActiveTab('settings')} 
                          className="flex justify-start items-center h-auto py-2 w-full"
                          variant="outline" 
                          size="sm">
                          {isPremiumFeature('professional') ? (
                            <>
                              <Lock className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">Team (Pro)</span>
                            </>
                          ) : (
                            <>
                              <Users className="mr-2 h-4 w-4 flex-shrink-0" />
                              <span className="truncate">Manage Team</span>
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {userPlan === 'starter' && (
                        <Button onClick={() => setActiveTab('settings')} variant="default" size="sm" className="mt-2 w-full">
                          Upgrade to Professional
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="col-span-1 lg:col-span-1">
                  <ChatConversations />
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="properties">
              <PropertyListings userPlan={userPlan} isPremiumFeature={isPremiumFeature} />
            </TabsContent>
            
            <TabsContent value="leads">
              <LeadManagement userPlan={userPlan} isPremiumFeature={isPremiumFeature} />
            </TabsContent>
            
            <TabsContent value="marketing">
              <MarketingAutomation userPlan={userPlan} isPremiumFeature={isPremiumFeature} />
            </TabsContent>
            
            <TabsContent value="chatbot">
              <ChatbotSettings 
                userId={user.id} 
                userPlan={userPlan} 
                isPremiumFeature={isPremiumFeature} 
              />
            </TabsContent>
            
            <TabsContent value="integrations">
              <Integrations userPlan={userPlan} isPremiumFeature={isPremiumFeature} />
            </TabsContent>
            
            <TabsContent value="settings">
              <AccountSettings user={user} userPlan={userPlan} userProfile={userProfile} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
