
import { ChatTheme } from './types';

export const getChatStyles = (theme: 'default' | 'modern' | 'minimal', variation: 'default' | 'blue' | 'green' | 'purple', customColor?: string): ChatTheme => {
  // Base container style
  let container = 'border border-border';
  
  // Base header style
  let header = '';
  
  // Base chat bubble styles
  let botBubble = 'p-3 rounded-lg max-w-xs sm:max-w-sm break-words';
  let userBubble = 'p-3 rounded-lg max-w-xs sm:max-w-sm break-words';
  
  // Base icon styles
  let botIcon = 'w-8 h-8 rounded-full flex items-center justify-center text-white';
  let userIcon = 'w-8 h-8 rounded-full flex items-center justify-center bg-secondary/80 text-secondary-foreground';
  
  // Base input container style
  let inputContainer = 'border-t border-border';
  
  // Base font style (can be overridden)
  let font = 'text-sm';
  
  // Apply color variations
  const applyColorVariation = (color: string) => {
    // Set default primary color based on variation
    let primaryColor = color;
    switch (variation) {
      case 'blue':
        primaryColor = '#3b82f6'; // blue-500
        break;
      case 'green':
        primaryColor = '#10b981'; // emerald-500
        break;
      case 'purple':
        primaryColor = '#8b5cf6'; // violet-500
        break;
      case 'default':
      default:
        primaryColor = '#3b82f6'; // Default blue
        break;
    }
    
    // Override with custom color if provided
    const themeColor = customColor || primaryColor;
    
    return {
      primaryColor: themeColor,
      botIcon: `${botIcon} bg-[${themeColor}]`,
      botBubble: `${botBubble} bg-[${themeColor}] text-white`,
      userBubble: `${userBubble} bg-[${themeColor}]25 dark:bg-[${themeColor}]15`, // 25 is hex for 15% opacity
    };
  };
  
  // Apply theme styles
  switch (theme) {
    case 'modern':
      container = `${container} bg-card`;
      header = 'border-b border-border bg-card text-card-foreground';
      botBubble = `${botBubble} shadow-sm`;
      userBubble = `${userBubble} shadow-sm`;
      botIcon = `${botIcon} shadow-sm`;
      userIcon = `${userIcon} shadow-sm`;
      inputContainer = `${inputContainer} bg-card/50 p-2`;
      break;
      
    case 'minimal':
      container = `${container} bg-white dark:bg-gray-950`;
      header = 'border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200';
      botBubble = `${botBubble}`;
      userBubble = `${userBubble}`;
      botIcon = `${botIcon}`;
      userIcon = `${userIcon}`;
      inputContainer = `${inputContainer} p-2`;
      break;
      
    case 'default':
    default:
      container = `${container} bg-white dark:bg-gray-900`;
      header = 'border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
      botBubble = `${botBubble}`;
      userBubble = `${userBubble}`;
      botIcon = `${botIcon}`;
      userIcon = `${userIcon}`;
      inputContainer = `${inputContainer}`;
      break;
  }
  
  // Apply color variation
  const colorStyles = applyColorVariation(customColor || '');
  
  return {
    container,
    header,
    botIcon: colorStyles.botIcon,
    botBubble: colorStyles.botBubble,
    userIcon,
    userBubble: colorStyles.userBubble,
    inputContainer,
    customColor: customColor || colorStyles.primaryColor,
    font
  };
};

export const applyFontStyle = (styles: ChatTheme, fontStyle: 'default' | 'serif' | 'mono'): ChatTheme => {
  // Apply font style
  switch (fontStyle) {
    case 'serif':
      return { ...styles, font: `font-serif ${styles.font}` };
    case 'mono':
      return { ...styles, font: `font-mono ${styles.font}` };
    case 'default':
    default:
      return { ...styles, font: `font-sans ${styles.font}` };
  }
};
