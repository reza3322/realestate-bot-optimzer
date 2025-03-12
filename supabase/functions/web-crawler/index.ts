
// This is the Supabase Edge Function for web crawling
// It handles crawling websites and extracting content, including JavaScript rendered content

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { load } from "https://esm.sh/cheerio@1.0.0-rc.12";

// Define the number of concurrent requests allowed
const MAX_CONCURRENT_REQUESTS = 10;
// Define the delay between requests in ms
const REQUEST_DELAY = 500;

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

    // Helper function to wait for a specified time
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
        }

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

    // Process all URLs in the queue
    while (urlQueue.length > 0) {
      const batchSize = Math.min(MAX_CONCURRENT_REQUESTS, urlQueue.length);
      const batch = urlQueue.splice(0, batchSize);

      // Process batch of URLs concurrently
      await Promise.all(batch.map(url => fetchPage(url)));

      // Wait between batches to be polite
      if (urlQueue.length > 0) {
        await wait(REQUEST_DELAY);
      }
    }

    console.log(`Crawling complete. Processed ${crawledPages.length} pages, failed on ${failedUrls.length} pages`);

    // Store results in the database
    const importedPages = [];
    for (const page of crawledPages) {
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
          importedPages.push(data[0]);
        }
      } catch (error) {
        console.error(`Error in database operation for ${page.url}:`, error);
      }
    }

    // Return the results
    return new Response(
      JSON.stringify({
        success: true,
        pages_crawled: crawledPages.length,
        pages_imported: importedPages.length,
        pages_failed: failedUrls.length,
        message: `Successfully crawled ${crawledPages.length} pages and imported ${importedPages.length} pages.`
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
