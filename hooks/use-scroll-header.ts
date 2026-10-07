"use client";
import { useEffect } from "react";
export function useScrollHeader(path: string) {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    const mobile = matchMedia("(max-width: 900px)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const scrollY = () =>
      Math.max(
        0,
        Math.min(
          window.scrollY,
          Math.max(0, document.documentElement.scrollHeight - innerHeight),
        ),
      );
    let last = scrollY();
    let offset = 0;
    let frame = 0;
    let distance = 0;
    const render = () => {
      header.style.setProperty("--header-scroll-offset", `${offset}px`);
      header.dataset.scrollHidden = String(offset >= distance && distance > 0);
    };
    const reset = () => {
      const top = Number.parseFloat(getComputedStyle(header).top) || 0;
      distance = header.offsetHeight + top * 2;
      offset = 0;
      last = scrollY();
      render();
    };
    const update = () => {
      frame = 0;
      const current = scrollY();
      const difference = current - last;
      last = current;
      const interacting = header.querySelector(
        '[data-open="true"], details[open], :focus-visible',
      );
      offset =
        !mobile.matches || reduced.matches || current <= 0 || interacting
          ? 0
          : Math.max(0, Math.min(distance, offset + difference));
      render();
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    reset();
    const observer = new ResizeObserver(reset);
    observer.observe(header);
    mobile.addEventListener("change", reset);
    reduced.addEventListener("change", reset);
    window.addEventListener("scroll", scroll, { passive: true });
    header.addEventListener("focusin", reset);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mobile.removeEventListener("change", reset);
      reduced.removeEventListener("change", reset);
      window.removeEventListener("scroll", scroll);
      header.removeEventListener("focusin", reset);
      header.style.removeProperty("--header-scroll-offset");
      delete header.dataset.scrollHidden;
    };
  }, [path]);
}
