# Native DOM + R3F scroll architecture

Implemented in the portfolio homepage. No animation library was added.

## Files

```text
app/globals.css
app/layout.tsx
app/page.tsx
hooks/use-native-scroll-reveal.ts
components/portfolio-motion.tsx
components/scroll-camera-controller.tsx
components/scroll-architecture-scene.tsx
public/fonts/JetBrainsMono-Regular.woff2
public/fonts/JetBrainsMono-OFL.txt
```

`app/layout.tsx` loads Geist Sans and a locally stored JetBrains Mono font with `next/font/local`. Fonts require no network request during a build.

## Theme and reveal styles

```css
@import "tailwindcss";

@theme {
  --color-background: #050505;
  --color-panel: #0c0c0c;
  --color-divider: #1f1f1f;
  --color-foreground: #f5f5f5;
  --color-muted: #a3a3a3;
  --ease-terminal: cubic-bezier(0.16, 1, 0.3, 1);
}

@theme inline {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

.tech-grid {
  pointer-events: none;
  background-color: #050505;
  background-image: linear-gradient(#141414 1px, transparent 1px), linear-gradient(90deg, #141414 1px, transparent 1px);
  background-size: 40px 40px;
}

[data-reveal] {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.reveal-pending {
  @apply opacity-0 translate-y-4;
}

.reveal-visible,
.reveal-pending:focus-within {
  @apply opacity-100 translate-y-0;
}
```

Elements are visible in server-rendered HTML. Only offscreen elements receive the pending class after the hook initializes. Entering the viewport or receiving keyboard focus reveals them. Changing reduced-motion preferences restores visibility and removes the animated Canvas.

## Components

### `hooks/use-native-scroll-reveal.ts`

```ts
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
```

### `components/scroll-camera-controller.tsx`

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";

export const CAMERA_POSES = {
  hero: { position: [10, 9, 13], target: [-2.8, 0, 0] },
  architecture: { position: [0, 16, 0.1], target: [0, 0, 0] },
  contact: { position: [2.8, 1.5, 3.6], target: [1.2, 0.3, 0.4] },
} as const;

export function cameraBlend(delta: number, speed = 4) {
  return 1 - Math.exp(-speed * Math.max(0, delta));
}

export function cameraSegment(progress: number) {
  const p = MathUtils.clamp(progress, 0, 1);
  if (p <= 0.3)
    return {
      from: CAMERA_POSES.hero,
      to: CAMERA_POSES.architecture,
      mix: MathUtils.smoothstep(p, 0, 0.3),
    };
  return {
    from: CAMERA_POSES.architecture,
    to: CAMERA_POSES.contact,
    mix: MathUtils.smoothstep(p, 0.6, 0.8),
  };
}

export default function ScrollCameraController() {
  const range = useRef(1);
  const target = useRef(new Vector3(...CAMERA_POSES.hero.target));
  const initialized = useRef(false);
  useEffect(() => {
    const measure = () => {
      range.current = Math.max(
        1,
        document.documentElement.scrollHeight - innerHeight,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener("resize", measure, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  useFrame(({ camera }, delta) => {
    const { from, to, mix } = cameraSegment(window.scrollY / range.current);
    const alpha = initialized.current ? cameraBlend(delta) : 1;
    initialized.current = true;
    camera.position.x = MathUtils.lerp(
      camera.position.x,
      MathUtils.lerp(from.position[0], to.position[0], mix),
      alpha,
    );
    camera.position.y = MathUtils.lerp(
      camera.position.y,
      MathUtils.lerp(from.position[1], to.position[1], mix),
      alpha,
    );
    camera.position.z = MathUtils.lerp(
      camera.position.z,
      MathUtils.lerp(from.position[2], to.position[2], mix),
      alpha,
    );
    target.current.x = MathUtils.lerp(
      target.current.x,
      MathUtils.lerp(from.target[0], to.target[0], mix),
      alpha,
    );
    target.current.y = MathUtils.lerp(
      target.current.y,
      MathUtils.lerp(from.target[1], to.target[1], mix),
      alpha,
    );
    target.current.z = MathUtils.lerp(
      target.current.z,
      MathUtils.lerp(from.target[2], to.target[2], mix),
      alpha,
    );
    camera.lookAt(target.current);
  });
  return null;
}
```

### `components/scroll-architecture-scene.tsx`

```tsx
"use client";

import { Component, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import type { Group } from "three";
import ScrollCameraController, {
  CAMERA_POSES,
  cameraBlend,
} from "./scroll-camera-controller";

function ArchitecturalGrid() {
  const group = useRef<Group>(null);
  const nodes = [
    [-2, 0, -2],
    [2, 0, -2],
    [-2, 0, 2],
    [2, 0, 2],
  ] as const;
  useFrame(({ pointer }, delta) => {
    if (group.current) {
      group.current.rotation.y +=
        (pointer.x * 0.035 - group.current.rotation.y) * cameraBlend(delta, 3);
    }
  });
  return (
    <group ref={group}>
      <gridHelper
        args={[24, 24, "#333333", "#1f1f1f"]}
        position={[0, -0.1, 0]}
      />
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[1.5, 1.7, 1.5]} />
        <meshBasicMaterial color="#0c0c0c" />
        <Edges color="#eeeeee" />
      </mesh>
      {nodes.map((position, index) => (
        <group key={index} position={[...position]}>
          {[0, 1, 2].map((level) => (
            <mesh key={level} position={[0, 0.18 + level * 0.35, 0]}>
              <boxGeometry args={[0.9, 0.24, 0.9]} />
              <meshBasicMaterial color="#0c0c0c" />
              <Edges color="#777777" />
            </mesh>
          ))}
          <mesh position={[-position[0] / 2, 0.03, 0]}>
            <boxGeometry args={[2, 0.01, 0.015]} />
            <meshBasicMaterial color="#555555" />
          </mesh>
          <mesh position={[-position[0], 0.03, -position[2] / 2]}>
            <boxGeometry args={[0.015, 0.01, 2]} />
            <meshBasicMaterial color="#555555" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

class SceneBoundary extends Component<
  { children: React.ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function ScrollArchitectureScene({
  onFailure,
}: {
  onFailure: () => void;
}) {
  const [active, setActive] = useState(true);
  useEffect(() => {
    let onPage = true;
    const update = () => setActive(onPage && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      onPage = entry.isIntersecting;
      update();
    });
    const root = document.querySelector(".portfolio-home");
    if (root) observer.observe(root);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return (
    <div
      className="scroll-architecture-scene"
      data-testid="webgl-scene"
      aria-hidden="true"
    >
      <SceneBoundary onFailure={onFailure}>
        <Canvas
          dpr={[1, 1.5]}
          frameloop={active ? "always" : "never"}
          camera={{
            position: [...CAMERA_POSES.hero.position],
            fov: 32,
            near: 0.1,
            far: 80,
          }}
          gl={{ alpha: true, antialias: true }}
          eventSource={document.getElementById("main")!}
          eventPrefix="client"
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("webglcontextlost", onFailure, {
              once: true,
            });
            gl.domElement.dataset.ready = "true";
          }}
        >
          <ScrollCameraController />
          <ArchitecturalGrid />
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
```

### `components/portfolio-motion.tsx`

```tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useNativeScrollReveal } from "@/hooks/use-native-scroll-reveal";

const Scene = dynamic(() => import("./scroll-architecture-scene"), {
  ssr: false,
});

export default function PortfolioMotion() {
  const background = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  useNativeScrollReveal();

  useEffect(() => {
    const layer = background.current;
    const root = layer?.closest<HTMLElement>(".portfolio-home");
    if (!layer || !root) return;
    const motion = matchMedia("(prefers-reduced-motion: no-preference)");
    const pointer = matchMedia("(hover: hover) and (pointer: fine)");
    const desktop = matchMedia("(min-width: 900px)");
    const canvas = document.createElement("canvas");
    const supported = !!canvas.getContext("webgl2");
    const update = () =>
      setEnabled(
        motion.matches &&
          desktop.matches &&
          supported &&
          navigator.hardwareConcurrency > 4,
      );
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
    update();
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", reset);
    motion.addEventListener("change", change);
    desktop.addEventListener("change", change);
    return () => {
      reset();
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
        className="interactive-background tech-grid"
        aria-hidden="true"
      >
        <div className="background-glow" />
      </div>
      {enabled && !failed && <Scene onFailure={() => setFailed(true)} />}
    </>
  );
}
```

## DOM integration

The real homepage imports `PortfolioMotion` once. It dynamically loads the Canvas on eligible desktops. The Canvas stays fixed while the HTML scrolls normally; it is not remounted when moving between sections. The hero uses its static diagram only when the background Canvas is unavailable.

```tsx
<div className="portfolio-home">
  <PortfolioMotion />
  <section className="hero">
    <div className="hero-copy">
      <h1>Complex systems. Clear thinking.</h1>
    </div>
    <HeroTopology staticOnly />
  </section>
  <section className="section selected-work">
    <div data-reveal="terminal">Selected engineering</div>
    <article data-reveal="grid-card">Project content</article>
  </section>
  <section className="section contact-callout">
    <div data-reveal="terminal">Let’s think it through.</div>
  </section>
</div>
```

## Scroll mapping and performance

| Document scroll | Camera |
| --- | --- |
| 0% | Distant architectural perspective |
| 0–30% | Smooth movement into the top-down view |
| 30–60% | Top-down perspective holds |
| 60–80% | Smooth movement into the macro view |
| 80–100% | Macro perspective holds |

Scroll progress is `window.scrollY / (document.documentElement.scrollHeight - innerHeight)`. The denominator is cached and updated by ResizeObserver and window resize, including late image/font layout changes. `useFrame` reads scrollY directly without React scroll state, scroll context or a scroll listener. Camera position and look target use `MathUtils.lerp` with `1 - exp(-4 * delta)` damping. The top-down stage uses a distant perspective camera, not a camera-type switch.

DPR is capped at 1.5. The scene uses basic materials and geometric edges, without postprocessing or shadow maps. Rendering pauses when the document is hidden or the homepage is outside the viewport. Small screens, low logical CPU counts, reduced motion and missing/lost WebGL use the static diagram. Actual FPS depends on GPU, browser and device; refresh-independent damping is tested at 60 Hz and 140 Hz.

## Run and verify

Inside the Dev Container:

```bash
npm ci
npm run check
npm run dev
```

Open forwarded port 3000. The review production preview is on port 3003. Do not run concurrent builds and dev servers against the same `.next` directory.

## Local Compose

```bash
python3 scripts/init-compose-env.py
docker compose --env-file .env.compose --profile app up -d --build app
```

Skip environment initialization when `.env.compose` already exists. This rebuilds the local app on port 3002. Infrastructure services retain their volumes. From the Dev Container, use `host.docker.internal:3002` to reach the Mac's published port.

## Kubernetes deployment

Use an existing configured cluster and registry. Replace the registry, tag and domain below with your real values. Configure domain, TLS, secrets and image access following `infra/kubernetes/README.md` before the first deployment. The current manifests still contain placeholder hostnames.

```bash
docker build --build-arg SITE_URL=https://YOUR_DOMAIN -t YOUR_REGISTRY/ataimo-portfolio:YOUR_TAG .
docker push YOUR_REGISTRY/ataimo-portfolio:YOUR_TAG
kubectl -n portfolio set image deployment/app app=YOUR_REGISTRY/ataimo-portfolio:YOUR_TAG
kubectl -n portfolio rollout status deployment/app
```

For a first deployment, update the image in `infra/kubernetes/app.yaml`, then apply `kubectl apply -k infra/kubernetes` after completing the infrastructure setup. The set-image command above is for an existing deployment. No cloud resources or public deployment were changed by this implementation.

## Sources

- [Tailwind theme variables](https://tailwindcss.com/docs/theme)
- [R3F useFrame and delta](https://r3f.docs.pmnd.rs/api/hooks)
