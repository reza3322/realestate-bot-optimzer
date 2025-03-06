
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
    const { message, userId, visitorInfo, conversationId, previousMessages } = await req.json()

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`Processing message for user ${userId}: "${message}"`)
    
    // Get user's properties if userId is provided
    let properties = []
    if (userId) {
      const { data: userProperties, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')

      if (!propertiesError && userProperties) {
        properties = userProperties
        console.log(`Found ${userProperties.length} properties for user ${userId}`)
      }
    }

    // Get user's training data if userId is provided
    let trainingData = []
    if (userId) {
      const { data: userTraining, error: trainingError } = await supabase
        .from('chatbot_training_data')
        .select('*')
        .eq('user_id', userId)
        .order('priority', { ascending: false })

      if (!trainingError && userTraining) {
        trainingData = userTraining
        console.log(`Found ${userTraining.length} training items for user ${userId}`)
      }
    }

    // Extract potential lead information from visitor info and message
    const extractedLeadInfo = extractLeadInfo(message, visitorInfo || {}, previousMessages || [])
    
    // Generate response based on the message, properties, and training data
    let response = generateResponse(message, properties, trainingData, previousMessages || [])
    
    // Generate conversation ID if not provided
    const chatConversationId = conversationId || crypto.randomUUID()
    
    // Store the conversation in the database
    if (userId) {
      await supabase
        .from('chatbot_conversations')
        .insert({
          user_id: userId,
          conversation_id: chatConversationId,
          message: message,
          response: response,
          visitor_id: extractedLeadInfo.visitorId || null
        })
        
      console.log(`Stored conversation with ID ${chatConversationId}`)
    }
    
    // Create or update lead if we have enough information
    let leadInfo = null
    if (userId && extractedLeadInfo && (extractedLeadInfo.email || extractedLeadInfo.name || extractedLeadInfo.phone)) {
      leadInfo = await processLeadInfo(supabase, userId, extractedLeadInfo)
      
      // If we detected property interest, create an activity
      if (leadInfo && extractedLeadInfo.propertyInterest) {
        await supabase
          .from('activities')
          .insert({
            user_id: userId,
            type: 'lead',
            description: `New lead interested in "${extractedLeadInfo.propertyInterest}"`,
            target_id: leadInfo.id,
            target_type: 'lead'
          })
          
        console.log(`Created lead activity for user ${userId}`)
      }
    }
    
    return new Response(
      JSON.stringify({
        response,
        conversationId: chatConversationId,
        leadInfo: leadInfo,
        suggestedFollowUp: generateFollowUpQuestion(message, extractedLeadInfo, properties)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing chatbot response:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Function to extract lead information from the conversation
function extractLeadInfo(message, visitorInfo, previousMessages) {
  // Start with any visitor info already provided
  const leadInfo = { ...visitorInfo }
  
  // Generate a visitor ID if not present
  if (!leadInfo.visitorId) {
    leadInfo.visitorId = crypto.randomUUID()
  }
  
  // Simple email regex pattern
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
  const emailMatch = message.match(emailPattern)
  if (emailMatch && !leadInfo.email) {
    leadInfo.email = emailMatch[0]
  }
  
  // Phone pattern (basic)
  const phonePattern = /\b(\+\d{1,3})?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/
  const phoneMatch = message.match(phonePattern)
  if (phoneMatch && !leadInfo.phone) {
    leadInfo.phone = phoneMatch[0]
  }
  
  // Look for name patterns
  if (!leadInfo.name) {
    // Look for phrases like "my name is John" or "I'm John"
    const namePatterns = [
      /my name is (\w+)/i,
      /I am (\w+)/i,
      /I'm (\w+)/i,
      /call me (\w+)/i
    ]
    
    for (const pattern of namePatterns) {
      const match = message.match(pattern)
      if (match && match[1]) {
        leadInfo.name = match[1]
        break
      }
    }
  }
  
  // Look for budget information
  if (!leadInfo.budget) {
    const budgetPatterns = [
      /budget of (\d[,\d]*)/i,
      /looking (?:to spend|for).{1,20}(\d[,\d]*)/i,
      /around (\d[,\d]*)/i,
      /(\d[,\d]*) budget/i,
      /up to (\d[,\d]*)/i,
      /maximum (?:of )?(\d[,\d]*)/i,
      /(\d[,\d]*) (?:dollars|€|euro|pound|£|\$)/i
    ]
    
    for (const pattern of budgetPatterns) {
      const match = message.match(pattern)
      if (match && match[1]) {
        // Remove commas and convert to number
        leadInfo.budget = parseInt(match[1].replace(/,/g, ''))
        break
      }
    }
  }
  
  // Check for property interest
  if (!leadInfo.propertyInterest) {
    // Property type matches
    const propertyTypes = [
      'house', 'apartment', 'condo', 'villa', 'property', 'home', 'flat',
      'studio', 'penthouse', 'duplex', 'townhouse', 'bungalow'
    ]
    
    // Bedroom patterns
    const bedroomPatterns = [
      /(\d+)(?:\s+|-)?bed(?:room)?s?/i,
      /(\d+) (?:br|bdr)/i
    ]
    
    // Location patterns
    const locationPattern = /(?:in|near|around) ([\w\s]+)(?:,|\.|\s|$)/i
    
    // Combine extracted information
    let propertyInterest = ''
    
    // Check for bedrooms
    for (const pattern of bedroomPatterns) {
      const match = message.match(pattern)
      if (match && match[1]) {
        propertyInterest += `${match[1]}-bedroom `
        break
      }
    }
    
    // Check for property type
    for (const type of propertyTypes) {
      if (message.toLowerCase().includes(type)) {
        propertyInterest += `${type} `
        break
      }
    }
    
    // Check for location
    const locationMatch = message.match(locationPattern)
    if (locationMatch && locationMatch[1]) {
      propertyInterest += `in ${locationMatch[1].trim()}`
    }
    
    if (propertyInterest.trim()) {
      leadInfo.propertyInterest = propertyInterest.trim()
    }
  }
  
  // Combine with information from previous messages
  if (previousMessages && previousMessages.length > 0) {
    for (const prevMsg of previousMessages) {
      if (prevMsg.role === 'user') {
        // Extract info from previous messages if we're missing it
        if (!leadInfo.email) {
          const emailMatch = prevMsg.content.match(emailPattern)
          if (emailMatch) leadInfo.email = emailMatch[0]
        }
        
        if (!leadInfo.phone) {
          const phoneMatch = prevMsg.content.match(phonePattern)
          if (phoneMatch) leadInfo.phone = phoneMatch[0]
        }
      }
    }
  }
  
  return leadInfo
}

// Function to generate a response based on the message and available data
function generateResponse(message, properties, trainingData, previousMessages) {
  const lowerMessage = message.toLowerCase()
  
  // Check if message matches any training data first
  for (const item of trainingData) {
    // Check if question keywords are in the message
    const questionKeywords = item.question.toLowerCase().split(' ')
    const keywordMatches = questionKeywords.filter(keyword => 
      keyword.length > 3 && lowerMessage.includes(keyword.toLowerCase())
    )
    
    // If there's a good match (multiple keywords or exact match), use this response
    if (lowerMessage === item.question.toLowerCase() || keywordMatches.length >= 2) {
      console.log(`Matched training data: "${item.question}" (priority: ${item.priority})`)
      return item.answer
    }
  }
  
  // If asking about properties
  if (containsPropertyQuery(lowerMessage)) {
    // Match properties with specific criteria in the message
    const matchedProperties = findMatchingProperties(message, properties)
    
    if (matchedProperties.length > 0) {
      // Format property information
      let response = ''
      if (matchedProperties.length === 1) {
        const property = matchedProperties[0]
        response = `I found a property that might interest you: ${property.title} in ${property.city || 'a desirable location'}${property.price ? ` priced at ${formatCurrency(property.price)}` : ''}. `
        
        response += `It's a ${property.type || 'property'}`
        if (property.bedrooms) response += ` with ${property.bedrooms} bedroom${property.bedrooms !== 1 ? 's' : ''}`
        if (property.bathrooms) response += ` and ${property.bathrooms} bathroom${property.bathrooms !== 1 ? 's' : ''}`
        if (property.size) response += `, ${property.size} sq ft`
        response += '. '
        
        if (property.description) {
          // Add a short excerpt from the description
          const shortDesc = property.description.split('.')[0] + '.'
          response += shortDesc
        }
        
        response += ' Would you like more details about this property?'
      } else {
        response = `I found ${matchedProperties.length} properties that might interest you. `
        
        // Mention the first few
        const topProperties = matchedProperties.slice(0, 3)
        response += 'Here are some options: '
        
        topProperties.forEach((property, index) => {
          response += `${index > 0 ? (index === topProperties.length - 1 ? ' and ' : ', ') : ''}${property.title} in ${property.city || 'a desirable location'}${property.price ? ` (${formatCurrency(property.price)})` : ''}`
        })
        
        response += '. Would you like more details about any of these properties?'
      }
      
      return response
    }
  }
  
  // Check for greetings
  if (/^(?:hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy)/i.test(lowerMessage)) {
    return "Hello! I'm your real estate assistant. How can I help you today? I can provide information about our properties, answer questions about the area, or help schedule a viewing."
  }
  
  // Check for contact information requests
  if (/\b(?:contact|call|phone|email|reach|text me|get in touch)\b/i.test(lowerMessage)) {
    return "I'd be happy to help connect you with one of our agents. Could you please share your name and the best way to contact you (email or phone)?"
  }
  
  // Check if asking about viewing or touring properties
  if (/\b(?:view|tour|visit|see|look at)\b.+\b(?:property|house|home|apartment)\b/i.test(lowerMessage)) {
    return "I'd be happy to arrange a viewing for you. Could you please tell me which property you're interested in seeing, and when would be a convenient time for you? I'll pass this information to our agents who will confirm the appointment."
  }
  
  // Check if asking about buying process
  if (/\b(?:buy|purchase|buying process|steps to|how to buy)\b/i.test(lowerMessage)) {
    return "The home buying process typically involves getting pre-approved for a mortgage, searching for homes, making an offer, conducting inspections, and closing the deal. Our agents can guide you through each step. Would you like me to connect you with one of our experts to discuss this further?"
  }
  
  // Check if asking about selling process
  if (/\b(?:sell|selling|put on market|list my)\b/i.test(lowerMessage)) {
    return "If you're looking to sell your property, our agents can help you determine the right asking price, prepare your home for viewings, market it effectively, and negotiate offers. Would you like to discuss your specific situation with one of our selling experts?"
  }
  
  // Default response for property inquiries when no matches found
  if (containsPropertyQuery(lowerMessage)) {
    if (properties.length === 0) {
      return "I'd be happy to help you find the perfect property. Could you tell me more about what you're looking for? For example, how many bedrooms do you need, which areas are you interested in, and what's your budget?"
    } else {
      return `We have ${properties.length} properties in our database. Could you provide more details about what you're looking for? For example, location, number of bedrooms, or your budget range?`
    }
  }
  
  // Default response
  return "I'm here to help with your real estate needs. You can ask me about available properties, pricing, neighborhoods, or scheduling a viewing. How can I assist you today?"
}

// Helper function to determine if message is asking about properties
function containsPropertyQuery(message) {
  const propertyTerms = [
    'property', 'properties', 'house', 'home', 'apartment', 'condo', 'flat',
    'villa', 'townhouse', 'penthouse', 'studio', 'duplex', 'bungalow',
    'listing', 'bedroom', 'bathroom', 'sqft', 'square feet', 'sq ft',
    'garden', 'garage', 'parking', 'price', 'cost', 'buy', 'purchase', 'rent',
    'lease', 'affordable', 'expensive', 'cheap', 'luxury', 'premium'
  ]
  
  return propertyTerms.some(term => message.includes(term))
}

// Helper function to find properties matching criteria in message
function findMatchingProperties(message, properties) {
  const lowerMessage = message.toLowerCase()
  
  // Extract potential criteria from message
  
  // Location search
  const locationMatches = lowerMessage.match(/(?:in|near|around|close to) ([\w\s]+?)(?:,|\.|\?|\s|$)/i)
  const location = locationMatches ? locationMatches[1].trim() : null
  
  // Bedrooms search
  const bedroomMatches = lowerMessage.match(/(\d+)(?:\s+|-)?bed(?:room)?s?/i)
  const bedrooms = bedroomMatches ? parseInt(bedroomMatches[1]) : null
  
  // Budget/price search
  const priceMatches = lowerMessage.match(/(?:under|below|less than|up to|maximum) (?:[$€£])?\s?(\d[\d,]*)/i) ||
                       lowerMessage.match(/(\d[\d,]*)(?:\s+)?(?:dollars|euros|pounds|[$€£])/i)
  
  let maxPrice = null
  if (priceMatches) {
    maxPrice = parseInt(priceMatches[1].replace(/,/g, ''))
  }
  
  // Type search
  const propertyTypes = ['house', 'apartment', 'condo', 'villa', 'townhouse', 'penthouse', 'flat', 'studio']
  let propertyType = null
  
  for (const type of propertyTypes) {
    if (lowerMessage.includes(type)) {
      propertyType = type
      break
    }
  }
  
  // Filter properties based on extracted criteria
  return properties.filter(property => {
    // Check location match
    if (location && property.city && !property.city.toLowerCase().includes(location.toLowerCase())) {
      return false
    }
    
    // Check bedroom match
    if (bedrooms !== null && property.bedrooms !== bedrooms) {
      return false
    }
    
    // Check price match
    if (maxPrice !== null && property.price > maxPrice) {
      return false
    }
    
    // Check type match
    if (propertyType !== null && property.type && !property.type.toLowerCase().includes(propertyType)) {
      return false
    }
    
    return true
  })
}

// Process and store lead information
async function processLeadInfo(supabase, userId, extractedInfo) {
  if (!extractedInfo || (!extractedInfo.email && !extractedInfo.name && !extractedInfo.phone)) {
    return null
  }
  
  // Check if lead already exists with this email or phone
  let existingLead = null
  
  if (extractedInfo.email) {
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .eq('email', extractedInfo.email)
      .limit(1)
    
    if (leads && leads.length > 0) {
      existingLead = leads[0]
    }
  } else if (extractedInfo.phone) {
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .eq('phone', extractedInfo.phone)
      .limit(1)
    
    if (leads && leads.length > 0) {
      existingLead = leads[0]
    }
  }
  
  if (existingLead) {
    // Update existing lead with any new information
    const updates = {}
    
    if (extractedInfo.name && !existingLead.first_name) {
      updates.first_name = extractedInfo.name
    }
    
    if (extractedInfo.phone && !existingLead.phone) {
      updates.phone = extractedInfo.phone
    }
    
    if (extractedInfo.budget && !existingLead.budget) {
      updates.budget = extractedInfo.budget
    }
    
    if (extractedInfo.propertyInterest && !existingLead.property_interest) {
      updates.property_interest = extractedInfo.propertyInterest
    }
    
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', existingLead.id)
      
      if (!error) {
        return { ...existingLead, ...updates }
      }
    }
    
    return existingLead
  } else {
    // Create new lead
    const newLead = {
      user_id: userId,
      first_name: extractedInfo.name || '',
      last_name: '',
      email: extractedInfo.email || '',
      phone: extractedInfo.phone || '',
      property_interest: extractedInfo.propertyInterest || '',
      budget: extractedInfo.budget || null,
      source: 'chatbot',
      status: 'new'
    }
    
    const { data, error } = await supabase
      .from('leads')
      .insert(newLead)
      .select()
    
    if (!error && data) {
      return data[0]
    }
  }
  
  return null
}

// Function to generate a follow-up question
function generateFollowUpQuestion(message, leadInfo, properties) {
  // If budget is missing, ask for it
  if (!leadInfo.budget && containsPropertyQuery(message.toLowerCase())) {
    return "What is your budget range for this property?"
  }
  
  // If we have budget but no name, ask for contact info
  if (leadInfo.budget && !leadInfo.name && !leadInfo.email && !leadInfo.phone) {
    return "Would you like to be notified when we have properties matching your criteria? If so, what's the best way to contact you?"
  }
  
  // If we have contact info but no property interest details
  if ((leadInfo.name || leadInfo.email || leadInfo.phone) && !leadInfo.propertyInterest) {
    return "What type of property are you interested in, and in which location?"
  }
  
  // If we have both contact info and property interest, suggest viewing
  if ((leadInfo.name || leadInfo.email || leadInfo.phone) && leadInfo.propertyInterest) {
    return "Would you be interested in scheduling a viewing for properties that match your criteria?"
  }
  
  // Default follow-up based on properties available
  if (properties.length > 0) {
    return "Are there any specific features you're looking for in a property?"
  }
  
  return "Is there anything specific you would like to know about our services?"
}

// Helper function to format currency
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(value)
}
