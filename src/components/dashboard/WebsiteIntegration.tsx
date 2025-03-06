import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Loader2, ArrowUpDown, Globe, RefreshCw, AlertTriangle } from "lucide-react";

interface WebsiteIntegrationProps {
  userId: string;
  userPlan: string;
  isPremiumFeature: (plan: string) => boolean;
}

interface UserWebsite {
  id: string;
  website_url: string;
  last_scraped_at: string | null;
  api_available: boolean;
  created_at: string;
}

interface ScrapeHistory {
  id: string;
  status: string;
  properties_found: number;
  properties_imported: number;
  created_at: string;
  error_message?: string;
}

const WebsiteIntegration = ({ userId, userPlan, isPremiumFeature }: WebsiteIntegrationProps) => {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [userWebsites, setUserWebsites] = useState<UserWebsite[]>([]);
  const [scrapeHistory, setScrapeHistory] = useState<ScrapeHistory[]>([]);
  
  useEffect(() => {
    if (userId) {
      fetchUserWebsites();
      fetchScrapeHistory();
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
  
  const fetchScrapeHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('scrape_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (error) {
        throw error;
      }
      
      setScrapeHistory(data || []);
    } catch (error) {
      console.error('Error fetching scrape history:', error);
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
      
      // Try to detect if the website has an API
      let apiAvailable = false;
      try {
        // This would be replaced with actual API detection logic
        // const apiCheckResponse = await fetch(`${websiteUrl}/api/properties`);
        // apiAvailable = apiCheckResponse.ok;
        apiAvailable = false; // For demo purposes
      } catch (error) {
        console.log('API check failed, assuming no API is available');
        apiAvailable = false;
      }
      
      // Save website to database
      const { data, error } = await supabase
        .from('user_websites')
        .insert({
          user_id: userId,
          website_url: websiteUrl,
          api_available: apiAvailable
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
  
  const startScrape = async (websiteId: string, websiteUrl: string) => {
    if (isScraping) {
      toast.info('A scraping process is already running');
      return;
    }
    
    setIsScraping(true);
    
    try {
      // Create scrape history record
      const { data: scrapeRecord, error: scrapeError } = await supabase
        .from('scrape_history')
        .insert({
          user_id: userId,
          website_id: websiteId,
          status: 'processing'
        })
        .select()
        .single();
        
      if (scrapeError) {
        throw scrapeError;
      }
      
      // Call the web scraper edge function
      toast.info('Starting to scrape your website. This may take a few minutes.');
      
      const { data, error } = await supabase.functions.invoke('web-scraper', {
        body: {
          userId,
          sourceUrl: websiteUrl,
          sourceType: 'scrape'
        }
      });
      
      if (error) {
        throw error;
      }
      
      // Update scrape history record
      await supabase
        .from('scrape_history')
        .update({
          status: 'completed',
          properties_found: data.total,
          properties_imported: data.properties_imported
        })
        .eq('id', scrapeRecord.id);
      
      // Update last scraped timestamp on website
      await supabase
        .from('user_websites')
        .update({
          last_scraped_at: new Date().toISOString()
        })
        .eq('id', websiteId);
      
      toast.success(`Scrape completed. Imported ${data.properties_imported} properties.`);
      
      // Refresh the lists
      fetchUserWebsites();
      fetchScrapeHistory();
      
    } catch (error) {
      console.error('Error during scraping:', error);
      toast.error('Scraping failed. Please try again or contact support.');
      
      // Update scrape history with error
      await supabase
        .from('scrape_history')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('website_id', websiteId)
        .eq('status', 'processing');
        
    } finally {
      setIsScraping(false);
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
            Enter your website URL to automatically import property listings
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
                      <span>•</span>
                      <span>Last scraped: {formatDate(website.last_scraped_at)}</span>
                      {website.api_available && (
                        <>
                          <span>•</span>
                          <Badge>API Available</Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => startScrape(website.id, website.website_url)}
                      disabled={isScraping}
                    >
                      {isScraping ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Scrape Now
                    </Button>
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
      
      {scrapeHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scrape History</CardTitle>
            <CardDescription>
              Recent property import attempts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scrapeHistory.map((history) => (
                <div 
                  key={history.id}
                  className="p-4 border rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            history.status === 'completed' 
                              ? 'default' 
                              : history.status === 'processing' 
                                ? 'secondary' 
                                : 'destructive'
                          }
                        >
                          {history.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(history.created_at)}
                        </span>
                      </div>
                      
                      <p className="mt-2">
                        {history.status === 'completed' ? (
                          <>Found {history.properties_found} properties, imported {history.properties_imported}</>
                        ) : history.status === 'processing' ? (
                          <>Import in progress...</>
                        ) : (
                          <>Failed to import properties</>
                        )}
                      </p>
                      
                      {history.error_message && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                          <p>{history.error_message}</p>
                        </div>
                      )}
                    </div>
                    
                    {history.status === 'failed' && (
                      <Button size="sm" variant="outline">
                        Try Again
                      </Button>
                    )}
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
