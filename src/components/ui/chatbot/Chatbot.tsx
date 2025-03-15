
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { getChatStyles } from './chatStyles';
import { Message, ChatTheme, LanguageCode, VisitorInfo, PropertyRecommendation, ChatbotProps, ChatbotResponse } from './types';
import { testChatbotResponse } from './responseHandlers';

const DEFAULT_TRANSLATIONS = {
  en: {
    welcomeMessage: "Hi there! I'm your real estate assistant. How can I help you today?",
    placeholderText: "Type your message...",
    errorMessage: "Sorry, there was an error processing your request."
  },
  es: {
    welcomeMessage: "¡Hola! Soy tu asistente inmobiliario. ¿Cómo puedo ayudarte hoy?",
    placeholderText: "Escribe tu mensaje...",
    errorMessage: "Lo siento, hubo un error al procesar tu solicitud."
  },
  fr: {
    welcomeMessage: "Bonjour! Je suis votre assistant immobilier. Comment puis-je vous aider aujourd'hui?",
    placeholderText: "Tapez votre message...",
    errorMessage: "Désolé, une erreur s'est produite lors du traitement de votre demande."
  },
  de: {
    welcomeMessage: "Hallo! Ich bin Ihr Immobilienassistent. Wie kann ich Ihnen heute helfen?",
    placeholderText: "Geben Sie Ihre Nachricht ein...",
    errorMessage: "Entschuldigung, bei der Verarbeitung Ihrer Anfrage ist ein Fehler aufgetreten."
  }
};

const Chatbot = ({
  className,
  theme = 'default',
  variation = 'default',
  fontStyle = 'default',
  botName = "Real Estate Assistant",
  welcomeMessage,
  placeholderText,
  maxHeight = "400px",
  onSendMessage,
  userId = 'demo-user',
  primaryColor,
  language = 'en',
  buttonStyle,
  fontSize = 16,
  botIconName = 'bot'
}: ChatbotProps) => {
  const translations = DEFAULT_TRANSLATIONS[language] || DEFAULT_TRANSLATIONS.en;
  
  const defaultWelcomeMessage = welcomeMessage || translations.welcomeMessage;
  const defaultPlaceholderText = placeholderText || translations.placeholderText;
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: defaultWelcomeMessage }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [responseSource, setResponseSource] = useState<'ai' | 'training' | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [visitorInfo, setVisitorInfo] = useState<VisitorInfo>({});
  const [propertyRecommendations, setPropertyRecommendations] = useState<PropertyRecommendation[]>([]);
  const [isConversationLoaded, setIsConversationLoaded] = useState<boolean>(false);

  const chatStyles = getChatStyles(theme, variation, primaryColor);
  
  // Generate stable storage keys for this conversation
  const conversationStorageKey = `chatConversation_${userId}`;
  const conversationIdStorageKey = `chatConversationId_${userId}`;
  
  // Load previous conversation history from the API if available
  const fetchConversationHistory = async (convId: string, uid: string) => {
    try {
      console.log(`Fetching conversation history for ID: ${convId}, User ID: ${uid}`);
      const response = await fetch('https://ckgaqkbsnrvccctqxsqv.supabase.co/functions/v1/get-conversation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationId: convId,
          userId: uid,
          limit: 20
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversation history: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Received conversation history:`, data);
      
      if (data.messages && data.messages.length > 0) {
        // Convert the backend format to our Message format
        const formattedMessages: Message[] = [];
        
        // Add welcome message first
        formattedMessages.push({ role: 'bot', content: defaultWelcomeMessage });
        
        // Add the conversation history
        data.messages.forEach((item: any) => {
          formattedMessages.push({ role: 'user', content: item.message });
          formattedMessages.push({ role: 'bot', content: item.response });
        });
        
        console.log(`Loaded ${formattedMessages.length} messages from history`);
        setMessages(formattedMessages);
      }
      
      return true;
    } catch (err) {
      console.error('Error fetching conversation history:', err);
      return false;
    }
  };
  
  // Restore conversation from localStorage and API on initial load
  useEffect(() => {
    const loadConversation = async () => {
      // Try to get saved conversation ID first
      const savedConversationId = localStorage.getItem(conversationIdStorageKey);
      
      if (savedConversationId) {
        console.log(`Found saved conversation ID: ${savedConversationId}`);
        setConversationId(savedConversationId);
        
        // Fetch the conversation history from the API
        const success = await fetchConversationHistory(savedConversationId, userId);
        
        // If API fetch failed, try local storage as fallback
        if (!success) {
          console.log('API fetch failed, trying localStorage fallback');
          const savedConversation = localStorage.getItem(conversationStorageKey);
          if (savedConversation) {
            try {
              const parsedMessages = JSON.parse(savedConversation) as Message[];
              // Only restore if there are more messages than just the welcome
              if (parsedMessages.length > 1) {
                console.log(`Restoring ${parsedMessages.length} messages from localStorage`);
                setMessages(parsedMessages);
              }
            } catch (e) {
              console.error('Error parsing saved conversation:', e);
            }
          }
        }
      } else {
        console.log('No saved conversation ID found');
        // Generate a new conversation ID
        const newConversationId = 'conv_' + Date.now().toString();
        setConversationId(newConversationId);
        console.log(`Generated new conversation ID: ${newConversationId}`);
        localStorage.setItem(conversationIdStorageKey, newConversationId);
      }
      
      setIsConversationLoaded(true);
    };
    
    loadConversation();
  }, [userId, conversationStorageKey, conversationIdStorageKey, defaultWelcomeMessage]);
  
  // Update welcome message if it changes
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'bot') {
      setMessages([{ role: 'bot', content: defaultWelcomeMessage }]);
    }
  }, [defaultWelcomeMessage, messages]);

  // Scroll to the bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      const chatContainer = messagesEndRef.current.parentElement;
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Generate a visitor ID if one doesn't exist
  useEffect(() => {
    if (!visitorInfo.visitorId) {
      setVisitorInfo(prev => ({
        ...prev,
        visitorId: 'visitor-' + Date.now()
      }));
    }
  }, [visitorInfo.visitorId]);
  
  // Save conversation to localStorage whenever it changes
  useEffect(() => {
    // Don't save if it's just the welcome message or if we're still loading
    if (messages.length > 1 && isConversationLoaded) {
      localStorage.setItem(conversationStorageKey, JSON.stringify(messages));
      console.log(`Saved conversation with ${messages.length} messages to localStorage`);
    }
    
    if (conversationId && isConversationLoaded) {
      localStorage.setItem(conversationIdStorageKey, conversationId);
      console.log(`Saved conversation ID: ${conversationId} to localStorage`);
    }
  }, [messages, conversationId, isConversationLoaded, conversationStorageKey, conversationIdStorageKey]);

  const handleSendMessage = async (message: string) => {
    // Add user message to the UI immediately
    const newMessages: Message[] = [...messages, { role: 'user', content: message }];
    setMessages(newMessages);
    
    // Execute callback
    onSendMessage?.(message);
    
    // Show typing indicator and clear error state
    setIsTyping(true);
    setError(null);
    setResponseSource(null);
    
    // Log conversation details
    console.log(`Sending message. User ID: ${userId}, Conversation ID: ${conversationId || 'New conversation'}`);
    console.log(`Previous messages being sent: ${newMessages.length - 1}`); // -1 for the current message
    
    try {
      // Get all previous messages except the initial welcome
      const previousMsgs = newMessages.filter(msg => 
        !(msg.role === 'bot' && msg.content === defaultWelcomeMessage) 
      ).slice(0, -1); // Remove the message we just sent
      
      // Log if we're dealing with an agency question for debugging
      const lowerMessage = message.toLowerCase();
      const isAgencyQuestion = 
        lowerMessage.includes('agency') || 
        lowerMessage.includes('company') || 
        lowerMessage.includes('about you') ||
        lowerMessage.includes('your name') ||
        lowerMessage.includes('who are you');
      
      if (isAgencyQuestion) {
        console.log('🏢 SENDING AGENCY QUESTION:', message);
        console.log('WITH CONVERSATION HISTORY:', JSON.stringify(previousMsgs, null, 2));
      }
      
      // Ensure we have a valid conversation ID
      const currentConversationId = conversationId || ('conv_' + Date.now().toString());
      if (!conversationId) {
        setConversationId(currentConversationId);
      }
      
      // Call the API with all context
      const result = await testChatbotResponse(
        message, 
        userId, 
        visitorInfo, 
        currentConversationId,
        previousMsgs 
      ) as ChatbotResponse;
      
      if (result.error) {
        console.error('Chatbot error:', result.error);
        setError(`Error: ${result.error}`);
      } else {
        // Handle conversation ID
        if (result.conversationId && (!conversationId || result.conversationId !== conversationId)) {
          console.log(`Setting conversation ID: ${result.conversationId}`);
          setConversationId(result.conversationId);
        }
        
        // Handle property recommendations
        const newPropertyRecs = result.propertyRecommendations || [];
        if (newPropertyRecs.length > 0) {
          console.log('Received property recommendations:', newPropertyRecs);
          setPropertyRecommendations(newPropertyRecs);
        }
        
        // Create a valid Message object for the bot's response
        const botMessage: Message = { 
          role: 'bot', 
          content: result.response,
          properties: newPropertyRecs
        };
        
        // Update state with the new message
        setMessages(prev => [...prev, botMessage]);
        
        // Set response source
        if (result.source) {
          setResponseSource(result.source as 'ai' | 'training');
          console.log(`Response source: ${result.source}`);
        } else {
          setResponseSource('ai');
        }
        
        // Handle visitor info update
        if (result.leadInfo) {
          setVisitorInfo(prev => ({
            ...prev,
            ...result.leadInfo
          }));
        }
      }
    } catch (err) {
      console.error('Chatbot exception:', err);
      setError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsTyping(false);
    }
  };

  const getFontClass = () => {
    switch (fontStyle) {
      case 'serif':
        return 'font-serif';
      case 'mono':
        return 'font-mono';
      case 'default':
      default:
        return 'font-sans';
    }
  };

  const headerStyle = chatStyles.customColor ? {
    backgroundColor: chatStyles.customColor
  } : undefined;

  const botIconStyle = chatStyles.customColor ? {
    backgroundColor: chatStyles.customColor
  } : undefined;

  const userBubbleStyle = chatStyles.customColor ? {
    backgroundColor: `${chatStyles.customColor}25`
  } : undefined;

  const sendButtonStyle = buttonStyle ? {
    ...buttonStyle
  } : undefined;

  return (
    <div className={cn(
      'flex flex-col overflow-hidden rounded-lg shadow-md',
      'h-[500px]',
      chatStyles.container,
      getFontClass(),
      className
    )}>
      <ChatHeader 
        botName={botName}
        headerStyle={chatStyles.header}
        fontStyle={getFontClass()} 
        botIconName={botIconName}
        customStyle={headerStyle}
      />
      
      <div 
        className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-none relative"
        style={{ height: `calc(100% - 120px)` }}
      >
        {messages.map((message, index) => (
          <ChatMessage 
            key={index}
            message={message}
            index={index}
            styles={{
              botBubble: chatStyles.botBubble,
              userBubble: chatStyles.userBubble,
              botIcon: chatStyles.botIcon,
              userIcon: chatStyles.userIcon,
              font: chatStyles.font,
              container: chatStyles.container,
              header: chatStyles.header,
              inputContainer: chatStyles.inputContainer
            }}
            botIconName={botIconName}
            customBotIconStyle={botIconStyle}
            customUserBubbleStyle={userBubbleStyle}
            conversationId={conversationId}
          />
        ))}
        
        {isTyping && (
          <TypingIndicator 
            botIconStyle={chatStyles.botIcon}
            botBubbleStyle={chatStyles.botBubble}
            botIconName={botIconName}
            customBotIconStyle={botIconStyle}
          />
        )}
        
        {responseSource && (
          <div className="text-xs text-right text-muted-foreground pr-2">
            Source: {responseSource === 'training' ? 'Training Data' : 'AI'}
          </div>
        )}
        
        {error && (
          <div className="p-2 rounded-md bg-red-50 text-red-500 text-sm">
            {translations.errorMessage || DEFAULT_TRANSLATIONS.en.errorMessage}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput 
        inputContainerStyle={chatStyles.inputContainer}
        onSendMessage={handleSendMessage}
        placeholderText={defaultPlaceholderText}
        buttonStyle={sendButtonStyle}
        visitorInfo={visitorInfo}
      />
    </div>
  );
};

export default Chatbot;
