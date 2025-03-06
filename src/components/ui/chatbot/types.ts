
// This is a type definition file for the chatbot component

export type Message = {
  role: 'user' | 'bot';
  content: string;
};

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'pt';

export type ChatTheme = {
  container: string;
  header: string;
  botIcon: string;
  botBubble: string;
  userIcon: string;
  userBubble: string;
  inputContainer: string;
  customColor?: string;
  font: string;
};
