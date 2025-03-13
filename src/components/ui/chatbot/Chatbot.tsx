
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { getChatStyles } from './chatStyles';
import { Message, ChatTheme, LanguageCode, ChatStylesType, VisitorInfo, PropertyRecommendation } from './types';
import { testChatbotResponse, formatPropertyRecommendations } from './responseHandlers';

const DEFAULT_TRANSLATIONS = {
  en: {
    welcomeMessage: "Hi there! I'm your RealHomeAI assistant. How can I help you today?",
    placeholderText: "Type your message...",
    errorMessage: "Sorry, there was an error processing your request.",
    noPropertiesMessage: "I couldn't find any properties matching your criteria right now. Would you like to leave your contact details so we can notify you when something suitable becomes available?"
  },
  es: {
    welcomeMessage: "¡Hola! Soy tu asistente RealHomeAI. ¿Cómo puedo ayudarte hoy?",
    placeholderText: "Escribe tu mensaje...",
    errorMessage: "Lo siento, hubo un error al procesar tu solicitud.",
    noPropertiesMessage: "No pude encontrar propiedades que coincidan con tus criterios en este momento. ¿Te gustaría dejar tus datos de contacto para que podamos notificarte cuando haya algo disponible?"
  },
  fr: {
    welcomeMessage: "Bonjour! Je suis votre assistant RealHomeAI. Comment puis-je vous aider aujourd'hui?",
    placeholderText: "Tapez votre message...",
    errorMessage: "Désolé, une erreur s'est produite lors du traitement de votre demande.",
    noPropertiesMessage: "Je n'ai pas trouvé de propriétés correspondant à vos critères pour le moment. Souhaitez-vous laisser vos coordonnées afin que nous puissions vous informer lorsque quelque chose de convenable sera disponible?"
  },
  de: {
    welcomeMessage: "Hallo! Ich bin Ihr RealHomeAI-Assistent. Wie kann ich Ihnen heute helfen?",
    placeholderText: "Geben Sie Ihre Nachricht ein...",
    errorMessage: "Entschuldigung, bei der Verarbeitung Ihrer Anfrage ist ein Fehler aufgetreten.",
    noPropertiesMessage: "Ich konnte keine Immobilien finden, die Ihren Kriterien entsprechen. Möchten Sie Ihre Kontaktdaten hinterlassen, damit wir Sie benachrichtigen können, wenn etwas Passendes verfügbar wird?"
  },
  pt: {
    welcomeMessage: "Olá! Sou seu assistente RealHomeAI. Como posso ajudá-lo hoje?",
    placeholderText: "Digite sua mensagem...",
    errorMessage: "Desculpe, ocorreu um erro ao processar sua solicitação.",
    noPropertiesMessage: "Não consegui encontrar imóveis que correspondam aos seus critérios no momento. Gostaria de deixar seus dados de contato para que possamos notificá-lo quando algo adequado estiver disponível?"
  }
};

interface ChatbotProps {
  apiKey?: string;
  className?: string;
  theme?: 'default' | 'modern' | 'minimal';
  variation?: 'default' | 'blue' | 'green' | 'purple';
  fontStyle?: 'default' | 'serif' | 'mono';
  botName?: string;
  welcomeMessage?: string;
  placeholderText?: string;
  maxHeight?: string;
  onSendMessage?: (message: string) => void;
  userId?: string;
  useRealAPI?: boolean;
  botIconName?: string;
  primaryColor?: string;
  language?: LanguageCode;
  buttonStyle?: React.CSSProperties;
  fontSize?: number;
}

const Chatbot = ({
  className,
  theme = 'default',
  variation = 'default',
  fontStyle = 'default',
  botName = "RealHomeAI Assistant",
  welcomeMessage,
  placeholderText,
  maxHeight = "400px",
  onSendMessage,
  userId = 'demo-user',
  useRealAPI = false,
  botIconName = 'bot',
  primaryColor,
  language = 'en',
  buttonStyle,
  fontSize = 16
}: ChatbotProps) => {
  const translations = DEFAULT_TRANSLATIONS[language] || DEFAULT_TRANSLATIONS.en;
  
  const defaultWelcomeMessage = welcomeMessage || translations.welcomeMessage.replace("RealHomeAI", botName);
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
  const [askingForContact, setAskingForContact] = useState(false);

  const chatStyles: ChatTheme = getChatStyles(theme, variation, primaryColor) as ChatTheme;
  
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'bot') {
      setMessages([{ role: 'bot', content: defaultWelcomeMessage }]);
    }
  }, [defaultWelcomeMessage]);

  useEffect(() => {
    if (messagesEndRef.current) {
      const chatContainer = messagesEndRef.current.parentElement;
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    if (!visitorInfo.visitorId) {
      setVisitorInfo(prev => ({
        ...prev,
        visitorId: 'visitor-' + Date.now()
      }));
    }
  }, []);

  const handleSendMessage = async (message: string) => {
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    onSendMessage?.(message);
    setIsTyping(true);
    setError(null);
    setResponseSource(null);
    
    const isLandingPageMode = userId === 'demo-user';
    console.log(`Chatbot mode: ${isLandingPageMode ? 'Landing Page Demo' : 'User Chatbot'}`);
    console.log(`Conversation ID: ${conversationId || 'New conversation'}`);
    
    try {
      // Check if we're collecting contact info as a follow-up
      if (askingForContact) {
        // Process contact information
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
        const phoneRegex = /(\+\d{1,3})?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
        
        const email = message.match(emailRegex)?.[0];
        const phone = message.match(phoneRegex)?.[0];
        const name = message.replace(emailRegex, '').replace(phoneRegex, '').trim();
        
        // Update visitor info with any contact details provided
        const updatedInfo = {
          ...visitorInfo,
          email: email || visitorInfo.email,
          phone: phone || visitorInfo.phone,
          name: name || visitorInfo.name
        };
        
        setVisitorInfo(updatedInfo);
        setAskingForContact(false);
        
        // Send a thank you response
        const thankYouMessage = `Thank you for providing your contact information. We'll notify you when properties matching your criteria become available.`;
        
        setMessages(prev => [...prev, { 
          role: 'bot', 
          content: thankYouMessage
        }]);
        
        setIsTyping(false);
        return;
      }
      
      // Get all previous messages except the initial welcome
      const previousMsgs = messages.filter(msg => 
        !(msg.role === 'bot' && msg.content === defaultWelcomeMessage) 
      );
      
      const result = await testChatbotResponse(
        message, 
        userId, 
        visitorInfo, 
        conversationId,
        previousMsgs
      );
      
      if (result.error) {
        console.error('Chatbot error:', result.error);
        setError(`Error: ${result.error}`);
      } else {
        if (result.conversationId && !conversationId) {
          console.log(`Setting conversation ID: ${result.conversationId}`);
          setConversationId(result.conversationId);
        }
        
        let botResponse = result.response;
        let shouldAskForContact = false;
        
        // Check if we received property recommendations
        if (result.propertyRecommendations && result.propertyRecommendations.length > 0) {
          console.log('Received property recommendations:', result.propertyRecommendations);
          setPropertyRecommendations(result.propertyRecommendations);
        } else {
          // Check if the message seems to be asking about properties but none were found
          const isPropertyQuery = message.toLowerCase().match(/property|house|apartment|home|real estate|buy|rent|bedroom|price/);
          
          if (isPropertyQuery) {
            // No properties found but user was asking about properties
            shouldAskForContact = true;
            botResponse = translations.noPropertiesMessage || DEFAULT_TRANSLATIONS.en.noPropertiesMessage;
            setAskingForContact(true);
          }
        }
        
        // Store the bot's response
        setMessages(prev => [...prev, { 
          role: 'bot', 
          content: botResponse,
          properties: result.propertyRecommendations || [] 
        }]);
        
        setResponseSource(result.source || null);
        
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
        apiKeyStatus={useRealAPI ? "set" : "not-set"}
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
        placeholderText={
          askingForContact 
            ? "Please provide your name, email or phone number..." 
            : defaultPlaceholderText
        }
        buttonStyle={sendButtonStyle}
        visitorInfo={visitorInfo}
      />
    </div>
  );
};

export default Chatbot;
