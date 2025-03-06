
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
    const body = await req.json();
    const { userId, sourceUrl, sourceType } = body;

    console.log('Request body:', { userId, sourceUrl, sourceType });

    if (!userId || !sourceUrl) {
      return new Response(
        JSON.stringify({ error: 'User ID and source URL are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    console.log('Initializing import process...');
    
    // Create a new import record
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
        JSON.stringify({ error: 'Failed to initialize import process', details: importError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    console.log('Import record created:', importRecord);
    
    // For demonstration purposes, we'll simulate scraping with mock data
    // In a production environment, you would implement actual web scraping logic here
    const scrapedProperties = simulateWebScraping(sourceUrl)
    
    console.log(`Scraped ${scrapedProperties.length} properties`);
    
    // Insert the scraped properties
    let successCount = 0
    let failCount = 0
    
    for (const property of scrapedProperties) {
      const { error: insertError } = await supabase
        .from('listings')
        .insert({
          ...property,
          user_id: userId
        })
      
      if (insertError) {
        console.error('Error inserting property:', insertError)
        failCount++
      } else {
        successCount++
      }
    }
    
    console.log(`Imported: ${successCount}, Failed: ${failCount}`);
    
    // Update the import record
    const { error: updateError } = await supabase
      .from('property_imports')
      .update({
        status: 'completed',
        records_total: scrapedProperties.length,
        records_imported: successCount,
        records_failed: failCount,
        log: JSON.stringify({
          message: `Import completed. ${successCount} properties imported, ${failCount} failed.`,
          timestamp: new Date().toISOString()
        })
      })
      .eq('id', importRecord.id)
    
    if (updateError) {
      console.error('Error updating import record:', updateError)
    }
    
    // Log activity
    try {
      await supabase
        .from('activities')
        .insert({
          user_id: userId,
          type: 'property_import',
          description: `Imported ${successCount} properties from ${sourceUrl}`
        })
    } catch (activityError) {
      console.error('Error logging activity:', activityError)
    }
    
    return new Response(
      JSON.stringify({
        status: 'completed',
        properties_imported: successCount,
        properties_failed: failCount,
        total: scrapedProperties.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing scraper request:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.toString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Simulate web scraping with mock data
function simulateWebScraping(sourceUrl: string) {
  // This would be replaced with actual web scraping logic in production
  console.log(`Simulating scraping from: ${sourceUrl}`)
  
  const mockProperties = []
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Seattle', 'Austin']
  const propertyTypes = ['Apartment', 'House', 'Condo', 'Townhouse']
  
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
      is_featured: Math.random() > 0.8 // 20% chance of being featured
    })
  }
  
  return mockProperties
}
