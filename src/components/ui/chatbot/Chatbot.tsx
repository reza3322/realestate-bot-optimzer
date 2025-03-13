
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
    errorMessage: "Sorry, there was an error processing your request."
  },
  es: {
    welcomeMessage: "¡Hola! Soy tu asistente RealHomeAI. ¿Cómo puedo ayudarte hoy?",
    placeholderText: "Escribe tu mensaje...",
    errorMessage: "Lo siento, hubo un error al procesar tu solicitud."
  },
  fr: {
    welcomeMessage: "Bonjour! Je suis votre assistant RealHomeAI. Comment puis-je vous aider aujourd'hui?",
    placeholderText: "Tapez votre message...",
    errorMessage: "Désolé, une erreur s'est produite lors du traitement de votre demande."
  },
  de: {
    welcomeMessage: "Hallo! Ich bin Ihr RealHomeAI-Assistent. Wie kann ich Ihnen heute helfen?",
    placeholderText: "Geben Sie Ihre Nachricht ein...",
    errorMessage: "Entschuldigung, bei der Verarbeitung Ihrer Anfrage ist ein Fehler aufgetreten."
  },
  pt: {
    welcomeMessage: "Olá! Sou seu assistente RealHomeAI. Como posso ajudá-lo hoje?",
    placeholderText: "Digite sua mensagem...",
    errorMessage: "Desculpe, ocorreu um erro ao processar sua solicitação."
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
        // Check if conversationId exists in the result before setting it
        if (result.conversationId && !conversationId) {
          console.log(`Setting conversation ID: ${result.conversationId}`);
          setConversationId(result.conversationId);
        }
        
        // Check if propertyRecommendations exists in the result before using it
        const newPropertyRecs = result.propertyRecommendations || [];
        if (newPropertyRecs.length > 0) {
          console.log('Received property recommendations:', newPropertyRecs);
          setPropertyRecommendations(newPropertyRecs);
        }
        
        // Store the bot's response
        setMessages(prev => [...prev, { 
          role: 'bot', 
          content: result.response,
          properties: newPropertyRecs
        }]);
        
        // Fix: Set response source properly if it exists
        if (result.source) {
          setResponseSource(result.source as 'ai' | 'training');
        } else {
          setResponseSource('ai');
        }
        
        // Handle visitor info update from result if leadInfo exists
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
        placeholderText={defaultPlaceholderText}
        buttonStyle={sendButtonStyle}
        visitorInfo={visitorInfo}
      />
    </div>
  );
};

export default Chatbot;
