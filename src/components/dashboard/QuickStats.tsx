
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, Activity, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface StatsData {
  totalLeads: number;
  activeConversations: number;
  chatbotInteractions: number;
  totalProperties: number;
  featuredProperties: number;
}

interface QuickStatsProps {
  stats?: StatsData;
  userPlan?: string;
  isPremiumFeature?: (requiredPlan: string) => boolean;
  userId?: string;
}

const QuickStats = ({ stats, userPlan, isPremiumFeature, userId }: QuickStatsProps) => {
  const [realStats, setRealStats] = useState<StatsData>({
    totalLeads: stats?.totalLeads || 0,
    activeConversations: stats?.activeConversations || 0,
    chatbotInteractions: stats?.chatbotInteractions || 0,
    totalProperties: stats?.totalProperties || 0,
    featuredProperties: stats?.featuredProperties || 0
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        // Get total leads
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('count')
          .eq('user_id', userId)
          .single();
        
        if (leadsError && leadsError.code !== 'PGRST116') {
          console.error('Error fetching leads count:', leadsError);
        }
        
        // Get chatbot interactions
        const { data: interactions, error: interactionsError } = await supabase
          .from('chatbot_conversations')
          .select('count')
          .eq('user_id', userId)
          .single();
        
        if (interactionsError && interactionsError.code !== 'PGRST116') {
          console.error('Error fetching chatbot interactions count:', interactionsError);
        }
        
        // Get active conversations (grouped by conversation_id)
        const { data: conversations, error: conversationsError } = await supabase
          .from('chatbot_conversations')
          .select('conversation_id')
          .eq('user_id', userId);
        
        if (conversationsError) {
          console.error('Error fetching active conversations:', conversationsError);
        }
        
        // Get unique conversation IDs
        const uniqueConversations = conversations 
          ? [...new Set(conversations.map(conv => conv.conversation_id))]
          : [];
        
        // Get total properties
        const { data: properties, error: propertiesError } = await supabase
          .from('properties')
          .select('featured')
          .eq('user_id', userId);
        
        if (propertiesError) {
          console.error('Error fetching properties:', propertiesError);
        }
        
        // Calculate featured properties
        const featuredProperties = properties 
          ? properties.filter(prop => prop.featured).length
          : 0;
        
        setRealStats({
          totalLeads: leads?.count || 0,
          activeConversations: uniqueConversations?.length || 0,
          chatbotInteractions: interactions?.count || 0,
          totalProperties: properties?.length || 0,
          featuredProperties
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [userId]);

  const calculatePercentageChange = (value: number): string => {
    // In a real application, you would compare with previous period data
    // Here we're just simulating some random growth
    const changes = [7, 12, 18, 5, 10, 15, 9];
    const randomIndex = Math.floor(Math.random() * changes.length);
    return `+${changes[randomIndex]}%`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? (
              <div className="h-7 w-12 bg-muted/30 animate-pulse rounded"></div>
            ) : (
              realStats.totalLeads
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="text-green-500">{calculatePercentageChange(realStats.totalLeads)}</span> from last week
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? (
              <div className="h-7 w-12 bg-muted/30 animate-pulse rounded"></div>
            ) : (
              realStats.activeConversations
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="text-green-500">{calculatePercentageChange(realStats.activeConversations)}</span> from last week
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Chatbot Interactions</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? (
              <div className="h-7 w-12 bg-muted/30 animate-pulse rounded"></div>
            ) : (
              realStats.chatbotInteractions
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="text-green-500">{calculatePercentageChange(realStats.chatbotInteractions)}</span> from yesterday
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Properties</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? (
              <div className="h-7 w-12 bg-muted/30 animate-pulse rounded"></div>
            ) : (
              realStats.totalProperties
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {loading ? (
              <div className="h-4 w-24 bg-muted/30 animate-pulse rounded"></div>
            ) : (
              `${realStats.featuredProperties} featured listings`
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickStats;
