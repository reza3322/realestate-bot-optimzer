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

  const chatStyles = getChatStyles(theme, variation, primaryColor);
  
  // Generate a stable conversation key for this user
  const conversationStorageKey = `chatConversation_${userId}`;
  const conversationIdStorageKey = `chatConversationId_${userId}`;
  
  // Restore conversation from localStorage on initial load
  useEffect(() => {
    const savedConversation = localStorage.getItem(conversationStorageKey);
    const savedConversationId = localStorage.getItem(conversationIdStorageKey);
    
    if (savedConversation) {
      try {
        const parsedMessages = JSON.parse(savedConversation) as Message[];
        // Only restore if there are more messages than just the welcome
        if (parsedMessages.length > 1) {
          console.log(`Restoring previous conversation with ${parsedMessages.length} messages`);
          setMessages(parsedMessages);
        }
      } catch (e) {
        console.error('Error restoring conversation:', e);
      }
    }
    
    if (savedConversationId) {
      setConversationId(savedConversationId);
      console.log(`Restored conversation ID: ${savedConversationId}`);
    }
  }, [userId, conversationStorageKey, conversationIdStorageKey]);
  
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
    // Don't save if it's just the welcome message
    if (messages.length > 1) {
      localStorage.setItem(conversationStorageKey, JSON.stringify(messages));
      console.log(`Saved conversation with ${messages.length} messages`);
    }
    
    if (conversationId) {
      localStorage.setItem(conversationIdStorageKey, conversationId);
      console.log(`Saved conversation ID: ${conversationId}`);
    }
  }, [messages, conversationId, conversationStorageKey, conversationIdStorageKey]);

  const handleSendMessage = async (message: string) => {
    // Add user message to the UI immediately
    const newMessages = [...messages, { role: 'user', content: message }];
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
      );
      
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
      
      // Call the API
      const result = await testChatbotResponse(
        message, 
        userId, 
        visitorInfo, 
        conversationId,
        previousMsgs.slice(0, -1) // Don't include the message we just sent
      ) as ChatbotResponse;
      
      if (result.error) {
        console.error('Chatbot error:', result.error);
        setError(`Error: ${result.error}`);
      } else {
        // Handle conversation ID
        if (result.conversationId && !conversationId) {
          console.log(`Setting conversation ID: ${result.conversationId}`);
          setConversationId(result.conversationId);
        }
        
        // Handle property recommendations
        const newPropertyRecs = result.propertyRecommendations || [];
        if (newPropertyRecs.length > 0) {
          console.log('Received property recommendations:', newPropertyRecs);
          setPropertyRecommendations(newPropertyRecs);
        }
        
        // Store the bot's response as a proper Message object
        setMessages(prev => [...prev, { 
          role: 'bot', 
          content: result.response,
          properties: newPropertyRecs
        }]);
        
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
