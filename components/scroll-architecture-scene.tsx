"use client";

import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import InfrastructureModel from "./infrastructure-model";
import type { Points } from "three";
import ScrollCameraController, {
  CAMERA_POSES,
} from "./scroll-camera-controller";

function SceneReady() {
  const ready = useRef(false);
  useFrame(({ gl }) => {
    if (!ready.current) {
      gl.domElement.dataset.ready = "true";
      ready.current = true;
    }
  });
  return null;
}

function LiveField() {
  const points = useRef<Points>(null);
  const positions = useMemo(() => {
    const data = new Float32Array(1800);
    for (let i = 0; i < 600; i++) {
      data[i * 3] = Math.sin(i * 127.1) * 14;
      data[i * 3 + 1] = Math.cos(i * 63.7) * 5;
      data[i * 3 + 2] = Math.sin(i * 31.3) * 14;
    }
    return data;
  }, []);
  const color = useMemo(
    () =>
      getComputedStyle(document.body)
        .getPropertyValue("--color-accent-primary")
        .trim(),
    [],
  );
  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y += delta * 0.018;
  });
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.035}
        transparent
        opacity={0.35}
        depthWrite={false}
      />
    </points>
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
  mobile = false,
}: {
  onFailure: () => void;
  mobile?: boolean;
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
          dpr={mobile ? 1 : [1, 1.5]}
          frameloop={active ? "always" : "never"}
          camera={{
            position: [...CAMERA_POSES.hero.position],
            fov: mobile ? 70 : 32,
            near: 0.1,
            far: 80,
          }}
          gl={{
            alpha: true,
            antialias: !mobile,
            powerPreference: mobile ? "low-power" : "high-performance",
          }}
          eventSource={document.getElementById("main")!}
          eventPrefix="client"
          onCreated={({ gl }) => {
            const base = getComputedStyle(document.body)
              .getPropertyValue("--color-bg-base")
              .trim();
            gl.setClearColor(base, 0);
            gl.domElement.addEventListener("webglcontextlost", onFailure, {
              once: true,
            });
          }}
        >
          <ScrollCameraController />
          <Suspense fallback={null}>
            <InfrastructureModel signals={active} />
            <SceneReady />
          </Suspense>
          {!mobile && <LiveField />}
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
