import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 30% 24%, rgba(244,143,86,0.96) 0%, rgba(217,106,43,1) 42%, rgba(185,85,33,1) 100%)",
          color: "#FFFFFF",
          fontSize: 150,
          fontWeight: 950,
          fontFamily: "Helvetica Neue, Arial, sans-serif",
          letterSpacing: "-0.13em",
          lineHeight: 0.82,
          transform: "translateX(-1px) scaleX(1.06) translateY(1px)",
          borderRadius: 40,
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -7px 12px rgba(120,44,8,0.18)",
        }}
      >
        LT
      </div>
    ),
    size
  );
}
