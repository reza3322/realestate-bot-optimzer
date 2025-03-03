
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/sections/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      try {
        setLoading(true);
        
        // Check if there's an active session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/auth');
          return;
        }
        
        // Get user profile data
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };
    
    getUser();
  }, [navigate]);
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <div className="flex justify-center items-center h-screen">You need to be logged in to access this page</div>;
  }

  const firstName = user.user_metadata?.first_name || user.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <main className="container px-4 py-24">
        <header className="pb-8 border-b mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {firstName}!
          </p>
        </header>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-primary/5 p-6 rounded-xl">
                <h3 className="font-medium mb-1">Active Listings</h3>
                <p className="text-3xl font-bold">5</p>
              </div>
              
              <div className="bg-primary/5 p-6 rounded-xl">
                <h3 className="font-medium mb-1">New Leads</h3>
                <p className="text-3xl font-bold">12</p>
              </div>
              
              <div className="bg-primary/5 p-6 rounded-xl">
                <h3 className="font-medium mb-1">Conversations</h3>
                <p className="text-3xl font-bold">8</p>
              </div>
            </div>
            
            <div className="rounded-xl border p-6">
              <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-4">
                <Button>Add New Property</Button>
                <Button variant="outline">View Analytics</Button>
                <Button variant="outline">Setup AI Assistant</Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="properties">
            <div className="text-center py-12">
              <h3 className="text-xl font-bold mb-2">No Properties Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start by adding your first property listing
              </p>
              <Button>Add New Property</Button>
            </div>
          </TabsContent>
          
          <TabsContent value="leads">
            <div className="text-center py-12">
              <h3 className="text-xl font-bold mb-2">No Leads Yet</h3>
              <p className="text-muted-foreground mb-6">
                Leads will appear here once your AI assistant starts qualifying prospects
              </p>
              <Button>Configure AI Assistant</Button>
            </div>
          </TabsContent>
          
          <TabsContent value="settings">
            <div className="max-w-2xl space-y-8">
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Account Settings</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user.email || ''} readOnly />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        value={user.user_metadata?.first_name || ''} 
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        value={user.user_metadata?.last_name || ''} 
                      />
                    </div>
                  </div>
                  
                  <Button className="w-fit">Update Profile</Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Subscription</h3>
                <div className="rounded-xl border p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="font-bold">Free Trial</h4>
                      <p className="text-sm text-muted-foreground">7 days remaining</p>
                    </div>
                    <Button>Upgrade Plan</Button>
                  </div>
                  <div className="h-2 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
