import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type Theme = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themes = {
  blue: {
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#4facfe',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    rgb: '102, 126, 234',
    rgbSecondary: '118, 75, 162',
  },
  purple: {
    primary: '#a855f7',
    secondary: '#ec4899',
    accent: '#f472b6',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
    rgb: '168, 85, 247',
    rgbSecondary: '236, 72, 153',
  },
  green: {
    primary: '#10b981',
    secondary: '#059669',
    accent: '#34d399',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    rgb: '16, 185, 129',
    rgbSecondary: '5, 150, 105',
  },
  orange: {
    primary: '#f97316',
    secondary: '#ea580c',
    accent: '#fb923c',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    rgb: '249, 115, 22',
    rgbSecondary: '234, 88, 12',
  },
  red: {
    primary: '#ef4444',
    secondary: '#dc2626',
    accent: '#f87171',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    rgb: '239, 68, 68',
    rgbSecondary: '220, 38, 38',
  },
  dark: {
    primary: '#1f2937',
    secondary: '#111827',
    accent: '#374151',
    gradient: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
    rgb: '31, 41, 55',
    rgbSecondary: '17, 24, 39',
  },
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('blue');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    
    if (savedTheme) setTheme(savedTheme);
    if (savedDarkMode) setIsDarkMode(savedDarkMode);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = document.documentElement;
    const currentTheme = themes[theme];
    
    root.style.setProperty('--primary-color', currentTheme.primary);
    root.style.setProperty('--secondary-color', currentTheme.secondary);
    root.style.setProperty('--accent-color', currentTheme.accent);
    root.style.setProperty('--gradient', currentTheme.gradient);
    root.style.setProperty('--primary-rgb', currentTheme.rgb);
    root.style.setProperty('--secondary-rgb', currentTheme.rgbSecondary);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode.toString());
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
