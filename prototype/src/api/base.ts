/**
 * Where the API lives. Same origin by default: on Vercel, /api is rewritten to the
 * Render API (prototype/vercel.json), so the session cookie is first-party and works in
 * Safari, private windows and any browser that blocks third-party cookies.
 * A direct cross-origin API URL is used only when explicitly requested with
 * VITE_API_CROSS_ORIGIN=true (plus VITE_API_URL).
 */
export const API_BASE =
  import.meta.env.VITE_API_CROSS_ORIGIN === "true" ? ((import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "") : "";
