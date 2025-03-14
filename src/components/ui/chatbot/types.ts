
export interface PropertyRecommendation {
  id: string;
  title: string;
  price: number;
  location: string;
  bedroomCount?: number;
  bathroomCount?: number;
  hasPool?: boolean;
  propertyType?: string;
  features?: string[];
  highlight?: string;
  url: string;
}

export interface Message {
  role: 'user' | 'bot' | 'assistant';
  content: string;
  properties?: PropertyRecommendation[];
}

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'pt';

// Add the missing types
export interface VisitorInfo {
  visitorId?: string;
  name?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

export interface ChatStylesType {
  container?: string;
  header?: string;
  botBubble?: string;
  userBubble?: string;
  botIcon?: string;
  userIcon?: string;
  inputContainer?: string;
  font?: string;
  customColor?: string;
}

export type ChatTheme = {
  container: string;
  header: string;
  botBubble: string;
  userBubble: string;
  botIcon: string;
  userIcon: string;
  inputContainer: string;
  font: string;
  customColor?: string;
};
