
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe, Loader2, AlertCircle, CheckCircle2, ExternalLink, Lock, Code } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface WebsiteCrawlerProps {
  userId: string;
  userPlan?: string;
  onCrawlComplete?: (success: boolean) => void;
}

const WebsiteCrawler = ({ userId, userPlan = "starter", onCrawlComplete }: WebsiteCrawlerProps) => {
  const [websiteUrl, setWebsiteUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<any>(null);
  const [maxPages, setMaxPages] = useState<number>(getDefaultMaxPages());
  
  function getDefaultMaxPages() {
    if (userPlan === "premium") return 50;
    if (userPlan === "enterprise") return 200;
    return 10; // Default for starter plan
  }
  
  function getMaxPagesLimit() {
    if (userPlan === "enterprise") return 500;
    if (userPlan === "premium") return 200;
    return 10; // Default for starter plan
  }
  
  const isPremium = userPlan === "premium" || userPlan === "enterprise";

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const crawlWebsite = async () => {
    // Basic validation
    if (!websiteUrl) {
      toast.error("Please enter a website URL");
      return;
    }

    // Ensure URL has a protocol
    let formattedUrl = websiteUrl;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    if (!isValidUrl(formattedUrl)) {
      toast.error("Please enter a valid website URL");
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setStatus("Initializing web crawler...");
    setError("");
    setResult(null);

    try {
      // Call the Supabase Edge Function to crawl the website
      setStatus("Crawling website pages with JavaScript support...");
      setProgress(30);
      
      const { data, error } = await supabase.functions.invoke("web-crawler", {
        body: {
          userId,
          url: formattedUrl,
          maxPages: maxPages
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to crawl website");
      }
      
      setProgress(90);
      setStatus("Processing crawled content...");
      
      // Check if the response contains any errors
      if (!data.success) {
        throw new Error(data.error || "Failed to process website content");
      }

      setProgress(100);
      setStatus("Website crawled successfully!");
      setResult(data);
      
      toast.success("Website crawled and content processed for chatbot training!");
      
      setTimeout(() => {
        setProgress(0);
      }, 3000);
      
      if (onCrawlComplete) onCrawlComplete(true);

    } catch (error: any) {
      console.error("Crawl error:", error);
      setError(error.message || "Unknown error occurred");
      toast.error(`Failed to crawl website: ${error.message || "Unknown error"}`);
      setStatus("Crawl failed. Please try again.");
      setProgress(0);
      if (onCrawlComplete) onCrawlComplete(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Globe className="mr-2 h-5 w-5 text-primary" />
          Crawl Your Website
          {isPremium && (
            <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">
              Premium
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Enter your website URL to extract content for chatbot training.
          Your chatbot will learn from your website content, including JavaScript-rendered content, and provide more relevant responses.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="website-url">Website URL</Label>
          <div className="flex gap-2">
            <Input
              id="website-url"
              type="url"
              placeholder="https://yourdomain.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button
              onClick={() => window.open(
                websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`, 
                '_blank'
              )}
              variant="outline"
              size="icon"
              type="button"
              disabled={!websiteUrl}
              title="Open website in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="max-pages" className="flex items-center">
              Pages to Crawl
              {!isPremium && (
                <Lock className="ml-1 h-3 w-3 text-muted-foreground" />
              )}
            </Label>
            <span className="text-sm font-medium">
              {maxPages} {maxPages === getMaxPagesLimit() ? "(Max)" : ""}
            </span>
          </div>
          <Slider
            id="max-pages"
            value={[maxPages]}
            min={1}
            max={getMaxPagesLimit()}
            step={1}
            onValueChange={(values) => setMaxPages(values[0])}
            disabled={isProcessing || !isPremium}
            className={!isPremium ? "opacity-70" : ""}
          />
          {!isPremium && (
            <p className="text-xs text-muted-foreground mt-1">
              Upgrade to Premium to crawl more than 10 pages.
            </p>
          )}
        </div>

        {(status || progress > 0) && (
          <div className="space-y-2">
            {progress > 0 && (
              <Progress value={progress} className="h-2" />
            )}
            <div className="text-sm text-muted-foreground flex items-center">
              {isProcessing && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              <span>Status: {status}</span>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert className="mt-2 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription>
              Successfully crawled {result.pages_imported} pages from your website.
              {result.pages_failed > 0 && ` (${result.pages_failed} pages failed)`}
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={crawlWebsite}
          disabled={isProcessing || !websiteUrl}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Crawling Website...
            </>
          ) : (
            <>
              <Globe className="mr-2 h-4 w-4" />
              Crawl Website
            </>
          )}
        </Button>

        <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-900">
          <Code className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <span className="font-medium">New:</span> Our crawler now extracts JavaScript-rendered content for better training data.
          </p>
        </div>

        <div className="text-xs text-muted-foreground mt-2 bg-muted/40 p-3 rounded-md border">
          <p className="font-medium mb-1">For best results:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Make sure your website is publicly accessible</li>
            <li>The crawler will extract content from HTML pages and JavaScript-rendered content</li>
            <li>Only pages on the same domain will be crawled</li>
            <li>
              {isPremium
                ? `Up to ${getMaxPagesLimit()} pages will be processed with your ${userPlan} plan`
                : "Up to 10 pages will be processed with your current plan"}
            </li>
            {!isPremium && (
              <li className="text-primary-600 dark:text-primary-400">
                Upgrade to Premium for up to 200 pages, or Enterprise for up to 500 pages
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebsiteCrawler;
