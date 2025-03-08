
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MessageSquare, Calendar, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface ChatConversation {
  id: string;
  conversation_id: string;
  user_id: string;
  visitor_id?: string;
  message: string;
  response: string;
  created_at: string;
}

interface GroupedConversation {
  conversation_id: string;
  messages: ChatConversation[];
  first_message: string;
  last_message_date: string;
  visitor_id?: string;
}

const ChatConversations = () => {
  const [conversations, setConversations] = useState<GroupedConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<ChatConversation[]>([]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error("No authenticated session");
        return;
      }
      
      const { data, error } = await supabase
        .from('chatbot_conversations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching conversations:", error);
        return;
      }
      
      // Group conversations by conversation_id
      const groupedConversations: Record<string, ChatConversation[]> = {};
      
      data.forEach((message: ChatConversation) => {
        if (!groupedConversations[message.conversation_id]) {
          groupedConversations[message.conversation_id] = [];
        }
        groupedConversations[message.conversation_id].push(message);
      });
      
      // Sort each conversation group by created_at and format for display
      const formattedConversations = Object.entries(groupedConversations).map(([id, messages]) => {
        // Sort messages by date (oldest first)
        const sortedMessages = [...messages].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        return {
          conversation_id: id,
          messages: sortedMessages,
          first_message: sortedMessages[0].message,
          last_message_date: sortedMessages[sortedMessages.length - 1].created_at,
          visitor_id: sortedMessages[0].visitor_id
        };
      });
      
      // Sort conversations by last message date (newest first)
      formattedConversations.sort((a, b) => 
        new Date(b.last_message_date).getTime() - new Date(a.last_message_date).getTime()
      );
      
      setConversations(formattedConversations);
    } catch (error) {
      console.error("Error in fetchConversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conversation: GroupedConversation) => {
    setSelectedConversation(conversation.conversation_id);
    setSelectedMessages(conversation.messages);
  };

  const filteredConversations = conversations.filter(conversation => 
    conversation.messages.some(msg => 
      msg.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
      msg.response.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Chat Conversations</CardTitle>
        <CardDescription>View and analyze visitor conversations with your chatbot</CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="conversations" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="conversations">All Conversations</TabsTrigger>
            <TabsTrigger value="analytics">Analytics (Coming Soon)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="conversations" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 border rounded-md">
                <div className="p-3 border-b bg-muted/40">
                  <h3 className="font-medium">Conversations</h3>
                </div>
                
                <ScrollArea className="h-[500px]">
                  {loading ? (
                    <div className="flex justify-center items-center h-40">
                      <div className="animate-spin h-6 w-6 border-t-2 border-primary rounded-full"></div>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {searchQuery ? "No matching conversations found" : "No conversations yet"}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredConversations.map((conversation) => (
                        <div 
                          key={conversation.conversation_id}
                          className={`p-3 hover:bg-muted/50 cursor-pointer ${
                            selectedConversation === conversation.conversation_id ? 'bg-muted/70' : ''
                          }`}
                          onClick={() => handleSelectConversation(conversation)}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center">
                              <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span className="text-sm font-medium truncate max-w-[150px]">
                                {conversation.first_message.slice(0, 30)}
                                {conversation.first_message.length > 30 ? '...' : ''}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {conversation.messages.length} msgs
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(conversation.last_message_date), 'MMM d, h:mm a')}
                            </div>
                            {conversation.visitor_id && (
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {conversation.visitor_id.slice(0, 8)}...
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
              
              <div className="md:col-span-2 border rounded-md">
                <div className="p-3 border-b bg-muted/40">
                  <h3 className="font-medium">
                    {selectedConversation ? 'Conversation Details' : 'Select a conversation'}
                  </h3>
                </div>
                
                {selectedConversation ? (
                  <ScrollArea className="h-[500px] p-4">
                    <div className="space-y-4">
                      {selectedMessages.map((message) => (
                        <div key={message.id} className="space-y-2">
                          <div className="flex items-start gap-2">
                            <Avatar className="h-8 w-8 bg-muted">
                              <User className="h-4 w-4" />
                            </Avatar>
                            <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                              <p>{message.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(message.created_at), 'MMM d, h:mm a')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-2 justify-end">
                            <div className="bg-primary/10 rounded-lg p-3 max-w-[80%]">
                              <p>{message.response}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(message.created_at), 'MMM d, h:mm a')}
                              </p>
                            </div>
                            <Avatar className="h-8 w-8 bg-primary/20">
                              <MessageSquare className="h-4 w-4 text-primary" />
                            </Avatar>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-center p-4">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Conversation Selected</h3>
                    <p className="text-muted-foreground max-w-md">
                      Select a conversation from the list to view the full chat history and details.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics">
            <div className="flex flex-col items-center justify-center h-60 text-center">
              <h3 className="text-lg font-medium mb-2">Analytics Coming Soon</h3>
              <p className="text-muted-foreground max-w-md">
                Soon you'll be able to see detailed analytics about your chatbot conversations, 
                popular topics, and lead conversion rates.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ChatConversations;
