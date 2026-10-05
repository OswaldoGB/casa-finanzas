import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#6f67e8",
        borderRadius: 40,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        padding: 30,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          height: "100%",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: 12,
            height: 48,
            width: 48,
          }}
        />
        <div
          style={{
            background: "#ffffff",
            borderRadius: 12,
            height: 48,
            opacity: 0.72,
            width: 62,
          }}
        />
        <div
          style={{
            alignItems: "center",
            background: "#76e4be",
            borderRadius: 12,
            color: "#14221d",
            display: "flex",
            fontFamily: "sans-serif",
            fontSize: 33,
            fontWeight: 700,
            height: 62,
            justifyContent: "center",
            width: 62,
          }}
        >
          +
        </div>
        <div
          style={{
            background: "#ffffff",
            borderRadius: 12,
            height: 62,
            opacity: 0.9,
            width: 48,
          }}
        />
      </div>
    </div>,
    size,
  );
}
