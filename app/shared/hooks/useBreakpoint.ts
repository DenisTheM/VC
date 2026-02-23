import { useState, useEffect } from "react";

export interface Breakpoint {
  isMobile: boolean;   // <= 768px
  isTablet: boolean;   // <= 1024px
  isDesktop: boolean;  // > 1024px
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => calc(window.innerWidth));

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setBp(calc(window.innerWidth)), 100);
    };
    window.addEventListener("resize", handler);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", handler);
    };
  }, []);

  return bp;
}

function calc(w: number): Breakpoint {
  return {
    isMobile: w <= 768,
    isTablet: w > 768 && w <= 1024,
    isDesktop: w > 1024,
  };
}
