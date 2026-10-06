"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Component, useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, CatmullRomCurve3, Vector3 } from "three";
import type { Group, Mesh } from "three";

const cyan = "#45c6ff",
  warm = "#ff9a4d";
const nodes = [
  { position: [-2.3, 0, -1.7], label: "IDENTITY", kind: "identity" },
  { position: [0.7, 0, -2.3], label: "CLOUD", kind: "cloud" },
  { position: [-2.5, 0, 0.8], label: "SERVICES", kind: "servers" },
  { position: [2.2, 0, 1.2], label: "KUBERNETES", kind: "containers" },
  { position: [2.8, 0, -1.3], label: "DATA", kind: "data" },
  { position: [-0.4, 0, 2.3], label: "TELEMETRY", kind: "telemetry" },
] as const;
const routes = nodes.map(
  ({ position: [x, , z] }) =>
    new CatmullRomCurve3(
      [
        new Vector3(x, 0.04, z),
        new Vector3(x * 0.7, 0.04, z),
        new Vector3(x * 0.4, 0.04, z * 0.4),
        new Vector3(x * 0.15, 0.04, z * 0.4),
        new Vector3(0, 0.04, 0),
      ],
      false,
      "centripetal",
    ),
);

function Platform({
  size = 1.2,
  color = cyan,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <>
      <RoundedBox
        position={[0, -0.2, 0]}
        args={[size, 0.2, size]}
        radius={0.07}
        smoothness={3}
      >
        <meshStandardMaterial
          color="#163247"
          metalness={0.35}
          roughness={0.35}
        />
      </RoundedBox>
      <RoundedBox
        position={[0, -0.085, 0]}
        args={[size * 0.94, 0.035, size * 0.94]}
        radius={0.045}
        smoothness={3}
      >
        <meshBasicMaterial color={color} />
      </RoundedBox>
      <RoundedBox
        position={[0, -0.035, 0]}
        args={[size * 0.9, 0.07, size * 0.9]}
        radius={0.045}
        smoothness={3}
      >
        <meshStandardMaterial
          color="#213d51"
          metalness={0.25}
          roughness={0.4}
        />
      </RoundedBox>
    </>
  );
}
function Screen() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#071a28";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = cyan;
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, 472, 472);
    ctx.fillStyle = cyan;
    ctx.font = "bold 100px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("API", 256, 270);
    ctx.font = "20px monospace";
    ctx.fillStyle = "#9bb0c3";
    ctx.fillText("G A T E W A Y", 256, 330);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i === 2 ? warm : cyan;
      ctx.fillRect(160 + i * 70, 395, 38, 5);
    }
    return new CanvasTexture(c);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, 0.92, 0.481]}>
      <planeGeometry args={[1.04, 1.04]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
function NodeLabel({ text, color }: { text: string; color: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.font = "26px monospace";
    ctx.textAlign = "center";
    ctx.fillText(text, 256, 42);
    return new CanvasTexture(canvas);
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite
      position={text === "IDENTITY" ? [0, 1.35, 0] : [0, -0.48, 0.25]}
      scale={[1.55, 0.194, 1]}
    >
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        toneMapped={false}
      />
    </sprite>
  );
}
function Infrastructure({ kind }: { kind: (typeof nodes)[number]["kind"] }) {
  if (kind === "servers")
    return (
      <>
        {[0, 1, 2].map((i) => (
          <group key={i} position={[0, 0.2 + i * 0.31, 0]}>
            <RoundedBox args={[0.86, 0.25, 0.65]} radius={0.04} smoothness={3}>
              <meshStandardMaterial
                color="#244156"
                metalness={0.3}
                roughness={0.35}
              />
            </RoundedBox>
            <mesh position={[-0.14, 0, 0.331]}>
              <boxGeometry args={[0.44, 0.025, 0.012]} />
              <meshBasicMaterial color={cyan} />
            </mesh>
            <mesh position={[0.29, 0, 0.335]}>
              <sphereGeometry args={[0.027, 8, 8]} />
              <meshBasicMaterial color={warm} />
            </mesh>
          </group>
        ))}
      </>
    );
  if (kind === "containers")
    return (
      <>
        {[
          [-0.24, 0.24, 0],
          [0.24, 0.24, 0],
          [0, 0.68, 0],
        ].map((p, i) => (
          <group key={i} position={p as [number, number, number]}>
            <RoundedBox args={[0.41, 0.4, 0.61]} radius={0.025} smoothness={3}>
              <meshStandardMaterial
                color="#246487"
                metalness={0.2}
                roughness={0.35}
              />
            </RoundedBox>
            {[-0.12, 0, 0.12].map((x) => (
              <mesh key={x} position={[x, 0, 0.312]}>
                <boxGeometry args={[0.018, 0.3, 0.01]} />
                <meshBasicMaterial color="#4b9fc2" />
              </mesh>
            ))}
          </group>
        ))}
      </>
    );
  if (kind === "data")
    return (
      <>
        {[0, 1, 2].map((i) => (
          <group key={i} position={[0, 0.17 + i * 0.25, 0]}>
            <mesh>
              <cylinderGeometry args={[0.34, 0.34, 0.23, 32]} />
              <meshStandardMaterial
                color="#28536c"
                metalness={0.4}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[0, 0.115, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.34, 0.012, 6, 32]} />
              <meshBasicMaterial color={cyan} />
            </mesh>
          </group>
        ))}
      </>
    );
  if (kind === "identity")
    return (
      <group position={[0, 0.58, 0]}>
        <RoundedBox args={[0.7, 0.86, 0.23]} radius={0.08} smoothness={3}>
          <meshStandardMaterial
            color="#4b3930"
            metalness={0.3}
            roughness={0.35}
          />
        </RoundedBox>
        <mesh position={[0, 0.1, 0.13]}>
          <torusGeometry args={[0.14, 0.027, 8, 24, Math.PI]} />
          <meshBasicMaterial color={warm} />
        </mesh>
        <RoundedBox
          args={[0.38, 0.28, 0.06]}
          position={[0, -0.1, 0.15]}
          radius={0.04}
          smoothness={3}
        >
          <meshBasicMaterial color={warm} />
        </RoundedBox>
        <mesh position={[0, -0.08, 0.19]}>
          <circleGeometry args={[0.025, 12]} />
          <meshBasicMaterial color="#483025" />
        </mesh>
      </group>
    );
  if (kind === "cloud")
    return (
      <group position={[0, 0.5, 0]}>
        {[
          [-0.26, 0, 0.21],
          [0, 0.12, 0.3],
          [0.27, 0, 0.22],
        ].map(([x, y, r], i) => (
          <mesh key={i} position={[x, y, 0]}>
            <sphereGeometry args={[r, 24, 16]} />
            <meshStandardMaterial
              color="#6dabc3"
              metalness={0.12}
              roughness={0.3}
            />
          </mesh>
        ))}
        <RoundedBox
          position={[0, -0.1, 0]}
          args={[0.68, 0.25, 0.4]}
          radius={0.1}
          smoothness={3}
        >
          <meshStandardMaterial
            color="#6dabc3"
            metalness={0.12}
            roughness={0.3}
          />
        </RoundedBox>
      </group>
    );
  return (
    <group position={[0, 0.4, 0]}>
      <RoundedBox args={[0.82, 0.65, 0.2]} radius={0.04} smoothness={3}>
        <meshStandardMaterial
          color="#244156"
          metalness={0.25}
          roughness={0.4}
        />
      </RoundedBox>
      {[0.12, 0.27, 0.38, 0.22, 0.43].map((h, i) => (
        <mesh key={i} position={[-0.27 + i * 0.135, -0.23 + h / 2, 0.11]}>
          <boxGeometry args={[0.065, h, 0.015]} />
          <meshBasicMaterial color={i === 4 ? warm : cyan} />
        </mesh>
      ))}
    </group>
  );
}
function Architecture() {
  const group = useRef<Group>(null),
    packets = useRef<(Mesh | null)[]>([]);
  const get = useThree((state) => state.get);
  const size = useThree((state) => state.size);
  useEffect(() => {
    const camera = get().camera;
    camera.zoom = Math.min(size.width / 8.7, size.height / 6.7);
    camera.updateProjectionMatrix();
  }, [get, size]);
  useFrame(({ clock, pointer }, delta) => {
    if (group.current) {
      const blend = Math.min(delta * 3, 1);
      group.current.rotation.y +=
        (pointer.x * 0.08 - group.current.rotation.y) * blend;
      group.current.rotation.x +=
        (-pointer.y * 0.035 - group.current.rotation.x) * blend;
      group.current.position.y = Math.sin(clock.elapsedTime * 0.55) * 0.045;
    }
    packets.current.forEach((mesh, i) => {
      if (mesh) {
        const t = (clock.elapsedTime * 0.2 + i * 0.17) % 1;
        mesh.position.copy(
          routes[i % routes.length].getPoint(i === 0 ? t : 1 - t),
        );
        mesh.position.y += 0.045;
      }
    });
  });
  return (
    <group ref={group} position={[0, 0, 0]}>
      <Platform size={1.8} />
      <RoundedBox
        position={[0, 0.92, 0]}
        args={[1.32, 1.7, 0.94]}
        radius={0.12}
        smoothness={4}
      >
        <meshStandardMaterial
          color="#31526a"
          metalness={0.35}
          roughness={0.3}
        />
      </RoundedBox>
      <Screen />
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.671, 0.6 + i * 0.23, 0]}>
          <boxGeometry args={[0.015, 0.045, 0.57]} />
          <meshBasicMaterial color={i === 0 ? warm : cyan} />
        </mesh>
      ))}
      <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.95, 1.8, 64]} />
        <meshBasicMaterial
          color={cyan}
          transparent
          opacity={0.045}
          depthWrite={false}
        />
      </mesh>
      {nodes.map((node, i) => (
        <group key={node.kind} position={[...node.position]}>
          <Platform color={i === 0 ? warm : cyan} />
          <Infrastructure kind={node.kind} />
          <NodeLabel text={node.label} color={i === 0 ? warm : "#b8cfdf"} />
        </group>
      ))}
      {routes.map((curve, i) => (
        <group key={i}>
          <mesh>
            <tubeGeometry args={[curve, 40, 0.032, 6, false]} />
            <meshBasicMaterial color="#122c3d" />
          </mesh>
          <mesh position={[0, 0.038, 0]}>
            <tubeGeometry args={[curve, 40, 0.011, 6, false]} />
            <meshBasicMaterial color={i === 0 ? warm : cyan} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            packets.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.042, 10, 10]} />
          <meshBasicMaterial color={i % 6 === 0 ? warm : cyan} />
        </mesh>
      ))}
    </group>
  );
}
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
export default function TopologyScene({
  onFailure,
}: {
  onFailure: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  return (
    <div ref={ref} className="webgl-scene" data-testid="webgl-scene">
      <Boundary onFailure={onFailure}>
        <Canvas
          orthographic
          dpr={[1, 1.5]}
          frameloop={visible ? "always" : "never"}
          camera={{ position: [7, 6, 8], zoom: 65, near: 0.1, far: 50 }}
          gl={{ alpha: true, antialias: true }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("webglcontextlost", onFailure, {
              once: true,
            });
            gl.domElement.dataset.ready = "true";
          }}
        >
          <ambientLight intensity={1.7} />
          <directionalLight
            position={[3, 7, 5]}
            intensity={3}
            color="#bde7ff"
          />
          <directionalLight
            position={[-4, 3, -2]}
            intensity={1.7}
            color="#ffbf8b"
          />
          <pointLight position={[0, 2, 3]} intensity={8} color={cyan} />
          <Architecture />
        </Canvas>
      </Boundary>
    </div>
  );
}
