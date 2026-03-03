import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://paikari.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/live", "/marketplace", "/running-bids", "/about", "/contact", "/faq", "/privacy", "/terms", "/auth/signin", "/auth/signup"],
        disallow: [
          "/admin/",
          "/seller-dashboard/",
          "/buyer-dashboard/",
          "/hub-manager/",
          "/qc-leader/",
          "/qc-checker/",
          "/delivery-point/",
          "/api/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
