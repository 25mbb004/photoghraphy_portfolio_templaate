/* HTML sanitizer for rich-text fields. Allowlist-based, no DOM needed.
   Tokenizes tags; anything not allowlisted is escaped, every attribute
   not allowlisted is dropped, all URLs are scheme-checked. */

const ALLOWED = {
  b: [], strong: [], i: [], em: [], u: [], s: [], br: [], hr: [],
  p: ["style"], div: ["style"], span: ["style", "class"],
  h2: ["style"], h3: ["style"], h4: ["style"],
  ul: [], ol: [], li: [],
  a: ["href", "target", "rel"],
  blockquote: [], pre: [], code: [],
  table: [], thead: [], tbody: [], tr: [], th: ["colspan", "rowspan"], td: ["colspan", "rowspan"],
  img: ["src", "alt", "width", "height", "loading"],
  figure: [], figcaption: [],
};

const SAFE_STYLE = /^(?:\s*(?:color|background-color|text-align|font-style|font-weight|text-decoration)\s*:\s*[#a-zA-Z0-9(),.%\s-]+;?\s*)*$/;
const SAFE_URL = /^(?:https?:|mailto:|tel:|\/(?!\/))/i;
const SAFE_CLASS = /^[\w\s-]*$/;

function cleanAttrs(tag, attrString) {
  const allowed = ALLOWED[tag];
  const out = [];
  const re = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m;
  while ((m = re.exec(attrString))) {
    const name = m[1].toLowerCase();
    let value = m[3] ?? m[4] ?? m[5] ?? "";
    if (!allowed.includes(name)) continue;
    if (name === "style" && !SAFE_STYLE.test(value)) continue;
    if (name === "class" && !SAFE_CLASS.test(value)) continue;
    if ((name === "href" || name === "src") && !SAFE_URL.test(value.trim())) continue;
    if (name === "target" && value !== "_blank") continue;
    value = value.replace(/&(?!(amp|lt|gt|quot|#\d+);)/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    out.push(`${name}="${value}"`);
  }
  if (tag === "a" && out.some((a) => a.startsWith('target="_blank"')) && !out.some((a) => a.startsWith("rel="))) {
    out.push('rel="noopener"');
  }
  return out.length ? " " + out.join(" ") : "";
}

export function sanitizeHtml(input) {
  if (typeof input !== "string") return "";
  let s = input.replace(/<!--[\s\S]*?-->/g, "");
  return s.replace(/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (whole, close, rawTag, attrs) => {
    const tag = rawTag.toLowerCase();
    if (!(tag in ALLOWED)) return "";
    if (close) return `</${tag}>`;
    const selfClose = tag === "br" || tag === "hr" || tag === "img" ? "" : "";
    return `<${tag}${cleanAttrs(tag, attrs)}>${selfClose}`;
  });
}

/* Plain-text fields: strip all tags outright. */
export function sanitizeText(input, max = 4000) {
  return String(input ?? "").replace(/<[^>]*>/g, "").slice(0, max);
}

/* SVG uploads: keep the file but strip active content. */
export function sanitizeSvg(text) {
  return text
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|xlink:href)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, "");
}
