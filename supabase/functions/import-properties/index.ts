
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
    
    // Log first few properties for debugging
    console.log('First properties for debugging:', JSON.stringify(properties.slice(0, 2)))
    
    // Process each property with robust format handling
    for (const property of properties) {
      try {
        // Create a normalized property object with consistent field names
        const normalizedProperty = normalizePropertyData(property)
        
        // Log the normalized property for debugging
        console.log('Normalized property:', JSON.stringify(normalizedProperty))
        
        // Validate the required fields
        if (!normalizedProperty.title) {
          // Make title from address if missing
          if (normalizedProperty.address) {
            normalizedProperty.title = `Property at ${normalizedProperty.address}`
          } else if (normalizedProperty.type) {
            normalizedProperty.title = `${normalizedProperty.type} Property`
          } else {
            normalizedProperty.title = "New Property Listing"
          }
        }

        // Validate the price - this is essential
        if (!normalizedProperty.price || normalizedProperty.price <= 0) {
          // Try to infer price from any field that has numeric value
          const possiblePriceField = findPossiblePriceField(property)
          if (possiblePriceField) {
            normalizedProperty.price = possiblePriceField
          } else {
            // Still no price found, use a placeholder and log warning
            normalizedProperty.price = 0
            console.log(`No valid price found for property: ${normalizedProperty.title}`)
            errorLog.push(`Missing or invalid price for property: ${normalizedProperty.title}`)
          }
        }
        
        // Set default status if not provided
        if (!normalizedProperty.status) {
          normalizedProperty.status = 'active'
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
          errorLog.push(`Error inserting property: ${insertError.message}. Data: ${JSON.stringify(normalizedProperty)}`)
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

// Helper function to find a possible price field
function findPossiblePriceField(property) {
  // Check if there's a field that has "price" or "cost" in its name
  for (const [key, value] of Object.entries(property)) {
    const keyLower = key.toLowerCase();
    
    if (keyLower.includes('price') || keyLower.includes('cost') || keyLower.includes('value')) {
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'string') {
        const numericValue = parseNumericValue(value);
        if (numericValue > 0) {
          return numericValue;
        }
      }
    }
  }
  
  // Check for any numeric field that might be a price
  for (const [key, value] of Object.entries(property)) {
    if (typeof value === 'number' && value > 1000) {
      return value;
    }
    if (typeof value === 'string' && /^[$€£¥]?\s*\d+[,.]?\d*\s*[kKmM]?$/.test(value)) {
      return parseNumericValue(value);
    }
  }
  
  return null;
}

// Helper function to normalize property data from various CSV formats
function normalizePropertyData(property) {
  const normalized = {}
  
  // Extended map of possible field names to standard field names
  const fieldMappings = {
    // Title variants
    'title': 'title', 'Title': 'title', 'property name': 'title', 'property_name': 'title',
    'propertyname': 'title', 'name': 'title', 'Name': 'title', 'heading': 'title',
    'Heading': 'title', 'listing_title': 'title', 'listing': 'title', 'property': 'title',
    'Property': 'title', 'property_title': 'title', 'header': 'title', 'Header': 'title',
    
    // Price variants
    'price': 'price', 'Price': 'price', 'cost': 'price', 'Cost': 'price',
    'value': 'price', 'Value': 'price', 'asking_price': 'price', 'asking price': 'price',
    'listing_price': 'price', 'amount': 'price', 'Amount': 'price', 'price_eur': 'price',
    'price_usd': 'price', 'price_gbp': 'price', 'sale_price': 'price', 'rent_price': 'price',
    
    // Description variants
    'description': 'description', 'Description': 'description', 'details': 'description',
    'Details': 'description', 'info': 'description', 'Info': 'description',
    'about': 'description', 'About': 'description', 'property_description': 'description',
    'summary': 'description', 'Summary': 'description', 'notes': 'description',
    
    // Status variants 
    'status': 'status', 'Status': 'status', 'state': 'status', 'State': 'status',
    'availability': 'status', 'property_status': 'status', 'condition': 'status',
    
    // Type variants
    'type': 'type', 'Type': 'type', 'property_type': 'type', 'property type': 'type',
    'category': 'type', 'Category': 'type', 'kind': 'type', 'Kind': 'type',
    
    // Address fields
    'address': 'address', 'Address': 'address', 'street': 'address', 'Street': 'address',
    'street_address': 'address', 'property_address': 'address', 'location_address': 'address',
    'full_address': 'address', 'address_line1': 'address', 'address1': 'address',
    
    // City variants
    'city': 'city', 'City': 'city', 'town': 'city', 'Town': 'city',
    'locality': 'city', 'Locality': 'city', 'municipality': 'city',
    'location': 'city', 'Location': 'city', 'area': 'city',
    
    // State/Province variants
    'state': 'state', 'State': 'state', 'province': 'state', 'Province': 'state',
    'region': 'state', 'Region': 'state', 'county': 'state', 'County': 'state',
    
    // Zip/Postal code variants
    'zip': 'zip', 'Zip': 'zip', 'zipcode': 'zip', 'ZipCode': 'zip',
    'postal': 'zip', 'Postal': 'zip', 'postal_code': 'zip', 'postalcode': 'zip',
    'zip_code': 'zip', 'post_code': 'zip', 'postcode': 'zip',
    
    // Bedrooms variants
    'bedrooms': 'bedrooms', 'Bedrooms': 'bedrooms', 'beds': 'bedrooms', 'Beds': 'bedrooms',
    'bedroom': 'bedrooms', 'Bedroom': 'bedrooms', 'bed': 'bedrooms', 'Bed': 'bedrooms',
    'br': 'bedrooms', 'BR': 'bedrooms', 'num_bedrooms': 'bedrooms', 'number_of_bedrooms': 'bedrooms',
    'bedroom_count': 'bedrooms', 'bed_count': 'bedrooms', 'rooms': 'bedrooms',
    
    // Bathrooms variants
    'bathrooms': 'bathrooms', 'Bathrooms': 'bathrooms', 'baths': 'bathrooms', 'Baths': 'bathrooms',
    'bathroom': 'bathrooms', 'Bathroom': 'bathrooms', 'bath': 'bathrooms', 'Bath': 'bathrooms',
    'ba': 'bathrooms', 'BA': 'bathrooms', 'num_bathrooms': 'bathrooms', 'number_of_bathrooms': 'bathrooms',
    
    // Size variants
    'size': 'size', 'Size': 'size', 'area': 'size', 'Area': 'size',
    'square_feet': 'size', 'squarefeet': 'size', 'sqft': 'size', 'SQFT': 'size',
    'sq_ft': 'size', 'square_meters': 'size', 'squaremeters': 'size', 'sqm': 'size',
    'SQM': 'size', 'sq_m': 'size', 'footage': 'size', 'square_footage': 'size',
    'living_area': 'size', 'floor_area': 'size', 'total_area': 'size', 'property_size': 'size',
    'm2': 'size', 'sq_meters': 'size'
  }
  
  // First, check for exact field name matches
  for (const [key, value] of Object.entries(property)) {
    // Skip null or undefined values
    if (value === null || value === undefined || value === '') continue;
    
    const standardField = fieldMappings[key]
    if (standardField) {
      // Parse numeric fields appropriately
      if (standardField === 'price' || standardField === 'size') {
        normalized[standardField] = parseNumericValue(value)
      } 
      else if (standardField === 'bedrooms' || standardField === 'bathrooms') {
        normalized[standardField] = parseNumericValue(value)
      }
      else {
        normalized[standardField] = value
      }
    }
  }
  
  // Then, try fuzzy matching for column names
  for (const [key, value] of Object.entries(property)) {
    if (value === null || value === undefined || value === '') continue;
    
    // Skip if we already found a value for this field
    const keyLower = key.toLowerCase();
    
    // Check for title-like fields
    if (!normalized.title) {
      if (keyLower.includes('title') || keyLower.includes('name') || 
          keyLower.includes('property') || keyLower.includes('listing')) {
        normalized.title = value;
        continue;
      }
    }
    
    // Check for price-like fields
    if (!normalized.price) {
      if (keyLower.includes('price') || keyLower.includes('cost') || 
          keyLower.includes('value') || keyLower.includes('amount')) {
        normalized.price = parseNumericValue(value);
        continue;
      }
    }
    
    // Check for description-like fields
    if (!normalized.description) {
      if (keyLower.includes('desc') || keyLower.includes('about') || 
          keyLower.includes('detail') || keyLower.includes('info')) {
        normalized.description = value;
        continue;
      }
    }
    
    // Check for bedroom-like fields
    if (!normalized.bedrooms) {
      if (keyLower.includes('bed') || keyLower.includes('room') ||
          keyLower.includes('br') || keyLower === 'rooms') {
        normalized.bedrooms = parseNumericValue(value);
        continue;
      }
    }
    
    // Check for bathroom-like fields
    if (!normalized.bathrooms) {
      if (keyLower.includes('bath') || keyLower.includes('ba')) {
        normalized.bathrooms = parseNumericValue(value);
        continue;
      }
    }
    
    // Check for size-like fields
    if (!normalized.size) {
      if (keyLower.includes('size') || keyLower.includes('area') || 
          keyLower.includes('sqft') || keyLower.includes('sq ft') ||
          keyLower.includes('square') || keyLower.includes('meter') ||
          keyLower.includes('m2') || keyLower.includes('footage')) {
        normalized.size = parseNumericValue(value);
        continue;
      }
    }
  }
  
  // Last attempt - for any fields we couldn't normalize, try numeric detection
  if (!normalized.price) {
    normalized.price = findPossiblePriceField(property) || 0;
  }
  
  return normalized
}

// Helper function to parse numeric values from various formats
function parseNumericValue(value) {
  if (value === null || value === undefined) return 0;
  
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    // Handle values with currency symbols
    let cleaned = value.replace(/[$€£¥,\s]+/g, '');
    
    // Handle K/M suffixes (thousands/millions)
    if (/\d+\s*k$/i.test(cleaned)) {
      const num = parseFloat(cleaned.replace(/k$/i, ''));
      return num * 1000;
    } else if (/\d+\s*m$/i.test(cleaned)) {
      const num = parseFloat(cleaned.replace(/m$/i, ''));
      return num * 1000000;
    }
    
    // Extract numeric part and convert to number
    const match = cleaned.match(/([-+]?\d*\.?\d+)/);
    if (match) {
      return parseFloat(match[0]);
    }
  }
  
  // If value couldn't be parsed, return 0
  return 0;
}
