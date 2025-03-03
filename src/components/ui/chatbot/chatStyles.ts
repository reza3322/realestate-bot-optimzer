
import { ChatStylesType } from './types';

export const getChatStyles = (
  theme: 'default' | 'modern' | 'minimal',
  variation: 'default' | 'blue' | 'green' | 'purple'
): ChatStylesType => {
  // Base theme styles
  let styles: ChatStylesType = {
    container: "bg-card border border-border",
    header: "bg-primary/10 border-b border-border",
    userBubble: "bg-primary text-primary-foreground rounded-xl rounded-tr-none",
    botBubble: "bg-secondary text-secondary-foreground rounded-xl rounded-tl-none",
    inputContainer: "border-t border-border",
    botIcon: "bg-primary/20 text-primary",
    userIcon: "bg-secondary text-secondary-foreground",
    font: "",
  };
  
  // Apply theme variations
  switch (theme) {
    case 'modern':
      styles = {
        ...styles,
        container: "bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800",
        header: "bg-gradient-to-r from-indigo-500 to-blue-600 text-white",
        userBubble: "bg-blue-600 text-white rounded-2xl rounded-tr-none shadow-md",
        botBubble: "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-none shadow-md border border-gray-100 dark:border-gray-700",
        inputContainer: "bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700",
        botIcon: "bg-gradient-to-r from-indigo-500 to-blue-600 text-white",
        userIcon: "bg-blue-600 text-white",
      };
      break;
    case 'minimal':
      styles = {
        ...styles,
        container: "bg-gray-50 dark:bg-gray-900",
        header: "bg-transparent border-b border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100",
        userBubble: "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg",
        botBubble: "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-200 dark:border-gray-700",
        inputContainer: "bg-transparent border-t border-gray-200 dark:border-gray-800",
        botIcon: "bg-transparent border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400",
        userIcon: "bg-transparent border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400",
      };
      break;
  }
  
  // Apply color variations
  switch (variation) {
    case 'blue':
      styles = {
        ...styles,
        header: styles.header.replace('from-indigo-500 to-blue-600', 'from-blue-400 to-blue-700').replace('bg-primary/10', 'bg-blue-100 dark:bg-blue-900/30'),
        userBubble: styles.userBubble.replace('bg-primary', 'bg-blue-600').replace('bg-blue-600', 'bg-blue-600'),
        botIcon: styles.botIcon.replace('bg-primary/20', 'bg-blue-100 dark:bg-blue-900/30').replace('text-primary', 'text-blue-700 dark:text-blue-400'),
      };
      break;
    case 'green':
      styles = {
        ...styles,
        header: styles.header.replace('from-indigo-500 to-blue-600', 'from-emerald-400 to-green-600').replace('bg-primary/10', 'bg-emerald-100 dark:bg-emerald-900/30'),
        userBubble: styles.userBubble.replace('bg-primary', 'bg-emerald-600').replace('bg-blue-600', 'bg-emerald-600'),
        botIcon: styles.botIcon.replace('bg-primary/20', 'bg-emerald-100 dark:bg-emerald-900/30').replace('text-primary', 'text-emerald-700 dark:text-emerald-400'),
      };
      break;
    case 'purple':
      styles = {
        ...styles,
        header: styles.header.replace('from-indigo-500 to-blue-600', 'from-purple-400 to-violet-600').replace('bg-primary/10', 'bg-purple-100 dark:bg-purple-900/30'),
        userBubble: styles.userBubble.replace('bg-primary', 'bg-purple-600').replace('bg-blue-600', 'bg-purple-600'),
        botIcon: styles.botIcon.replace('bg-primary/20', 'bg-purple-100 dark:bg-purple-900/30').replace('text-primary', 'text-purple-700 dark:text-purple-400'),
      };
      break;
  }
  
  return styles;
};

export const applyFontStyle = (
  styles: ChatStylesType, 
  fontStyle: 'default' | 'serif' | 'mono'
): ChatStylesType => {
  const updatedStyles = { ...styles };
  
  switch (fontStyle) {
    case 'serif':
      updatedStyles.font = "font-serif";
      break;
    case 'mono':
      updatedStyles.font = "font-mono";
      break;
    default:
      updatedStyles.font = "font-sans";
  }
  
  return updatedStyles;
};
