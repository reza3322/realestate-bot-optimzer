
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/sections/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { getSession, getUserProfile, getUserRole, getLeads, getProperties, getRecentActivities, getChatbotConversations } from '@/lib/supabase';
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
import ChatbotTrainingManager from '@/components/dashboard/ChatbotTrainingManager';
import { PlusCircle, Upload, FileSpreadsheet, Users, Bell, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userPlan, setUserPlan] = useState('starter');
  const [userProfile, setUserProfile] = useState(null);
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeConversations: 0,
    websiteVisitors: 0,
    totalProperties: 0,
    featuredProperties: 0
  });
  const [activities, setActivities] = useState([]);
  const [realTimeUpdate, setRealTimeUpdate] = useState(0); // For triggering refreshes
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
  }, [navigate, realTimeUpdate]);
  
  // Set up a real-time subscription for data changes
  useEffect(() => {
    // Subscribe to changes in chatbot_conversations
    const conversationsChannel = supabase
      .channel('chatbot_conversations_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chatbot_conversations'
      }, () => {
        // Refresh data when changes occur
        setRealTimeUpdate(prev => prev + 1);
      })
      .subscribe();
      
    // Subscribe to changes in leads
    const leadsChannel = supabase
      .channel('leads_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leads'
      }, () => {
        setRealTimeUpdate(prev => prev + 1);
      })
      .subscribe();
      
    // Subscribe to changes in properties
    const propertiesChannel = supabase
      .channel('properties_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'properties'
      }, () => {
        setRealTimeUpdate(prev => prev + 1);
      })
      .subscribe();
      
    // Subscribe to changes in chatbot training data
    const trainingChannel = supabase
      .channel('training_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chatbot_training_data'
      }, () => {
        setRealTimeUpdate(prev => prev + 1);
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(propertiesChannel);
      supabase.removeChannel(trainingChannel);
    };
  }, []);
  
  const fetchStats = async (userId) => {
    try {
      // Get real counts from the database
      const { data: leadsData } = await getLeads();
      
      const { data: propertiesData } = await getProperties();
      
      // Get active conversations count
      const { data: conversationsData } = await getChatbotConversations();
      const uniqueConversationIds = new Set();
      if (conversationsData) {
        conversationsData.forEach(convo => {
          if (convo.conversation_id) {
            uniqueConversationIds.add(convo.conversation_id);
          }
        });
      }
      
      const totalLeads = leadsData?.length || 0;
      const totalProperties = propertiesData?.length || 0;
      const featuredProperties = propertiesData?.filter(p => p.featured)?.length || 0;
      
      // Get recent website visitors - this would ideally come from analytics
      // For now, we'll use a combination of real data and estimates
      const weeklyVisitorEstimate = Math.max(50, totalLeads * 5 + uniqueConversationIds.size * 2);
      
      setStats({
        totalLeads,
        activeConversations: uniqueConversationIds.size,
        websiteVisitors: weeklyVisitorEstimate,
        totalProperties,
        featuredProperties
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  
  const fetchActivities = async (userId) => {
    try {
      const { data } = await getRecentActivities(10);
      if (data) {
        setActivities(data);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
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
              <TabsTrigger value="training">Training</TabsTrigger>
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
                        onClick={() => setActiveTab('training')} 
                        className="flex justify-start items-center"
                        variant={isPremiumFeature('professional') ? "outline" : "outline"}
                        size="lg">
                        {isPremiumFeature('professional') && <Lock className="mr-2 h-4 w-4 text-muted-foreground" />}
                        {!isPremiumFeature('professional') && <Bell className="mr-2 h-4 w-4" />}
                        {isPremiumFeature('professional') ? 'Train Chatbot (Pro)' : 'Train Chatbot'}
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
            
            <TabsContent value="training">
              <ChatbotTrainingManager 
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
