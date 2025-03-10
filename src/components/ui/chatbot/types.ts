
export interface Message {
  role: 'user' | 'bot';
  content: string;
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
  container?: string;
  header?: {
    container: string;
    font: string;
  };
  inputContainer?: string;
}

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'pt' | string;

export interface ChatbotSettings {
  primaryColor: string;
  theme: string;
  variation: string;
  botIcon: string;
  fontFamily: string;
  fontSize: number;
  botName: string;
  welcomeMessage: string;
  placeholderText: string;
  enabled: boolean;
  position: string;
  buttonText: string;
  buttonIcon: string;
  buttonSize: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonStyle: string;
  buttonPosition: string;
  language: LanguageCode;
}

export interface VisitorInfo {
  name?: string;
  email?: string;
  phone?: string;
  propertyInterest?: string;
  budget?: string;
  [key: string]: any;
}

export interface PropertyRecommendation {
  title: string;
  price: number | string;
  location: string;
  features: string[];
  highlight?: string;
  url?: string;
  id?: string;
}

export interface ChatbotResponse {
  response: string;
  suggestedFollowUp?: string;
  source?: 'ai' | 'training';
  conversationId?: string;
  leadInfo?: VisitorInfo;
  error?: string;
  isVerified?: boolean;
  propertyRecommendations?: PropertyRecommendation[];
}

export interface PropertySearchParams {
  type?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  keywords?: string[];
  style?: string;
  maxResults?: number;
}
