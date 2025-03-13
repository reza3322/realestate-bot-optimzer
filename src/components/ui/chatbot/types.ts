
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
}

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'pt';
