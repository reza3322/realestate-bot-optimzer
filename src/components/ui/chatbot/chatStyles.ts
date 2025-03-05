
import { ChatStylesType } from './types';

export const getChatStyles = (
  theme: 'default' | 'modern' | 'minimal',
  variation: 'default' | 'blue' | 'green' | 'purple' = 'default',
  primaryColor?: string
): ChatStylesType => {
  // Base styles (shared across all themes)
  const baseStyles: ChatStylesType = {
    container: 'bg-white dark:bg-gray-900 shadow-md rounded-md overflow-hidden',
    header: 'bg-primary text-white p-4 flex items-center',
    userBubble: 'bg-primary/10 text-foreground rounded-lg p-3 max-w-[80%] ml-auto',
    botBubble: 'bg-muted text-foreground rounded-lg p-3 max-w-[80%]',
    inputContainer: 'border-t border-border p-4 bg-background',
    botIcon: 'bg-primary text-white h-8 w-8 rounded-full flex items-center justify-center',
    userIcon: 'bg-primary/20 h-8 w-8 rounded-full flex items-center justify-center',
    font: 'font-sans',
  };

  // Apply color variation
  let colorStyles: Partial<ChatStylesType> = {};
  
  // If a custom primary color is provided, use it
  if (primaryColor) {
    colorStyles = {
      header: `bg-[${primaryColor}] text-white p-4 flex items-center`,
      userBubble: `bg-[${primaryColor}]/10 text-foreground rounded-lg p-3 max-w-[80%] ml-auto`,
      botIcon: `bg-[${primaryColor}] text-white h-8 w-8 rounded-full flex items-center justify-center`,
    };
  } else {
    // Use predefined variations
    switch (variation) {
      case 'blue':
        colorStyles = {
          header: `bg-blue-500 text-white p-4 flex items-center`,
          userBubble: `bg-blue-100 dark:bg-blue-900/30 text-foreground rounded-lg p-3 max-w-[80%] ml-auto`,
          botIcon: `bg-blue-500 text-white h-8 w-8 rounded-full flex items-center justify-center`,
        };
        break;
      case 'green':
        colorStyles = {
          header: `bg-emerald-600 text-white p-4 flex items-center`,
          userBubble: `bg-emerald-100 dark:bg-emerald-900/30 text-foreground rounded-lg p-3 max-w-[80%] ml-auto`,
          botIcon: `bg-emerald-600 text-white h-8 w-8 rounded-full flex items-center justify-center`,
        };
        break;
      case 'purple':
        colorStyles = {
          header: `bg-purple-600 text-white p-4 flex items-center`,
          userBubble: `bg-purple-100 dark:bg-purple-900/30 text-foreground rounded-lg p-3 max-w-[80%] ml-auto`,
          botIcon: `bg-purple-600 text-white h-8 w-8 rounded-full flex items-center justify-center`,
        };
        break;
      default:
        // Default blue primary theme
        colorStyles = {
          header: `bg-blue-500 text-white p-4 flex items-center`,
          userBubble: `bg-blue-100 dark:bg-blue-900/30 text-foreground rounded-lg p-3 max-w-[80%] ml-auto`,
          botIcon: `bg-blue-500 text-white h-8 w-8 rounded-full flex items-center justify-center`,
        };
        break;
    }
  }

  // Apply theme-specific styles
  let themeStyles: Partial<ChatStylesType> = {};
  
  switch (theme) {
    case 'modern':
      themeStyles = {
        container: `bg-white dark:bg-gray-900 shadow-lg rounded-xl overflow-hidden`,
        header: `${colorStyles.header || baseStyles.header} rounded-t-xl`,
        userBubble: `${colorStyles.userBubble || baseStyles.userBubble} rounded-2xl`,
        botBubble: `${baseStyles.botBubble} rounded-2xl`,
        inputContainer: `border-t border-border p-4 bg-background rounded-b-xl`,
      };
      break;
    case 'minimal':
      themeStyles = {
        container: `bg-white dark:bg-gray-900 shadow-md overflow-hidden`,
        header: `${colorStyles.header || baseStyles.header} border-b border-border bg-background text-foreground`,
        userBubble: `${colorStyles.userBubble || baseStyles.userBubble} rounded-md border border-border/50`,
        botBubble: `${baseStyles.botBubble} rounded-md border border-border/50`,
        inputContainer: `border-t border-border p-3 bg-background`,
      };
      break;
    default:
      // Use default theme
      themeStyles = {
        container: baseStyles.container,
        header: colorStyles.header || baseStyles.header,
        userBubble: colorStyles.userBubble || baseStyles.userBubble,
        botBubble: baseStyles.botBubble,
        inputContainer: baseStyles.inputContainer,
      };
      break;
  }

  // Merge base styles with theme-specific and color styles
  return {
    ...baseStyles,
    ...themeStyles,
    botIcon: colorStyles.botIcon || baseStyles.botIcon,
  };
};

export const applyFontStyle = (
  styles: ChatStylesType,
  fontStyle: 'default' | 'serif' | 'mono' | 'sans' | 'inter' = 'default'
): ChatStylesType => {
  let fontClass = '';
  
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
      fontClass = 'font-sans'; // Inter is a sans-serif font
      break;
    default:
      fontClass = 'font-sans';
      break;
  }
  
  return {
    ...styles,
    font: fontClass,
  };
};
