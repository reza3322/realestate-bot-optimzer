
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
      conversationId,
      includeQA = true, 
      includeFiles = true, 
      includeProperties = true,
      maxResults = 5 
    } = await req.json();
    
    console.log(`Searching training data for user ${userId} with query: ${query}`);
    console.log(`Conversation ID: ${conversationId || 'Not provided'}`);

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
    let conversationContext = [];

    // Fetch conversation history if conversationId is provided
    if (conversationId) {
      console.log(`Fetching conversation history for: ${conversationId}`);
      const { data: historyData, error: historyError } = await supabaseClient
        .from('chatbot_conversations')
        .select('message, response, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(10); // Get the last 10 exchanges
      
      if (historyError) {
        console.error('Error fetching conversation history:', historyError);
      } else if (historyData && historyData.length > 0) {
        conversationContext = historyData;
        console.log(`Found ${conversationContext.length} previous conversation exchanges`);
        
        // Extract property mentions from previous responses
        const prevPropertyIds = new Set();
        historyData.forEach(exchange => {
          const urlMatches = exchange.response.match(/\[View Listing\]\(([^)]+)\)/g);
          if (urlMatches) {
            // Track mentioned property URLs to ensure we reference them in future responses
            console.log('Found property mentions in conversation history');
          }
        });
      }
    }

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

    // Fetch file content - IMPROVED RELEVANCE SEARCH
    if (includeFiles) {
      const { data: filesData, error: filesError } = await supabaseClient
        .from('chatbot_training_files')
        .select('id, source_file, category, content_type, extracted_text')
        .eq('user_id', userId)
        .textSearch('extracted_text', query.split(' ').filter(word => word.length > 3).join(' & '), {
          config: 'english'
        })
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
      
      // Check if they're asking about a previously mentioned property
      const askingAboutPrevious = query.toLowerCase().includes('that property') || 
                                 query.toLowerCase().includes('this property') ||
                                 query.toLowerCase().includes('the property') ||
                                 query.toLowerCase().includes('more details') ||
                                 query.toLowerCase().includes('tell me more');
      
      const isPropertyQuery = emptyOrGeneralQuery || 
                              propertyTerms.some(term => query.toLowerCase().includes(term)) ||
                              askingAboutPrevious;
      
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
        
        // If they're asking about previous property, check conversation context
        if (askingAboutPrevious && conversationContext.length > 0) {
          console.log("User appears to be asking about previously mentioned properties");
          
          // Look through previous responses for property IDs
          const mentionedProperties = new Set();
          for (const exchange of conversationContext) {
            // Extract property IDs from previous responses using regex
            const idMatches = exchange.response.match(/property\/([a-f0-9-]+)/g);
            if (idMatches) {
              idMatches.forEach(match => {
                const id = match.replace('property/', '');
                mentionedProperties.add(id);
              });
            }
          }
          
          if (mentionedProperties.size > 0) {
            console.log(`Found ${mentionedProperties.size} previously mentioned properties`);
            propertyQuery = propertyQuery.in('id', Array.from(mentionedProperties));
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
            url: property.url || `https://youragency.com/property/${property.id}`,
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
              url: property.url || `https://youragency.com/property/${property.id}`,
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
        property_listings: propertyListings,
        conversation_context: conversationContext
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
