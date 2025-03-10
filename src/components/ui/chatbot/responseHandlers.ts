
import { supabase } from '@/lib/supabase';
import { Message, VisitorInfo } from './types';
import { v4 as uuidv4 } from 'uuid';

// Function to find relevant training data for the user's query
export const findRelevantTrainingData = async (userId: string, message: string) => {
  console.log("Searching for training data matches for:", message);
  
  try {
    // For demo mode or landing page (non-UUID userId), return empty training data
    if (userId === 'demo-user' || !isValidUUID(userId)) {
      console.log("Using demo mode, skipping training data lookup");
      return { 
        qaMatches: [],
        fileContent: [],
        propertyListings: [] 
      };
    }

    // Check if the message is about property listings
    const isPropertyQuery = checkIfPropertyQuery(message);
    
    // Find Q&A matches with improved property and lead-capture focused matching
    const { data: qaMatches, error: qaError } = await supabase
      .rpc('search_training_data', {
        user_id_param: userId,
        query_text: message
      });
      
    if (qaError) {
      console.error("Error searching training data:", qaError);
      throw qaError;
    }
    
    // Find relevant file content with improved filtering for properties
    const { data: fileContent, error: fileError } = await supabase
      .from('chatbot_training_files')
      .select('extracted_text, source_file, priority, category')
      .eq('user_id', userId)
      .order('priority', { ascending: false })
      .limit(5);
      
    if (fileError) {
      console.error("Error searching file content:", fileError);
      throw fileError;
    }

    // If this is a property query, let's also fetch clean property data
    let propertyListings = [];
    if (isPropertyQuery) {
      const locationTerms = extractLocationTerms(message);
      const priceRange = extractPriceRange(message);
      const bedrooms = extractBedroomCount(message);
      const propertyType = extractPropertyType(message);
      
      console.log("Property query detected with filters:", { locationTerms, priceRange, bedrooms, propertyType });
      
      // Fetch clean property data
      const { data: properties, error: propError } = await fetchCleanPropertyListings(
        userId, 
        locationTerms,
        priceRange,
        bedrooms,
        propertyType
      );
      
      if (propError) {
        console.error("Error fetching property listings:", propError);
      } else if (properties && properties.length > 0) {
        propertyListings = formatPropertyListings(properties);
        console.log(`Found ${properties.length} matching properties, formatted for display`);
      }
    }
    
    return {
      qaMatches: qaMatches || [],
      fileContent: fileContent || [],
      propertyListings
    };
  } catch (error) {
    console.error("Error searching training data:", error);
    return { 
      qaMatches: [],
      fileContent: [],
      propertyListings: []
    };
  }
};

// Helper function to determine if a message is a property query
const checkIfPropertyQuery = (message: string): boolean => {
  const propertyTerms = [
    'property', 'properties', 'house', 'home', 'apartment', 'villa', 'condo',
    'flat', 'listing', 'listings', 'real estate', 'buy', 'purchase', 'rent'
  ];
  
  const messageLower = message.toLowerCase();
  return propertyTerms.some(term => messageLower.includes(term));
};

// Helper function to extract location terms from a message
const extractLocationTerms = (message: string): string[] => {
  // Simple extraction of potential location terms
  // In a real implementation, this could use NLP or a location database
  const locationPatterns = [
    /in\s+([A-Za-z\s]+)/, 
    /near\s+([A-Za-z\s]+)/, 
    /around\s+([A-Za-z\s]+)/,
    /at\s+([A-Za-z\s]+)/
  ];
  
  const locations = [];
  for (const pattern of locationPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      locations.push(match[1].trim());
    }
  }
  
  // If no location found in patterns, check if any location is mentioned directly
  if (locations.length === 0) {
    const messageLower = message.toLowerCase();
    const directLocationCheck = messageLower.match(/\b(hacienda las chapas|puerto banus|nueva andalucia|golden mile|marbella)\b/gi);
    if (directLocationCheck) {
      locations.push(...directLocationCheck);
    }
  }
  
  return locations;
};

// Helper function to extract price range from a message
const extractPriceRange = (message: string): {min?: number, max?: number} => {
  const priceRange = {};
  
  // Extract maximum price
  const maxPriceMatch = message.match(/under\s+(\$?[\d,.]+k?)|less\s+than\s+(\$?[\d,.]+k?)|up\s+to\s+(\$?[\d,.]+k?)|maximum\s+(\$?[\d,.]+k?)/i);
  if (maxPriceMatch) {
    const maxPrice = maxPriceMatch[1] || maxPriceMatch[2] || maxPriceMatch[3] || maxPriceMatch[4];
    priceRange['max'] = parseCurrencyValue(maxPrice);
  }
  
  // Extract minimum price
  const minPriceMatch = message.match(/over\s+(\$?[\d,.]+k?)|more\s+than\s+(\$?[\d,.]+k?)|at\s+least\s+(\$?[\d,.]+k?)|minimum\s+(\$?[\d,.]+k?)/i);
  if (minPriceMatch) {
    const minPrice = minPriceMatch[1] || minPriceMatch[2] || minPriceMatch[3] || minPriceMatch[4];
    priceRange['min'] = parseCurrencyValue(minPrice);
  }
  
  // Extract price range in format "between X and Y"
  const rangePriceMatch = message.match(/between\s+(\$?[\d,.]+k?)\s+and\s+(\$?[\d,.]+k?)/i);
  if (rangePriceMatch) {
    priceRange['min'] = parseCurrencyValue(rangePriceMatch[1]);
    priceRange['max'] = parseCurrencyValue(rangePriceMatch[2]);
  }
  
  return priceRange;
};

// Helper to parse currency values including shorthand like "1.5M" or "500k"
const parseCurrencyValue = (value: string): number => {
  if (!value) return 0;
  
  // Remove currency symbols and commas
  let cleanValue = value.replace(/[$,]/g, '');
  
  // Handle shorthand notations
  if (cleanValue.toLowerCase().endsWith('k')) {
    cleanValue = cleanValue.slice(0, -1);
    return parseFloat(cleanValue) * 1000;
  } else if (cleanValue.toLowerCase().endsWith('m')) {
    cleanValue = cleanValue.slice(0, -1);
    return parseFloat(cleanValue) * 1000000;
  }
  
  return parseFloat(cleanValue);
};

// Helper function to extract bedroom count from a message
const extractBedroomCount = (message: string): number | null => {
  const bedroomMatch = message.match(/(\d+)\s+bed(room)?s?/i);
  if (bedroomMatch && bedroomMatch[1]) {
    return parseInt(bedroomMatch[1], 10);
  }
  return null;
};

// Helper function to extract property type from a message
const extractPropertyType = (message: string): string | null => {
  const propertyTypes = ['house', 'apartment', 'villa', 'condo', 'townhouse', 'flat', 'studio', 'luxury'];
  const messageLower = message.toLowerCase();
  
  for (const type of propertyTypes) {
    if (messageLower.includes(type)) {
      return type;
    }
  }
  
  return null;
};

// Function to fetch clean property listings from Supabase
const fetchCleanPropertyListings = async (
  userId: string, 
  locations: string[] = [], 
  priceRange: {min?: number, max?: number} = {}, 
  bedrooms: number | null = null,
  propertyType: string | null = null
) => {
  // Start building the query
  let query = supabase
    .from('properties')
    .select(`
      id,
      title,
      price,
      city,
      state,
      address,
      bedrooms,
      bathrooms,
      type,
      size,
      description,
      status,
      images
    `)
    .eq('user_id', userId)
    .eq('status', 'active');
  
  // Apply location filters
  if (locations.length > 0) {
    // Try to match any of the provided locations
    const locationFilters = locations.map(location => {
      return `city.ilike.%${location}% or state.ilike.%${location}% or address.ilike.%${location}%`;
    });
    query = query.or(locationFilters.join(','));
  }
  
  // Apply price range filters
  if (priceRange.min !== undefined) {
    query = query.gte('price', priceRange.min);
  }
  if (priceRange.max !== undefined) {
    query = query.lte('price', priceRange.max);
  }
  
  // Apply bedroom filter
  if (bedrooms !== null) {
    query = query.eq('bedrooms', bedrooms);
  }
  
  // Apply property type filter
  if (propertyType !== null) {
    query = query.ilike('type', `%${propertyType}%`);
  }
  
  // Limit and sort results - only show top 5 properties
  query = query.order('price', { ascending: false }).limit(5);
  
  // Execute the query
  return await query;
};

// Function to format property listings for clean display
const formatPropertyListings = (properties: any[]): string => {
  if (!properties || properties.length === 0) {
    return '';
  }
  
  let formattedListings = `I found ${properties.length > 1 ? `${properties.length} properties` : 'a property'} that might interest you:\n\n`;
  
  properties.forEach((property, index) => {
    // Format price with currency symbol
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(property.price);
    
    // Create a property "listing card" in text form
    formattedListings += `🏡 **${property.title || `${property.bedrooms}-Bedroom ${property.type || 'Property'}`}** – ${formattedPrice}\n`;
    
    // Add location info
    const location = [property.address, property.city, property.state].filter(Boolean).join(', ');
    formattedListings += `📍 Location: ${location || 'Contact for details'}\n`;
    
    // Add key features
    const features = [];
    if (property.bedrooms) features.push(`${property.bedrooms} Bedrooms`);
    if (property.bathrooms) features.push(`${property.bathrooms} Bathrooms`);
    if (property.size) features.push(`${property.size} m²`);
    
    // Extract key highlights from description (if available)
    if (property.description) {
      const highlights = extractHighlights(property.description);
      if (highlights.length > 0) {
        features.push(...highlights.slice(0, 2));
      }
    }
    
    formattedListings += `✅ ${features.join(', ')}\n`;
    
    // Add a placeholder link (in a real implementation, this would be a valid link)
    formattedListings += `🔗 [View Listing](https://youragency.com/listing/${property.id})\n\n`;
  });
  
  // Add a call-to-action
  formattedListings += "Would you like more details about any of these properties or to see more options?";
  
  return formattedListings;
};

// Helper to extract key highlights from a property description
const extractHighlights = (description: string): string[] => {
  // List of feature keywords to look for
  const featureKeywords = [
    'pool', 'garden', 'view', 'sea view', 'mountain view', 'private', 'secure', 
    'gated', 'modern', 'renovated', 'garage', 'parking', 'terrace', 'balcony',
    'air conditioning', 'heating', 'furnished', 'unfurnished', 'new', 'luxury'
  ];
  
  const highlights = [];
  const descLower = description.toLowerCase();
  
  // Find mentioned features
  for (const keyword of featureKeywords) {
    if (descLower.includes(keyword)) {
      // Capitalize first letter of each word in the keyword
      const formattedKeyword = keyword.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      highlights.push(formattedKeyword);
    }
    
    // Limit to 3 highlights
    if (highlights.length >= 3) break;
  }
  
  return highlights;
};

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Enhanced function to extract lead information from user message
export const extractLeadInfo = (message: string): Partial<VisitorInfo> => {
  const leadInfo: Partial<VisitorInfo> = {};
  
  // Extract email - improved regex
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = message.match(emailRegex);
  if (emailMatches && emailMatches.length > 0) {
    leadInfo.email = emailMatches[0];
  }
  
  // Extract phone number - enhanced pattern for multiple formats
  const phoneRegex = /\b(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  const phoneMatches = message.match(phoneRegex);
  if (phoneMatches && phoneMatches.length > 0) {
    leadInfo.phone = phoneMatches[0];
  }
  
  // Extract name patterns - multiple patterns for better detection
  const namePatterns = [
    /(?:my name is|i am|i'm|this is) ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/i,
    /([A-Z][a-z]+(?: [A-Z][a-z]+)?) here/i,
    /^([A-Z][a-z]+(?: [A-Z][a-z]+)?)$/i  // Message is just a name
  ];
  
  for (const pattern of namePatterns) {
    const nameMatch = message.match(pattern);
    if (nameMatch && nameMatch[1]) {
      leadInfo.name = nameMatch[1];
      break;
    }
  }
  
  // Extract budget - enhanced pattern
  const budgetRegex = /(?:budget|afford|looking to spend|price range|under|up to|max|maximum)[^\d]*(\$?[\d,]+(?:[\d,.]+k)?(?:\s*-\s*\$?[\d,]+(?:[\d,.]+k)?)?)/i;
  const budgetMatch = message.match(budgetRegex);
  if (budgetMatch && budgetMatch[1]) {
    leadInfo.budget = budgetMatch[1];
  }
  
  // Extract property interest - enhanced with more patterns
  const propertyTerms = ['house', 'home', 'property', 'condo', 'apartment', 'townhouse'];
  const actionTerms = {
    'buying': 'Buying',
    'looking to buy': 'Buying',
    'purchase': 'Buying',
    'interested in buying': 'Buying',
    'selling': 'Selling',
    'sell': 'Selling',
    'renting': 'Renting',
    'rent': 'Renting',
    'lease': 'Renting'
  };
  
  // Check for property interest
  const messageLower = message.toLowerCase();
  if (propertyTerms.some(term => messageLower.includes(term))) {
    for (const [action, value] of Object.entries(actionTerms)) {
      if (messageLower.includes(action)) {
        leadInfo.propertyInterest = value;
        break;
      }
    }
    
    // Default to "Buying" if property term found but no action specified
    if (!leadInfo.propertyInterest && propertyTerms.some(term => messageLower.includes(term))) {
      leadInfo.propertyInterest = 'Buying';
    }
  }
  
  // Extract location interest
  const locationRegex = /(?:in|near|around|at) ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/i;
  const locationMatch = message.match(locationRegex);
  if (locationMatch && locationMatch[1]) {
    leadInfo.location = locationMatch[1];
  }
  
  return leadInfo;
};

// Function to generate response using AI or demo data
export const testChatbotResponse = async (
  message: string, 
  userId: string, 
  visitorInfo = {}, 
  conversationId?: string,
  previousMessages: Message[] = []
) => {
  console.log(`Processing message: "${message}" for user ${userId}`);

  try {
    // Enhance the query to include the formatted property listings
    const trainingData = await findRelevantTrainingData(userId, message);
    
    // Call our Edge Function
    const response = await supabase.functions.invoke('chatbot-response', {
      body: {
        message,
        userId,
        visitorInfo,
        conversationId,
        previousMessages,
        trainingData, // Pass the enhanced training data including formatted property listings
      }
    });
    
    if (response.error) {
      console.error("Error calling AI Chatbot Edge Function:", response.error);
      throw new Error(response.error.message || "AI response generation failed");
    }
    
    console.log("AI Chatbot response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error in testChatbotResponse:", error);
    const errorLeadInfo = {}; // Initialize empty object for leadInfo in error case
    return {
      response: "I'm sorry, I encountered an error processing your request.",
      source: 'error',
      leadInfo: errorLeadInfo,
      conversationId,
    };
  }
};
