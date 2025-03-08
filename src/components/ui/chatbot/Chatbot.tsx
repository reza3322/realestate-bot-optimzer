
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { getChatStyles, applyFontStyle } from './chatStyles';
import { Message, ChatTheme, LanguageCode, ChatStylesType } from './types';
import { testChatbotResponse } from './responseHandlers';

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

  const styles: ChatTheme = getChatStyles(theme, variation, primaryColor);
  
  const chatStyles: ChatStylesType = {
    botBubble: styles.botBubble,
    userBubble: styles.userBubble,
    botIcon: styles.botIcon,
    userIcon: styles.userIcon,
    font: styles.font,
    container: styles.container,
    header: styles.header,
    inputContainer: styles.inputContainer
  };

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

  const handleSendMessage = async (message: string) => {
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    onSendMessage?.(message);
    setIsTyping(true);
    setError(null);
    setResponseSource(null);
    
    if (useRealAPI) {
      try {
        const { response, error, source } = await testChatbotResponse(message, userId);
        
        if (error) {
          console.error('Chatbot error:', error);
          setError(`Error: ${error}`);
        } else {
          setMessages(prev => [...prev, { role: 'bot', content: response }]);
          setResponseSource(source || null);
        }
      } catch (err) {
        console.error('Chatbot exception:', err);
        setError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsTyping(false);
      }
    } else {
      setTimeout(async () => {
        const demoResponses = [
          "I'd be happy to help you find a property. What's your budget range?",
          "Great! And what neighborhoods are you interested in?",
          "I've found 3 properties that match your criteria. Would you like to schedule a viewing?",
          "Perfect! I've notified your agent and scheduled a viewing for Saturday at 2pm.",
          "Our agents specialize in luxury properties in downtown and suburban areas.",
          "Yes, we have several properties with pools available right now.",
          "The average price in that neighborhood has increased by 12% over the last year.",
          "I can help you get pre-approved for a mortgage through our partner lenders."
        ];
        
        const randomIndex = Math.floor(Math.random() * demoResponses.length);
        const demoResponse = demoResponses[randomIndex];
        
        setIsTyping(false);
        setMessages(prev => [...prev, { role: 'bot', content: demoResponse }]);
      }, 1500);
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

  const headerStyle = styles.customColor ? {
    backgroundColor: styles.customColor
  } : undefined;

  const botIconStyle = styles.customColor ? {
    backgroundColor: styles.customColor
  } : undefined;

  const userBubbleStyle = styles.customColor ? {
    backgroundColor: `${styles.customColor}25`
  } : undefined;

  const sendButtonStyle = buttonStyle ? {
    ...buttonStyle
  } : undefined;

  return (
    <div className={cn(
      'flex flex-col overflow-hidden rounded-lg shadow-md',
      'h-[500px]',
      styles.container,
      getFontClass(),
      className
    )}>
      <ChatHeader 
        botName={botName}
        headerStyle={styles.header}
        fontStyle={styles.font}
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
            styles={chatStyles}
            botIconName={botIconName}
            customBotIconStyle={botIconStyle}
            customUserBubbleStyle={userBubbleStyle}
          />
        ))}
        
        {isTyping && (
          <TypingIndicator 
            botIconStyle={styles.botIcon}
            botBubbleStyle={styles.botBubble}
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
        inputContainerStyle={styles.inputContainer}
        onSendMessage={handleSendMessage}
        placeholderText={defaultPlaceholderText}
        buttonStyle={sendButtonStyle}
      />
    </div>
  );
};

export default Chatbot;
