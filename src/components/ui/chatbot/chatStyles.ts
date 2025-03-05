
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

// Default color mappings
const themeColors = {
  default: {
    primary: 'bg-blue-600',
    secondary: 'bg-blue-100',
    text: 'text-white',
    secondaryText: 'text-blue-800'
  },
  blue: {
    primary: 'bg-blue-600',
    secondary: 'bg-blue-100',
    text: 'text-white',
    secondaryText: 'text-blue-800'
  },
  green: {
    primary: 'bg-green-600',
    secondary: 'bg-green-100',
    text: 'text-white',
    secondaryText: 'text-green-800'
  },
  purple: {
    primary: 'bg-purple-600',
    secondary: 'bg-purple-100',
    text: 'text-white',
    secondaryText: 'text-purple-800'
  }
};

// Function to generate dynamic CSS variables based on the primary color
const generateColorVars = (primaryColor?: string) => {
  if (!primaryColor) return {};

  // Convert hex to RGB for creating opacity variations
  const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const formattedHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(formattedHex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null;
  };

  const rgb = hexToRgb(primaryColor);
  if (!rgb) return {};

  return {
    '--chat-primary-color': primaryColor,
    '--chat-primary-rgb': `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    '--chat-light-color': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
    '--chat-medium-color': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`,
    '--chat-dark-color': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`
  };
};

export const getChatStyles = (
  theme: ChatTheme = 'default',
  variation: ChatVariation = 'default',
  primaryColor?: string
): ChatStyles => {
  // Base container styles
  let container = 'bg-white';
  
  // Get variation colors
  const varColors = themeColors[variation];
  
  // Default styles based on theme
  if (theme === 'default') {
    return {
      container: 'bg-white border border-gray-200 rounded-lg shadow',
      header: `${varColors.primary} ${varColors.text} p-3 rounded-t-lg`,
      font: 'font-sans',
      botBubble: `${varColors.secondary} ${varColors.secondaryText} rounded-lg rounded-tl-none`,
      userBubble: `${varColors.primary} ${varColors.text} rounded-lg rounded-tr-none`,
      botIcon: `${varColors.primary} ${varColors.text}`,
      userIcon: 'bg-gray-200 text-gray-600',
      inputContainer: 'bg-white border-t border-gray-100'
    };
  }
  
  if (theme === 'modern') {
    return {
      container: 'bg-gray-50 border-0 rounded-xl shadow-lg',
      header: `${varColors.primary} ${varColors.text} p-4 rounded-t-xl`,
      font: 'font-sans',
      botBubble: `${varColors.secondary} ${varColors.secondaryText} rounded-2xl rounded-tl-none shadow-sm`,
      userBubble: `${varColors.primary} ${varColors.text} rounded-2xl rounded-tr-none shadow-sm`,
      botIcon: `${varColors.primary} ${varColors.text} rounded-full`,
      userIcon: 'bg-gray-700 text-white rounded-full',
      inputContainer: 'bg-gray-50 border-t border-gray-200 p-4'
    };
  }
  
  if (theme === 'minimal') {
    return {
      container: 'bg-white border border-gray-100 rounded-md shadow-sm',
      header: 'bg-gray-50 text-gray-800 p-2 border-b border-gray-100 rounded-t-md',
      font: 'font-sans',
      botBubble: 'bg-gray-100 text-gray-800 rounded-md rounded-tl-none',
      userBubble: 'bg-gray-800 text-white rounded-md rounded-tr-none',
      botIcon: 'bg-gray-200 text-gray-600 rounded-full',
      userIcon: 'bg-gray-600 text-white rounded-full',
      inputContainer: 'bg-white border-t border-gray-50'
    };
  }
  
  // Default fallback
  return {
    container: 'bg-white border border-gray-200 rounded-lg shadow',
    header: 'bg-blue-600 text-white p-3 rounded-t-lg',
    font: 'font-sans',
    botBubble: 'bg-blue-100 text-blue-800 rounded-lg rounded-tl-none',
    userBubble: 'bg-blue-600 text-white rounded-lg rounded-tr-none',
    botIcon: 'bg-blue-600 text-white',
    userIcon: 'bg-gray-200 text-gray-600',
    inputContainer: 'bg-white border-t border-gray-100'
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
