/**
 * Payment endpoints live as serverless functions on the production deployment.
 * In the Lovable preview / local dev there is no /api route, which returns a
 * 404 HTML page. In those environments we call the production API absolutely
 * (its CORS config allows lovable + localhost origins).
 */
const PRODUCTION_API_ORIGIN = "https://borixexpress.com";

function hostServesApi(hostname: string): boolean {
  return (
    hostname === "borixexpress.com" ||
    hostname.endsWith(".borixexpress.com") ||
    hostname.endsWith(".vercel.app")
  );
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return normalized;
  if (hostServesApi(window.location.hostname)) return normalized;
  return `${PRODUCTION_API_ORIGIN}${normalized}`;
}
