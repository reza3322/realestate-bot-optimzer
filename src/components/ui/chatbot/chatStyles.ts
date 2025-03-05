
import { cva } from "class-variance-authority";

export type ChatTheme = 'default' | 'modern' | 'minimal' | 'rounded' | 'bubble';
export type ChatVariation = 'default' | 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'custom';
export type FontStyle = 'default' | 'serif' | 'mono' | 'sans' | 'inter' | 'rounded' | 'playful';

interface ChatStyles {
  container: string;
  header: string;
  font: string;
  botBubble: string;
  userBubble: string;
  botIcon: string;
  userIcon: string;
  inputContainer: string;
  inputField: string;
  sendButton: string;
}

export const getChatStyles = (
  theme: ChatTheme = 'default',
  variation: ChatVariation = 'blue',
  primaryColor?: string
): ChatStyles => {
  // Base color values for preset variations
  const colorMap = {
    default: '#3b82f6', // blue
    blue: '#0ea5e9',    // sky blue
    green: '#10b981',   // emerald
    purple: '#8b5cf6',  // violet
    red: '#ef4444',     // red
    orange: '#f97316'   // orange
  };
  
  // Use primaryColor if provided and variation is custom, otherwise use the preset color
  const themeColor = (variation === 'custom' && primaryColor) 
    ? primaryColor 
    : colorMap[variation] || colorMap.default;
  
  // Apply theme-specific styles
  let styles: ChatStyles = {
    container: 'bg-white rounded-lg overflow-hidden shadow-md',
    header: `bg-[${themeColor}] text-white p-3 flex items-center gap-2`,
    font: 'font-sans',
    botBubble: 'bg-gray-100 text-gray-800 p-3 rounded-lg rounded-tl-none max-w-[85%]',
    userBubble: `bg-[${themeColor}] text-white p-3 rounded-lg rounded-tr-none max-w-[85%]`,
    botIcon: `bg-[${themeColor}] text-white rounded-full p-1`,
    userIcon: 'bg-gray-200 text-gray-600 rounded-full p-1',
    inputContainer: 'bg-white p-3',
    inputField: 'px-5 py-3 rounded-full bg-white text-gray-700 border border-gray-200 focus:outline-none focus:ring-1',
    sendButton: `absolute right-2 p-2 rounded-full bg-[${themeColor}] text-white hover:bg-opacity-90 disabled:opacity-50`
  };
  
  // Apply theme-specific adjustments
  switch (theme) {
    case 'modern':
      styles = {
        ...styles,
        container: 'bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100',
        header: `bg-[${themeColor}] text-white p-4 flex items-center gap-3`,
        botBubble: 'bg-gray-100 text-gray-800 p-3 rounded-xl rounded-tl-none max-w-[85%]',
        userBubble: `bg-[${themeColor}] text-white p-3 rounded-xl rounded-tr-none max-w-[85%]`,
        inputContainer: 'bg-white p-4 border-t border-gray-50',
        inputField: 'px-5 py-3 rounded-full bg-white text-gray-700 border border-gray-200 focus:outline-none focus:ring-2',
      };
      break;
    case 'minimal':
      styles = {
        ...styles,
        container: 'bg-white overflow-hidden shadow-sm border border-gray-100',
        header: `bg-[${themeColor}] text-white p-3 flex items-center gap-2`,
        botBubble: 'bg-gray-50 text-gray-800 p-3 border-l-2 border-gray-200 max-w-[85%]',
        userBubble: `border-r-2 border-[${themeColor}] bg-white text-gray-800 p-3 max-w-[85%]`,
        inputContainer: 'bg-white p-3 border-t border-gray-100',
        inputField: 'px-4 py-2 bg-white text-gray-700 border border-gray-200 focus:outline-none',
        sendButton: `p-2 rounded-sm bg-[${themeColor}] text-white hover:bg-opacity-90 disabled:opacity-50`
      };
      break;
    case 'rounded':
      styles = {
        ...styles,
        container: 'bg-white rounded-3xl overflow-hidden shadow-md',
        botBubble: 'bg-gray-100 text-gray-800 p-3 rounded-2xl rounded-tl-none max-w-[85%]',
        userBubble: `bg-[${themeColor}] text-white p-3 rounded-2xl rounded-tr-none max-w-[85%]`,
        inputField: 'px-5 py-3 rounded-full bg-white text-gray-700 border border-gray-200 focus:outline-none focus:ring-1',
      };
      break;
    case 'bubble':
      styles = {
        ...styles,
        container: 'bg-white rounded-lg overflow-hidden shadow-lg',
        botBubble: 'bg-gray-100 text-gray-800 p-3 rounded-full max-w-[85%]',
        userBubble: `bg-[${themeColor}] text-white p-3 rounded-full max-w-[85%]`,
        inputContainer: 'bg-gray-50 p-3',
        inputField: 'px-5 py-3 rounded-full bg-white text-gray-700 border-0 shadow-sm focus:outline-none focus:ring-1',
      };
      break;
  }
  
  return styles;
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
    case 'rounded':
      fontClass = 'font-sans tracking-wide'; // Rounded, friendly look
      break;
    case 'playful':
      fontClass = 'font-sans tracking-wide leading-relaxed'; // More playful spacing
      break;
    default:
      fontClass = 'font-sans';
  }
  
  return {
    ...styles,
    font: fontClass
  };
};
