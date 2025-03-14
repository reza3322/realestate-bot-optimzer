
import { cn } from '@/lib/utils';
import { ChatTheme } from './types';

// Get pre-defined chat styles based on theme and variation
export const getChatStyles = (
  theme: string = 'default',
  variation: string = 'default',
  customColor?: string
): ChatTheme => {
  // Base styles that will be applied regardless of theme
  const baseStyles = {
    container: 'bg-background border rounded-lg',
    font: 'text-foreground',
    botBubble: 'bg-muted text-muted-foreground rounded-lg p-3 max-w-[80%]',
    userBubble: 'bg-primary/10 text-primary-foreground rounded-lg p-3 max-w-[80%] ml-auto',
    botIcon: 'flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground',
    userIcon: 'flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground',
    header: 'bg-primary text-primary-foreground p-3 rounded-t-lg flex items-center',
    inputContainer: 'border-t p-3 bg-background'
  };

  // Theme-specific styles
  const themeStyles: Record<string, Partial<ChatTheme>> = {
    default: {
      // Default theme already covered by baseStyles
    },
    modern: {
      botBubble: 'bg-muted text-muted-foreground rounded-xl p-4 max-w-[80%] shadow-sm',
      userBubble: 'bg-primary/10 text-primary-foreground rounded-xl p-4 max-w-[80%] ml-auto shadow-sm',
      botIcon: 'flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-sm',
      userIcon: 'flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground shadow-sm',
      header: 'bg-primary text-primary-foreground p-4 rounded-t-lg flex items-center shadow-sm',
      container: 'bg-background border rounded-xl shadow-md',
    },
    minimal: {
      botBubble: 'bg-background text-foreground border rounded-lg p-3 max-w-[80%]',
      userBubble: 'bg-primary text-primary-foreground rounded-lg p-3 max-w-[80%] ml-auto',
      botIcon: 'flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground',
      userIcon: 'flex items-center justify-center w-8 h-8 rounded-full bg-background text-foreground border',
      header: 'bg-background text-foreground border-b p-3 rounded-t-lg flex items-center',
    }
  };

  // Variation-specific color overrides
  const variationColors: Record<string, { primary: string }> = {
    default: { primary: 'hsl(var(--primary))' },
    blue: { primary: '#3b82f6' },
    green: { primary: '#10b981' },
    purple: { primary: '#8b5cf6' }
  };

  // Get the theme-specific styles or default to empty object
  const selectedThemeStyles = themeStyles[theme] || {};

  // Merge base styles with theme-specific styles
  const mergedStyles = { ...baseStyles, ...selectedThemeStyles };

  // Apply variation color if custom color is not provided
  if (!customColor && variation !== 'default') {
    mergedStyles.customColor = variationColors[variation]?.primary;
  } else if (customColor) {
    mergedStyles.customColor = customColor;
  }

  return mergedStyles as ChatTheme;
};

// Adding generateChatStyles as an alias to maintain compatibility
export const generateChatStyles = getChatStyles;
