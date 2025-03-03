
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
    const { leadId, userId, answers } = await req.json()

    if (!leadId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Lead ID and User ID are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('user_id', userId)
      .single()
    
    if (leadError) {
      console.error('Error fetching lead:', leadError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch lead' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // Calculate qualification score
    const qualificationData = calculateQualificationScore(answers, lead)
    
    // Update the lead with qualification data
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        ...qualificationData.leadUpdates,
        qualification_score: qualificationData.score
      })
      .eq('id', leadId)
    
    if (updateError) {
      console.error('Error updating lead:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update lead qualification data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // Log the qualification activity
    await supabase
      .from('activities')
      .insert({
        user_id: userId,
        type: 'lead_qualification',
        target_id: leadId,
        target_type: 'lead',
        description: `Lead ${lead.first_name} ${lead.last_name} qualified with score: ${qualificationData.score}/100`
      })
    
    // Create a notification if the lead is highly qualified
    if (qualificationData.score >= 80) {
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          lead_id: leadId,
          type: 'high_quality_lead',
          title: 'High-Quality Lead Identified',
          message: `${lead.first_name} ${lead.last_name} is a highly qualified lead (${qualificationData.score}/100). Consider reaching out directly.`,
          read: false
        })
    }
    
    return new Response(
      JSON.stringify({
        lead_id: leadId,
        qualification_score: qualificationData.score,
        qualification_details: qualificationData.details,
        suggested_actions: qualificationData.suggestedActions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in lead-qualification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Function to calculate lead qualification score
function calculateQualificationScore(answers, lead) {
  // Initialize score components
  let budgetScore = 0
  let timelineScore = 0
  let motivationScore = 0
  let preApprovedScore = 0
  let communicationScore = 0
  
  // Initialize lead updates object
  const leadUpdates = {}
  
  // Budget scoring
  if (answers.budget) {
    leadUpdates.budget = parseInt(answers.budget.replace(/[^0-9]/g, ''), 10)
    
    if (leadUpdates.budget > 500000) {
      budgetScore = 25 // High budget is a strong indicator
    } else if (leadUpdates.budget > 250000) {
      budgetScore = 20
    } else if (leadUpdates.budget > 100000) {
      budgetScore = 15
    } else {
      budgetScore = 10
    }
  }
  
  // Timeline scoring
  if (answers.timeline) {
    leadUpdates.timeline = answers.timeline
    
    if (answers.timeline === 'immediately' || answers.timeline === '0-3 months') {
      timelineScore = 25 // Immediate need is a strong indicator
    } else if (answers.timeline === '3-6 months') {
      timelineScore = 20
    } else if (answers.timeline === '6-12 months') {
      timelineScore = 15
    } else {
      timelineScore = 5 // More than a year away
    }
  }
  
  // Motivation scoring
  if (answers.motivation) {
    motivationScore = answers.motivation === 'very_motivated' ? 20 :
                     answers.motivation === 'somewhat_motivated' ? 15 :
                     answers.motivation === 'just_browsing' ? 5 : 0
  }
  
  // Pre-approved for financing
  if (answers.pre_approved !== undefined) {
    leadUpdates.pre_approved = answers.pre_approved
    preApprovedScore = answers.pre_approved ? 20 : 10
  }
  
  // Communication preference scoring
  if (answers.preferred_communication) {
    communicationScore = answers.preferred_communication === 'phone' ? 10 :
                        answers.preferred_communication === 'email' ? 8 :
                        answers.preferred_communication === 'text' ? 6 : 5
  }
  
  // Property preferences
  if (answers.preferred_location) {
    leadUpdates.preferred_location = answers.preferred_location
  }
  
  if (answers.preferred_property_type) {
    leadUpdates.preferred_property_type = answers.preferred_property_type
  }
  
  if (answers.bedrooms_min !== undefined) {
    leadUpdates.bedrooms_min = answers.bedrooms_min
  }
  
  if (answers.bedrooms_max !== undefined) {
    leadUpdates.bedrooms_max = answers.bedrooms_max
  }
  
  if (answers.bathrooms_min !== undefined) {
    leadUpdates.bathrooms_min = answers.bathrooms_min
  }
  
  if (answers.bathrooms_max !== undefined) {
    leadUpdates.bathrooms_max = answers.bathrooms_max
  }
  
  if (answers.square_feet_min !== undefined) {
    leadUpdates.square_feet_min = answers.square_feet_min
  }
  
  if (answers.square_feet_max !== undefined) {
    leadUpdates.square_feet_max = answers.square_feet_max
  }
  
  // Calculate total score
  const totalScore = budgetScore + timelineScore + motivationScore + preApprovedScore + communicationScore
  
  // Generate detailed feedback
  const details = {
    budget: {
      score: budgetScore,
      max: 25,
      feedback: getBudgetFeedback(budgetScore)
    },
    timeline: {
      score: timelineScore,
      max: 25,
      feedback: getTimelineFeedback(timelineScore)
    },
    motivation: {
      score: motivationScore,
      max: 20,
      feedback: getMotivationFeedback(motivationScore)
    },
    financing: {
      score: preApprovedScore,
      max: 20,
      feedback: getFinancingFeedback(preApprovedScore)
    },
    communication: {
      score: communicationScore,
      max: 10,
      feedback: 'Based on their preferred communication method.'
    }
  }
  
  // Generate suggested actions based on score
  const suggestedActions = getSuggestedActions(totalScore, leadUpdates.pre_approved, leadUpdates.timeline)
  
  return {
    score: totalScore,
    leadUpdates,
    details,
    suggestedActions
  }
}

// Feedback helper functions
function getBudgetFeedback(score) {
  if (score >= 20) return 'High budget indicates serious buying potential.'
  if (score >= 15) return 'Mid-range budget shows good potential.'
  return 'Budget is on the lower end for the market.'
}

function getTimelineFeedback(score) {
  if (score >= 20) return 'Looking to buy very soon - high priority lead.'
  if (score >= 15) return 'Planning to buy within a reasonable timeframe.'
  return 'Not in a hurry to purchase.'
}

function getMotivationFeedback(score) {
  if (score >= 15) return 'Highly motivated to find a property.'
  if (score >= 10) return 'Shows interest but not in a rush.'
  return 'Currently just exploring options.'
}

function getFinancingFeedback(score) {
  if (score >= 15) return 'Pre-approved for financing - ready to make offers.'
  return 'Not yet pre-approved - may need assistance with financing options.'
}

// Function to suggest next actions
function getSuggestedActions(score, preApproved, timeline) {
  const actions = []
  
  if (score >= 80) {
    actions.push('Immediate personal follow-up call')
    actions.push('Schedule in-person meeting')
    actions.push('Prepare customized property recommendations')
  } else if (score >= 60) {
    actions.push('Follow up within 24-48 hours')
    actions.push('Send curated property listings')
    
    if (!preApproved) {
      actions.push('Provide mortgage pre-approval resources')
    }
  } else if (score >= 40) {
    actions.push('Follow up within one week')
    actions.push('Add to regular newsletter')
    actions.push('Schedule check-in call in 2-3 weeks')
  } else {
    actions.push('Add to long-term nurture campaign')
    actions.push('Schedule follow-up in 1-2 months')
    actions.push('Send educational resources about the buying process')
  }
  
  return actions
}
