import type { MetadataRoute } from "next";

const BASE_URL = "https://www.lateglieria.it";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/menu", "/ordine", "/privacy", "/cookie-policy"],
        disallow: ["/admin", "/rider", "/api", "/stato-ordine"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
