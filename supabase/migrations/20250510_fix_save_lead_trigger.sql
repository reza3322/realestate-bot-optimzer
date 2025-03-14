
-- Update the trigger function to correctly handle visitor_id instead of visitor_info
CREATE OR REPLACE FUNCTION public.save_lead_from_chatbot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  lead_id UUID;
  lead_exists BOOLEAN;
BEGIN
  -- Check if this conversation already has a lead
  SELECT EXISTS (
    SELECT 1 FROM public.leads 
    WHERE conversation_id = NEW.conversation_id
  ) INTO lead_exists;
  
  IF NOT lead_exists AND NEW.conversation_id IS NOT NULL THEN
    -- Create basic lead from conversation
    INSERT INTO public.leads (
      user_id,
      first_name,
      last_name,
      email,
      phone,
      source,
      conversation_id,
      status
    )
    VALUES (
      NEW.user_id,
      'Website',  -- Default first name
      'Visitor',  -- Default last name
      NULL,       -- Email will be captured later
      NULL,       -- Phone will be captured later
      'AI Chatbot',
      NEW.conversation_id,
      'new'
    )
    RETURNING id INTO lead_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS save_lead_from_chatbot_trigger ON chatbot_conversations;

-- Create the trigger again with the updated function
CREATE TRIGGER save_lead_from_chatbot_trigger
AFTER INSERT ON chatbot_conversations
FOR EACH ROW
EXECUTE FUNCTION save_lead_from_chatbot();
