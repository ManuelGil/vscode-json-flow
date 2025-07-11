import { type Color, colors } from '@webview/themes/colors';
import type { ColorMode } from '@xyflow/react';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  defaultColor?: Color;
  modeStorageKey?: string;
  colorStorageKey?: string;
  onColorModeChange?: (mode: ColorMode) => void;
};

type ThemeProviderState = {
  theme: Theme;
  color: Color;
  colorMode: ColorMode;
  setTheme: (theme: Theme) => void;
  setColor: (color: Color) => void;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  colorMode: 'light',
  color: 'neutral',
  setTheme: () => null,
  setColor: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

/**
 * ThemeProvider component for context and color mode management.
 * @param children - React children
 * @param defaultTheme - Default theme
 * @param defaultColor - Default color
 * @param modeStorageKey - Storage key for theme
 * @param colorStorageKey - Storage key for color
 * @param onColorModeChange - Handler for color mode change
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  defaultColor = 'neutral',
  modeStorageKey = 'vite-ui-theme',
  colorStorageKey = 'vite-ui-color',
  onColorModeChange,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(modeStorageKey) as Theme) || defaultTheme,
  );
  const [color, setColor] = useState<Color>(
    () => (localStorage.getItem(colorStorageKey) as Color) || defaultColor,
  );
  const [colorMode, setColorMode] = useState<ColorMode>('light');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    let newColorMode: ColorMode = 'light';
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
      newColorMode = systemTheme;
    } else {
      root.classList.add(theme);
      newColorMode = theme;
    }

    setColorMode(newColorMode);
    onColorModeChange?.(newColorMode);
    return () => {
      root.classList.remove('light', 'dark');
    };
  }, [theme, onColorModeChange]);

  useEffect(() => {
    const root = window.document.documentElement;
    colors.forEach((c) => root.classList.remove(c));
    root.classList.add(color);
  }, [color]);

  const value = {
    theme,
    color,
    colorMode,
    setTheme: (theme: Theme) => {
      localStorage.setItem(modeStorageKey, theme);
      setTheme(theme);
    },
    setColor: (color: Color) => {
      localStorage.setItem(colorStorageKey, color);
      setColor(color);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
