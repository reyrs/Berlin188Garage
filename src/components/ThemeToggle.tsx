import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/theme';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
      title={theme === 'light' ? 'Mode gelap' : 'Mode terang'}
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4 text-gray-600" />
      ) : (
        <Sun className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );
}
