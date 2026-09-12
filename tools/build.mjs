/* ============================================================
   Static snapshot exporter (optional utility).
   The live site renders every page from the CMS database via
   netlify/functions/render.mjs — this script just exports a
   frozen copy of the DEFAULT content to dist-static/ for
   offline preview or emergency static hosting.
   Usage: node tools/build.mjs
   ============================================================ */
import { writeFileSync, mkdirSync, cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderPath, routes, renderSitemap } from "../netlify/functions/lib/render.mjs";
import content from "../netlify/functions/lib/default-content.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist-static");

// Running as the Netlify build command: nothing to build (functions render
// live pages), so only produce the snapshot when asked for explicitly.
if (process.env.NETLIFY && !process.env.SNAPSHOT) {
  console.log("Netlify build: dynamic rendering active, no static snapshot needed.");
  process.exit(0);
}

mkdirSync(join(OUT, "projects"), { recursive: true });
mkdirSync(join(OUT, "notes"), { recursive: true });

for (const path of [...routes(content), "/404.html", "/thanks.html"]) {
  const out = renderPath(content, path);
  const file = path === "/" ? "index.html" : path.slice(1);
  writeFileSync(join(OUT, file), out.body);
  console.log("wrote", file);
}
writeFileSync(join(OUT, "sitemap.xml"), renderSitemap(content));
writeFileSync(join(OUT, "robots.txt"), `${content.seo.robots}\n`);

for (const dir of ["assets", "admin"]) {
  if (existsSync(join(ROOT, "site", dir))) cpSync(join(ROOT, "site", dir), join(OUT, dir), { recursive: true });
}
cpSync(join(ROOT, "site", "favicon.svg"), join(OUT, "favicon.svg"));
console.log("\nStatic snapshot in dist-static/");
