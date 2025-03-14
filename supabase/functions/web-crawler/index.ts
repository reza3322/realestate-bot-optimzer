
// This is the Supabase Edge Function for web crawling
// It handles crawling websites and extracting content, including JavaScript rendered content

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { load } from "https://esm.sh/cheerio@1.0.0-rc.12";

// Define the number of concurrent requests allowed - reducing this to be more gentle
const MAX_CONCURRENT_REQUESTS = 2;
// Define the delay between requests in ms - increasing this to avoid rate limiting
const REQUEST_DELAY = 3000;
// Add jitter to the delay to make requests less predictable
const DELAY_JITTER = 1000;
// Maximum number of pages to process in a single batch
const BATCH_SIZE = 5;
// Maximum CPU time before we need to yield (in ms)
const MAX_CPU_TIME = 25000;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
      status: 204,
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: `Unsupported method: ${req.method}` }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { url, userId } = await req.json();
    
    if (!url || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting to crawl: ${url} for user: ${userId}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalize URL and add protocol if missing
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Extract domain for same-origin checks
    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname;

    // Set to track visited URLs
    const visitedUrls = new Set<string>();
    // Queue of URLs to visit
    const urlQueue: string[] = [normalizedUrl];
    // Array to store crawled pages
    const crawledPages: { url: string; content: string }[] = [];
    // Track failures
    const failedUrls: string[] = [];
    // Track rate limiting issues
    let rateLimitDetected = false;
    let consecutiveFailures = 0;
    // Start time to track CPU usage
    const startTime = Date.now();

    // Helper function to wait for a specified time with some jitter
    const wait = (ms: number) => {
      const jitter = Math.floor(Math.random() * DELAY_JITTER);
      return new Promise(resolve => setTimeout(resolve, ms + jitter));
    };

    // Function to extract all links from a page
    const extractLinks = (html: string, baseUrl: string): string[] => {
      const links: string[] = [];
      const $ = load(html);
      
      $('a').each((_, element) => {
        const href = $(element).attr('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          try {
            // Resolve relative URLs
            const absoluteUrl = new URL(href, baseUrl).href;
            // Only include links from the same domain
            if (new URL(absoluteUrl).hostname === domain) {
              links.push(absoluteUrl);
            }
          } catch (e) {
            // Ignore invalid URLs
            console.error(`Invalid URL: ${href}`, e);
          }
        }
      });
      
      return links;
    };

    // Function to clean and extract text content from HTML
    const extractText = (html: string): string => {
      const $ = load(html);
      
      // Remove scripts, styles, and other non-content elements
      $('script, style, meta, link, noscript, iframe, svg').remove();
      
      // Get the text content and normalize whitespace
      let text = $('body').text();
      text = text.replace(/\s+/g, ' ').trim();
      
      // Get all headings and their text to preserve structure
      const headings: string[] = [];
      $('h1, h2, h3, h4, h5, h6').each((_, el) => {
        headings.push($(el).text().trim());
      });
      
      // Get all paragraphs to preserve structure
      const paragraphs: string[] = [];
      $('p').each((_, el) => {
        const content = $(el).text().trim();
        if (content) {
          paragraphs.push(content);
        }
      });
      
      // Combine all text content with structured elements
      const structuredContent = [
        ...headings.map(h => `# ${h}`),
        ...paragraphs,
        text
      ].join('\n\n');
      
      return structuredContent;
    };

    // Function to fetch and process a page
    const fetchPage = async (url: string): Promise<void> => {
      try {
        console.log(`Fetching page: ${url}`);
        
        // Add user agent rotation to avoid blocking
        const userAgents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36'
        ];
        
        const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': randomUserAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
          },
        });

        if (response.status === 429) {
          rateLimitDetected = true;
          consecutiveFailures++;
          throw new Error(`Rate limit detected (429) for ${url}`);
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
        }

        // Reset consecutive failures counter on success
        consecutiveFailures = 0;

        const html = await response.text();
        
        // Extract and save content
        const content = extractText(html);
        if (content.trim()) {
          crawledPages.push({ url, content });
          console.log(`Successfully processed: ${url}`);
        }

        // Extract links for further crawling
        const links = extractLinks(html, url);
        for (const link of links) {
          if (!visitedUrls.has(link) && !urlQueue.includes(link)) {
            urlQueue.push(link);
          }
        }
      } catch (error) {
        console.error(`Error processing ${url}:`, error);
        failedUrls.push(url);
      } finally {
        visitedUrls.add(url);
      }
    };

    // Store the first batch of crawled pages in the database
    const storePages = async (pages: { url: string; content: string }[]): Promise<number> => {
      let importedCount = 0;
      
      for (const page of pages) {
        try {
          const { data, error } = await supabase
            .from('chatbot_training_files')
            .insert({
              user_id: userId,
              source_file: page.url,
              extracted_text: page.content,
              category: 'Web Crawler',
              priority: 5,
              content_type: 'text/html',
              processing_status: 'complete'
            })
            .select();

          if (error) {
            console.error(`Error storing page ${page.url}:`, error);
            continue;
          }

          if (data && data.length > 0) {
            importedCount++;
          }
        } catch (error) {
          console.error(`Error in database operation for ${page.url}:`, error);
        }
      }
      
      return importedCount;
    };

    // Process and store the initial batch to provide immediate feedback to the user
    const initialBatchSize = Math.min(BATCH_SIZE, urlQueue.length);
    const initialBatch = urlQueue.splice(0, initialBatchSize);
    
    for (const url of initialBatch) {
      await fetchPage(url);
      await wait(REQUEST_DELAY);
    }
    
    // Store the initial batch
    const initialImportCount = await storePages(crawledPages);
    
    // Create a background task to continue processing the rest
    const continueProcessing = async () => {
      let totalImported = initialImportCount;
      const totalBatchesToProcess = Math.min(100, urlQueue.length); // Limit to avoid infinite crawling
      let processedBatches = 0;
      
      console.log(`Starting background processing for ${urlQueue.length} remaining URLs`);
      
      while (urlQueue.length > 0 && !rateLimitDetected && processedBatches < totalBatchesToProcess) {
        // Check if we've used too much CPU time and need to stop
        if (Date.now() - startTime > MAX_CPU_TIME) {
          console.log(`CPU time exceeded, stopping after ${processedBatches} batches`);
          break;
        }
        
        const batchSize = Math.min(BATCH_SIZE, urlQueue.length);
        const batch = urlQueue.splice(0, batchSize);
        const batchPages: { url: string; content: string }[] = [];
        
        // Process batch
        for (const url of batch) {
          if (!visitedUrls.has(url)) {
            await fetchPage(url);
            await wait(REQUEST_DELAY);
          }
        }
        
        // Collect pages from this batch
        const newPages = crawledPages.slice(totalImported);
        
        // Store the batch
        const importedCount = await storePages(newPages);
        totalImported += importedCount;
        
        processedBatches++;
        
        // Wait between batches
        await wait(REQUEST_DELAY * 2);
      }
      
      console.log(`Background processing complete. Total imported: ${totalImported}`);
      
      // If more URLs remain but we had to stop, log this
      if (urlQueue.length > 0) {
        console.log(`Stopped with ${urlQueue.length} URLs remaining in queue due to limits`);
      }
    };
    
    // Use EdgeRuntime.waitUntil for background processing if available
    // @ts-ignore - EdgeRuntime may not be defined in all environments
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(continueProcessing());
      console.log("Background processing started using EdgeRuntime.waitUntil");
    } else {
      // Fallback for environments without EdgeRuntime.waitUntil
      setTimeout(() => {
        continueProcessing().catch(err => {
          console.error("Error in background processing:", err);
        });
      }, 0);
      console.log("Background processing started using setTimeout");
    }

    // Return immediate response with initial results
    return new Response(
      JSON.stringify({
        success: true,
        pages_crawled: crawledPages.length,
        pages_imported: initialImportCount,
        pages_failed: failedUrls.length,
        message: `Started crawling ${initialBatchSize} pages and imported ${initialImportCount} pages. Continuing in the background.`,
        status: "processing"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
