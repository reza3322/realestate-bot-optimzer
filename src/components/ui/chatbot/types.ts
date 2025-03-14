
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
}
