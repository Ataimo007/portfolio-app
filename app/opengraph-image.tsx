import { ImageResponse } from "next/og";
export const alt =
  "Ataimo Edem — API Management, Solutions Architecture & Customer Engineering";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#07111f",
        color: "#eaf4ff",
        padding: 80,
      }}
    >
      <div style={{ fontSize: 24, color: "#45c6ff", letterSpacing: 6 }}>
        ATAIMO EDEM
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 76,
          marginTop: 40,
          lineHeight: 1.1,
        }}
      >
        <span>I design, troubleshoot</span>
        <span>and evolve.</span>
      </div>
      <div style={{ fontSize: 32, marginTop: 35, color: "#8ca3b8" }}>
        Enterprise API platforms.
      </div>
      <div style={{ fontSize: 20, marginTop: 60 }}>
        API Management · Solutions Architecture · Customer Engineering
      </div>
    </div>,
    size,
  );
}
