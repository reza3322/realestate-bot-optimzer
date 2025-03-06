
export interface Message {
  role: 'user' | 'bot';
  content: string;
}

export interface ChatStylesType {
  container: string;
  header: {
    container: string;
    font: string;
  };
  userBubble: string;
  botBubble: string;
  inputContainer: string;
  botIcon: string;
  userIcon: string;
  font: string;
  customColor?: string;
}
