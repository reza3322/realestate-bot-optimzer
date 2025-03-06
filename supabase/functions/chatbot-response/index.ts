
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

    // Get chat history for context
    const chatSessionId = conversationId || crypto.randomUUID()
    let chatHistory = []
    
    if (conversationId) {
      const { data: sessionHistory, error: historyError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('session_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(5)
      
      if (!historyError && sessionHistory && sessionHistory.length > 0) {
        chatHistory = sessionHistory
        console.log(`Found ${chatHistory.length} previous messages in this session`)
      }
    }

    // Extract potential lead information from visitor info and message
    const extractedLeadInfo = extractLeadInfo(message, visitorInfo || {}, previousMessages || [])
    
    // Generate response based on the message, properties, training data, and chat history
    let response = await generateAIResponse(message, properties, trainingData, chatHistory, extractedLeadInfo)
    
    // Store the conversation in the database
    if (userId) {
      await supabase
        .from('chatbot_conversations')
        .insert({
          user_id: userId,
          conversation_id: chatSessionId,
          message: message,
          response: response,
          visitor_id: extractedLeadInfo.visitorId || null,
          lead_id: extractedLeadInfo.leadId || null
        })
        
      console.log(`Stored conversation with ID ${chatSessionId}`)
      
      // Also store in chat_sessions for memory/context
      await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          session_id: chatSessionId,
          user_message: message,
          ai_response: response,
          created_at: new Date().toISOString()
        })
      
      console.log(`Stored message in chat session for memory/context`)
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
        conversationId: chatSessionId,
        leadInfo: leadInfo,
        suggestedFollowUp: generateFollowUpQuestion(message, extractedLeadInfo, properties, chatHistory)
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

// Improved AI response generation with NLP and memory
async function generateAIResponse(message, properties, trainingData, chatHistory, leadInfo) {
  // OpenAI API key
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
  
  // If we have an OpenAI API key, use it to generate a more natural response
  if (openAIApiKey) {
    try {
      // Format property data for inclusion in the prompt
      let propertyContext = ''
      if (properties && properties.length > 0) {
        propertyContext = 'Available properties:\n' + properties.map(p => 
          `- ${p.title}: ${p.bedrooms || 'N/A'} bed, ${p.bathrooms || 'N/A'} bath, ${p.type || 'property'} in ${p.city || 'N/A'}, priced at $${p.price}`
        ).join('\n')
      }
      
      // Format training data for inclusion in the prompt
      let trainingContext = ''
      if (trainingData && trainingData.length > 0) {
        trainingContext = 'Custom knowledge:\n' + trainingData.map(t => 
          `Q: ${t.question}\nA: ${t.answer}`
        ).join('\n\n')
      }
      
      // Format conversation history
      let conversationHistory = ''
      if (chatHistory && chatHistory.length > 0) {
        conversationHistory = 'Previous conversation:\n' + chatHistory.map(msg => 
          `User: ${msg.user_message}\nAssistant: ${msg.ai_response}`
        ).join('\n\n')
      }
      
      // Prepare the prompt with system instructions, conversation history, and the current message
      const prompt = {
        model: 'gpt-4o-mini', // Using the recommended model
        messages: [
          {
            role: 'system',
            content: `You are an AI real estate assistant for a property website. 
            You help potential buyers find properties that match their needs.
            
            Keep conversations natural and flowing. Ask clarifying questions before recommending properties.
            Always remember what the user said in previous messages and maintain context.
            If you don't know specific property information, ask for clarification or suggest contacting an agent.
            
            If the user seems interested in viewing a property, offer to connect them with an agent.
            If no properties match the user's criteria, ask if they want to be notified when matching properties become available.
            
            ${propertyContext ? propertyContext + '\n\n' : ''}
            ${trainingContext ? trainingContext + '\n\n' : ''}`
          }
        ]
      }
      
      // Add conversation history if available
      if (chatHistory && chatHistory.length > 0) {
        for (const msg of chatHistory) {
          prompt.messages.push({ role: 'user', content: msg.user_message })
          prompt.messages.push({ role: 'assistant', content: msg.ai_response })
        }
      }
      
      // Add the current message
      prompt.messages.push({ role: 'user', content: message })
      
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(prompt)
      })
      
      const data = await response.json()
      
      if (data.error) {
        console.error('OpenAI API error:', data.error)
        // Fall back to rule-based response if API fails
        return generateRuleBasedResponse(message, properties, trainingData, chatHistory)
      }
      
      console.log('Generated AI response with OpenAI')
      return data.choices[0].message.content
    } catch (error) {
      console.error('Error generating AI response:', error)
      // Fall back to rule-based response if API fails
      return generateRuleBasedResponse(message, properties, trainingData, chatHistory)
    }
  } else {
    // Fall back to rule-based response if no API key
    return generateRuleBasedResponse(message, properties, trainingData, chatHistory)
  }
}

// Function to generate a rule-based response as a fallback
function generateRuleBasedResponse(message, properties, trainingData, chatHistory) {
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
  
  // Check the conversation context from history
  let contextTopic = ''
  let recentPropertyInterest = false
  
  if (chatHistory && chatHistory.length > 0) {
    // Check the recent messages for context
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const recentMsg = chatHistory[i].user_message.toLowerCase()
      
      // Check for property-related questions in recent history
      if (containsPropertyQuery(recentMsg)) {
        recentPropertyInterest = true
        
        // Extract potential topics from recent messages
        if (recentMsg.includes('bedroom')) contextTopic = 'bedrooms'
        else if (recentMsg.includes('bath')) contextTopic = 'bathrooms'
        else if (recentMsg.includes('price') || recentMsg.includes('cost') || recentMsg.includes('budget')) 
          contextTopic = 'price'
        else if (recentMsg.includes('location') || recentMsg.includes('area') || recentMsg.includes('neighborhood')) 
          contextTopic = 'location'
        
        break
      }
    }
  }
  
  // Current message indicates follow-up about price/cost
  const isPriceFollowUp = (lowerMessage.includes('cheaper') || lowerMessage.includes('expensive') || 
    lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('budget')) 
    && lowerMessage.length < 30 && recentPropertyInterest
  
  // Current message indicates follow-up about location
  const isLocationFollowUp = (lowerMessage.includes('area') || lowerMessage.includes('where') || 
    lowerMessage.includes('location') || lowerMessage.includes('neighborhood')) 
    && lowerMessage.length < 30 && recentPropertyInterest
  
  // If asking about properties or it's a follow-up question
  if (containsPropertyQuery(lowerMessage) || isPriceFollowUp || isLocationFollowUp) {
    // Match properties with specific criteria in the message
    const matchedProperties = findMatchingProperties(message, properties, contextTopic)
    
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
        
        response += ' Would you like more details about this property? Or would you prefer to schedule a viewing?'
      } else {
        response = `I found ${matchedProperties.length} properties that might interest you. `
        
        // Mention the first few
        const topProperties = matchedProperties.slice(0, 3)
        response += 'Here are some options: '
        
        topProperties.forEach((property, index) => {
          response += `${index > 0 ? (index === topProperties.length - 1 ? ' and ' : ', ') : ''}${property.title} in ${property.city || 'a desirable location'}${property.price ? ` (${formatCurrency(property.price)})` : ''}`
        })
        
        response += '. Would you like more details about any of these properties? Or would you prefer to filter by price or location?'
      }
      
      return response
    } else if (isPriceFollowUp && contextTopic === 'price') {
      // Handle price follow-up when no matches found
      return "I don't have any properties at that price point right now. What price range are you comfortable with? I can notify you when properties in your budget become available."
    } else if (isLocationFollowUp && contextTopic === 'location') {
      // Handle location follow-up when no matches found
      return "I don't have properties in that specific area at the moment. Are you open to other neighborhoods? Or would you like me to alert you when properties in that area become available?"
    }
  }
  
  // Check for greetings
  if (/^(?:hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy)/i.test(lowerMessage)) {
    return "Hello! I'm your real estate assistant. How can I help you today? I can provide information about our properties, answer questions about the area, or help schedule a viewing. What type of property are you looking for?"
  }
  
  // Check for contact information requests
  if (/\b(?:contact|call|phone|email|reach|text me|get in touch)\b/i.test(lowerMessage)) {
    return "I'd be happy to help connect you with one of our agents. Could you please share your name and the best way to contact you (email or phone)? They'll be able to provide personalized assistance for your property search."
  }
  
  // Check if asking about viewing or touring properties
  if (/\b(?:view|tour|visit|see|look at)\b.+\b(?:property|house|home|apartment)\b/i.test(lowerMessage)) {
    return "I'd be happy to arrange a viewing for you. Could you please tell me which property you're interested in seeing, and when would be a convenient time for you? I'll pass this information to our agents who will confirm the appointment."
  }
  
  // Default response for property inquiries when no matches found
  if (containsPropertyQuery(lowerMessage)) {
    if (properties.length === 0) {
      return "I'd be happy to help you find the perfect property. Could you tell me more about what you're looking for? For example, how many bedrooms do you need, which areas are you interested in, and what's your budget? This will help me find options that match your preferences."
    } else {
      return `We have ${properties.length} properties in our database. Could you provide more details about what you're looking for? For example, location, number of bedrooms, or your budget range? This will help me recommend the best matches for you.`
    }
  }
  
  // Default response
  return "I'm here to help with your real estate needs. You can ask me about available properties, pricing, neighborhoods, or scheduling a viewing. How can I assist you today? If you're looking for a specific type of property, just let me know your requirements."
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
function findMatchingProperties(message, properties, contextTopic = '') {
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
  
  // Filter properties based on extracted criteria and context topic
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
    
    // Apply context topic filter if present and the current message doesn't specify criteria
    if (contextTopic === 'price' && !maxPrice && lowerMessage.includes('cheaper')) {
      // Find cheaper properties
      return property.price < calculateAveragePrice(properties)
    }
    
    return true
  })
}

// Helper function to calculate average property price for context
function calculateAveragePrice(properties) {
  if (!properties || properties.length === 0) return 0
  
  const sum = properties.reduce((total, prop) => total + (prop.price || 0), 0)
  return sum / properties.length
}

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

// Function to generate a follow-up question that's context-aware
function generateFollowUpQuestion(message, leadInfo, properties, chatHistory) {
  // Check chat history for context
  let hasAskedAboutBudget = false
  let hasAskedAboutLocation = false
  let hasAskedAboutBedrooms = false
  let hasAskedForContactInfo = false
  
  if (chatHistory && chatHistory.length > 0) {
    for (const msg of chatHistory) {
      const botMsg = msg.ai_response.toLowerCase()
      
      if (botMsg.includes('budget') || botMsg.includes('price') || botMsg.includes('afford')) {
        hasAskedAboutBudget = true
      }
      
      if (botMsg.includes('area') || botMsg.includes('location') || botMsg.includes('neighborhood')) {
        hasAskedAboutLocation = true
      }
      
      if (botMsg.includes('bedroom') || botMsg.includes('how many bed')) {
        hasAskedAboutBedrooms = true
      }
      
      if (botMsg.includes('contact') || botMsg.includes('email') || botMsg.includes('phone')) {
        hasAskedForContactInfo = true
      }
    }
  }
  
  // If they mentioned a property type or showed interest, but no budget
  if (leadInfo.propertyInterest && !leadInfo.budget && !hasAskedAboutBudget) {
    return "What's your budget range for this property?"
  }
  
  // If we have budget but need location refinement
  if (leadInfo.budget && !hasAskedAboutLocation) {
    return "Which areas or neighborhoods are you most interested in?"
  }
  
  // If we have budget and location but no bedroom preference
  if (leadInfo.budget && hasAskedAboutLocation && !hasAskedAboutBedrooms) {
    return "How many bedrooms are you looking for in your ideal property?"
  }
  
  // If we have property details but no contact info
  if ((leadInfo.name || leadInfo.email || leadInfo.phone) && leadInfo.propertyInterest) {
    if (properties.length > 0) {
      return "Would you be interested in scheduling a viewing for properties that match your criteria?"
    } else {
      return "Would you like to be notified when we have new listings that match your requirements?"
    }
  }
  
  // If we have shown properties but no contact info and haven't asked yet
  if (properties.length > 0 && !(leadInfo.email || leadInfo.phone) && !hasAskedForContactInfo) {
    return "Could you share your contact information so an agent can reach out with more details about these properties?"
  }
  
  // Default follow-up based on properties available
  if (properties.length > 0) {
    return "Are there any specific features you're looking for in a property that we haven't discussed yet?"
  }
  
  return "Is there anything specific you would like to know about our services or local real estate market?"
}

// Helper function to format currency
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(value)
}
