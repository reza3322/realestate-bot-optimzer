import { ChatTheme, ChatStylesType } from './types';

export const getChatStyles = (
  theme: 'default' | 'modern' | 'minimal' = 'default',
  variation: 'default' | 'blue' | 'green' | 'purple' = 'default',
  primaryColor?: string
): ChatTheme => {
  let combinedStyles: ChatTheme = {
    container: 'rounded-lg shadow-md',
    header: 'flex items-center justify-between p-4 border-b',
    botBubble: 'bg-gray-100 text-gray-800 rounded-xl p-3 mb-2 max-w-[75%] break-words',
    userBubble: 'bg-blue-500 text-white rounded-xl p-3 mb-2 max-w-[75%] self-end break-words',
    inputContainer: 'flex items-center p-4 border-t',
    botIcon: 'bg-gray-200 rounded-full p-2 mr-3',
    userIcon: 'bg-blue-600 rounded-full p-2 ml-3',
    font: 'font-sans',
    customColor: primaryColor
  };

  if (primaryColor) {
    combinedStyles = {
      ...combinedStyles,
      botBubble: `bg-gray-100 text-gray-800 rounded-xl p-3 mb-2 max-w-[75%] break-words`,
      userBubble: `text-white rounded-xl p-3 mb-2 max-w-[75%] self-end break-words`,
      botIcon: `rounded-full p-2 mr-3`,
      userIcon: `rounded-full p-2 ml-3`,
    };
  }

  switch (theme) {
    case 'modern':
      combinedStyles = {
        ...combinedStyles,
        container: 'rounded-2xl shadow-lg',
        header: 'p-5 rounded-t-2xl',
        botBubble: 'bg-gray-50 text-gray-800 rounded-3xl p-4 mb-3 max-w-[80%]',
        userBubble: 'bg-blue-600 text-white rounded-3xl p-4 mb-3 max-w-[80%] self-end',
        inputContainer: 'p-5',
        botIcon: 'bg-gray-100 rounded-xl p-3 mr-4',
        userIcon: 'bg-blue-700 rounded-xl p-3 ml-4',
      };
      break;
    case 'minimal':
      combinedStyles = {
        ...combinedStyles,
        container: 'shadow-none border',
        header: 'py-3',
        botBubble: 'bg-white text-gray-700 p-2 mb-1 max-w-[90%] shadow-none',
        userBubble: 'bg-white text-gray-700 p-2 mb-1 max-w-[90%] self-end shadow-none',
        inputContainer: 'py-2',
        botIcon: 'mr-2',
        userIcon: 'ml-2',
      };
      break;
    default:
      // Default theme styles
      break;
  }

  switch (variation) {
    case 'blue':
      combinedStyles = {
        ...combinedStyles,
        userBubble: 'bg-blue-500 text-white rounded-xl p-3 mb-2 max-w-[75%] self-end',
        userIcon: 'bg-blue-600 rounded-full p-2 ml-3',
      };
      break;
    case 'green':
      combinedStyles = {
        ...combinedStyles,
        userBubble: 'bg-green-500 text-white rounded-xl p-3 mb-2 max-w-[75%] self-end',
        userIcon: 'bg-green-600 rounded-full p-2 ml-3',
      };
      break;
    case 'purple':
      combinedStyles = {
        ...combinedStyles,
        userBubble: 'bg-purple-500 text-white rounded-xl p-3 mb-2 max-w-[75%] self-end',
        userIcon: 'bg-purple-600 rounded-full p-2 ml-3',
      };
      break;
    default:
      // Default variation styles
      break;
  }

  // Return the theme styles
  return combinedStyles;
};

export const applyFontStyle = (fontStyle: string): string => {
  switch (fontStyle) {
    case 'serif':
      return 'font-serif';
    case 'mono':
      return 'font-mono';
    default:
      return 'font-sans';
  }
};

// Re-export the ChatStylesType for use in other components
export type { ChatStylesType };
