/* Explicit page routes — same handler as render.mjs, but WITHOUT
   preferStatic, so page URLs always hit the renderer even if a stale
   static copy of a page survives in a deploy manifest. Assets, /admin
   and /favicon.svg are not claimed here and stay static. */
export { default } from "./render.mjs";

export const config = {
  path: [
    "/", "/index.html",
    "/work.html", "/archive.html", "/about.html", "/services.html",
    "/testimonials.html", "/contact.html", "/guide.html",
    "/thanks.html", "/404.html", "/notes.html",
    "/robots.txt", "/sitemap.xml",
    "/projects/*", "/notes/*", "/data/*",
  ],
};
