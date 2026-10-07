"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";

export const CAMERA_POSES = {
  hero: { position: [14, 16, 24], target: [0, 0, -1] },
  architecture: { position: [1, 42, -3.9], target: [1, 0, -4] },
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
