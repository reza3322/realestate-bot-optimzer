
export type ThemeVariant = 'default' | 'modern' | 'minimal';

export interface ThemeStyles {
  container: string;
  font: string;
}

export interface ChatStylesType {
  [key: string]: {
    [key in ThemeVariant]: ThemeStyles;
  };
}

export const chatStyles: ChatStylesType = {
  light: {
    default: {
      container: 'bg-white border-gray-200 shadow-lg',
      font: 'text-gray-900'
    },
    modern: {
      container: 'bg-gray-50 border-gray-100 shadow-xl rounded-xl',
      font: 'text-gray-800'
    },
    minimal: {
      container: 'bg-white border-transparent shadow-none',
      font: 'text-gray-800'
    }
  },
  dark: {
    default: {
      container: 'bg-gray-900 border-gray-800 shadow-lg',
      font: 'text-gray-100'
    },
    modern: {
      container: 'bg-gray-800 border-gray-700 shadow-xl rounded-xl',
      font: 'text-gray-100'
    },
    minimal: {
      container: 'bg-gray-900 border-transparent shadow-none',
      font: 'text-gray-100'
    }
  }
};
