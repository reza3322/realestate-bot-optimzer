
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get request body
    const { userId, url, maxPages } = await req.json()

    if (!userId || !url) {
      return new Response(
        JSON.stringify({ error: 'User ID and URL are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Starting web crawling for URL: ${url} by user: ${userId}, maxPages: ${maxPages || 'default'}`)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Fetch user plan to determine crawl limits
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single()
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError)
    }
    
    // Determine max pages based on user plan
    let pagesToCrawl = 10; // Default limit for all users
    const userPlan = profileData?.plan || 'starter';
    
    if (maxPages && !isNaN(Number(maxPages))) {
      // If maxPages is specified in request, use it (but enforce plan limits)
      if (userPlan === 'premium' || userPlan === 'enterprise') {
        pagesToCrawl = Number(maxPages);
        console.log(`Premium/Enterprise user - allowing custom crawl limit: ${pagesToCrawl} pages`);
      } else {
        // For non-premium users, cap at default
        pagesToCrawl = Math.min(Number(maxPages), 10);
        console.log(`Non-premium user - enforcing max limit of 10 pages (requested: ${maxPages})`);
      }
    } else if (userPlan === 'premium') {
      pagesToCrawl = 50; // Premium users get 50 pages by default
      console.log('Premium user - allowing 50 pages');
    } else if (userPlan === 'enterprise') {
      pagesToCrawl = 200; // Enterprise users get 200 pages by default
      console.log('Enterprise user - allowing 200 pages');
    }
    
    // Create a property import record to track the progress
    const { data: importRecord, error: importError } = await supabase
      .from('property_imports')
      .insert({
        user_id: userId,
        source: 'web_crawler',
        source_name: url,
        status: 'processing',
      })
      .select()
      .single()
    
    if (importError) {
      console.error('Error creating import record:', importError)
      return new Response(
        JSON.stringify({ error: 'Failed to initialize import process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // Crawl the website and extract content
    const pagesContent = await crawlWebsite(url, pagesToCrawl)
    
    // Create a new training file entry with the extracted content
    let successCount = 0
    let errorList = []
    
    for (const [pageUrl, content] of Object.entries(pagesContent)) {
      if (!content || content.trim() === '') {
        console.log(`Skipping empty content for page: ${pageUrl}`)
        continue
      }
      
      // Sanitize the content to remove null bytes and other problematic characters
      const sanitizedContent = sanitizeText(content)
      
      // Create a training file entry
      try {
        const { error: insertError } = await supabase
          .from('chatbot_training_files')
          .insert({
            user_id: userId,
            source_file: `Webpage: ${pageUrl}`,
            // Remove the source_type field which doesn't exist
            extracted_text: sanitizedContent,
            priority: 5, // Default priority
            category: 'Website Content',
            content_type: 'text/html' // Add content_type field which does exist
          })
        
        if (insertError) {
          console.error(`Error inserting content for ${pageUrl}:`, insertError)
          errorList.push({ page: pageUrl, error: insertError.message })
        } else {
          successCount++
          console.log(`Successfully stored content for ${pageUrl}`)
        }
      } catch (error) {
        console.error(`Exception storing content for ${pageUrl}:`, error)
        errorList.push({ page: pageUrl, error: error.message })
      }
    }
    
    // Update the import record
    const { error: updateError } = await supabase
      .from('property_imports')
      .update({
        status: 'completed',
        records_total: Object.keys(pagesContent).length,
        records_imported: successCount,
        records_failed: Object.keys(pagesContent).length - successCount,
        log: JSON.stringify({
          message: `Import completed. ${successCount} pages imported, ${errorList.length} failed.`,
          errors: errorList,
          timestamp: new Date().toISOString()
        })
      })
      .eq('id', importRecord.id)
    
    if (updateError) {
      console.error('Error updating import record:', updateError)
    }
    
    // Log activity
    await supabase
      .from('activities')
      .insert({
        user_id: userId,
        type: 'web_crawler',
        description: `Crawled website ${url} and imported ${successCount} pages`
      })
    
    return new Response(
      JSON.stringify({
        success: true,
        pages_total: Object.keys(pagesContent).length,
        pages_imported: successCount,
        pages_failed: errorList.length,
        plan: userPlan,
        max_pages: pagesToCrawl,
        errors: errorList.length > 0 ? errorList : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing web crawler request:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Function to crawl a website and extract content from pages
async function crawlWebsite(baseUrl: string, maxPages = 10): Promise<Record<string, string>> {
  const visitedUrls = new Set<string>()
  const queue: string[] = [baseUrl]
  const results: Record<string, string> = {}
  
  // Ensure the baseUrl has a trailing slash for proper URL joining
  const baseUrlObj = new URL(baseUrl)
  
  console.log(`Starting crawl of ${baseUrl}, max pages: ${maxPages}`)
  
  while (queue.length > 0 && visitedUrls.size < maxPages) {
    const currentUrl = queue.shift()
    if (!currentUrl || visitedUrls.has(currentUrl)) continue
    
    visitedUrls.add(currentUrl)
    console.log(`Crawling page ${visitedUrls.size}/${maxPages}: ${currentUrl}`)
    
    try {
      const response = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'RealHome.ai Bot/1.0 (Web Crawler for Chatbot Training)'
        }
      })
      
      if (!response.ok) {
        console.error(`Failed to fetch ${currentUrl}: ${response.status} ${response.statusText}`)
        continue
      }
      
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('text/html')) {
        console.log(`Skipping non-HTML content at ${currentUrl}: ${contentType}`)
        continue
      }
      
      const html = await response.text()
      
      // Parse the HTML and extract text content
      const parser = new DOMParser()
      const document = parser.parseFromString(html, 'text/html')
      
      if (!document) {
        console.error(`Failed to parse HTML for ${currentUrl}`)
        continue
      }
      
      // Extract and clean text content
      let textContent = extractTextContent(document)
      
      // Store the cleaned text content
      results[currentUrl] = textContent
      
      // Find more links to crawl
      if (visitedUrls.size < maxPages) {
        const links = findLinks(document, currentUrl, baseUrlObj.origin)
        
        // Add new links to the queue
        for (const link of links) {
          if (!visitedUrls.has(link) && !queue.includes(link)) {
            queue.push(link)
          }
        }
      }
    } catch (error) {
      console.error(`Error crawling ${currentUrl}:`, error)
    }
  }
  
  console.log(`Crawl completed. Visited ${visitedUrls.size} pages.`)
  return results
}

// Extract text content from an HTML document
function extractTextContent(document: any): string {
  // Remove script and style tags
  const scripts = document.querySelectorAll('script, style, noscript, iframe, svg')
  scripts.forEach((script: any) => script.remove())
  
  // Get content from specific tags
  const title = document.querySelector('title')?.textContent || ''
  const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
  
  // Extract heading and paragraph content
  let mainContent = ''
  
  // Get headings
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
  headings.forEach((h: any) => {
    mainContent += `${h.textContent}\n\n`
  })
  
  // Get paragraphs
  const paragraphs = document.querySelectorAll('p')
  paragraphs.forEach((p: any) => {
    mainContent += `${p.textContent}\n\n`
  })
  
  // Get list items
  const listItems = document.querySelectorAll('li')
  listItems.forEach((li: any) => {
    mainContent += `• ${li.textContent}\n`
  })
  
  // Get table cells
  const tableCells = document.querySelectorAll('th, td')
  tableCells.forEach((cell: any) => {
    mainContent += `${cell.textContent} | `
  })
  
  // Get div content
  const divs = document.querySelectorAll('div')
  divs.forEach((div: any) => {
    // Only get text directly in the div, not from child elements
    if (div.childNodes) {
      div.childNodes.forEach((node: any) => {
        if (node.nodeType === 3) { // Text node
          const text = node.textContent.trim()
          if (text) {
            mainContent += `${text}\n`
          }
        }
      })
    }
  })
  
  // Combine and clean the content
  let combinedContent = `Title: ${title}\n\nDescription: ${metaDescription}\n\n${mainContent}`
  
  // Clean up the text
  combinedContent = combinedContent
    .replace(/\s+/g, ' ')     // Replace multiple spaces with a single space
    .replace(/\n\s*\n/g, '\n\n') // Replace multiple newlines with double newlines
    .trim()
  
  return combinedContent
}

// Find links to other pages on the same domain
function findLinks(document: any, currentUrl: string, baseOrigin: string): string[] {
  const links: string[] = []
  const anchorTags = document.querySelectorAll('a')
  const currentUrlObj = new URL(currentUrl)
  
  anchorTags.forEach((a: any) => {
    try {
      const href = a.getAttribute('href')
      if (!href) return
      
      // Skip anchor links, javascript, mailto, tel links
      if (href.startsWith('#') || 
          href.startsWith('javascript:') || 
          href.startsWith('mailto:') || 
          href.startsWith('tel:')) {
        return
      }
      
      // Resolve relative URLs
      let fullUrl: URL
      try {
        fullUrl = new URL(href, currentUrl)
      } catch {
        return // Invalid URL
      }
      
      // Only include links from the same domain
      if (fullUrl.origin !== baseOrigin) {
        return
      }
      
      // Skip query parameters and fragments to avoid duplicate content
      fullUrl.search = ''
      fullUrl.hash = ''
      
      // Skip common non-content URLs
      const pathLower = fullUrl.pathname.toLowerCase()
      if (pathLower.includes('/wp-admin') || 
          pathLower.includes('/wp-login') || 
          pathLower.includes('/login') || 
          pathLower.includes('/logout') || 
          pathLower.includes('/wp-content/uploads') ||
          pathLower.match(/\.(jpg|jpeg|png|gif|svg|webp|pdf|doc|docx|xls|xlsx|zip|rar)$/)) {
        return
      }
      
      // Normalize URL to avoid duplicates
      const normalizedUrl = fullUrl.toString()
      links.push(normalizedUrl)
    } catch (error) {
      console.error('Error processing link:', error)
    }
  })
  
  return links
}

// Sanitize text to remove problematic characters for database storage
function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\u0000/g, '') // Remove null bytes
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\\u0000/g, '') // Remove escaped null bytes
    .substring(0, 1000000); // Limit length to prevent database issues
}
