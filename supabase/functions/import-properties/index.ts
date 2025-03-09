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
        
        // Log the normalized property for debugging
        console.log('Normalized property:', JSON.stringify(normalizedProperty))
        
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
  
  // Extended map of possible field names to standard field names
  const fieldMappings = {
    // Title variants with more options
    'title': 'title', 'Title': 'title', 'property name': 'title', 'property_name': 'title',
    'propertyname': 'title', 'name': 'title', 'Name': 'title', 'heading': 'title',
    'Heading': 'title', 'listing_title': 'title', 'listing': 'title', 'property': 'title',
    'Property': 'title', 'property_title': 'title', 'header': 'title', 'Header': 'title',
    'prop_title': 'title', 'prop name': 'title', 'property headline': 'title',
    'subject': 'title', 'Subject': 'title',
    
    // Price variants with more options
    'price': 'price', 'Price': 'price', 'cost': 'price', 'Cost': 'price',
    'value': 'price', 'Value': 'price', 'asking_price': 'price', 'asking price': 'price',
    'listing_price': 'price', 'amount': 'price', 'Amount': 'price', 'price_eur': 'price',
    'price_usd': 'price', 'price_gbp': 'price', 'sale_price': 'price', 'rent_price': 'price',
    'property_price': 'price', 'list_price': 'price', 'selling_price': 'price', 'final_price': 'price',
    'monthly_price': 'price', 'yearly_price': 'price', 'offer_price': 'price', 
    'sale_value': 'price', 'list_value': 'price', 'euro_price': 'price', 'dollar_price': 'price',
    'eur': 'price', 'usd': 'price',
    
    // Description variants with more options
    'description': 'description', 'Description': 'description', 'details': 'description',
    'Details': 'description', 'info': 'description', 'Info': 'description',
    'about': 'description', 'About': 'description', 'property_description': 'description',
    'listing_description': 'description', 'text': 'description', 'Text': 'description',
    'full_description': 'description', 'property_details': 'description', 'summary': 'description',
    'Summary': 'description', 'overview': 'description', 'Overview': 'description',
    'content': 'description', 'Content': 'description', 'long_description': 'description',
    'note': 'description', 'notes': 'description', 'additional_info': 'description', 
    'features': 'description', 'property_text': 'description', 'desc': 'description',
    
    // Status variants 
    'status': 'status', 'Status': 'status', 'state': 'status', 'State': 'status',
    'availability': 'status', 'Availability': 'status', 'property_status': 'status',
    'listing_status': 'status', 'sale_status': 'status', 'condition': 'status',
    'Condition': 'status', 'active': 'status', 'Active': 'status',
    
    // Type variants
    'type': 'type', 'Type': 'type', 'property_type': 'type', 'property type': 'type',
    'category': 'type', 'Category': 'type', 'kind': 'type', 'Kind': 'type',
    'class': 'type', 'Class': 'type', 'style': 'type', 'Style': 'type',
    'property_category': 'type', 'property_class': 'type', 'property_style': 'type',
    'building_type': 'type', 'residence_type': 'type', 'home_type': 'type',
    
    // Address fields
    'address': 'address', 'Address': 'address', 'street': 'address', 'Street': 'address',
    'street_address': 'address', 'property_address': 'address', 'location_address': 'address',
    'full_address': 'address', 'mailing_address': 'address', 'physical_address': 'address',
    'address_line1': 'address', 'address1': 'address', 'addr': 'address',
    
    // City variants
    'city': 'city', 'City': 'city', 'town': 'city', 'Town': 'city',
    'locality': 'city', 'Locality': 'city', 'municipality': 'city',
    'village': 'city', 'location': 'city', 'Location': 'city',
    'property_city': 'city', 'property_town': 'city', 'area': 'city',
    'district': 'city', 'region_name': 'city', 'urban_area': 'city',
    
    // State/Province variants
    'state': 'state', 'State': 'state', 'province': 'state', 'Province': 'state',
    'region': 'state', 'Region': 'state', 'county': 'state', 'County': 'state',
    'division': 'state', 'administrative_area': 'state', 'territory': 'state',
    'state_province': 'state', 'state_code': 'state', 'province_code': 'state',
    
    // Zip/Postal code variants
    'zip': 'zip', 'Zip': 'zip', 'zipcode': 'zip', 'ZipCode': 'zip',
    'postal': 'zip', 'Postal': 'zip', 'postal_code': 'zip', 'postalcode': 'zip',
    'zip_code': 'zip', 'code_postal': 'zip', 'post_code': 'zip', 'postcode': 'zip',
    'pin': 'zip', 'pin_code': 'zip', 'postal_index': 'zip',
    
    // Bedrooms variants
    'bedrooms': 'bedrooms', 'Bedrooms': 'bedrooms', 'beds': 'bedrooms', 'Beds': 'bedrooms',
    'bedroom': 'bedrooms', 'Bedroom': 'bedrooms', 'bed': 'bedrooms', 'Bed': 'bedrooms',
    'br': 'bedrooms', 'BR': 'bedrooms', 'num_bedrooms': 'bedrooms', 'number_of_bedrooms': 'bedrooms',
    'bedroom_count': 'bedrooms', 'bed_count': 'bedrooms', 'rooms': 'bedrooms',
    'no_of_bedrooms': 'bedrooms', 'nb_bedrooms': 'bedrooms', 'nb_chambres': 'bedrooms', 
    'dormitorios': 'bedrooms', 'habitaciones': 'bedrooms', 'quartos': 'bedrooms',
    'total_bedrooms': 'bedrooms', 'bdrooms': 'bedrooms', 'bd': 'bedrooms',
    
    // Bathrooms variants
    'bathrooms': 'bathrooms', 'Bathrooms': 'bathrooms', 'baths': 'bathrooms', 'Baths': 'bathrooms',
    'bathroom': 'bathrooms', 'Bathroom': 'bathrooms', 'bath': 'bathrooms', 'Bath': 'bathrooms',
    'ba': 'bathrooms', 'BA': 'bathrooms', 'num_bathrooms': 'bathrooms', 'number_of_bathrooms': 'bathrooms',
    'bathroom_count': 'bathrooms', 'bath_count': 'bathrooms', 'no_of_bathrooms': 'bathrooms',
    'nb_bathrooms': 'bathrooms', 'nb_salledebain': 'bathrooms', 'banos': 'bathrooms',
    'total_bathrooms': 'bathrooms', 'bthrms': 'bathrooms', 'bth': 'bathrooms', 'wb': 'bathrooms',
    
    // Size variants
    'size': 'size', 'Size': 'size', 'area': 'size', 'Area': 'size',
    'square_feet': 'size', 'squarefeet': 'size', 'sqft': 'size', 'SQFT': 'size',
    'sq_ft': 'size', 'square_meters': 'size', 'squaremeters': 'size', 'sqm': 'size',
    'SQM': 'size', 'sq_m': 'size', 'footage': 'size', 'square_footage': 'size',
    'living_area': 'size', 'floor_area': 'size', 'total_area': 'size', 'property_size': 'size',
    'building_size': 'size', 'living_space': 'size', 'total_sqft': 'size', 'total_sqm': 'size',
    'm2': 'size', 'sq_meters': 'size', 'surface': 'size', 'superficie': 'size',
    'floor_size': 'size', 'total_floor_area': 'size', 'lot_size': 'size', 'plot_size': 'size',
    'mq': 'size', 'metros': 'size', 'metros2': 'size', 'ft2': 'size', 'm²': 'size', 'ft²': 'size'
  }
  
  // Go through each property in the input and map to standard fields
  for (const [key, value] of Object.entries(property)) {
    if (value === null || value === undefined || value === '') continue;
    
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
      // Try fuzzy matching for column names
      let matched = false
      for (const [mappingKey, mappingValue] of Object.entries(fieldMappings)) {
        // Check if the current key resembles any of our mapping keys
        if (
          key.toLowerCase().includes(mappingKey.toLowerCase()) || 
          mappingKey.toLowerCase().includes(key.toLowerCase())
        ) {
          if (mappingValue === 'price' || mappingValue === 'size') {
            normalized[mappingValue] = parseNumericValue(value);
          } else if (mappingValue === 'bedrooms' || mappingValue === 'bathrooms') {
            normalized[mappingValue] = parseNumericValue(value);
          } else {
            normalized[mappingValue] = value;
          }
          matched = true;
          break;
        }
      }
      
      // If not matched through fuzzy matching, keep the original field
      if (!matched) {
        normalized[key] = value;
      }
    }
  }
  
  // Set default status if not provided
  if (!normalized.status) {
    normalized.status = 'active'
  }
  
  // If price is missing, but we have a field with a name containing 'price'
  if (!normalized.price) {
    for (const [key, value] of Object.entries(property)) {
      if (key.toLowerCase().includes('price') || key.toLowerCase().includes('cost') || 
          key.toLowerCase().includes('value') || key.toLowerCase().includes('eur') || 
          key.toLowerCase().includes('usd')) {
        normalized.price = parseNumericValue(value);
        break;
      }
    }
  }
  
  // If title is missing but we have a name-like field
  if (!normalized.title) {
    for (const [key, value] of Object.entries(property)) {
      if (key.toLowerCase().includes('name') || key.toLowerCase().includes('title') || 
          key.toLowerCase().includes('heading') || key.toLowerCase().includes('property')) {
        normalized.title = value;
        break;
      }
    }
  }
  
  return normalized
}

// Helper function to parse numeric values from various formats
function parseNumericValue(value) {
  if (typeof value === 'number') return value
  
  if (typeof value === 'string') {
    // First handle common suffixes like K or M (for thousands or millions)
    if (/\d+\s*k$/i.test(value)) {
      // Handle "150k" or "150 k" format (thousands)
      const num = parseFloat(value.replace(/k$/i, '').replace(/,/g, '').trim());
      return num * 1000;
    } else if (/\d+\s*m$/i.test(value)) {
      // Handle "1.5m" or "1.5 m" format (millions)
      const num = parseFloat(value.replace(/m$/i, '').replace(/,/g, '').trim());
      return num * 1000000;
    }
    
    // Remove currency symbols, commas, spaces, and other non-numeric characters
    // But keep the decimal point
    const cleaned = value.replace(/[$€£¥,\s]+/g, '').replace(/[^\d.-]/g, '');
    
    // If there's a slash (like in "1/2" for bathrooms), calculate the fraction
    if (cleaned.includes('/')) {
      const parts = cleaned.split('/');
      if (parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1])) && parseFloat(parts[1]) !== 0) {
        return parseFloat(parts[0]) / parseFloat(parts[1]);
      }
    }
    
    // Extract numeric part
    const match = cleaned.match(/([-+]?\d*\.?\d+)/);
    if (match) {
      return parseFloat(match[0]);
    }
  }
  
  // If value is not a number or couldn't be parsed, return 0
  return 0;
}
