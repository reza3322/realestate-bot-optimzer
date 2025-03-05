
export interface Message {
  role: 'user' | 'bot';
  content: string;
}

export interface ChatbotDemoProps {
  theme?: 'default' | 'modern' | 'minimal';
  variation?: 'default' | 'blue' | 'green' | 'purple';
  fontStyle?: 'default' | 'serif' | 'mono';
  botIconName?: string;
}

export interface ChatStylesType {
  container: string;
  header: string;
  userBubble: string;
  botBubble: string;
  inputContainer: string;
  botIcon: string;
  userIcon: string;
  font: string;
}
