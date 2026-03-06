import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://trainer-hub-psi.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/portal", "/api", "/invite"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
