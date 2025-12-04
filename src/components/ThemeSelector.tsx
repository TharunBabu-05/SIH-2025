import { Palette, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/ThemeSelector.css';

const ThemeSelector = () => {
  const { theme, setTheme, isDarkMode, toggleDarkMode } = useTheme();

  const themes = [
    { name: 'blue', color: '#667eea', label: 'Blue' },
    { name: 'purple', color: '#a855f7', label: 'Purple' },
    { name: 'green', color: '#10b981', label: 'Green' },
    { name: 'orange', color: '#f97316', label: 'Orange' },
    { name: 'red', color: '#ef4444', label: 'Red' },
    { name: 'dark', color: '#1f2937', label: 'Dark' },
  ];

  return (
    <div className="theme-selector-container">
      <button className="theme-toggle-btn" title="Theme Settings">
        <Palette size={20} />
      </button>
      
      <div className="theme-dropdown">
        <div className="theme-header">
          <h3>Choose Theme</h3>
          <button className="dark-mode-toggle" onClick={toggleDarkMode}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span>{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>
        </div>
        
        <div className="theme-options">
          {themes.map((t) => (
            <button
              key={t.name}
              className={`theme-option ${theme === t.name ? 'active' : ''}`}
              onClick={() => setTheme(t.name as any)}
              title={t.label}
            >
              <div 
                className="theme-color-preview" 
                style={{ background: t.color }}
              />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;
