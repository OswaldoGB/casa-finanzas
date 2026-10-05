import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#6f67e8",
        borderRadius: 112,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        padding: 86,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 28,
          height: "100%",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: 34,
            height: 138,
            width: 138,
          }}
        />
        <div
          style={{
            background: "#ffffff",
            borderRadius: 34,
            height: 138,
            opacity: 0.72,
            width: 174,
          }}
        />
        <div
          style={{
            alignItems: "center",
            background: "#76e4be",
            borderRadius: 34,
            color: "#14221d",
            display: "flex",
            fontFamily: "sans-serif",
            fontSize: 92,
            fontWeight: 700,
            height: 174,
            justifyContent: "center",
            width: 174,
          }}
        >
          +
        </div>
        <div
          style={{
            background: "#ffffff",
            borderRadius: 34,
            height: 174,
            opacity: 0.9,
            width: 138,
          }}
        />
      </div>
    </div>,
    size,
  );
}
