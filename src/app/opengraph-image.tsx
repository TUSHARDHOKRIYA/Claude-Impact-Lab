import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
        }}
      >
        <div style={{ color: "#1157ce", fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>
          Kala Ghoda Khabar
        </div>
        <div style={{ color: "#1157ce", fontSize: 36, marginTop: 28 }}>
          Report a street condition in Kala Ghoda.
        </div>
      </div>
    ),
    { ...size },
  );
}
