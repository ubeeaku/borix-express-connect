/**
 * Payment endpoints live as serverless functions on the production deployment.
 * In the Lovable preview / local dev there is no /api route, which returns a
 * 404 HTML page. In those environments we call the production API absolutely
 * (its CORS config allows lovable + localhost origins).
 *
 * Override the production origin with VITE_API_ORIGIN (e.g. your Vercel URL).
 */
const PRODUCTION_API_ORIGIN = (
  import.meta.env.VITE_API_ORIGIN || "https://borixexpress.com"
).replace(/\/$/, "");

const PRODUCTION_HOSTNAME = (() => {
  try {
    return new URL(PRODUCTION_API_ORIGIN).hostname;
  } catch {
    return "borixexpress.com";
  }
})();

function hostServesApi(hostname: string): boolean {
  return (
    hostname === PRODUCTION_HOSTNAME ||
    hostname.endsWith(`.${PRODUCTION_HOSTNAME}`) ||
    hostname.endsWith(".vercel.app")
  );
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return normalized;
  if (hostServesApi(window.location.hostname)) return normalized;
  return `${PRODUCTION_API_ORIGIN}${normalized}`;
}
