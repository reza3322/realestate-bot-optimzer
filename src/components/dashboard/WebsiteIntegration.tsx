
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Globe, Loader2 } from "lucide-react";

interface WebsiteIntegrationProps {
  userId: string;
  userPlan: string;
  isPremiumFeature: (plan: string) => boolean;
}

interface UserWebsite {
  id: string;
  website_url: string;
  created_at: string;
}

const WebsiteIntegration = ({ userId, userPlan, isPremiumFeature }: WebsiteIntegrationProps) => {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [userWebsites, setUserWebsites] = useState<UserWebsite[]>([]);
  
  useEffect(() => {
    if (userId) {
      fetchUserWebsites();
    }
  }, [userId]);
  
  const fetchUserWebsites = async () => {
    try {
      const { data, error } = await supabase
        .from('user_websites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setUserWebsites(data || []);
    } catch (error) {
      console.error('Error fetching user websites:', error);
      toast.error('Failed to load your websites');
    }
  };
  
  const validateUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (error) {
      return false;
    }
  };
  
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setWebsiteUrl(url);
    
    // Basic URL validation
    if (url && !validateUrl(url)) {
      setIsValidUrl(false);
    } else {
      setIsValidUrl(true);
    }
  };
  
  const saveWebsite = async () => {
    if (!websiteUrl || !validateUrl(websiteUrl)) {
      setIsValidUrl(false);
      toast.error('Please enter a valid website URL');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Check if this website is already added
      const { data: existingWebsites } = await supabase
        .from('user_websites')
        .select('id')
        .eq('user_id', userId)
        .eq('website_url', websiteUrl);
        
      if (existingWebsites && existingWebsites.length > 0) {
        toast.error('This website is already in your integrations');
        setIsLoading(false);
        return;
      }
      
      // Save website to database
      const { data, error } = await supabase
        .from('user_websites')
        .insert({
          user_id: userId,
          website_url: websiteUrl
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      toast.success('Website added successfully');
      setWebsiteUrl("");
      fetchUserWebsites();
      
    } catch (error) {
      console.error('Error saving website:', error);
      toast.error('Failed to save website. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const deleteWebsite = async (websiteId: string) => {
    try {
      const { error } = await supabase
        .from('user_websites')
        .delete()
        .eq('id', websiteId)
        .eq('user_id', userId);
        
      if (error) {
        throw error;
      }
      
      toast.success('Website removed successfully');
      fetchUserWebsites();
      
    } catch (error) {
      console.error('Error deleting website:', error);
      toast.error('Failed to remove website');
    }
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Website Integration</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Add Your Real Estate Website</CardTitle>
          <CardDescription>
            Enter your website URL to connect it to your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="https://yourrealestate.com"
                value={websiteUrl}
                onChange={handleUrlChange}
                className={!isValidUrl ? "border-red-500" : ""}
              />
              {!isValidUrl && (
                <p className="text-red-500 text-sm mt-1">
                  Please enter a valid URL (e.g., https://example.com)
                </p>
              )}
            </div>
            <Button 
              onClick={saveWebsite} 
              disabled={isLoading || !websiteUrl || !isValidUrl}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
              Save Website
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {userWebsites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Integrated Websites</CardTitle>
            <CardDescription>
              Manage your connected real estate websites
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userWebsites.map((website) => (
                <div 
                  key={website.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{website.website_url}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <span>Added: {formatDate(website.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deleteWebsite(website.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WebsiteIntegration;
