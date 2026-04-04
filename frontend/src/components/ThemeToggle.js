import React from 'react';
import { Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-colors ${
        isDark 
          ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
      } ${className}`}
      data-testid="theme-toggle-btn"
      title={isDark ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}
    >
      {isDark ? <Sun weight="bold" className="w-5 h-5" /> : <Moon weight="bold" className="w-5 h-5" />}
    </button>
  );
};

export default ThemeToggle;
