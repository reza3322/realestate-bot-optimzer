
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { message, userId, leadId, source } = await req.json()

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Processing message from ${source || 'website'}: "${message}"`)
    
    // In a real implementation, this would call a more sophisticated AI service
    // For demo purposes, we'll use a basic response generation
    const response = processAIResponse(message)

    // If there's a userId, store the conversation in the database
    if (userId) {
      const { error: insertError } = await supabase
        .from('chatbot_conversations')
        .insert({
          user_id: userId,
          lead_id: leadId || null,
          message,
          response,
          source: source || 'website'
        })

      if (insertError) {
        console.error('Error storing conversation:', insertError)
      }
    }

    return new Response(
      JSON.stringify({ 
        response,
        isQualifying: message.toLowerCase().includes('buy') || message.toLowerCase().includes('price'),
        suggestedFollowUp: getSuggestedFollowUp(message)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Basic response generation function
function processAIResponse(message: string): string {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! I'm your RealHome.AI assistant. How can I help you with your real estate needs today?"
  }
  
  if (lowerMessage.includes('buy') || lowerMessage.includes('purchase')) {
    return "That's great! I'd be happy to help you find a property to buy. Could you tell me your preferred location and your budget range?"
  }
  
  if (lowerMessage.includes('sell')) {
    return "Looking to sell your property? I can help with that! To provide an estimate, I'll need some details about your property - how many bedrooms and bathrooms does it have, and what's the approximate square footage?"
  }
  
  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('expensive')) {
    return "Property prices vary based on location, size, and features. If you have a specific property in mind or a neighborhood you're interested in, I can provide more detailed pricing information."
  }
  
  if (lowerMessage.includes('location') || lowerMessage.includes('area') || lowerMessage.includes('neighborhood')) {
    return "Location is key in real estate! Could you tell me which areas you're interested in, and what features are important to you (schools, shopping, parks, etc.)?"
  }
  
  if (lowerMessage.includes('agent') || lowerMessage.includes('broker')) {
    return "Our experienced real estate agents are here to help! Would you like me to arrange for an agent to contact you? If so, please provide your preferred contact method."
  }
  
  return "Thank you for your message. I'd like to understand your real estate needs better. Are you looking to buy, sell, or rent a property? Or do you have specific questions I can help with?"
}

// Function to generate follow-up suggestions based on conversation context
function getSuggestedFollowUp(message: string): string {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('buy') || lowerMessage.includes('purchase')) {
    return "What is your budget range for this purchase?"
  }
  
  if (lowerMessage.includes('sell')) {
    return "When are you planning to sell your property?"
  }
  
  if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
    return "Would you like to schedule a viewing of any particular properties?"
  }
  
  if (lowerMessage.includes('location') || lowerMessage.includes('area')) {
    return "Are schools or proximity to public transportation important to you?"
  }
  
  return "Would you prefer to continue this conversation with one of our real estate agents?"
}
