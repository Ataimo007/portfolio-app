"use client";
import { useEffect } from "react";
export function useScrollHeader(path: string) {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    const mobile = matchMedia("(max-width: 900px)");
    let last = Math.max(0, window.scrollY);
    let travel = 0;
    let frame = 0;
    header.dataset.scrollHidden = "false";
    const update = () => {
      frame = 0;
      const current = Math.max(
        0,
        Math.min(
          window.scrollY,
          document.documentElement.scrollHeight - innerHeight,
        ),
      );
      const difference = current - last;
      travel =
        Math.sign(difference) === Math.sign(travel)
          ? travel + difference
          : difference;
      last = current;
      const interacting = header.querySelector(
        '[data-open="true"], details[open], :focus-visible',
      );
      if (!mobile.matches || current <= header.offsetHeight || interacting) {
        header.dataset.scrollHidden = "false";
        travel = 0;
      } else if (Math.abs(travel) >= 8) {
        header.dataset.scrollHidden = String(travel > 0);
        travel = 0;
      }
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const focus = () => {
      header.dataset.scrollHidden = "false";
    };
    mobile.addEventListener("change", update);
    window.addEventListener("scroll", scroll, { passive: true });
    header.addEventListener("focusin", focus);
    return () => {
      cancelAnimationFrame(frame);
      mobile.removeEventListener("change", update);
      window.removeEventListener("scroll", scroll);
      header.removeEventListener("focusin", focus);
      delete header.dataset.scrollHidden;
    };
  }, [path]);
}
