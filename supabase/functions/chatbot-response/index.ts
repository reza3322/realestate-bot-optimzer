
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.2.1'

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

    console.log(`Processing message: "${message}" for user: ${userId}`)

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

      if (propertiesError) {
        console.error('Error fetching properties:', propertiesError)
      } else if (userProperties) {
        properties = userProperties
        console.log(`Found ${userProperties.length} properties for user`)
      }
    }

    // First, check if there's a matching training data response
    let response = null
    let responseSource = null
    
    if (userId) {
      console.log('Checking for matching training data...')
      const { data: trainingMatches, error: trainingError } = await supabase
        .from('chatbot_training_data')
        .select('*')
        .eq('user_id', userId)
        .order('priority', { ascending: false })

      if (trainingError) {
        console.error('Error fetching training data:', trainingError)
      } else if (trainingMatches && trainingMatches.length > 0) {
        console.log(`Found ${trainingMatches.length} training entries to check`)
        
        // Find the closest match based on the question content
        // This is a simple implementation - could be improved with more sophisticated matching
        const messageWords = message.toLowerCase().split(' ')
        let bestMatch = null
        let highestMatchScore = 0

        for (const training of trainingMatches) {
          const questionWords = training.question.toLowerCase().split(' ')
          let matchScore = 0
          
          // Count how many words from the message appear in the training question
          for (const word of messageWords) {
            if (word.length > 3 && questionWords.includes(word)) { // Only count significant words
              matchScore++
            }
          }
          
          // Also check if the whole message is contained in the question
          if (training.question.toLowerCase().includes(message.toLowerCase())) {
            matchScore += 3 // Give extra weight to full matches
          }
          
          if (matchScore > highestMatchScore) {
            highestMatchScore = matchScore
            bestMatch = training
          }
        }
        
        // If we found a good match, use it
        if (bestMatch && (highestMatchScore > 2 || bestMatch.question.toLowerCase().includes(message.toLowerCase()))) {
          console.log(`Using training data match: "${bestMatch.question}" with score ${highestMatchScore}`)
          response = bestMatch.answer
          responseSource = 'training'
        } else {
          console.log('No good match found in training data')
        }
      } else {
        console.log('No training data found for user')
      }
    }

    // If no match in training data, use OpenAI
    if (!response) {
      console.log('Generating response with OpenAI')
      
      try {
        const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
        
        if (!openAIApiKey) {
          console.error('OpenAI API key is not configured')
          response = "I'm sorry, I'm having trouble generating a response right now."
        } else {
          const configuration = new Configuration({ apiKey: openAIApiKey })
          const openai = new OpenAIApi(configuration)

          // Create a system message based on the user's properties
          let systemPrompt = "You are a helpful AI assistant for a real estate business. "
          
          if (properties.length > 0) {
            systemPrompt += `The user has ${properties.length} properties in their portfolio. `
            systemPrompt += "Here's a brief summary of their properties: "
            
            properties.slice(0, 3).forEach((property, index) => {
              systemPrompt += `Property ${index + 1}: ${property.type || 'Property'} in ${property.city || 'N/A'}, `
              systemPrompt += `${property.bedrooms || 'N/A'} bedrooms, `
              systemPrompt += `price: ${formatCurrency(property.price || 0)}. `
            })
            
            if (properties.length > 3) {
              systemPrompt += `And ${properties.length - 3} more properties.`
            }
          }
          
          // Add guidance for the AI
          systemPrompt += "Provide helpful, concise, and friendly responses. If asked about properties, "
          systemPrompt += "provide specific details when available. If unsure, suggest checking with a real estate agent."
          
          console.log('System prompt:', systemPrompt)

          // Create messages array with system prompt and user message
          const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ]
          
          // Add previous messages for context if available
          if (previousMessages && Array.isArray(previousMessages) && previousMessages.length > 0) {
            for (const prevMsg of previousMessages.slice(-4)) { // Add up to 4 previous messages
              const role = prevMsg.role === 'user' ? 'user' : 'assistant'
              messages.splice(1, 0, { role, content: prevMsg.content })
            }
          }

          // Generate response with OpenAI
          const completion = await openai.createChatCompletion({
            model: "gpt-4o-mini", // Using a more affordable model
            messages: messages,
            max_tokens: 250,
            temperature: 0.7,
          })

          response = completion.data.choices[0]?.message?.content || "I'm not sure how to respond to that."
          responseSource = 'ai'
          
          console.log('OpenAI response generated:', response)
        }
      } catch (openAiError) {
        console.error('OpenAI error:', openAiError)
        response = "I apologize, but I'm having trouble connecting to my knowledge base right now. Please try again later."
      }
    }

    // Extract potential lead information from visitor info and message
    const extractedLeadInfo = extractLeadInfo(message, visitorInfo || {}, previousMessages || [])
    
    // Generate conversation ID if not provided
    const chatConversationId = conversationId || crypto.randomUUID()
    
    // Store the conversation in the database
    if (userId) {
      try {
        await supabase
          .from('chatbot_conversations')
          .insert({
            user_id: userId,
            conversation_id: chatConversationId,
            message: message,
            response: response,
            visitor_id: extractedLeadInfo.visitorId || null
          })
        console.log('Conversation saved to database')
      } catch (dbError) {
        console.error('Error storing chat session:', dbError)
      }
    }
    
    // Create or update lead if we have enough information
    let leadInfo = null
    if (userId && extractedLeadInfo && (extractedLeadInfo.email || extractedLeadInfo.name)) {
      leadInfo = await processLeadInfo(supabase, userId, extractedLeadInfo)
    }

    console.log('Response prepared:', { 
      response: response?.substring(0, 50) + '...',
      source: responseSource,
      conversationId: chatConversationId
    })
    
    return new Response(
      JSON.stringify({
        response,
        source: responseSource,
        conversationId: chatConversationId,
        leadInfo: leadInfo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing chatbot response:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
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
