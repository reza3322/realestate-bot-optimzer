
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface Property {
  id: string;
  title: string;
  description?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  city?: string;
  state?: string;
  url?: string;
  images?: string[];
  status?: string;
}

export interface TrainingContent {
  id: string;
  content_type: 'qa_pair' | 'file' | 'web_crawl';
  question?: string;
  answer?: string;
  extracted_text?: string;
  source_file?: string;
  category?: string;
  priority?: number;
}

export interface ChatbotProps {
  theme?: 'default' | 'modern' | 'minimal';
  variation?: 'default' | 'blue' | 'green' | 'purple';
  fontSize?: number;
  botName?: string;
  welcomeMessage?: string;
  userId?: string;
  visitorInfo?: Record<string, any>;
  useRealAPI?: boolean;
  language?: string;
  buttonStyle?: React.CSSProperties;
  placeholderText?: string;
  maxHeight?: string;
  onSendMessage?: (message: string) => void;
  apiKey?: string;
  className?: string;
  fontStyle?: 'default' | 'serif' | 'mono';
  botIconName?: string;
  primaryColor?: string;
}

// Additional types needed for the Chatbot component
export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'pt';

export interface Message {
  role: 'user' | 'bot';
  content: string;
}

export interface VisitorInfo {
  visitorId?: string;
  name?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

export interface PropertyRecommendation {
  id: string;
  title: string;
  price?: number;
  imageUrl?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  url?: string;
  description?: string;
}

export interface ChatTheme {
  container: string;
  header: {
    container: string;
    font: string;
  };
  inputContainer: string;
  font: string;
  botBubble: string;
  userBubble: string;
  botIcon: string;
  userIcon: string;
  customColor?: string;
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

export interface ChatbotSettingsProps {
  userId: string;
  userPlan?: string;
  isPremiumFeature?: (requiredPlan: string) => boolean;
  onSubmitSuccess?: () => void;
}

// Define the response structure for the testChatbotResponse function
export interface ChatbotResponse {
  content: string;
  error?: string;
  source?: 'ai' | 'training';
  conversationId?: string;
  leadInfo?: any;
  propertyRecommendations?: PropertyRecommendation[];
}
