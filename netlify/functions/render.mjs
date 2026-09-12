/* Public page renderer. Every page of the site is rendered from the
   content document in the database — static files (assets, admin app)
   take precedence via preferStatic. Published pages are edge-cached
   and purged on publish; ?preview=1 renders the draft for admins. */
import { getContent } from "./lib/store.mjs";
import { renderPath } from "./lib/render.mjs";
import { getSession } from "./lib/auth.mjs";

export default async function handler(req, context) {
  const url = new URL(req.url);
  let path = url.pathname;
  if (path.endsWith("/") && path !== "/") path = path.slice(0, -1) + "";
  if (/^\/(admin|api|media|assets|\.netlify)(\/|$)/.test(path)) return new Response("Not found", { status: 404 });

  const wantsPreview = url.searchParams.get("preview") === "1";
  let kind = "published";
  // 5 min fresh + long SWR: instant via tag purge on publish, and even
  // if a purge ever fails the site self-heals within minutes.
  let cache = "public, s-maxage=300, stale-while-revalidate=86400";
  if (wantsPreview) {
    const session = await getSession(req);
    if (session) { kind = "draft"; cache = "private, no-store"; }
  }

  const content = await getContent(kind);
  const out = renderPath(content, path);
  const headers = {
    "content-type": out.type,
    "cache-control": kind === "draft" ? "private, no-store" : cache,
  };
  if (kind === "published") {
    headers["netlify-cdn-cache-control"] = cache;
    headers["netlify-cache-tag"] = "content";
  }
  if (kind === "draft") {
    // stamp the preview so it is never mistaken for the live site
    out.body = String(out.body).replace("</body>", `<div style="position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:999;background:#e29a3b;color:#0e1412;font:11px/1 monospace;letter-spacing:.14em;text-transform:uppercase;padding:7px 14px;border-radius:999px">Draft preview — not published</div></body>`);
  }
  return new Response(out.body, { status: out.status, headers });
}

export const config = { path: "/*", preferStatic: true };
