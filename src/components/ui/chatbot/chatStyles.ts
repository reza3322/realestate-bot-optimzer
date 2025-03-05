
import { cva } from "class-variance-authority";

export type ChatTheme = 'default' | 'modern' | 'minimal';
export type ChatVariation = 'default' | 'blue' | 'green' | 'purple';
export type FontStyle = 'default' | 'serif' | 'mono' | 'sans' | 'inter';

interface ChatStyles {
  container: string;
  header: string;
  font: string;
  botBubble: string;
  userBubble: string;
  botIcon: string;
  userIcon: string;
  inputContainer: string;
}

export const getChatStyles = (
  theme: ChatTheme = 'default',
  variation: ChatVariation = 'blue',
  primaryColor?: string
): ChatStyles => {
  // Simple, clean styles for all themes
  return {
    container: 'bg-white rounded-lg overflow-hidden shadow-md',
    header: 'bg-blue-500 text-white p-3 flex items-center gap-2',
    font: 'font-sans',
    botBubble: 'bg-gray-100 text-gray-800 rounded-lg rounded-tl-none',
    userBubble: 'bg-blue-500 text-white rounded-lg rounded-tr-none',
    botIcon: 'bg-blue-500 text-white',
    userIcon: 'bg-gray-200 text-gray-600',
    inputContainer: 'bg-white'
  };
};

export const applyFontStyle = (styles: ChatStyles, fontStyle: FontStyle): ChatStyles => {
  let fontClass: string;
  
  switch (fontStyle) {
    case 'serif':
      fontClass = 'font-serif';
      break;
    case 'mono':
      fontClass = 'font-mono';
      break;
    case 'sans':
      fontClass = 'font-sans';
      break;
    case 'inter':
      fontClass = 'font-sans'; // Using sans as fallback if Inter isn't available
      break;
    default:
      fontClass = 'font-sans';
  }
  
  return {
    ...styles,
    font: fontClass
  };
};
