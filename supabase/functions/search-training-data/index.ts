
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
      maxResults = 5,
      previousMessages = [] 
    } = await req.json();
    
    console.log(`Searching training data for user ${userId} with query: ${query}`);
    console.log(`Conversation ID: ${conversationId || 'Not provided'}`);
    console.log(`Previous messages count: ${previousMessages.length}`);

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
          const urlMatches = exchange.response.match(/property\/([a-f0-9-]+)/g);
          if (urlMatches) {
            // Track mentioned property URLs to ensure we reference them in future responses
            console.log('Found property mentions in conversation history');
            urlMatches.forEach(match => {
              const id = match.replace('property/', '');
              prevPropertyIds.add(id);
            });
          }
        });

        // If properties were mentioned previously, prioritize fetching them
        if (prevPropertyIds.size > 0) {
          console.log(`Found ${prevPropertyIds.size} previously mentioned property IDs`);
          const propertyIds = Array.from(prevPropertyIds);
          
          // Get the full details of previously mentioned properties
          const { data: prevProperties, error: prevPropertiesError } = await supabaseClient
            .from('properties')
            .select('*')
            .in('id', propertyIds)
            .eq('user_id', userId)
            .eq('status', 'active');
            
          if (!prevPropertiesError && prevProperties && prevProperties.length > 0) {
            console.log(`Retrieved ${prevProperties.length} previously mentioned properties`);
            propertyListings = prevProperties.map(formatPropertyData);
          }
        }
      }
    }

    // Analyze the query for context using previous messages
    const queryContext = analyzeQueryContext(query, previousMessages);
    console.log('Query context analysis:', queryContext);

    // Fetch Q&A matches - USING SEMANTIC SEARCH
    if (includeQA) {
      // Enhanced semantic search using the query context
      const enhancedQuery = queryContext.enhancedQuery || query;
      
      const { data: qaData, error: qaError } = await supabaseClient
        .rpc('search_training_data', {
          user_id_param: userId,
          query_text: enhancedQuery
        });
      
      if (qaError) {
        console.error('Error searching QA data:', qaError);
      } else if (qaData && qaData.length > 0) {
        qaMatches = qaData.slice(0, maxResults);
        console.log(`Found ${qaMatches.length} QA matches`);
        
        // Enhance results with context from previous conversations
        if (queryContext.isFollowUp && qaMatches.length === 0) {
          console.log('This appears to be a follow-up question, trying broader search...');
          // Try a broader search for follow-up questions
          const { data: broadQAData } = await supabaseClient
            .from('chatbot_training_data')
            .select('*')
            .eq('user_id', userId)
            .limit(maxResults);
            
          if (broadQAData && broadQAData.length > 0) {
            console.log(`Found ${broadQAData.length} QA matches with broader search`);
            qaMatches = broadQAData;
          }
        }
      }
    }

    // ENHANCED TRAINING FILE SEARCH - MORE AGGRESSIVE WITH SEMANTIC MATCHING
    if (includeFiles) {
      // Check if query seems to be about company info, policies, etc.
      const isGeneralQuery = query.toLowerCase().match(/about|company|agency|policy|contact|service|help|support/);
      
      let fileQuery = supabaseClient
        .from('chatbot_training_files')
        .select('id, source_file, category, content_type, extracted_text')
        .eq('user_id', userId);
        
      if (isGeneralQuery) {
        // For general queries, just get the most relevant files
        console.log('Query appears to be about general information, using broader search');
        
        // Extract key terms for the search
        const keyTerms = query.split(' ')
          .filter(word => word.length > 3)
          .join(' & ');
          
        fileQuery = fileQuery.textSearch('extracted_text', keyTerms, {
          config: 'english'
        });
      } else {
        // For specific queries, do a more targeted search
        console.log('Using more targeted search for specific file content');
        
        // Create a more targeted search pattern
        const searchPattern = query.split(' ')
          .filter(word => word.length > 3)
          .join(' <-> ');
          
        fileQuery = fileQuery.textSearch('extracted_text', searchPattern, {
          config: 'english'
        });
      }
      
      const { data: filesData, error: filesError } = await fileQuery.limit(maxResults);
      
      if (filesError) {
        console.error('Error fetching training files:', filesError);
      } else if (filesData && filesData.length > 0) {
        // Filter and transform file data
        fileContent = filesData.map(file => ({
          id: file.id,
          source: file.source_file,
          category: file.category,
          content_type: file.content_type,
          text: file.extracted_text.substring(0, 800) // Provide more context
        }));
        console.log(`Found ${fileContent.length} file content matches`);
      } else {
        // If no exact matches, try a broader search
        console.log('No exact file matches, trying broader search...');
        
        const { data: broadFiles } = await supabaseClient
          .from('chatbot_training_files')
          .select('id, source_file, category, content_type, extracted_text')
          .eq('user_id', userId)
          .limit(maxResults);
          
        if (broadFiles && broadFiles.length > 0) {
          fileContent = broadFiles.map(file => ({
            id: file.id,
            source: file.source_file,
            category: file.category,
            content_type: file.content_type,
            text: file.extracted_text.substring(0, 800)
          }));
          console.log(`Found ${fileContent.length} file content matches with broader search`);
        }
      }
    }

    // GREATLY IMPROVED PROPERTY SEARCH - MORE INTELLIGENT AND FLEXIBLE
    if (includeProperties && propertyListings.length === 0) {
      // Enhanced property query detection - detect related terms and synonyms
      const propertyTerms = [
        'property', 'properties', 'house', 'home', 'apartment', 'villa', 'flat', 'condo', 
        'real estate', 'buy', 'rent', 'sale', 'bedroom', 'bathroom', 'pool', 'listing', 'listings',
        'place', 'space', 'residence', 'accommodation', 'building', 'address', 'location'
      ];
      
      // Simple semantic check if query is about properties
      const isPropertyQuery = propertyTerms.some(term => query.toLowerCase().includes(term)) ||
                              queryContext.isAboutProperties ||
                              query.toLowerCase().match(/show|find|looking|search/i);
      
      // Check if they're asking about a previously mentioned property
      const isAboutPreviousProperty = query.toLowerCase().match(/that|this|the property|more details|tell me more|featured/i) ||
                                     queryContext.isFollowUpAboutProperty;
      
      if (isPropertyQuery || isAboutPreviousProperty || queryContext.hasSpatialReference) {
        console.log("Query appears to be about properties, performing intelligent search...");
        
        // Extract information from the query and context
        const extractedInfo = extractPropertyCriteria(query, queryContext);
        console.log("Extracted property search criteria:", extractedInfo);
        
        // Start with a basic query for active properties
        let propertyQuery = supabaseClient
          .from('properties')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active');
        
        // Apply filters based on extracted information
        if (extractedInfo.location) {
          console.log(`Filtering by location: ${extractedInfo.location}`);
          propertyQuery = propertyQuery.or(`city.ilike.%${extractedInfo.location}%,state.ilike.%${extractedInfo.location}%,description.ilike.%${extractedInfo.location}%`);
        }
        
        if (extractedInfo.bedrooms) {
          console.log(`Filtering by bedrooms: ${extractedInfo.bedrooms}`);
          propertyQuery = propertyQuery.gte('bedrooms', extractedInfo.bedrooms);
        }
        
        if (extractedInfo.propertyType) {
          console.log(`Filtering by property type: ${extractedInfo.propertyType}`);
          propertyQuery = propertyQuery.eq('type', extractedInfo.propertyType);
        }
        
        if (extractedInfo.hasPool) {
          console.log('Filtering for properties with pools');
          propertyQuery = propertyQuery.eq('has_pool', true);
        }
        
        // If looking at specific price ranges
        if (extractedInfo.minPrice) {
          console.log(`Filtering with minimum price: ${extractedInfo.minPrice}`);
          propertyQuery = propertyQuery.gte('price', extractedInfo.minPrice);
        }
        
        if (extractedInfo.maxPrice) {
          console.log(`Filtering with maximum price: ${extractedInfo.maxPrice}`);
          propertyQuery = propertyQuery.lte('price', extractedInfo.maxPrice);
        }
        
        // Asking about a specific property ID
        if (extractedInfo.propertyId) {
          console.log(`Looking for specific property ID: ${extractedInfo.propertyId}`);
          propertyQuery = propertyQuery.eq('id', extractedInfo.propertyId);
        }
        
        // Execute the query
        const { data: properties, error: propertiesError } = await propertyQuery
          .order('featured', { ascending: false })
          .limit(maxResults);
        
        if (propertiesError) {
          console.error('Error fetching properties:', propertiesError);
        } else if (properties && properties.length > 0) {
          console.log(`Found ${properties.length} matching properties`);
          propertyListings = properties.map(formatPropertyData);
        } else {
          // If no specific matches, just return some featured properties
          console.log('No specific property matches, returning featured properties');
          
          const { data: featuredProperties } = await supabaseClient
            .from('properties')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .eq('featured', true)
            .limit(maxResults);
            
          if (featuredProperties && featuredProperties.length > 0) {
            console.log(`Found ${featuredProperties.length} featured properties`);
            propertyListings = featuredProperties.map(formatPropertyData);
          } else {
            // Last resort - just get any properties
            const { data: anyProperties } = await supabaseClient
              .from('properties')
              .select('*')
              .eq('user_id', userId)
              .eq('status', 'active')
              .limit(maxResults);
              
            if (anyProperties && anyProperties.length > 0) {
              console.log(`Found ${anyProperties.length} properties (any)}`);
              propertyListings = anyProperties.map(formatPropertyData);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        qa_matches: qaMatches,
        file_content: fileContent,
        property_listings: propertyListings,
        conversation_context: conversationContext,
        query_context: queryContext
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

// Helper functions to make the search more intelligent

// Analyze the query context using previous messages
function analyzeQueryContext(query, previousMessages = []) {
  const lowerQuery = query.toLowerCase();
  const context = {
    isFollowUp: false,
    isFollowUpAboutProperty: false,
    isAboutProperties: false,
    hasSpatialReference: false,
    enhancedQuery: null,
    previousTopics: new Set(),
    mentionedProperties: new Set()
  };
  
  // Check if query contains follow-up indicators
  const followUpIndicators = ['it', 'that', 'this', 'they', 'those', 'the', 'these', 'there', 'then'];
  context.isFollowUp = followUpIndicators.some(term => 
    new RegExp(`\\b${term}\\b`, 'i').test(lowerQuery)
  );
  
  // Check for spatial references
  const spatialReferences = ['near', 'close to', 'around', 'in', 'at', 'by', 'next to'];
  context.hasSpatialReference = spatialReferences.some(ref => lowerQuery.includes(ref));
  
  // Check if it's about properties
  const propertyTerms = ['house', 'property', 'apartment', 'villa', 'real estate', 'home'];
  context.isAboutProperties = propertyTerms.some(term => lowerQuery.includes(term)) ||
                             lowerQuery.includes('bedroom') || 
                             lowerQuery.includes('bathroom') ||
                             lowerQuery.includes('price') ||
                             lowerQuery.includes('location');
  
  // Analyze previous messages for context if available
  if (previousMessages && previousMessages.length > 0) {
    previousMessages.forEach(msg => {
      const content = typeof msg.content === 'string' ? msg.content.toLowerCase() : 
                     (msg.message ? msg.message.toLowerCase() : '');
      
      // Check previous messages for property mentions
      propertyTerms.forEach(term => {
        if (content.includes(term)) {
          context.previousTopics.add('properties');
        }
      });
      
      // Look for specific property IDs or mentions in previous messages
      const propertyIdMatch = content.match(/property\/([a-f0-9-]+)/g);
      if (propertyIdMatch) {
        propertyIdMatch.forEach(match => {
          const id = match.replace('property/', '');
          context.mentionedProperties.add(id);
        });
        context.isFollowUpAboutProperty = true;
      }
      
      // Check if previous message mentioned property listings
      if (content.includes('listing') || content.includes('properties you might like')) {
        context.isFollowUpAboutProperty = true;
      }
    });
    
    // If this is a follow-up, try to enhance the query with context
    if (context.isFollowUp) {
      // Get the most recent message for context
      const lastMessage = previousMessages[previousMessages.length - 1];
      const lastContent = lastMessage.content || lastMessage.message || '';
      
      // Simple approach: combine the last query with the new one for more context
      context.enhancedQuery = `${lastContent} ${query}`;
    }
  }
  
  return context;
}

// Extract property search criteria from a query
function extractPropertyCriteria(query, context) {
  const lowerQuery = query.toLowerCase();
  const criteria = {
    location: null,
    bedrooms: null,
    propertyType: null,
    hasPool: false,
    minPrice: null,
    maxPrice: null,
    propertyId: null
  };
  
  // Extract location using regex
  const locationMatch = lowerQuery.match(/in\s+([a-zA-Z\s]+?)(?:,|\s|$|\?|\.)/i) || 
                        lowerQuery.match(/(?:at|near|around) ([a-zA-Z\s]+)/i);
  if (locationMatch && locationMatch[1]) {
    criteria.location = locationMatch[1].trim();
  }
  
  // Extract bedrooms
  const bedroomMatch = lowerQuery.match(/(\d+)\s*(?:bed|bedroom|br)/i);
  if (bedroomMatch && bedroomMatch[1]) {
    criteria.bedrooms = parseInt(bedroomMatch[1]);
  }
  
  // Extract property type
  const typePatterns = {
    'villa': /villa/i,
    'apartment': /apartment|flat/i,
    'house': /house(?!\s*of)|home/i,
    'penthouse': /penthouse/i,
    'condo': /condo/i
  };
  
  for (const [type, pattern] of Object.entries(typePatterns)) {
    if (pattern.test(lowerQuery)) {
      criteria.propertyType = type;
      break;
    }
  }
  
  // Check for pool
  if (lowerQuery.includes('pool') || lowerQuery.includes('swimming')) {
    criteria.hasPool = true;
  }
  
  // Extract price ranges
  const priceMatch = lowerQuery.match(/(\d+(?:[,.]\d+)?)\s*(?:k|thousand|million|m|€|euro|eur|dollars|usd)/i);
  if (priceMatch) {
    let price = parseFloat(priceMatch[1].replace(',', '.'));
    
    // Convert k/m to actual values
    if (priceMatch[0].includes('k') || priceMatch[0].includes('thousand')) {
      price *= 1000;
    } else if (priceMatch[0].includes('m') || priceMatch[0].includes('million')) {
      price *= 1000000;
    }
    
    // Determine if it's a min or max based on context
    if (lowerQuery.includes('under') || lowerQuery.includes('less than') || lowerQuery.includes('maximum')) {
      criteria.maxPrice = price;
    } else if (lowerQuery.includes('over') || lowerQuery.includes('more than') || lowerQuery.includes('minimum')) {
      criteria.minPrice = price;
    } else {
      // Default to price as an approximation with range
      criteria.minPrice = price * 0.8;
      criteria.maxPrice = price * 1.2;
    }
  }
  
  // Extract property ID if they're asking about a specific one
  const propertyIdMatch = lowerQuery.match(/property\/([a-f0-9-]+)/i);
  if (propertyIdMatch && propertyIdMatch[1]) {
    criteria.propertyId = propertyIdMatch[1];
  } else if (context.mentionedProperties && context.mentionedProperties.size === 1) {
    // If only one property was mentioned in previous context
    criteria.propertyId = Array.from(context.mentionedProperties)[0];
  }
  
  return criteria;
}

// Format property data to a consistent structure
function formatPropertyData(property) {
  // Create URL if not provided
  const url = property.url || `./property/${property.id}`;
  
  // Extract features
  const features = [];
  if (property.bedrooms) features.push(`${property.bedrooms} Bedrooms`);
  if (property.bathrooms) features.push(`${property.bathrooms} Bathrooms`);
  if (property.living_area) features.push(`${property.living_area} m² Living Area`);
  if (property.has_pool) features.push(`Swimming Pool`);
  
  // Format location
  const location = property.city ? 
    (property.state ? `${property.city}, ${property.state}` : property.city) : 
    'Exclusive Location';
  
  // Generate a highlight if not available
  let highlight = null;
  if (property.description) {
    const descLower = property.description.toLowerCase();
    if (descLower.includes('view') || descLower.includes('panoramic')) {
      highlight = 'Breathtaking views from your private terrace!';
    } else if (descLower.includes('modern') || descLower.includes('contemporary')) {
      highlight = 'Stunning modern design with high-end finishes!';
    } else if (property.has_pool) {
      highlight = 'Enjoy your own private swimming pool!';
    } else {
      highlight = 'Perfect home in a prime location!';
    }
  }
  
  return {
    id: property.id,
    title: property.title || `${property.type || 'Property'} in ${property.city || 'Exclusive Location'}`,
    price: property.price,
    location: location,
    bedroomCount: property.bedrooms,
    bathroomCount: property.bathrooms,
    hasPool: property.has_pool,
    propertyType: property.type,
    features: features,
    highlight: highlight,
    url: url
  };
}
