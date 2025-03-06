
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

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'pt';

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
  language?: LanguageCode;
}
