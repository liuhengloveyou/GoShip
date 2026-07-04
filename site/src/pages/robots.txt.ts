import type { APIRoute } from "astro";

const getRobotsTxt = (siteURL: URL, sitemapURL: URL) => `
User-agent: *
Allow: /
Disallow: /admin/

Host: ${siteURL.origin}
Sitemap: ${sitemapURL.origin}/sitemap-index.xml
`;

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    return new Response("Missing site URL in Astro config.", { status: 500 });
  }
  const sitemapURL = new URL("sitemap-index.xml", site);
  return new Response(getRobotsTxt(site, sitemapURL));
};
