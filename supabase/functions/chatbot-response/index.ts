
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
      }
    }

    // Extract potential lead information from visitor info and message
    const extractedLeadInfo = extractLeadInfo(message, visitorInfo || {}, previousMessages || [])
    
    // Generate a basic response based on the message and available data
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
    }
    
    // Create or update lead if we have enough information
    let leadInfo = null
    if (userId && extractedLeadInfo && (extractedLeadInfo.email || extractedLeadInfo.name)) {
      leadInfo = await processLeadInfo(supabase, userId, extractedLeadInfo)
    }
    
    return new Response(
      JSON.stringify({
        response,
        conversationId: chatConversationId,
        leadInfo: leadInfo
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
      /(\d[,\d]*) budget/i
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
  
  // Check previous messages for property interest
  if (!leadInfo.propertyInterest) {
    const propertyTypes = ['house', 'apartment', 'condo', 'villa', 'property', 'home', 'flat']
    for (const type of propertyTypes) {
      if (message.toLowerCase().includes(type)) {
        leadInfo.propertyInterest = type
        break
      }
    }
  }
  
  return leadInfo
}

// Function to generate a response based on the message and available data
function generateResponse(message, properties, trainingData, previousMessages) {
  // Check if message matches any training data
  for (const item of trainingData) {
    if (message.toLowerCase().includes(item.question.toLowerCase())) {
      return item.answer
    }
  }
  
  // Check if asking about properties
  const propertyKeywords = ['property', 'house', 'home', 'apartment', 'condo', 'villa', 'flat']
  const isAskingAboutProperties = propertyKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  )
  
  if (isAskingAboutProperties && properties.length > 0) {
    // Simple response with property information
    const propertyCount = properties.length
    let response = `I have information about ${propertyCount} properties that might interest you. `
    
    if (propertyCount > 0) {
      const featuredProperty = properties[0]
      response += `For example, we have a ${featuredProperty.type || 'property'} in ${featuredProperty.city || 'a great location'}`
      
      if (featuredProperty.price) {
        response += ` priced at ${formatCurrency(featuredProperty.price)}`
      }
      
      if (featuredProperty.bedrooms) {
        response += ` with ${featuredProperty.bedrooms} bedrooms`
      }
      
      response += `. Would you like more details about this or other properties?`
    }
    
    return response
  }
  
  // Check if asking for contact information
  if (message.toLowerCase().includes('contact') || 
      message.toLowerCase().includes('email') || 
      message.toLowerCase().includes('phone')) {
    return "I'd be happy to have someone contact you. Could you please share your name and email address?"
  }
  
  // Default response
  return "I'm here to help you find the perfect property. Feel free to ask me about available properties, pricing, or any other questions you might have."
}

// Process and store lead information
async function processLeadInfo(supabase, userId, extractedInfo) {
  if (!extractedInfo || (!extractedInfo.email && !extractedInfo.name)) {
    return null
  }
  
  // Check if lead already exists with this email
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
      first_name: extractedInfo.name || 'Website Visitor',
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

// Helper function to format currency
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(value)
}
