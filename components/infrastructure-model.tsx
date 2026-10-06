"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges, Line, useTexture } from "@react-three/drei";
import {
  CanvasTexture,
  SRGBColorSpace,
  MathUtils,
  Vector3,
  Quaternion,
  type Mesh,
  type Group,
} from "three";
import { infrastructure, infrastructureEdges } from "@/lib/infrastructure";

function ModelLabel({ text }: { text: string }) {
  const texture = useMemo(() => {
    const css = getComputedStyle(document.body);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    const font = `64px ${css.getPropertyValue("--font-mono").trim()}`;
    context.font = font;
    canvas.width = Math.ceil(context.measureText(text).width + 48);
    canvas.height = 128;
    context.fillStyle = css.getPropertyValue("--color-bg-surface").trim();
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = css.getPropertyValue("--color-border-grid").trim();
    context.lineWidth = 4;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    context.font = font;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = css.getPropertyValue("--color-text-main").trim();
    context.fillText(text, canvas.width / 2, 64);
    const value = new CanvasTexture(canvas);
    value.colorSpace = SRGBColorSpace;
    return value;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite
      position={[0, 0.3, 1]}
      scale={[(texture.image.width / 128) * 0.4, 0.4, 1]}
    >
      <spriteMaterial
        map={texture}
        toneMapped={false}
        depthTest={false}
        depthWrite={false}
      />
    </sprite>
  );
}

function Logo({ url }: { url: string }) {
  const texture = useTexture(url);
  const image = texture.image as HTMLImageElement;
  const ratio = image.width / image.height;
  return (
    <mesh position={[0, 1.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry
        args={[ratio > 1 ? 1.35 : 1.1 * ratio, ratio > 1 ? 1.35 / ratio : 1.1]}
      />
      <meshBasicMaterial
        map={texture}
        transparent
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}
function Flow({
  from,
  to,
  color,
  signals,
}: {
  from: (typeof infrastructure)[number];
  to: (typeof infrastructure)[number];
  color: string;
  signals: boolean;
}) {
  const dot = useRef<Mesh>(null);
  const path = useMemo(() => {
    const a = new Vector3(from.position[0], 0.12, from.position[2] + 0.9);
    const b = new Vector3(to.position[0], 0.12, to.position[2] - 0.9);
    const lane = from.id === "gateway" ? -2 : (a.z + b.z) / 2;
    const points =
      from.id === "client" && to.id === "mail"
        ? [a, new Vector3(9, 0.12, a.z), new Vector3(9, 0.12, b.z), b]
        : [a, new Vector3(a.x, 0.12, lane), new Vector3(b.x, 0.12, lane), b];
    const distances = points.slice(1).map((p, i) => p.distanceTo(points[i]));
    const total = distances.reduce((a, b) => a + b, 0);
    const direction = b
      .clone()
      .sub(points[points.length - 2])
      .normalize();
    const rotation = new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      direction,
    );
    return { points, distances, total, rotation };
  }, [from, to]);
  useFrame(({ clock }) => {
    if (!signals || !dot.current) return;
    let distance = ((clock.elapsedTime / 6 + from.layer / 4) % 1) * path.total;
    for (let i = 0; i < path.distances.length; i++) {
      if (distance <= path.distances[i]) {
        dot.current.position.lerpVectors(
          path.points[i],
          path.points[i + 1],
          path.distances[i] ? distance / path.distances[i] : 0,
        );
        break;
      }
      distance -= path.distances[i];
    }
  });
  return (
    <group>
      <Line
        points={path.points}
        color={color}
        lineWidth={1.2}
        transparent
        opacity={0.5}
      />
      <mesh
        position={path.points[path.points.length - 1]}
        quaternion={path.rotation}
      >
        <coneGeometry args={[0.12, 0.3, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {signals && (
        <mesh ref={dot}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
    </group>
  );
}
export default function InfrastructureModel({
  labels = false,
  signals = false,
}: {
  labels?: boolean;
  signals?: boolean;
}) {
  const group = useRef<Group>(null);
  const palette = useMemo(() => {
    const css = getComputedStyle(document.body);
    const token = (name: string) =>
      css.getPropertyValue(`--color-${name}`).trim();
    return {
      surface: token("bg-surface"),
      grid: token("border-grid"),
      primary: token("accent-primary"),
      secondary: token("accent-secondary"),
      warm: token("accent-warm"),
    };
  }, []);
  useFrame(({ pointer }, delta) => {
    if (group.current && !labels)
      group.current.rotation.y = MathUtils.lerp(
        group.current.rotation.y,
        pointer.x * 0.08,
        1 - Math.exp(-3 * delta),
      );
  });
  return (
    <group ref={group}>
      <mesh position={[0, -0.18, 0.4]}>
        <boxGeometry args={[18, 0.2, 13]} />
        <meshBasicMaterial color={palette.surface} />
        <Edges color={palette.primary} />
      </mesh>
      {labels && (
        <group position={[-6, 0, -5.6]}>
          <ModelLabel text="ONE AZURE VM · K3s" />
        </group>
      )}
      {infrastructureEdges.map(([from, to]) => (
        <Flow
          key={`${from}-${to}`}
          from={infrastructure.find((n) => n.id === from)!}
          to={infrastructure.find((n) => n.id === to)!}
          color={to === "relay" ? palette.warm : palette.primary}
          signals={signals}
        />
      ))}
      {infrastructure.map((node) => (
        <group key={node.id} position={[...node.position]}>
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[2.5, 0.7, 1.7]} />
            <meshBasicMaterial color={palette.surface} />
            <Edges color={palette[node.tone]} />
          </mesh>
          <mesh position={[0, 0.84, 0]}>
            <boxGeometry args={[1.6, 0.3, 1.3]} />
            <meshBasicMaterial color={palette.surface} />
            <Edges color={palette[node.tone]} />
          </mesh>
          <Logo url={node.logo} />
          {labels && (
            <ModelLabel
              text={node.id === "relay" ? "SMTP2GO · EXTERNAL" : node.label}
            />
          )}
        </group>
      ))}
    </group>
  );
}
