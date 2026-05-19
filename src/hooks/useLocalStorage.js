import { useState, useEffect } from 'react';

export function useLocalStorage(key, defaultValue) {
  const prefixedKey = `fzti_${key}`;

  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(prefixedKey);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(prefixedKey, JSON.stringify(value));
    } catch {
      // storage full or unavailable
    }
  }, [prefixedKey, value]);

  return [value, setValue];
}
