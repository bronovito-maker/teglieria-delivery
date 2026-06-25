/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' ${isProd ? "" : "'unsafe-eval'"} https://maps.googleapis.com https://www.googletagmanager.com https://connect.facebook.net https://va.vercel-scripts.com https://cdn.zirel.org`.replace(/\s+/g, " ").trim(),
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: https://*.zirel.org",
      "font-src 'self' data: https://fonts.gstatic.com",
      `connect-src 'self' https: wss: ${isProd ? "" : "http: ws:"} https://vitals.vercel-insights.com https://*.zirel.org https://*.up.railway.app`.replace(/\s+/g, " ").trim(),
      "frame-src 'self' https://*.zirel.org",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
