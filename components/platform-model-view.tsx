"use client";
import { Component, Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import InfrastructureModel from "./infrastructure-model";
class Boundary extends Component<
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
export default function PlatformModelView({
  onFailure,
}: {
  onFailure: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: no-preference)");
    let visible = false;
    const update = () =>
      setActive(visible && motion.matches && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    if (root.current) observer.observe(root.current);
    document.addEventListener("visibilitychange", update);
    motion.addEventListener("change", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      motion.removeEventListener("change", update);
    };
  }, []);
  return (
    <Boundary onFailure={onFailure}>
      <div
        ref={root}
        className="platform-model-view"
        aria-label="Interactive 3D infrastructure model. Drag to rotate; the component details follow below."
      >
        <Canvas
          frameloop={active ? "always" : "demand"}
          orthographic
          dpr={[1, 1.5]}
          camera={{ position: [1, 18, 20], zoom: 42 }}
          gl={{ alpha: true, antialias: true }}
          onCreated={({ gl }) => {
            gl.setClearColor(
              getComputedStyle(document.body)
                .getPropertyValue("--color-bg-surface")
                .trim(),
              1,
            );
            gl.domElement.addEventListener("webglcontextlost", onFailure, {
              once: true,
            });
          }}
        >
          <Suspense fallback={null}>
            <InfrastructureModel labels signals={active} />
          </Suspense>
          <OrbitControls
            target={[1, 0, -1]}
            enableZoom={false}
            enablePan={false}
            minPolarAngle={0.3}
            maxPolarAngle={1.3}
          />
        </Canvas>
      </div>
    </Boundary>
  );
}
