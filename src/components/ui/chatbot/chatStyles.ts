import { ChatTheme } from './types';

// Get base theme styles
const getThemeStyles = (theme: string): ChatTheme => {
  switch (theme) {
    case 'modern':
      return {
        container: 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
        header: {
          container: 'bg-gray-100 dark:bg-gray-700 p-4 border-b border-gray-200 dark:border-gray-700',
          font: 'text-lg font-semibold text-gray-800 dark:text-gray-200'
        },
        inputContainer: 'p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900',
        font: 'text-gray-700 dark:text-gray-300',
        botBubble: 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl p-2',
        userBubble: 'bg-blue-100 dark:bg-blue-500 text-blue-800 dark:text-blue-50 rounded-xl p-2',
        botIcon: 'bg-gray-300 dark:bg-gray-500 rounded-full p-2 text-gray-800 dark:text-gray-200',
        userIcon: 'bg-blue-300 dark:bg-blue-700 rounded-full p-2 text-blue-800 dark:text-blue-200'
      };
    case 'minimal':
      return {
        container: 'shadow-md',
        header: {
          container: 'bg-white dark:bg-gray-900 p-3 border-b border-gray-100 dark:border-gray-800',
          font: 'text-md font-medium text-gray-700 dark:text-gray-300'
        },
        inputContainer: 'p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-800',
        font: 'text-gray-600 dark:text-gray-400',
        botBubble: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg p-2',
        userBubble: 'bg-blue-50 dark:bg-blue-600 text-blue-700 dark:text-blue-50 rounded-lg p-2',
        botIcon: 'bg-gray-200 dark:bg-gray-600 rounded-full p-1.5 text-gray-700 dark:text-gray-300',
        userIcon: 'bg-blue-200 dark:bg-blue-600 rounded-full p-1.5 text-blue-700 dark:text-blue-300'
      };
    case 'default':
    default:
      return {
        container: 'border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800',
        header: {
          container: 'bg-gray-50 dark:bg-gray-700 p-3 border-b border-gray-300 dark:border-gray-700',
          font: 'text-lg font-medium text-gray-700 dark:text-gray-300'
        },
        inputContainer: 'p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700',
        font: 'text-gray-600 dark:text-gray-400',
        botBubble: 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md p-2',
        userBubble: 'bg-blue-50 dark:bg-blue-500 text-blue-700 dark:text-blue-50 rounded-md p-2',
        botIcon: 'bg-gray-200 dark:bg-gray-500 rounded-full p-1.5 text-gray-700 dark:text-gray-300',
        userIcon: 'bg-blue-200 dark:bg-blue-600 rounded-full p-1.5 text-blue-700 dark:text-blue-300'
      };
  }
};

// Apply color variation
const applyColorVariation = (theme: ChatTheme, variation: string): ChatTheme => {
  let updatedTheme = { ...theme };
  
  switch (variation) {
    case 'blue':
      updatedTheme.userBubble = 'bg-sky-100 dark:bg-sky-500 text-sky-800 dark:text-sky-50 rounded-md p-2';
      updatedTheme.userIcon = 'bg-sky-200 dark:bg-sky-600 rounded-full p-1.5 text-sky-700 dark:text-sky-300';
      updatedTheme.botIcon = 'bg-sky-200 dark:bg-gray-500 rounded-full p-1.5 text-sky-700 dark:text-gray-300';
      updatedTheme.header.container = 'bg-sky-50 dark:bg-gray-700 p-3 border-b border-sky-200 dark:border-gray-700';
      break;
    case 'green':
      updatedTheme.userBubble = 'bg-green-100 dark:bg-green-500 text-green-800 dark:text-green-50 rounded-md p-2';
      updatedTheme.userIcon = 'bg-green-200 dark:bg-green-600 rounded-full p-1.5 text-green-700 dark:text-green-300';
      updatedTheme.botIcon = 'bg-green-200 dark:bg-gray-500 rounded-full p-1.5 text-green-700 dark:text-gray-300';
      updatedTheme.header.container = 'bg-green-50 dark:bg-gray-700 p-3 border-b border-green-200 dark:border-gray-700';
      break;
    case 'purple':
      updatedTheme.userBubble = 'bg-purple-100 dark:bg-purple-500 text-purple-800 dark:text-purple-50 rounded-md p-2';
      updatedTheme.userIcon = 'bg-purple-200 dark:bg-purple-600 rounded-full p-1.5 text-purple-700 dark:text-purple-300';
      updatedTheme.botIcon = 'bg-purple-200 dark:bg-gray-500 rounded-full p-1.5 text-purple-700 dark:text-gray-300';
      updatedTheme.header.container = 'bg-purple-50 dark:bg-gray-700 p-3 border-b border-purple-200 dark:border-gray-700';
      break;
    case 'default':
    default:
      // Keep default theme
      break;
  }
  
  return updatedTheme;
};

// Apply font style
export const applyFontStyle = (theme: ChatTheme, fontStyle: string): ChatTheme => {
  let fontClass = 'font-sans'; // Default font

  switch (fontStyle) {
    case 'serif':
      fontClass = 'font-serif';
      break;
    case 'mono':
      fontClass = 'font-mono';
      break;
    case 'default':
    default:
      fontClass = 'font-sans';
      break;
  }

  return {
    ...theme,
    font: `${theme.font} ${fontClass}`,
    header: {
      ...theme.header,
      font: `${theme.header.font} ${fontClass}`
    }
  };
};

// Get base styling based on theme & variation
export const getChatStyles = (theme: string, variation: string, primaryColor?: string): ChatTheme => {
  // First, get the base theme styles
  const baseTheme = getThemeStyles(theme);
  
  // Apply color variation
  const coloredTheme = applyColorVariation(baseTheme, variation);
  
  // Apply custom color if provided
  if (primaryColor && primaryColor.trim() !== '') {
    console.log('Applying custom primary color:', primaryColor);
    return {
      ...coloredTheme,
      customColor: primaryColor,
    };
  }
  
  return coloredTheme;
};
