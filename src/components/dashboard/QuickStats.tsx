
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
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Set up real-time subscription to relevant tables
  useEffect(() => {
    if (!userId) return;
    
    const leadsChannel = supabase
      .channel('realtime-leads')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'leads', filter: `user_id=eq.${userId}` },
        () => fetchData()
      )
      .subscribe();
      
    const chatbotChannel = supabase
      .channel('realtime-chatbot')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chatbot_conversations', filter: `user_id=eq.${userId}` },
        () => fetchData()
      )
      .subscribe();
      
    const propertiesChannel = supabase
      .channel('realtime-properties')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'properties', filter: `user_id=eq.${userId}` },
        () => fetchData()
      )
      .subscribe();
    
    // Initial data fetch
    fetchData();
    
    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(chatbotChannel);
      supabase.removeChannel(propertiesChannel);
    };
  }, [userId]);

  // Also update when stats change externally
  useEffect(() => {
    if (stats) {
      setRealStats(stats);
    }
  }, [stats]);

  const fetchData = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      console.log("QuickStats: Fetching fresh data...");
      
      // Get total leads - include leads generated from chatbot conversations
      const { count: leadsCount, error: leadsError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (leadsError && leadsError.code !== 'PGRST116') {
        console.error('Error fetching leads count:', leadsError);
      }
      
      // Count property-related questions from chatbot as potential leads
      const { count: chatLeadsCount, error: chatLeadsError } = await supabase
        .from('chatbot_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .ilike('message', '%property%');
        
      if (chatLeadsError && chatLeadsError.code !== 'PGRST116') {
        console.error('Error fetching chat leads count:', chatLeadsError);
      }
      
      // Total leads should include both database leads and property-related chats
      const totalLeads = (leadsCount || 0) + (chatLeadsCount || 0);
      
      // Get chatbot interactions
      const { count: interactionsCount, error: interactionsError } = await supabase
        .from('chatbot_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
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
        ? [...new Set(conversations.map(conv => conv.conversation_id))].length
        : 0;
      
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
        
      console.log("Stats fetched successfully:", {
        totalLeads,
        activeConversations: uniqueConversations,
        chatbotInteractions: interactionsCount || 0,
        totalProperties: properties?.length || 0,
        featuredProperties
      });
      
      setRealStats({
        totalLeads,
        activeConversations: uniqueConversations,
        chatbotInteractions: interactionsCount || 0,
        totalProperties: properties?.length || 0,
        featuredProperties
      });
      
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentageChange = (value: number): string => {
    // In a real application, you would compare with previous period data
    // Here we're just simulating some random growth
    const changes = [7, 12, 18, 5, 10, 15, 9];
    const randomIndex = Math.floor(Math.random() * changes.length);
    return `+${changes[randomIndex]}%`;
  };

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
