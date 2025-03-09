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
    // Get request body
    const { userId, properties, source = 'csv' } = await req.json()

    if (!userId || !properties || !Array.isArray(properties)) {
      return new Response(
        JSON.stringify({ error: 'User ID and properties array are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from('property_imports')
      .insert({
        user_id: userId,
        source,
        source_name: `Manual ${source.toUpperCase()} import`,
        status: 'processing',
        records_total: properties.length
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
    
    // Initialize counters
    let successCount = 0
    let failCount = 0
    let errorLog = []
    
    // Process each property with more flexible format handling
    for (const property of properties) {
      try {
        // Create a normalized property object with consistent field names
        const normalizedProperty = normalizePropertyData(property)
        
        // Validate required fields - only title, price, and city are truly essential
        if (!normalizedProperty.title || !normalizedProperty.price) {
          failCount++
          errorLog.push(`Property missing required fields (title or price): ${JSON.stringify(property)}`)
          continue
        }
        
        // Add user_id to the property
        const propertyWithUser = {
          ...normalizedProperty,
          user_id: userId
        }
        
        // Insert the property
        const { error: insertError } = await supabase
          .from('properties')
          .insert(propertyWithUser)
        
        if (insertError) {
          console.error('Error inserting property:', insertError)
          failCount++
          errorLog.push(`Error inserting property: ${insertError.message}`)
        } else {
          successCount++
        }
      } catch (error) {
        console.error('Error processing property:', error)
        failCount++
        errorLog.push(`Unexpected error: ${error.message}`)
      }
    }
    
    // Update the import record
    const { error: updateError } = await supabase
      .from('property_imports')
      .update({
        status: 'completed',
        records_imported: successCount,
        records_failed: failCount,
        log: {
          message: `Import completed. ${successCount} properties imported, ${failCount} failed.`,
          errors: errorLog,
          timestamp: new Date().toISOString()
        }
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
        type: 'property_import',
        description: `Imported ${successCount} properties from ${source.toUpperCase()}`
      })
    
    return new Response(
      JSON.stringify({
        status: 'completed',
        import_id: importRecord.id,
        properties_imported: successCount,
        properties_failed: failCount,
        total: properties.length,
        errors: errorLog.length > 0 ? errorLog : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing property import:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Helper function to normalize property data from various CSV formats
function normalizePropertyData(property) {
  const normalized = {}
  
  // Map of possible field names to standard field names
  const fieldMappings = {
    // Title variants
    'title': 'title',
    'Title': 'title',
    'property name': 'title',
    'property_name': 'title',
    'propertyname': 'title',
    'name': 'title',
    'Name': 'title',
    'heading': 'title',
    'Heading': 'title',
    'listing_title': 'title',
    'listing': 'title',
    
    // Price variants
    'price': 'price',
    'Price': 'price',
    'cost': 'price',
    'Cost': 'price',
    'value': 'price',
    'Value': 'price',
    'asking_price': 'price',
    'asking price': 'price',
    'listing_price': 'price',
    
    // Description variants
    'description': 'description',
    'Description': 'description',
    'details': 'description',
    'Details': 'description',
    'info': 'description',
    'Info': 'description',
    'about': 'description',
    'About': 'description',
    
    // Status variants
    'status': 'status',
    'Status': 'status',
    'state': 'status',
    'State': 'status',
    'availability': 'status',
    'Availability': 'status',
    
    // Type variants
    'type': 'type',
    'Type': 'type',
    'property_type': 'type',
    'property type': 'type',
    'category': 'type',
    'Category': 'type',
    
    // Address fields
    'address': 'address',
    'Address': 'address',
    'street': 'address',
    'Street': 'address',
    'street_address': 'address',
    
    // City variants
    'city': 'city',
    'City': 'city',
    'town': 'city',
    'Town': 'city',
    'locality': 'city',
    'Locality': 'city',
    
    // State/Province variants
    'state': 'state',
    'State': 'state',
    'province': 'state',
    'Province': 'state',
    'region': 'state',
    'Region': 'state',
    
    // Zip/Postal code variants
    'zip': 'zip',
    'Zip': 'zip',
    'zipcode': 'zip',
    'ZipCode': 'zip',
    'postal': 'zip',
    'Postal': 'zip',
    'postal_code': 'zip',
    'postalcode': 'zip',
    
    // Bedrooms variants
    'bedrooms': 'bedrooms',
    'Bedrooms': 'bedrooms',
    'beds': 'bedrooms',
    'Beds': 'bedrooms',
    'bedroom': 'bedrooms',
    'Bedroom': 'bedrooms',
    'bed': 'bedrooms',
    'Bed': 'bedrooms',
    'br': 'bedrooms',
    'BR': 'bedrooms',
    
    // Bathrooms variants
    'bathrooms': 'bathrooms',
    'Bathrooms': 'bathrooms',
    'baths': 'bathrooms',
    'Baths': 'bathrooms',
    'bathroom': 'bathrooms',
    'Bathroom': 'bathrooms',
    'bath': 'bathrooms',
    'Bath': 'bathrooms',
    'ba': 'bathrooms',
    'BA': 'bathrooms',
    
    // Size variants
    'size': 'size',
    'Size': 'size',
    'area': 'size',
    'Area': 'size',
    'square_feet': 'size',
    'squarefeet': 'size',
    'sqft': 'size',
    'SQFT': 'size',
    'sq_ft': 'size',
    'square_meters': 'size',
    'squaremeters': 'size',
    'sqm': 'size',
    'SQM': 'size',
    'sq_m': 'size'
  }
  
  // Go through each property in the input and map to standard fields
  for (const [key, value] of Object.entries(property)) {
    const standardField = fieldMappings[key]
    if (standardField) {
      // Parse numeric fields
      if (standardField === 'price' || standardField === 'size') {
        // Strip currency symbols and commas, then convert to number
        const numericValue = parseNumericValue(value)
        normalized[standardField] = numericValue
      } 
      else if (standardField === 'bedrooms' || standardField === 'bathrooms') {
        // Convert to numeric
        normalized[standardField] = parseNumericValue(value)
      }
      else {
        normalized[standardField] = value
      }
    } else {
      // Keep other fields as-is
      normalized[key] = value
    }
  }
  
  // Set default status if not provided
  if (!normalized.status) {
    normalized.status = 'active'
  }
  
  return normalized
}

// Helper function to parse numeric values from various formats
function parseNumericValue(value) {
  if (typeof value === 'number') return value
  
  if (typeof value === 'string') {
    // Remove currency symbols, commas, and other non-numeric characters
    const cleaned = value.replace(/[$€£¥,]/g, '')
    
    // Handle size notations like "1500 sq ft" or "1500sqft"
    const numericPart = cleaned.match(/^([\d.]+)/);
    
    if (numericPart) {
      return parseFloat(numericPart[0])
    }
  }
  
  return value || 0
}
