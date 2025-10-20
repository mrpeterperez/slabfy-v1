import { useEffect } from 'react';

export function usePageTitle(title: string, includeAppName = true) {
  useEffect(() => {
    const fullTitle = includeAppName ? `${title} • Slabfy` : title;
    document.title = fullTitle;

    // Clean up - set back to default when component unmounts
    return () => {
      document.title = 'Slabfy';
    };
  }, [title, includeAppName]);
}