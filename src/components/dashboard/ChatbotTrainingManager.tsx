
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import ChatbotTraining from '@/components/ui/chatbot/ChatbotTraining';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, BookOpen, Database, FileText } from "lucide-react";
import { supabase } from '@/lib/supabase';

interface ChatbotTrainingManagerProps {
  userId: string;
  userPlan: string;
  isPremiumFeature: (requiredPlan: string) => boolean;
}

const ChatbotTrainingManager = ({ userId, userPlan, isPremiumFeature }: ChatbotTrainingManagerProps) => {
  const { toast } = useToast();
  const [trainingStats, setTrainingStats] = useState({
    faqCount: 0,
    propertyCount: 0,
    businessInfoCount: 0,
    customResponseCount: 0,
    totalTrainingItems: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainingStats();
  }, [userId]);

  const fetchTrainingStats = async () => {
    try {
      setLoading(true);
      
      // Get counts of training data by content_type
      const { data, error } = await supabase
        .from('chatbot_training_data')
        .select('content_type, count')
        .eq('user_id', userId)
        .group('content_type');
      
      if (error) throw error;
      
      // Get properties count
      const { count: propertyCount, error: propertiesError } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (propertiesError) throw propertiesError;
      
      // Process the stats
      const stats = {
        faqCount: 0,
        propertyCount: propertyCount || 0,
        businessInfoCount: 0,
        customResponseCount: 0,
        totalTrainingItems: 0
      };
      
      if (data) {
        data.forEach((item: any) => {
          if (item.content_type === 'faqs') stats.faqCount = item.count;
          if (item.content_type === 'property') stats.propertyCount += item.count;
          if (item.content_type === 'business') stats.businessInfoCount = item.count;
          if (item.content_type === 'custom') stats.customResponseCount = item.count;
        });
        
        stats.totalTrainingItems = stats.faqCount + stats.propertyCount + 
                                    stats.businessInfoCount + stats.customResponseCount;
      }
      
      setTrainingStats(stats);
    } catch (error) {
      console.error('Error fetching training stats:', error);
      toast({
        title: 'Error fetching training data',
        description: 'Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const syncPropertiesToTraining = async () => {
    try {
      setLoading(true);
      toast({
        title: 'Syncing properties',
        description: 'Please wait while we sync your properties to your chatbot training...'
      });
      
      // Get all user properties
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', userId);
      
      if (propertiesError) throw propertiesError;
      
      if (!properties || properties.length === 0) {
        toast({
          title: 'No properties found',
          description: 'Please add properties first before syncing.'
        });
        return;
      }
      
      // First delete existing property training data
      const { error: deleteError } = await supabase
        .from('chatbot_training_data')
        .delete()
        .eq('user_id', userId)
        .eq('content_type', 'property')
        .neq('id', 'placeholder'); // This ensures we don't match anything if id column is UUID
      
      if (deleteError) throw deleteError;
      
      // Create training data for each property
      const trainingData = properties.map(property => {
        // Basic property details training
        const propertyBasic = {
          user_id: userId,
          content_type: 'property',
          question: `Tell me about ${property.title}`,
          answer: `${property.title} is a ${property.type || 'property'} located in ${property.city || 'the area'}${property.state ? `, ${property.state}` : ''}. ${property.description || ''}`,
          category: 'Property Details',
          priority: 5
        };
        
        // Property price training
        const propertyPrice = {
          user_id: userId,
          content_type: 'property',
          question: `How much is ${property.title}? What's the price of ${property.title}?`,
          answer: `${property.title} is priced at ${property.price.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}${property.status !== 'active' ? ` (${property.status})` : ''}.`,
          category: 'Property Pricing',
          priority: 5
        };
        
        // Property features training
        let featuresText = '';
        if (property.bedrooms) featuresText += `${property.bedrooms} bedroom${property.bedrooms !== 1 ? 's' : ''}, `;
        if (property.bathrooms) featuresText += `${property.bathrooms} bathroom${property.bathrooms !== 1 ? 's' : ''}, `;
        if (property.size) featuresText += `${property.size} square feet, `;
        
        featuresText = featuresText ? featuresText.slice(0, -2) : 'Information about features unavailable';
        
        const propertyFeatures = {
          user_id: userId,
          content_type: 'property',
          question: `What are the features of ${property.title}? How many bedrooms does ${property.title} have?`,
          answer: `${property.title} features ${featuresText}.`,
          category: 'Property Features',
          priority: 4
        };
        
        return [propertyBasic, propertyPrice, propertyFeatures];
      }).flat();
      
      // Insert all training data
      const { error: insertError } = await supabase
        .from('chatbot_training_data')
        .insert(trainingData);
      
      if (insertError) throw insertError;
      
      toast({
        title: 'Properties synced successfully',
        description: `${properties.length} properties have been synced to your chatbot training.`
      });
      
      // Refresh stats
      fetchTrainingStats();
    } catch (error) {
      console.error('Error syncing properties:', error);
      toast({
        title: 'Error syncing properties',
        description: 'Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Chatbot Training</h2>
        <Button onClick={syncPropertiesToTraining} disabled={loading}>
          <Database className="mr-2 h-4 w-4" />
          Sync Properties to Chatbot
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Training Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <span className="text-muted-foreground">Loading...</span> : trainingStats.totalTrainingItems}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Combined training data points
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Properties Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <span className="text-muted-foreground">Loading...</span> : trainingStats.propertyCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Property listings used for training
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">FAQ Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <span className="text-muted-foreground">Loading...</span> : trainingStats.faqCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Common questions and answers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Custom Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <span className="text-muted-foreground">Loading...</span> : 
                trainingStats.businessInfoCount + trainingStats.customResponseCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Business info and custom responses
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Chatbot Training Information</AlertTitle>
        <AlertDescription>
          Your chatbot is trained using the data below. The more training data you provide, the better your chatbot will perform.
          When you add new properties, use the "Sync Properties" button to update your chatbot with the latest property information.
        </AlertDescription>
      </Alert>
      
      <ChatbotTraining userId={userId} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Training Data Sources</CardTitle>
            <CardDescription>
              Your chatbot learns from different types of data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Badge className="mt-0.5">Properties</Badge>
              <div className="space-y-1">
                <p className="text-sm font-medium">Property Listings</p>
                <p className="text-xs text-muted-foreground">
                  Your chatbot automatically learns about properties you add to your account.
                  Use the "Sync Properties" button after adding new listings.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Badge variant="outline" className="mt-0.5">FAQs</Badge>
              <div className="space-y-1">
                <p className="text-sm font-medium">Frequently Asked Questions</p>
                <p className="text-xs text-muted-foreground">
                  Add common questions and answers that visitors may ask about your services.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Badge variant="secondary" className="mt-0.5">Custom</Badge>
              <div className="space-y-1">
                <p className="text-sm font-medium">Custom Training</p>
                <p className="text-xs text-muted-foreground">
                  Add any custom questions, responses or information specific to your business.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Tips for Better Chatbot Responses</CardTitle>
            <CardDescription>
              How to get the most out of your AI chatbot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Be Specific</p>
                <p className="text-xs text-muted-foreground">
                  Add detailed information about your properties including pricing, features, and location details.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Add Variations</p>
                <p className="text-xs text-muted-foreground">
                  Include different ways people might ask the same question to improve response matching.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Keep Data Updated</p>
                <p className="text-xs text-muted-foreground">
                  Regularly sync your properties and update training data to ensure accurate responses.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatbotTrainingManager;
