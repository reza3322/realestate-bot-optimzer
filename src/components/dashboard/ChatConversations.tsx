
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, User, Calendar, ChevronRight } from "lucide-react";
import { supabase, getChatbotConversations } from '@/lib/supabase';
import { Skeleton } from "@/components/ui/skeleton";

interface Conversation {
  id: string;
  user_id: string;
  conversation_id: string;
  message: string;
  response: string;
  created_at: string;
  visitor_id?: string;
  lead_id?: string;
}

const ChatConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversationCount, setConversationCount] = useState<{[key: string]: number}>({});

  useEffect(() => {
    fetchRecentConversations();
    
    // Set up a subscription to refresh when new conversations are added
    const channel = supabase
      .channel('chatbot_conversation_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'chatbot_conversations' }, 
        () => fetchRecentConversations()
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecentConversations = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await getChatbotConversations(100);
      
      if (error) throw error;
      
      // Group conversations by conversation_id and count them
      const counts: {[key: string]: number} = {};
      const conversationIds = new Set<string>();
      
      if (data) {
        data.forEach(conv => {
          if (conv.conversation_id) {
            counts[conv.conversation_id] = (counts[conv.conversation_id] || 0) + 1;
            conversationIds.add(conv.conversation_id);
          }
        });
      }
      
      setConversationCount(counts);
      
      // Get most recent message from each conversation
      const latestMessages: Conversation[] = [];
      
      conversationIds.forEach(convId => {
        const conversationMessages = data?.filter(m => m.conversation_id === convId) || [];
        if (conversationMessages.length > 0) {
          // Sort by date (newest first) and take the first one
          const sorted = [...conversationMessages].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          latestMessages.push(sorted[0]);
        }
      });
      
      // Sort by created_at (newest first) and take top 5
      const sorted = latestMessages.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setConversations(sorted.slice(0, 5));
      setError(null);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return `${date.toLocaleDateString()}`;
  };

  const truncateText = (text: string, maxLength: number = 70) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> 
          Recent Conversations
        </CardTitle>
        <CardDescription>
          Latest visitor interactions with your chatbot
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">
            {error}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p>No conversations yet</p>
            <p className="text-sm mt-1">When visitors use your chatbot, conversations will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((conversation) => (
              <div key={conversation.id} className="flex items-start space-x-3 pb-4 border-b last:border-0 last:pb-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" />
                  <AvatarFallback>
                    <User className="h-6 w-6 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium leading-none">
                        {conversation.visitor_id ? 'Visitor ' + conversation.visitor_id.substring(0, 6) : 'Anonymous Visitor'}
                      </p>
                      <div className="flex items-center mt-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatRelativeTime(conversation.created_at)}
                        <Badge className="ml-2 text-[10px] px-1 py-0" variant="outline">
                          {conversationCount[conversation.conversation_id] || 1} messages
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm">
                    <span className="font-medium">Visitor:</span> {truncateText(conversation.message)}
                  </p>
                  
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Bot:</span> {truncateText(conversation.response)}
                  </p>
                </div>
                
                <Button variant="ghost" className="h-8 w-8 p-0" title="View Conversation">
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">View</span>
                </Button>
              </div>
            ))}
            
            <div className="text-center pt-2">
              <Button variant="outline" size="sm" className="text-xs">
                View All Conversations
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatConversations;
