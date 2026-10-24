import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

function readSaved() {
  try {
    return JSON.parse(localStorage.getItem('darkMode')) === true;
  } catch {
    return false;
  }
}

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(readSaved);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.body.classList.toggle('bg-gray-900', darkMode);
    try {
      localStorage.setItem('darkMode', JSON.stringify(darkMode));
    } catch {
      /* storage unavailable */
    }
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme: () => setDarkMode((d) => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
