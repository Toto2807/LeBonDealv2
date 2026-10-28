import { useEffect, useState } from 'react';

// Retarde la propagation d'une valeur (ex. la recherche) pour ne pas appeler l'API à chaque frappe.
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

