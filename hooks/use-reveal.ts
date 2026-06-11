import { useEffect, useRef } from "react";

/**
 * Attaches an IntersectionObserver to the returned ref.
 * When the element enters the viewport it gets the `is-visible` class,
 * which triggers the `ark-reveal` CSS animation defined in globals.css.
 */
export function useReveal<T extends HTMLElement>(
  options?: IntersectionObserverInit,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "-40px 0px", ...options },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
