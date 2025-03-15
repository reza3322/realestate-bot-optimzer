
// Chat message types
export interface Message {
  role: 'user' | 'bot';
  content: string;
  properties?: PropertyRecommendation[];
}

export interface ChatStylesType {
  botBubble: string;
  userBubble: string;
  botIcon: string;
  userIcon: string;
  font: string;
  container: string;
  header: string;
  inputContainer: string;
}

export interface ChatTheme extends ChatStylesType {
  customColor?: string;
}

// Chatbot settings types
export type LanguageCode = 'en' | 'es' | 'fr' | 'de';
export type ChatThemeType = 'default' | 'modern' | 'minimal';
export type ChatVariation = 'default' | 'blue' | 'green' | 'purple';
export type FontStyle = 'default' | 'serif' | 'mono';

// Visitor information type
export interface VisitorInfo {
  visitorId?: string;
  name?: string;
  email?: string;
  phone?: string;
  interests?: string[];
  location?: string;
  [key: string]: any;
}

// Property recommendation type
export interface PropertyRecommendation {
  id: string;
  title: string;
  price: string;
  location?: string;
  features?: string[];
  url: string;
  image?: string;
}

// Chatbot response type
export interface ChatbotResponse {
  response: string;
  error?: string;
  source?: 'ai' | 'training' | 'fallback' | 'error';
  leadInfo?: any;
  conversationId?: string;
  propertyRecommendations?: PropertyRecommendation[];
}

// Chatbot props interface
export interface ChatbotProps {
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
  primaryColor?: string;
  language?: LanguageCode;
  buttonStyle?: React.CSSProperties;
  fontSize?: number;
  botIconName?: string;
}
