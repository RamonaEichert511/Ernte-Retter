import { useState, useEffect } from "react";

/**
 * Custom Hook: useLocalStorage (Bonus-Aufgabe)
 * Kapselt die localStorage-Logik in einem wiederverwendbaren Hook.
 */
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

export default useLocalStorage;
