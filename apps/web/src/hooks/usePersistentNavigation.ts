import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';

/**
 * Persists the last visited route for a specific module to sessionStorage.
 * @param moduleName The unique name of the module (e.g., 'albums', 'artists')
 * @param rootPath The root path of the module (e.g., '/app/library/albums')
 */
export function usePersistentNavigation(moduleName: string, rootPath: string) {
  const location = useLocation();
  const storageKey = `last_visited_${moduleName}_route`;

  useEffect(() => {
    const currentPath = location.pathname.replace(/\/$/, '');
    const normalizedRoot = rootPath.replace(/\/$/, '');
    const isIndex = currentPath === normalizedRoot;

    if (isIndex) {
      sessionStorage.removeItem(storageKey);
    } else if (location.pathname.startsWith(normalizedRoot)) {
      sessionStorage.setItem(storageKey, location.pathname);
    }
  }, [location.pathname, rootPath, storageKey]);
}
