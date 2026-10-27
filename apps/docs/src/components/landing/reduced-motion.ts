import { useEffect, useState } from "react";

/**
 * Whether the visitor asked the page to keep still.
 *
 * The landing's two moving surfaces — the shuffled deck and the terminal
 * sequence — read one query, so a reader who asked for less motion never sees a
 * card slide or a window open. `false` on the server, where the query does not
 * exist; the effect reports the real answer before the first animated frame.
 */
export const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);

    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
};
