import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#1d272d",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
        }}
      >
        <div style={{ color: "#ffffff", fontSize: 80, fontWeight: 700, lineHeight: 1.1 }}>
          Rastabaaz
        </div>
        <div style={{ color: "#f5c400", fontSize: 36, marginTop: 28 }}>
          Where Mumbai&apos;s monsoon road money went, and whether the fix held.
        </div>
      </div>
    ),
    { ...size },
  );
}
