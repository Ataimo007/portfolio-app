"use client";

import { useEffect } from "react";

export function useNativeScrollReveal(selector = ".portfolio-home") {
  useEffect(() => {
    const root = document.querySelector(selector);
    if (!root) return;
    const elements = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const reveal = (element: HTMLElement) => {
      element.classList.remove("reveal-pending");
      element.classList.add("reveal-visible");
      element.dataset.revealed = "true";
      observer?.unobserve(element);
    };
    const reset = () => {
      observer?.disconnect();
      elements.forEach((element) =>
        element.classList.remove("reveal-pending", "reveal-visible"),
      );
    };
    const setup = () => {
      reset();
      if (media.matches) return;
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) reveal(entry.target as HTMLElement);
          });
        },
        { threshold: 0.12 },
      );
      elements.forEach((element) => {
        if (
          element.dataset.revealed ||
          element.getBoundingClientRect().top < innerHeight
        )
          reveal(element);
        else {
          element.classList.add("reveal-pending");
          observer?.observe(element);
        }
      });
    };
    const focus = (event: Event) => {
      const element = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-reveal]",
      );
      if (element) reveal(element);
    };
    setup();
    root.addEventListener("focusin", focus);
    media.addEventListener("change", setup);
    return () => {
      reset();
      root.removeEventListener("focusin", focus);
      media.removeEventListener("change", setup);
    };
  }, [selector]);
}
