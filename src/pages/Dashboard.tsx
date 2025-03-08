
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
      // Get leads
      const { data: leadsData } = await getLeads();
      
      // Get properties
      const { data: propertiesData } = await getProperties();
      
      // Get chatbot interactions
      const { data: chatInteractions, error: chatError } = await supabase
        .from('chatbot_conversations')
        .select('conversation_id', { count: 'exact', head: true })
        .eq('user_id', userId);
        
      if (chatError) {
        console.error('Error fetching chatbot interactions:', chatError);
      }
      
      // Count unique conversation IDs
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('chatbot_conversations')
        .select('conversation_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (conversationsError) {
        console.error('Error fetching conversations:', conversationsError);
      }
      
      // Count unique conversation IDs
      const uniqueConversations = conversationsData ? 
        [...new Set(conversationsData.map(c => c.conversation_id))].length : 0;
      
      const totalLeads = leadsData?.length || 0;
      const totalProperties = propertiesData?.length || 0;
      const featuredProperties = propertiesData?.filter(p => p.featured)?.length || 0;
      const totalInteractions = chatInteractions?.count || 0;
      
      setStats({
        totalLeads,
        activeConversations: uniqueConversations,
        chatbotInteractions: totalInteractions,
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
      
      <div className="flex flex-1">
        <DashboardSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="flex-1 p-6 overflow-auto">
          <header className="pb-6 mb-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {firstName}!
            </p>
          </header>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="hidden">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
              <TabsTrigger value="chatbot">Chatbot</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <QuickStats stats={stats} userPlan={userPlan} isPremiumFeature={isPremiumFeature} />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest updates on your platform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentActivity activities={activities} />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle>Quick Actions</CardTitle>
                      <CardDescription>Common tasks you might want to perform</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button 
                        onClick={() => setActiveTab('properties')} 
                        className="flex justify-start items-center"
                        variant="outline" 
                        size="lg">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Property
                      </Button>
                      
                      <Button 
                        onClick={() => setActiveTab('properties')} 
                        className="flex justify-start items-center"
                        variant="outline" 
                        size="lg">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Images
                      </Button>
                      
                      <Button 
                        onClick={() => setActiveTab('properties')} 
                        className="flex justify-start items-center"
                        variant="outline" 
                        size="lg">
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Import Properties
                      </Button>
                      
                      <Button 
                        onClick={() => setActiveTab('leads')} 
                        className="flex justify-start items-center"
                        variant="outline" 
                        size="lg">
                        <Users className="mr-2 h-4 w-4" />
                        View All Leads
                      </Button>
                      
                      <Button 
                        onClick={() => setActiveTab('marketing')} 
                        className="flex justify-start items-center"
                        variant={isPremiumFeature('professional') ? "outline" : "outline"}
                        size="lg">
                        {isPremiumFeature('professional') && <Lock className="mr-2 h-4 w-4 text-muted-foreground" />}
                        {!isPremiumFeature('professional') && <Bell className="mr-2 h-4 w-4" />}
                        {isPremiumFeature('professional') ? 'AI Follow-ups (Pro)' : 'Setup AI Follow-ups'}
                      </Button>
                      
                      <Button 
                        onClick={() => setActiveTab('settings')} 
                        className="flex justify-start items-center"
                        variant="outline" 
                        size="lg">
                        {isPremiumFeature('professional') ? (
                          <>
                            <Lock className="mr-2 h-4 w-4 text-muted-foreground" />
                            Invite Team (Pro)
                          </>
                        ) : (
                          <>
                            <Users className="mr-2 h-4 w-4" />
                            Manage Team
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {userPlan === 'starter' && (
                      <Button onClick={() => setActiveTab('settings')} variant="default">
                        Upgrade to Professional
                      </Button>
                    )}
                  </CardContent>
                </Card>
                
                <ChatConversations />
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
