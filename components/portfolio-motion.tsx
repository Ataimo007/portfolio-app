"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useNativeScrollReveal } from "@/hooks/use-native-scroll-reveal";

const Scene = dynamic(() => import("./scroll-architecture-scene"), {
  ssr: false,
});

export default function PortfolioMotion() {
  const background = useRef<HTMLDivElement>(null);
  const [mobile, setMobile] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  useNativeScrollReveal();

  useEffect(() => {
    const layer = background.current;
    const root = layer?.closest<HTMLElement>(".portfolio-home");
    if (!layer || !root) return;
    const motion = matchMedia("(prefers-reduced-motion: no-preference)");
    const pointer = matchMedia("(hover: hover) and (pointer: fine)");
    const desktop = matchMedia("(min-width: 901px)");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2");
    const supported = Boolean(context);
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    const update = () => {
      setMobile(!desktop.matches);
      setEnabled(motion.matches && supported);
    };
    let frame = 0;
    let x = 50;
    let y = 35;
    const move = (event: PointerEvent) => {
      if (!motion.matches || !pointer.matches || event.pointerType === "touch")
        return;
      const bounds = layer.getBoundingClientRect();
      x = Math.max(
        0,
        Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100),
      );
      y = Math.max(
        0,
        Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100),
      );
      if (!frame)
        frame = requestAnimationFrame(() => {
          layer.style.setProperty("--pointer-x", `${x}%`);
          layer.style.setProperty("--pointer-y", `${y}%`);
          frame = 0;
        });
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      layer.style.removeProperty("--pointer-x");
      layer.style.removeProperty("--pointer-y");
    };
    const change = () => {
      reset();
      update();
    };
    const scenes = [...root.querySelectorAll<HTMLElement>("[data-scene]")];
    const visible = new Map<Element, number>();
    const sceneObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          visible.set(entry.target, entry.intersectionRatio),
        );
        const current = [...visible].sort((a, b) => b[1] - a[1])[0];
        if (!current || current[1] === 0) return;
        root
          .querySelectorAll<HTMLAnchorElement>("[data-scene-link]")
          .forEach((link) => {
            if (link.dataset.sceneLink === current[0].id)
              link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          });
      },
      { threshold: [0, 0.15, 0.4, 0.65] },
    );
    scenes.forEach((scene) => sceneObserver.observe(scene));
    update();
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", reset);
    motion.addEventListener("change", change);
    desktop.addEventListener("change", change);
    return () => {
      reset();
      sceneObserver.disconnect();
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", reset);
      motion.removeEventListener("change", change);
      desktop.removeEventListener("change", change);
    };
  }, []);

  return (
    <>
      <div
        ref={background}
        className="interactive-background tech-grid-bg"
        aria-hidden="true"
      >
        <div className="background-glow" />
        <div className="live-texture" />
      </div>
      {enabled && !failed && (
        <Scene mobile={mobile} onFailure={() => setFailed(true)} />
      )}
    </>
  );
}
