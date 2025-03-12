
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      query, 
      userId, 
      includeQA = true, 
      includeFiles = true, 
      includeProperties = true,
      maxResults = 5 
    } = await req.json();
    
    console.log(`Searching training data for user ${userId} with query: ${query}`);

    if (!query || !userId) {
      return new Response(
        JSON.stringify({ error: 'Query and user ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize results
    let qaMatches = [];
    let fileContent = [];
    let propertyListings = [];

    // Fetch Q&A matches
    if (includeQA) {
      const { data: qaData, error: qaError } = await supabaseClient
        .rpc('search_training_data', {
          user_id_param: userId,
          query_text: query
        });
      
      if (qaError) {
        console.error('Error searching QA data:', qaError);
      } else if (qaData && qaData.length > 0) {
        qaMatches = qaData.slice(0, maxResults);
        console.log(`Found ${qaMatches.length} QA matches`);
      }
    }

    // Fetch file content
    if (includeFiles) {
      const { data: filesData, error: filesError } = await supabaseClient
        .from('chatbot_training_files')
        .select('id, source_file, category, content_type, extracted_text')
        .eq('user_id', userId)
        .limit(maxResults);
      
      if (filesError) {
        console.error('Error fetching training files:', filesError);
      } else if (filesData && filesData.length > 0) {
        // Filter and transform file data
        fileContent = filesData.map(file => ({
          id: file.id,
          source: file.source_file,
          category: file.category,
          content_type: file.content_type,
          text: file.extracted_text.substring(0, 500) // Limit text length
        }));
        console.log(`Found ${fileContent.length} file content matches`);
      }
    }

    // Fetch property listings - directly from the database, not hardcoded
    if (includeProperties) {
      // First check if the query seems to be about properties
      const propertyTerms = ['property', 'properties', 'house', 'home', 'apartment', 'villa', 'flat', 'condo', 
                             'real estate', 'buy', 'rent', 'sale', 'bedroom', 'bathroom', 'pool', 'listing', 'listings'];
      
      // Set isPropertyQuery to true for empty queries or general listings requests
      // This handles cases like "show me listings" or "what properties do you have"
      const emptyOrGeneralQuery = !query.trim() || 
                                query.toLowerCase().includes('list') || 
                                query.toLowerCase().includes('show me') ||
                                query.toLowerCase().includes('do you have');
      
      const isPropertyQuery = emptyOrGeneralQuery || 
                              propertyTerms.some(term => query.toLowerCase().includes(term));
      
      if (isPropertyQuery) {
        console.log("Query appears to be about properties, searching database...");
        
        // Extract potential location from query
        let locationFilter = '';
        const locationMatches = query.match(/in\s+([a-zA-Z\s]+?)(?:,|\s|$|\?|\.)/i);
        if (locationMatches && locationMatches[1]) {
          locationFilter = locationMatches[1].trim();
          console.log(`Extracted location filter: ${locationFilter}`);
        }
        
        // Extract potential bedrooms from query
        let bedroomsFilter = null;
        const bedroomsMatches = query.match(/(\d+)\s*(?:bed|bedroom|bedrooms|br)/i);
        if (bedroomsMatches && bedroomsMatches[1]) {
          bedroomsFilter = parseInt(bedroomsMatches[1]);
          console.log(`Extracted bedrooms filter: ${bedroomsFilter}`);
        }
        
        // Build query based on extracted filters
        let propertyQuery = supabaseClient
          .from('properties')
          .select('id, title, description, price, bedrooms, bathrooms, city, state, status, url, has_pool, type')
          .eq('user_id', userId)
          .eq('status', 'active');
        
        // Add location filter if present
        if (locationFilter) {
          propertyQuery = propertyQuery.or(`city.ilike.%${locationFilter}%,state.ilike.%${locationFilter}%,description.ilike.%${locationFilter}%`);
        }
        
        // Add bedrooms filter if present
        if (bedroomsFilter !== null) {
          propertyQuery = propertyQuery.eq('bedrooms', bedroomsFilter);
        }
        
        // Add pool filter if mentioned
        if (query.toLowerCase().includes('pool')) {
          propertyQuery = propertyQuery.eq('has_pool', true);
        }
        
        // Add type filter if mentioned
        const typeKeywords = {
          'villa': ['villa'],
          'apartment': ['apartment', 'flat'],
          'house': ['house', 'home'],
          'penthouse': ['penthouse'],
          'condo': ['condo', 'condominium']
        };
        
        for (const [type, keywords] of Object.entries(typeKeywords)) {
          if (keywords.some(keyword => query.toLowerCase().includes(keyword))) {
            console.log(`Filtering by property type: ${type}`);
            propertyQuery = propertyQuery.eq('type', type);
            break;
          }
        }
        
        // Execute query with limit and order by featured properties first
        const { data: propertiesData, error: propertiesError } = await propertyQuery
          .order('featured', { ascending: false })
          .order('price', { ascending: false })
          .limit(maxResults);
        
        if (propertiesError) {
          console.error('Error fetching properties:', propertiesError);
        } else if (propertiesData && propertiesData.length > 0) {
          // Format the property data to ensure consistent structure
          propertyListings = propertiesData.map(property => ({
            id: property.id,
            title: property.title || `${property.type || 'Property'} in ${property.city || 'Exclusive Location'}`,
            description: property.description,
            price: property.price,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            city: property.city,
            state: property.state,
            status: property.status,
            url: property.url || `https://youragency.com/listing/${property.id.substring(0, 6)}`,
            has_pool: property.has_pool,
            type: property.type,
            // Create location field for easier formatting
            location: property.city ? (property.state ? `${property.city}, ${property.state}` : property.city) : 'Exclusive Location'
          }));
          console.log(`Found ${propertyListings.length} property listings matching query terms`);
        } else {
          console.log("No properties found with specific filters, returning general listings");
          // If no specific filters matched, just return some properties
          const { data: fallbackProperties, error: fallbackError } = await supabaseClient
            .from('properties')
            .select('id, title, description, price, bedrooms, bathrooms, city, state, status, url, has_pool, type')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('featured', { ascending: false })
            .limit(maxResults);
          
          if (!fallbackError && fallbackProperties && fallbackProperties.length > 0) {
            propertyListings = fallbackProperties.map(property => ({
              id: property.id,
              title: property.title || `${property.type || 'Property'} in ${property.city || 'Exclusive Location'}`,
              description: property.description,
              price: property.price,
              bedrooms: property.bedrooms,
              bathrooms: property.bathrooms,
              city: property.city,
              state: property.state,
              status: property.status,
              url: property.url || `https://youragency.com/listing/${property.id.substring(0, 6)}`,
              has_pool: property.has_pool,
              type: property.type,
              location: property.city ? (property.state ? `${property.city}, ${property.state}` : property.city) : 'Exclusive Location'
            }));
            console.log(`Found ${propertyListings.length} fallback property listings`);
          } else if (fallbackError) {
            console.error('Error fetching fallback properties:', fallbackError);
          } else {
            console.log("No properties found in the database");
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        qa_matches: qaMatches,
        file_content: fileContent,
        property_listings: propertyListings
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-training-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
