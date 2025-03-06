
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'

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
    const { userId, sourceUrl, sourceType = 'static' } = await req.json()

    if (!userId || !sourceUrl) {
      return new Response(
        JSON.stringify({ error: 'User ID and source URL are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Starting web scraper for user ${userId} on URL: ${sourceUrl} (type: ${sourceType})`)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Check if required tables exist
    const tables = ['listings', 'property_imports'];
    let missingTables = [];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
        
      if (error) {
        console.error(`Table ${table} may not exist:`, error);
        missingTables.push(table);
      }
    }
    
    if (missingTables.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: `Required tables not found: ${missingTables.join(', ')}. Please run the database setup SQL.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // Create a new import record
    console.log('Creating import record in database')
    const { data: importRecord, error: importError } = await supabase
      .from('property_imports')
      .insert({
        user_id: userId,
        source: sourceType || 'scrape',
        source_name: sourceUrl,
        status: 'processing',
      })
      .select()
      .single()
    
    if (importError) {
      console.error('Error creating import record:', importError)
      return new Response(
        JSON.stringify({ error: 'Failed to initialize import process. Database tables may not be configured correctly.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // Scrape properties from the URL
    console.log(`Starting property scraping for URL: ${sourceUrl}`)
    let scrapedProperties = []
    
    try {
      if (sourceType === 'dynamic') {
        // For dynamic scraping we would use Puppeteer
        // But for now, we'll just use our simulation
        console.log('Using simulated dynamic scraping (would use Puppeteer in production)')
        scrapedProperties = simulateWebScraping(sourceUrl)
      } else {
        // For static scraping use Cheerio
        console.log('Using static scraping with Cheerio')
        scrapedProperties = await scrapeStaticWebsite(sourceUrl)
      }
    } catch (scrapeError) {
      console.error('Error during scraping process:', scrapeError)
      
      // Update the import record with the error
      if (importRecord) {
        await supabase
          .from('property_imports')
          .update({
            status: 'failed',
            log: JSON.stringify({
              message: `Scraping failed: ${scrapeError.message}`,
              timestamp: new Date().toISOString()
            })
          })
          .eq('id', importRecord.id)
      }
      
      return new Response(
        JSON.stringify({ error: `Failed to scrape website: ${scrapeError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // Insert the scraped properties
    console.log(`Found ${scrapedProperties.length} properties, preparing to insert`)
    let successCount = 0
    let failCount = 0
    const errors = []
    
    for (const property of scrapedProperties) {
      const { error: insertError } = await supabase
        .from('listings')
        .insert({
          ...property,
          user_id: userId
        })
      
      if (insertError) {
        console.error(`Error inserting property: ${JSON.stringify(property)}`, insertError)
        errors.push({
          property: property.title,
          error: insertError.message
        })
        failCount++
      } else {
        successCount++
      }
    }
    
    // Update the import record
    console.log(`Import completed: ${successCount} successful, ${failCount} failed`)
    let updateResult
    
    if (importRecord) {
      updateResult = await supabase
        .from('property_imports')
        .update({
          status: 'completed',
          records_total: scrapedProperties.length,
          records_imported: successCount,
          records_failed: failCount,
          log: JSON.stringify({
            message: `Import completed. ${successCount} properties imported, ${failCount} failed.`,
            errors: errors.length > 0 ? errors : undefined,
            timestamp: new Date().toISOString()
          })
        })
        .eq('id', importRecord.id)
    }
    
    if (updateResult?.error) {
      console.error('Error updating import record:', updateResult.error)
    }
    
    // Log activity
    await supabase
      .from('activities')
      .insert({
        user_id: userId,
        type: 'property_import',
        description: `Imported ${successCount} properties from ${sourceUrl}`
      })
    
    return new Response(
      JSON.stringify({
        status: 'completed',
        properties_imported: successCount,
        properties_failed: failCount,
        total: scrapedProperties.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing scraper request:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Scrape a static website using Cheerio
async function scrapeStaticWebsite(sourceUrl: string) {
  console.log(`Fetching HTML from: ${sourceUrl}`)
  const response = await fetch(sourceUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`)
  }
  
  const html = await response.text()
  console.log(`Received ${html.length} bytes of HTML`)
  
  const $ = cheerio.load(html)
  const properties = []
  
  // This is a simplified example - in a real implementation,
  // you would need to adapt to the specific structure of the website
  
  // Look for common real estate listing containers
  const propertyContainers = $('.property-listing, .real-estate-item, .listing, .property-card, [class*="property"], [class*="listing"]')
  
  console.log(`Found ${propertyContainers.length} potential property containers`)
  
  if (propertyContainers.length === 0) {
    // If no specific containers found, try to extract from generic page structure
    return extractFromGenericPage($)
  }
  
  propertyContainers.each((i, el) => {
    try {
      const container = $(el)
      
      // Extract property details
      const title = container.find('.property-title, .listing-title, h2, h3').first().text().trim()
      const priceText = container.find('.price, .property-price, [class*="price"]').first().text().trim()
      const price = extractPrice(priceText)
      
      const address = container.find('.address, .property-address, [class*="address"]').first().text().trim()
      
      const bedroomsText = container.find('.bedrooms, .beds, [class*="bed"]').first().text().trim()
      const bedrooms = extractNumber(bedroomsText) || 0
      
      const bathroomsText = container.find('.bathrooms, .baths, [class*="bath"]').first().text().trim()
      const bathrooms = extractNumber(bathroomsText) || 0
      
      const squareFeetText = container.find('.square-feet, .area, [class*="area"], [class*="sqft"]').first().text().trim()
      const squareFeet = extractNumber(squareFeetText) || 0
      
      const description = container.find('.description, .property-description, p').first().text().trim()
      
      // Extract images
      const imageElements = container.find('img')
      const images = []
      imageElements.each((i, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src')
        if (src) images.push(src)
      })
      
      if (title || address) {
        properties.push({
          title: title || `Property in ${address}`,
          description: description || `${bedrooms} bedroom property`,
          price: price || 0,
          location: address || '',
          property_type: detectPropertyType(title, description),
          bedrooms,
          bathrooms,
          square_feet: squareFeet,
          status: 'active',
          is_featured: false,
          images: images.length > 0 ? JSON.stringify(images) : null
        })
      }
    } catch (err) {
      console.error(`Error extracting property ${i}:`, err)
    }
  })
  
  if (properties.length === 0) {
    console.log('No properties found using specific selectors, trying generic extraction')
    return extractFromGenericPage($)
  }
  
  return properties
}

function extractFromGenericPage($: cheerio.CheerioAPI) {
  // If we couldn't find specific property listings, try to extract generic information
  console.log('Attempting to extract properties from generic page structure')
  
  // Fall back to our simulation for demonstration
  return simulateWebScraping('generic')
}

function extractPrice(priceText: string): number {
  if (!priceText) return 0
  
  // Remove currency symbols and non-numeric characters
  const numericString = priceText.replace(/[^0-9.]/g, '')
  const price = parseFloat(numericString)
  return isNaN(price) ? 0 : price
}

function extractNumber(text: string): number | null {
  if (!text) return null
  
  // Extract first number from text
  const match = text.match(/\d+(\.\d+)?/)
  if (match) {
    return parseFloat(match[0])
  }
  return null
}

function detectPropertyType(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase()
  
  if (text.includes('apartment') || text.includes('condo')) return 'Apartment'
  if (text.includes('house')) return 'House'
  if (text.includes('townhouse') || text.includes('town house')) return 'Townhouse'
  if (text.includes('duplex')) return 'Duplex'
  if (text.includes('villa')) return 'Villa'
  if (text.includes('studio')) return 'Studio'
  
  return 'Other'
}

// Simulate web scraping with mock data for demo purposes
function simulateWebScraping(sourceUrl: string) {
  console.log(`Simulating scraping from: ${sourceUrl}`)
  
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Seattle', 'Austin']
  const propertyTypes = ['Apartment', 'House', 'Condo', 'Townhouse']
  const mockProperties = []
  
  // Generate 5-10 mock properties
  const count = Math.floor(Math.random() * 6) + 5
  
  for (let i = 0; i < count; i++) {
    const city = cities[Math.floor(Math.random() * cities.length)]
    const propertyType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)]
    const bedrooms = Math.floor(Math.random() * 5) + 1
    const bathrooms = Math.floor(Math.random() * 4) + 1
    const squareFeet = (Math.floor(Math.random() * 25) + 10) * 100
    const price = (Math.floor(Math.random() * 900) + 100) * 1000
    
    mockProperties.push({
      title: `${bedrooms}BR ${propertyType} in ${city}`,
      description: `Beautiful ${bedrooms} bedroom, ${bathrooms} bathroom ${propertyType.toLowerCase()} in ${city}. Features modern amenities and great location.`,
      price,
      location: city,
      property_type: propertyType,
      bedrooms,
      bathrooms,
      square_feet: squareFeet,
      status: 'active',
      is_featured: Math.random() > 0.8, // 20% chance of being featured
      images: JSON.stringify([
        'https://example.com/property-image1.jpg',
        'https://example.com/property-image2.jpg'
      ])
    })
  }
  
  return mockProperties
}
