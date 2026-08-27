import { useEffect, useState } from 'react';

const locationChangeEvent = 'popstate';

export function navigateTo(path: string) {
  if (window.location.pathname !== path) {
    window.history.pushState(null, '', path);
  }

  window.dispatchEvent(new Event(locationChangeEvent));
}

export function useCurrentPath() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener(locationChangeEvent, handleLocationChange);

    return () => {
      window.removeEventListener(locationChangeEvent, handleLocationChange);
    };
  }, []);

  return path;
}
