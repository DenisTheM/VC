import { useState, useEffect, useCallback } from "react";

/**
 * Page navigation hook that syncs with browser history.
 * Enables browser back/forward buttons within the SPA.
 */
export function usePageNav(defaultPage: string) {
  const getPageFromHash = () => {
    const hash = window.location.hash.slice(1); // remove '#'
    return hash || defaultPage;
  };

  const [page, setPageState] = useState(getPageFromHash);

  // Navigate to a page and push to browser history
  const setPage = useCallback(
    (id: string) => {
      setPageState(id);
      const newHash = `#${id}`;
      if (window.location.hash !== newHash) {
        window.history.pushState(null, "", newHash);
      }
    },
    [],
  );

  // Listen for browser back/forward
  useEffect(() => {
    const onPopState = () => {
      setPageState(getPageFromHash());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Set initial hash if none present
  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, "", `#${defaultPage}`);
    }
  }, [defaultPage]);

  return [page, setPage] as const;
}
