/* ============================================================
   THE THERMOCHROME LEDGER — renderer
   Pure functions: (content document, path) → HTML.
   Reproduces the original static markup exactly; every string
   comes from the content document, nothing is hardcoded.
   ============================================================ */

const TINT = { 1859: "#e6913c", 2200: "#dd7f31", 3200: "#d9a662", 4400: "#c9b58e", 6500: "#a3b4ae", 10500: "#7e9cb8" };
export const tint = (k) => {
  if (TINT[k]) return TINT[k];
  const keys = Object.keys(TINT).map(Number).sort((a, b) => Math.abs(a - k) - Math.abs(b - k));
  return TINT[keys[0]] || "#e29a3b";
};

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const attr = esc;

const img = (seed, w, h) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const plateSrc = (pl, w, h) => pl.src ? pl.src : img(pl.seed || "ik-plate", w, h);

export function plate(pl, w, h, alt, { eager = false, tintHex = null, cls = "" } = {}) {
  return `<div class="plate ${cls}"${tintHex ? ` style="--tint:${tintHex}"` : ""}>
    <img src="${attr(plateSrc(pl, w, h))}" alt="${attr(alt)}" width="${w}" height="${h}" loading="${eager ? "eager" : "lazy"}" decoding="async"${eager ? ` fetchpriority="high"` : ""}>
    <div class="corners"><i></i></div>
  </div>`;
}

function figureBlock(p, pl, idx, cls = "") {
  const no = `Plate ${String(idx + 1).padStart(2, "0")}`;
  return `<figure class="figure dev ${cls}">
    ${plate(pl, pl.w || 1600, pl.h || 1067, pl.caption)}
    <figcaption><span class="pl-no">${no}</span><span>${esc(pl.caption)}</span><span>${esc(p.index)}</span></figcaption>
  </figure>`;
}

const visProjects = (c) => c.projects.filter((p) => p.visible !== false);

/* ------------------------------------------------------------ shell */
function shell(c, { title, desc, theme = "dark", k = 3200, page, content, canonicalPath = "" }) {
  const S = c.settings;
  const navItems = c.nav.filter((n) => n.visible !== false);
  const canonical = c.seo.canonicalBase && canonicalPath !== null
    ? `\n  <link rel="canonical" href="${attr(c.seo.canonicalBase.replace(/\/$/, "") + canonicalPath)}">` : "";
  const og = c.seo.ogImage ? `\n  <meta property="og:image" content="${attr(c.seo.ogImage)}">` : "";
  const ld = S.schemaMarkup ? `\n  <script type="application/ld+json">${S.schemaMarkup.replace(/<\/script/gi, "<\\/script")}</script>` : "";
  const F = S.footer;
  const navMenu = navItems.map((n) => {
    const kids = (n.children || []).filter((ch) => ch.visible !== false);
    const sub = kids.length
      ? `\n          <ul class="menu-sub">${kids.map((ch) => `<li><a href="${attr(ch.href)}">${esc(ch.label)}</a></li>`).join("")}</ul>` : "";
    return `<li><a href="${attr(n.href)}" data-k="${n.k || 3200}" style="--mk:${tint(n.k || 3200)}">${esc(n.label)}</a>${sub}</li>`;
  }).join("\n        ");
  const socials = (S.socials || []).map((s) => `<a href="${attr(s.url)}" rel="noopener" target="_blank">${esc(s.label)}</a>`);
  const newsletter = F.newsletterEnabled ? `
      <form class="foot-news" name="newsletter" method="POST" action="/thanks.html" data-netlify="true">
        <input type="hidden" name="form-name" value="newsletter">
        <h4>${esc(F.newsletterTitle)}</h4>
        <p class="mono mono-s mute">${esc(F.newsletterNote)}</p>
        <div class="foot-news-row">
          <input type="email" name="email" required placeholder="${attr(F.newsletterPlaceholder)}" aria-label="Email address">
          <button class="cta" type="submit">${esc(F.newsletterButton)}</button>
        </div>
      </form>` : "";

  return `<!DOCTYPE html>
<html lang="en" data-theme-root="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${attr(desc)}">
  <meta property="og:title" content="${attr(title)}">
  <meta property="og:description" content="${attr(desc)}">
  <meta property="og:type" content="website">${og}${canonical}
  <meta name="theme-color" content="${theme === "paper" ? "#f0e8d6" : "#0e1412"}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/assets/fonts/fraunces-var.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/fraunces-italic-var.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/fragment-mono.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/css/main.css">
  <script type="module" src="/assets/js/app.js"></script>${ld}
</head>
<body data-theme="${theme}">
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="ambient-field" aria-hidden="true"></div>
  <div class="grain" aria-hidden="true"></div>

  <div class="boot" aria-hidden="true">
    <div class="boot-inner">
      <div class="k-num"><span>01859</span> K</div>
      <div class="meter"><i></i></div>
      <div class="mono mono-s">${esc(S.bootLine)}</div>
    </div>
  </div>

  <header class="masthead">
    <a class="wordmark" href="/">${esc(S.wordmark)} <span class="dot" aria-hidden="true"></span></a>
    <div class="masthead-mid" aria-hidden="true">
      <span>${esc(S.mastheadTag)}</span>
      <span class="k-live">3200 K</span>
    </div>
    <button class="menu-btn" data-open aria-expanded="false" aria-controls="menu" aria-haspopup="dialog">
      <span class="blades" aria-hidden="true"></span> Index
    </button>
  </header>

  <nav class="menu" id="menu" aria-label="Site index">
    <div class="menu-inner">
      <button class="menu-btn menu-close">Close</button>
      <ul class="menu-list">
        ${navMenu}
      </ul>
    </div>
    <div class="menu-side">
      <div class="spine" aria-hidden="true"></div>
      <div class="block">
        <p class="mono mono-s mute">${S.menuLedgerLine}</p>
      </div>
      <address>
        <p class="mono mono-s"><a href="mailto:${attr(S.email)}">${esc(S.email)}</a><br>
        ${socials.join(" · ")}</p>
      </address>
      <p class="mono mono-s mute"><a href="/guide.html">${esc(S.menuGuideLabel)}</a></p>
    </div>
  </nav>

  <div class="k-rail" aria-hidden="true">
    <span class="cap">Colour temperature</span>
    <div class="track"><span class="needle"></span></div>
    <span class="read">3200 K</span>
  </div>

  <main id="main" data-page="${page}" data-theme="${theme}" data-k-default="${k}">
${content}
  </main>

  <footer class="site-foot">
    <div class="wrap">
      <div class="foot-grid">
        <div>
          <p class="foot-sig">${F.sig}</p>${newsletter}
        </div>
        <div>
          <h4>${esc(F.colIndex)}</h4>
          <ul>${navItems.map((n) => `<li><a href="${attr(n.href)}">${esc(n.label)}</a></li>`).join("")}
            <li><a href="/guide.html">Owner's Guide</a></li>
          </ul>
        </div>
        <div>
          <h4>${esc(F.colRecords)}</h4>
          <ul>${visProjects(c).map((p) => `<li><a href="/projects/${attr(p.slug)}.html">${esc(p.title)}</a></li>`).join("")}</ul>
        </div>
        <div>
          <h4>${esc(F.colElsewhere)}</h4>
          <ul>
            <li><a href="mailto:${attr(S.email)}">${esc(S.email)}</a></li>
            ${(S.socials || []).map((s) => `<li><a href="${attr(s.url)}" rel="noopener" target="_blank">${esc(s.label)}</a></li>`).join("\n            ")}
          </ul>
        </div>
      </div>
      <div class="foot-base mono mono-s">
        <span>${esc(F.baseLeft)}</span>
        <span>${esc(F.baseMid)}</span>
        <span>${esc(F.baseRight)}</span>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

/* ------------------------------------------------------------ pages */
function homePage(c) {
  const g = c.pages.home;
  const P = visProjects(c);
  const featured = (g.records.featured || []).map((slug) => P.find((p) => p.slug === slug)).filter(Boolean);
  return shell(c, {
    title: g.metaTitle, desc: g.metaDesc, page: "home", k: 3200, canonicalPath: "/",
    content: `
  <section class="hero" data-k="3200">
    <canvas class="field-canvas" aria-hidden="true"></canvas>
    <div class="hero-inner wrap">
      <div class="hero-kicker mono">
        <span class="pulse" aria-hidden="true"></span>
        <span>${esc(g.kicker)}</span>
      </div>
      <h1 class="hero-title serif-display dev-title">${g.titleHtml}</h1>
      <div class="hero-sub">
        <p class="lede dev">${esc(g.lede)}</p>
        <div class="range mono dev" style="--d:.15s">
          <span class="mute">${esc(g.rangeLabel)}</span>
          <span>${esc(g.rangeValue)}</span>
          <span class="accent">${esc(g.rangeAccent)}</span>
        </div>
      </div>
    </div>
    <span class="hero-scroll" aria-hidden="true">${esc(g.scrollHint)}</span>
  </section>

  <section class="band wrap statement" data-k="2200">
    <div class="file-line mono"><span class="no">${esc(g.practice.no)}</span><span>${esc(g.practice.label)}</span></div>
    <p class="big dev">${g.practice.bigHtml}</p>
    <br>
    <p class="mute dev" style="--d:.1s">${esc(g.practice.note)}</p>
  </section>

  <section class="band wrap" data-k="3200">
    <div class="file-line mono"><span class="no">${esc(g.records.no)}</span><span>${esc(g.records.label)}</span></div>
    ${featured.map((p) => `
    <a class="record-row" href="/projects/${attr(p.slug)}.html" data-k="${p.kelvin}" style="--tint:${tint(p.kelvin)}">
      <div class="r-meta">
        <span class="r-k"><i aria-hidden="true"></i>${esc(p.index)} · ${esc(p.category)} · ${esc(String(p.location).split(",")[0])}</span>
        <span class="r-title serif-display">${esc(p.title)}</span>
        <p class="mute">${esc(p.summary)}</p>
        <span class="r-open">${esc(g.records.openLabel)}</span>
      </div>
      <div class="r-plate dev tilt" style="--d:.1s">
        ${plate(p.plates[0], 1200, 900, p.summary, { tintHex: tint(p.kelvin) })}
      </div>
    </a>`).join("")}
    <div style="margin-top:2.5rem">
      <a class="cta" href="/work.html"><span class="ap" aria-hidden="true"></span>${esc(g.records.browseCta)}</a>
    </div>
  </section>

  <div class="meter-strip" aria-hidden="true" data-k="4400">
    <div class="strip-track">
      ${(g.meter || []).map((m) => `${m.bold ? `<b>${esc(m.text)}</b>` : `<span>${esc(m.text)}</span>`}<span>·</span>`).join("")}
    </div>
  </div>

  <section class="band wrap" data-k="4400">
    <div class="file-line mono"><span class="no">${esc(g.photographer.no)}</span><span>${esc(g.photographer.label)}</span></div>
    <div class="about-hero" style="padding-top:0">
      <div>
        <h2 class="serif-display dev" style="font-size:var(--fs-h2)">${g.photographer.headingHtml}</h2>
        <br>
        <p class="mute dev" style="--d:.1s">${esc(g.photographer.note)}</p>
        <br>
        <a class="line-link mono dev" style="--d:.2s" href="/about.html">${esc(g.photographer.linkLabel)}</a>
      </div>
      <div class="portrait dev tilt" style="--d:.15s">
        ${plate(g.photographer.portrait, g.photographer.portrait.w || 1200, g.photographer.portrait.h || 1600, g.photographer.portrait.alt, { tintHex: tint(g.photographer.portraitK || 4400) })}
      </div>
    </div>
  </section>

  <section class="band wrap" data-k="1859">
    <div class="file-line mono"><span class="no">${esc(g.commissions.no)}</span><span>${esc(g.commissions.label)}</span></div>
    <p class="big dev" style="font-size:var(--fs-h2);max-width:22ch">${g.commissions.bigHtml}</p>
    <br><br>
    <a class="cta dev" style="--d:.15s" href="/contact.html"><span class="ap" aria-hidden="true"></span>${esc(g.commissions.ctaLabel)}</a>
  </section>
`,
  });
}

function workPage(c) {
  const g = c.pages.work;
  const P = visProjects(c);
  return shell(c, {
    title: g.metaTitle, desc: g.metaDesc, page: "work", k: 1859, canonicalPath: "/work.html",
    content: `
  <section class="band wrap" data-k="1859" style="padding-top:clamp(7rem,18vh,11rem)">
    <div class="file-line mono"><span class="no">${esc(g.fileNo)}</span><span>${esc(g.fileLabel)}</span></div>
    <h1 class="serif-display dev-title" style="font-size:var(--fs-h1)">${g.titleHtml}</h1>
    <br>
    <p class="lede dev">${esc(g.lede)}</p>
  </section>

  ${P.map((p, i) => `
  <section class="work-scene wrap" data-k="${p.kelvin}" style="--tint:${tint(p.kelvin)}">
    <div class="ghost-k" aria-hidden="true">${p.kelvin}</div>
    <div class="scene-grid">
      <a class="scene-plate" href="/projects/${attr(p.slug)}.html" aria-label="Open record: ${attr(p.title)}">
        <div class="ap-mask tilt" style="height:100%">
          ${plate(p.plates[0], 1400, 1120, p.summary, { tintHex: tint(p.kelvin) })}
        </div>
      </a>
      <div class="scene-copy">
        <span class="mono mute dev">${esc(p.index)} · ${String(i + 1).padStart(2, "0")} / ${String(P.length).padStart(2, "0")}</span>
        <h2 class="scene-title serif-display dev" style="--d:.08s"><a class="line-link" href="/projects/${attr(p.slug)}.html" style="background-image:none">${esc(p.title)}</a></h2>
        <p class="scene-desc dev" style="--d:.16s">${esc(p.summary)} ${esc(String(p.description).split(". ")[0])}.</p>
        <div class="scene-tags dev" style="--d:.24s">
          <span class="stamp">${esc(p.category)}</span>
          <span class="stamp">${esc(p.location)}</span>
          <span class="stamp">${esc(p.year)}</span>
          <span class="stamp">${p.kelvin} K</span>${p.videos && p.videos.length ? `
          <span class="stamp">${esc(g.filmStamp)}</span>` : ""}
        </div>
        <div class="dev" style="--d:.3s"><a class="line-link mono" href="/projects/${attr(p.slug)}.html">${esc(g.openLabel)}</a></div>
      </div>
    </div>
  </section>`).join("")}
`,
  });
}

function archivePage(c) {
  const g = c.pages.archive;
  const P = visProjects(c);
  const cats = ["all", ...new Set(P.map((p) => p.category.toLowerCase()))];
  const frames = P.flatMap((p) =>
    [0, 1, 3].map((pi, j) => p.plates[pi] ? {
      p, pl: p.plates[pi],
      code: `${p.index}/${String(j + 1).padStart(2, "0")}`,
    } : null).filter(Boolean)
  );
  return shell(c, {
    title: g.metaTitle, desc: g.metaDesc, page: "archive", theme: "paper", k: 2200, canonicalPath: "/archive.html",
    content: `
  <section class="band wrap sheet-head" data-k="2200" style="padding-top:clamp(7rem,18vh,11rem)">
    <div class="file-line mono"><span class="no">${esc(g.fileNo)}</span><span>${esc(g.fileLabel)}</span></div>
    <h1 class="serif-display dev-title" style="font-size:var(--fs-h1)">${g.titleHtml}</h1>
    <p class="lede dev">${esc(g.lede)}</p>
    <p class="mono mono-s loupe-hint dev" style="--d:.1s">${esc(g.hint)}</p>
    <ul class="tabs dev" style="--d:.15s" role="group" aria-label="Filter by category">
      ${cats.map((cat, i) => `<li><button data-cat="${attr(cat)}" aria-pressed="${i === 0 ? "true" : "false"}">${cat === "all" ? esc(g.allLabel) : esc(cat)}</button></li>`).join("")}
    </ul>
  </section>
  <section class="wrap" data-k="3200" style="padding-bottom:var(--band)">
    <div class="contact-sheet">
      ${frames.map(({ p, pl, code }) => `
      <a class="frame" href="/projects/${attr(p.slug)}.html" data-cat="${attr(p.category.toLowerCase())}" aria-label="${attr(p.title)}: ${attr(pl.caption)}">
        ${plate(pl, 700, 700, pl.caption, { tintHex: tint(p.kelvin) })}
        <span class="f-no" aria-hidden="true"><span>${esc(code)}</span><span>${p.kelvin} K</span></span>
      </a>`).join("")}
    </div>
  </section>
`,
  });
}

function aboutPage(c) {
  const g = c.pages.about;
  const team = (c.team || []).filter((t) => t.visible !== false);
  const teamBlock = team.length ? `
  <section class="band wrap" data-k="3200">
    <div class="file-line mono"><span class="no">${esc(g.teamLabelNo)}</span><span>${esc(g.teamLabel)}</span></div>
    <ul class="log-list dev">
      ${team.map((t) => `<li><span class="yr">${esc(t.role)}</span><span><strong>${esc(t.name)}</strong>${t.bioHtml ? ` — ${t.bioHtml}` : ""}${t.email ? ` · <a class="line-link" href="mailto:${attr(t.email)}">${esc(t.email)}</a>` : ""}${(t.socials || []).map((s) => ` · <a class="line-link" href="${attr(s.url)}" rel="noopener" target="_blank">${esc(s.label)}</a>`).join("")}</span></li>`).join("")}
    </ul>
  </section>` : "";
  return shell(c, {
    title: g.metaTitle, desc: g.metaDesc, page: "about", theme: "paper", k: 4400, canonicalPath: "/about.html",
    content: `
  <section class="about-hero wrap" data-k="4400">
    <div>
      <div class="file-line mono"><span class="no">${esc(g.hero.fileNo)}</span><span>${esc(g.hero.fileLabel)}</span></div>
      <h1 class="serif-display dev-title" style="font-size:var(--fs-h1)">${g.hero.titleHtml}</h1>
      <br>
      <p class="lede dev">${esc(g.hero.lede)}</p>
    </div>
    <div class="dev tilt" style="--d:.15s">
      <figure class="figure">
        ${plate(g.hero.portrait, g.hero.portrait.w || 1200, g.hero.portrait.h || 1600, g.hero.portrait.alt, { tintHex: tint(3200) })}
        <figcaption><span class="pl-no">${esc(g.hero.figA)}</span><span>${esc(g.hero.figB)}</span><span>${esc(g.hero.figC)}</span></figcaption>
      </figure>
    </div>
  </section>

  <section class="band wrap" data-k="3200">
    <div class="about-cols">
      <div class="prose dev">
        <div class="file-line mono"><span class="no">${esc(g.practice.no)}</span><span>${esc(g.practice.label)}</span></div>
        ${(g.practice.paras || []).map((p) => `<p>${p}</p>`).join("\n        ")}
      </div>
      <div>
        <div class="file-line mono"><span class="no">${esc(g.equipment.no)}</span><span>${esc(g.equipment.label)}</span></div>
        <ul class="equip-list dev">
          ${(g.equipment.items || []).map((it) => `<li><span>${esc(it.name)}</span><span>${esc(it.note)}</span></li>`).join("\n          ")}
        </ul>
      </div>
    </div>
  </section>

  <section class="band wrap" data-k="4400">
    <div class="about-cols">
      <div>
        <div class="file-line mono"><span class="no">${esc(g.log.no)}</span><span>${esc(g.log.label)}</span></div>
        <ul class="log-list dev">
          ${(g.log.entries || []).map((e) => `<li><span class="yr">${esc(e.yr)}</span><span>${e.html}</span></li>`).join("\n          ")}
        </ul>
      </div>
      <div>
        <div class="file-line mono"><span class="no">${esc(g.clients.no)}</span><span>${esc(g.clients.label)}</span></div>
        <div class="laurels dev">
          ${(g.clients.stamps || []).map((s) => `<span class="stamp">${esc(s)}</span>`).join("")}
        </div>
        <br><br>
        <div class="file-line mono"><span class="no">${esc(g.awards.no)}</span><span>${esc(g.awards.label)}</span></div>
        <ul class="log-list dev">
          ${(g.awards.entries || []).map((e) => `<li><span class="yr">${esc(e.yr)}</span><span>${esc(e.text)}</span></li>`).join("\n          ")}
        </ul>
      </div>
    </div>
  </section>
${teamBlock}
  <section class="band wrap" data-k="1859">
    <p class="big dev" style="font-size:var(--fs-h2);max-width:24ch">${g.cta.bigHtml}</p>
    <br>
    <a class="cta dev" style="--d:.1s" href="/contact.html"><span class="ap" aria-hidden="true"></span>${esc(g.cta.ctaLabel)}</a>
  </section>
`,
  });
}

function servicesPage(c) {
  const g = c.pages.services;
  const orders = (c.services || []).filter((s) => s.visible !== false);
  const faqs = (c.faqs || []).filter((f) => f.visible !== false);
  const faqBlock = faqs.length ? `
  <section class="band wrap" data-k="6500" style="padding-top:0">
    <div class="file-line mono"><span class="no">${esc(g.faqNo)}</span><span>${esc(g.faqLabel)}</span></div>
    <div class="faq-list">
      ${faqs.map((f) => `<details class="faq dev"><summary><span class="mono accent">Q</span><span>${esc(f.q)}</span></summary><div class="faq-a prose">${f.a}</div></details>`).join("\n      ")}
    </div>
  </section>` : "";
  return shell(c, {
    title: g.metaTitle, desc: g.metaDesc, page: "services", theme: "paper", k: 5600, canonicalPath: "/services.html",
    content: `
  <section class="band wrap" data-k="5600" style="padding-top:clamp(7rem,18vh,11rem)">
    <div class="file-line mono"><span class="no">${esc(g.fileNo)}</span><span>${esc(g.fileLabel)}</span></div>
    <h1 class="serif-display dev-title" style="font-size:var(--fs-h1)">${g.titleHtml}</h1>
    <br>
    <p class="lede dev">${esc(g.lede)}</p>
  </section>

  <section class="wrap" data-k="4400">
    ${orders.map((o) => `<article class="order">
      <div class="o-head">
        <span class="mono mute dev">${esc(o.no)} · ${esc(o.lead)}</span>
        <h3 class="serif-display dev" style="--d:.08s">${o.titleHtml}</h3>
        <span class="mono accent dev" style="--d:.14s">${esc(o.price)}</span>
        <p class="mute dev" style="--d:.2s">${esc(o.desc)}</p>${o.buttonLabel && o.buttonHref ? `
        <p class="dev" style="--d:.26s"><a class="line-link mono" href="${attr(o.buttonHref)}">${esc(o.buttonLabel)}</a></p>` : ""}
      </div>
      <div class="o-body dev" style="--d:.15s">
        <dl class="spec-grid">
          ${(o.specs || []).map((s) => `<div><dt>${esc(s.dt)}</dt><dd>${esc(s.dd)}</dd></div>`).join("")}
        </dl>
        <ol class="fstops">
          ${(o.steps || []).map((s) => `<li><span class="f">${esc(s.f)}</span><span>${s.text}</span></li>`).join("\n          ")}
        </ol>
      </div>
    </article>`).join("\n\n    ")}
  </section>
${faqBlock}
  <section class="band wrap" data-k="1859">
    <p class="mono mono-s mute dev">${esc(g.terms)}</p>
    <br>
    <a class="cta dev" style="--d:.1s" href="/contact.html"><span class="ap" aria-hidden="true"></span>${esc(g.ctaLabel)}</a>
  </section>
`,
  });
}

function testimonialsPage(c) {
  const g = c.pages.testimonials;
  const voices = (c.voices || []).filter((v) => v.visible !== false);
  return shell(c, {
    title: g.metaTitle, desc: g.metaDesc, page: "testimonials", k: 1859, canonicalPath: "/testimonials.html",
    content: `
  <section class="band wrap" data-k="3200" style="padding-top:clamp(7rem,18vh,11rem);padding-bottom:0">
    <div class="file-line mono"><span class="no">${esc(g.fileNo)}</span><span>${esc(g.fileLabel)}</span></div>
    <h1 class="serif-display dev-title" style="font-size:var(--fs-h1)">${g.titleHtml}</h1>
  </section>
  <div class="wrap">
  ${voices.map((v) => `
    <section class="voice" data-k="${v.k || 3200}">
      <blockquote class="serif-display dev"><span class="qmark" aria-hidden="true">“</span>${esc(v.q)}<span class="qmark" aria-hidden="true">”</span></blockquote>
      <cite class="dev" style="--d:.15s">
        <span>${esc(v.who)}</span>
        <span class="mono mono-s mute">${esc(v.role)}</span>
      </cite>
      <span class="v-k" aria-hidden="true">${esc(v.where)}</span>
    </section>`).join("")}
  </div>
  <section class="band wrap" data-k="1859" style="border-top:1px solid var(--line)">
    <p class="big dev" style="font-size:var(--fs-h2);max-width:24ch">${g.cta.bigHtml}</p>
    <br>
    <a class="cta dev" style="--d:.1s" href="/contact.html"><span class="ap" aria-hidden="true"></span>${esc(g.cta.ctaLabel)}</a>
  </section>
`,
  });
}

function contactPage(c) {
  const g = c.pages.contact;
  const S = c.settings;
  const f = g.form;
  const socials = (S.socials || []).map((s) => `<a class="line-link" href="${attr(s.url)}" rel="noopener" target="_blank">${esc(s.label)}</a>`).join(" · ");
  const phoneBlock = g.phone ? `
        <div class="block dev" style="--d:.22s">
          <span class="mono mono-s mute">Telephone</span>
          <p><a class="line-link" href="tel:${attr(g.phone.replace(/\s/g, ""))}">${esc(g.phone)}</a>${g.whatsapp ? ` · <a class="line-link" href="https://wa.me/${attr(g.whatsapp.replace(/[^\d]/g, ""))}" rel="noopener" target="_blank">WhatsApp</a>` : ""}</p>
        </div>` : "";
  const mapBlock = g.mapsEmbed ? `
    <div class="map-slot dev" style="margin-top:var(--band)">
      <div class="file-line mono"><span class="no">MAP</span><span>${esc(g.mapsLabel)}</span></div>
      <iframe src="${attr(g.mapsEmbed)}" title="${attr(g.mapsLabel)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" style="width:100%;aspect-ratio:16/7;border:1px solid var(--line);filter:grayscale(1) contrast(1.05)"></iframe>
    </div>` : "";
  return shell(c, {
    title: g.metaTitle, desc: g.metaDesc, page: "contact", k: 10500, canonicalPath: "/contact.html",
    content: `
  <section class="contact-hero wrap" data-k="10500">
    <div class="file-line mono"><span class="no">${esc(g.fileNo)}</span><span>${esc(g.fileLabel)}</span></div>
    <h1 class="serif-display dev-title" style="font-size:var(--fs-h1)">${g.titleHtml}</h1>
    <br>
    <p class="lede dev">${esc(g.lede)}</p>
  </section>

  <section class="band wrap" data-k="1859" style="padding-top:clamp(2.5rem,7vh,4.5rem)">
    <div class="contact-grid">
      <form class="dev-form dev" name="development-order" method="POST" action="/thanks.html" data-netlify="true" netlify-honeypot="bot-field">
        <input type="hidden" name="form-name" value="development-order">
        <p class="visually-hidden" aria-hidden="true"><label>Leave this field empty: <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
        <div class="field">
          <label for="f-name"><span class="fi">01</span> ${esc(f.nameLabel)}</label>
          <input id="f-name" name="name" type="text" required autocomplete="name" placeholder="${attr(f.namePlaceholder)}">
        </div>
        <div class="field">
          <label for="f-mail"><span class="fi">02</span> ${esc(f.emailLabel)}</label>
          <input id="f-mail" name="email" type="email" required autocomplete="email" placeholder="${attr(f.emailPlaceholder)}">
        </div>
        <div class="field">
          <label for="f-kind"><span class="fi">03</span> ${esc(f.kindLabel)}</label>
          <select id="f-kind" name="order-type">
            ${(f.kinds || []).map((k) => `<option>${esc(k)}</option>`).join("\n            ")}
          </select>
        </div>
        <div class="field">
          <label for="f-light"><span class="fi">04</span> ${esc(f.briefLabel)}</label>
          <textarea id="f-light" name="brief" required placeholder="${attr(f.briefPlaceholder)}"></textarea>
        </div>
        <div class="field">
          <label for="f-when"><span class="fi">05</span> ${esc(f.deadlineLabel)}</label>
          <input id="f-when" name="deadline" type="text" placeholder="${attr(f.deadlinePlaceholder)}">
        </div>
        <button class="cta" type="submit"><span class="ap" aria-hidden="true"></span>${esc(f.submitLabel)}</button>
      </form>

      <aside class="contact-aside">
        <div class="block dev" style="--d:.1s">
          <span class="mono mono-s mute">${esc(g.directLabel)}</span>
          <a class="big-mail serif-display line-link" href="mailto:${attr(S.email)}">${g.emailDisplayHtml}</a>
        </div>
        <div class="block dev" style="--d:.18s">
          <span class="mono mono-s mute">${esc(g.studioLabel)}</span>
          <address>${g.addressHtml}</address>
        </div>${phoneBlock}
        <div class="block dev" style="--d:.26s">
          <span class="mono mono-s mute">${esc(g.hoursLabel)}</span>
          <p>${g.hoursHtml}</p>
        </div>
        <div class="block dev" style="--d:.34s">
          <span class="mono mono-s mute">${esc(g.elsewhereLabel)}</span>
          <p>${socials}</p>
        </div>
        <div class="block dev" style="--d:.42s">
          <span class="mono mono-s mute">${esc(g.repLabel)}</span>
          <p>${g.repHtml}</p>
        </div>
      </aside>
    </div>${mapBlock}
  </section>
`,
  });
}

/* ------------------------------------------------------------ notes (blog) */
const noteLive = (n, now = Date.now()) => {
  if (n.status !== "published") return false;
  if (n.publishAt && Date.parse(n.publishAt) > now) return false;
  if (n.unpublishAt && Date.parse(n.unpublishAt) < now) return false;
  return true;
};
export const liveNotes = (c) => (c.notes || []).filter((n) => noteLive(n)).sort((a, b) => String(b.date).localeCompare(String(a.date)));

function notesIndexPage(c) {
  const g = c.pages.notes;
  const notes = liveNotes(c);
  return shell(c, {
    title: g.metaTitle, desc: g.metaDesc, page: "notes", theme: "paper", k: 4400, canonicalPath: "/notes.html",
    content: `
  <section class="band wrap" data-k="4400" style="padding-top:clamp(7rem,18vh,11rem)">
    <div class="file-line mono"><span class="no">${esc(g.fileNo)}</span><span>${esc(g.fileLabel)}</span></div>
    <h1 class="serif-display dev-title" style="font-size:var(--fs-h1)">${g.titleHtml}</h1>
    <br>
    <p class="lede dev">${esc(g.lede)}</p>
  </section>
  <section class="wrap" data-k="3200" style="padding-bottom:var(--band)">
    <ul class="log-list">
      ${notes.map((n) => `<li class="dev"><span class="yr">${esc(String(n.date).slice(0, 10))}</span><span><a class="line-link" href="/notes/${attr(n.slug)}.html" style="font-family:var(--serif);font-size:1.3rem">${esc(n.title)}</a><br><span class="mono mono-s mute">${esc(n.cat || "")}${(n.tags || []).length ? " · " + n.tags.map(esc).join(", ") : ""}</span>${n.excerpt ? `<br>${esc(n.excerpt)}` : ""}<br><a class="line-link mono mono-s" href="/notes/${attr(n.slug)}.html">${esc(g.readLabel)}</a></span></li>`).join("\n      ")}
    </ul>
  </section>
`,
  });
}

function notePage(c, n) {
  const g = c.pages.notes;
  return shell(c, {
    title: n.metaTitle || `${n.title} · ${c.settings.siteTitle}`,
    desc: n.metaDesc || n.excerpt || g.metaDesc,
    page: "note", theme: "paper", k: 4400, canonicalPath: `/notes/${n.slug}.html`,
    content: `
  <article class="band wrap" data-k="4400" style="padding-top:clamp(7rem,18vh,11rem);max-width:52rem">
    <div class="file-line mono"><span class="no">${esc(g.fileNo)}</span><span>${esc(String(n.date).slice(0, 10))}${n.author ? ` · ${esc(n.author)}` : ""}${n.cat ? ` · ${esc(n.cat)}` : ""}</span></div>
    <h1 class="serif-display dev-title" style="font-size:var(--fs-h1)">${esc(n.title)}</h1>
    <br>
    ${n.cover && (n.cover.src || n.cover.seed) ? `<figure class="figure dev">${plate(n.cover, 1600, 900, n.title, { tintHex: tint(4400) })}</figure><br>` : ""}
    <div class="prose dev" style="--d:.1s">${n.bodyHtml || ""}</div>
    <br><br>
    <a class="line-link mono" href="/notes.html">${esc(g.backLabel)}</a>
  </article>
`,
  });
}

/* ------------------------------------------------------------ guide, misc */
function guidePage(c) {
  const g = c.pages.guide;
  return shell(c, {
    title: g.metaTitle, desc: g.metaDesc, page: "guide", theme: "paper", k: 5600, canonicalPath: "/guide.html",
    content: `
  <div class="guide-layout wrap" data-k="5600">
    <nav class="guide-toc" aria-label="Guide contents">
      ${(g.sections || []).map((s) => `<a href="#${attr(s.id)}">${esc(s.title)}</a>`).join("\n      ")}
    </nav>
    <div class="guide-body">
      <header>
        <div class="file-line mono"><span class="no">${esc(g.fileNo)}</span><span>${esc(g.fileLabel)}</span></div>
        <h1 class="serif-display dev-title" style="font-size:var(--fs-h2)">${g.titleHtml}</h1>
        <p class="lede" style="margin-top:1rem">${esc(g.lede)}</p>
      </header>
      ${(g.sections || []).map((s) => `<section id="${attr(s.id)}">
        <h2>${esc(s.title)}</h2>
        ${s.html}
      </section>`).join("\n      ")}
    </div>
  </div>
`,
  });
}

function lostPage(c, key, path) {
  const g = c.pages[key];
  return shell(c, {
    title: g.metaTitle, desc: g.metaDesc, page: key === "thanks" ? "thanks" : "404", k: key === "thanks" ? 1859 : 2200, canonicalPath: path,
    content: `
  <section class="lost wrap" data-k="${key === "thanks" ? 1859 : 2200}">
    <span class="mono accent">${esc(g.stamp)}</span>
    <h1 class="serif-display dev-title" style="font-size:var(--fs-h1)">${g.titleHtml}</h1>
    <p class="lede" style="margin-inline:auto">${esc(g.lede)}</p>
    <a class="cta" href="/"><span class="ap" aria-hidden="true"></span>${esc(g.ctaLabel)}</a>
  </section>
`,
  });
}

/* ------------------------------------------------------------ project page */
function videoBlock(p, v, vi, t) {
  const hasMedia = v.src || v.embed;
  if (!hasMedia) {
    return `<figure class="figure dev"${vi ? ` style="--d:${vi * 0.08}s"` : ""}>
          <div class="video-slot" role="img" aria-label="Film placeholder: ${attr(v.title)}${v.duration ? `, ${attr(v.duration)}` : ""}">
            <div class="play" aria-hidden="true"></div>
            <span class="vs-note mono mono-s">${esc(v.note || "Add a film in the admin panel: upload an MP4 or paste a Vimeo/YouTube embed URL")}</span>
          </div>
          <figcaption><span class="pl-no">Reel ${String(vi + 1).padStart(2, "0")}</span><span>${esc(v.title)}${v.duration ? ` · ${esc(v.duration)}` : ""}</span><span>${esc(p.index)}</span></figcaption>
        </figure>`;
  }
  const opts = [
    v.autoplay ? ` data-autoplay="1"` : "",
    v.loop ? ` data-loop="1"` : "",
    v.muted ? ` data-muted="1"` : "",
    v.controls === false ? ` data-nocontrols="1"` : "",
    v.posterSrc ? ` data-poster="${attr(v.posterSrc)}"` : "",
  ].join("");
  const posterPl = v.posterSrc ? { src: v.posterSrc } : { seed: v.poster || (p.plates[0] && p.plates[0].seed) };
  return `<figure class="figure dev"${vi ? ` style="--d:${vi * 0.08}s"` : ""}>
          <div class="video-slot projection"${v.src ? ` data-src="${attr(v.src)}"` : ""}${v.embed ? ` data-embed="${attr(v.embed)}"` : ""} data-title="${attr(v.title)}"${opts}>
            <div class="poster">${plate(posterPl, 1600, 900, "", { tintHex: t })}</div>
            <button class="play-btn" type="button" aria-label="Play film: ${attr(v.title)}${v.duration ? `, ${attr(v.duration)}` : ""}">
              <span class="play" aria-hidden="true"></span>
            </button>
            <div class="vs-meta" aria-hidden="true"><span class="vt">${esc(v.title)}</span><span class="vd">${esc(v.duration || "")}</span></div>
          </div>
          <figcaption><span class="pl-no">Reel ${String(vi + 1).padStart(2, "0")}</span><span>${esc(v.note || v.title)}</span><span>${esc(p.index)}</span></figcaption>
        </figure>`;
}

function projectPage(c, p) {
  const P = visProjects(c);
  const i = P.findIndex((x) => x.slug === p.slug);
  const next = P[(i + 1) % P.length];
  const t = tint(p.kelvin);
  const rows = [];
  let buf = [];
  (p.plates || []).forEach((pl, idx) => {
    if (pl.layout === "row") {
      buf.push(figureBlock(p, pl, idx));
      if (buf.length === 2) { rows.push(`<div class="row-2">${buf.join("")}</div>`); buf = []; }
    } else {
      if (buf.length) { rows.push(`<div class="row-2">${buf.join("")}</div>`); buf = []; }
      const cls = pl.layout === "full" ? "" : (pl.layout || "");
      rows.push(figureBlock(p, pl, idx, cls));
    }
  });
  if (buf.length) rows.push(`<div class="row-2">${buf.join("")}</div>`);

  return shell(c, {
    title: `${p.title} · ${c.settings.siteTitle}`,
    desc: `${p.summary} A ${String(p.category).toLowerCase()} record by photographer ${c.settings.siteTitle}: ${p.location}, ${p.year}, filed at ${p.kelvin} K.`,
    page: "project", k: p.kelvin, canonicalPath: `/projects/${p.slug}.html`,
    content: `
  <article style="--tint:${t}">
    <header class="case-hero" data-k="${p.kelvin}">
      <div class="hero-plate" data-plx="1.2">
        ${plate(p.plates[0] || {}, 1920, 1280, "", { eager: true, tintHex: t })}
      </div>
      <div class="hero-shade" aria-hidden="true"></div>
      <div class="case-head wrap">
        <span class="mono accent dev">${esc(p.index)} · ${esc(p.category)} · filed at ${p.kelvin} K</span>
        <h1 class="case-title serif-display dev-title">${esc(p.title)}</h1>
        <span class="mono mute dev" style="--d:.2s">${esc(p.client)} · ${esc(p.location)} · ${esc(p.year)}</span>
      </div>
    </header>

    <div class="case-meta-band wrap" style="padding-block:1.5rem" data-k="${p.kelvin}">
      <dl class="spec-grid dev">
        <div><dt>Client</dt><dd>${esc(p.client)}</dd></div>
        <div><dt>Role</dt><dd>${esc(p.role)}</dd></div>
        <div><dt>Year</dt><dd>${esc(p.year)}</dd></div>
        <div><dt>Category</dt><dd>${esc(p.category)}</dd></div>
        <div><dt>Location</dt><dd>${esc(p.location)}</dd></div>
        <div><dt>Camera</dt><dd>${esc(p.camera)}</dd></div>
        <div><dt>Lens</dt><dd>${esc(p.lens)}</dd></div>
        <div><dt>Colour temp.</dt><dd>${p.kelvin} K</dd></div>
      </dl>
    </div>

    <div class="case-body band wrap" data-k="${p.kelvin}">
      <section class="case-desc">
        <div>
          <div class="file-line mono"><span class="no">01</span><span>The record</span></div>
          <p class="lede dev">${esc(p.summary)}</p>
        </div>
        <div class="prose dev" style="--d:.12s"><p>${esc(p.description)}</p></div>
      </section>

      <section>
        <div class="file-line mono"><span class="no">02</span><span>Plates</span></div>
        <div class="plate-flow">${rows.join("\n")}</div>
      </section>

      <section>
        <div class="file-line mono"><span class="no">03</span><span>Motion</span></div>
        <div class="plate-flow">
        ${(p.videos || []).map((v, vi) => videoBlock(p, v, vi, t)).join("\n")}
        </div>
      </section>

      <section>
        <div class="file-line mono"><span class="no">04</span><span>Behind the scenes</span></div>
        <div class="bts-strip">
          ${(p.bts || []).map((b, j) => `<figure class="figure dev" style="--d:${j * 0.08}s">
            ${plate(b, 900, 600, b.caption, { tintHex: t, cls: "sprocket" })}
            <figcaption><span class="pl-no">BTS ${j + 1}</span><span>${esc(b.caption)}</span></figcaption>
          </figure>`).join("")}
        </div>
      </section>

      <section>
        <div class="file-line mono"><span class="no">05</span><span>Laurels &amp; print</span></div>
        <div class="laurels dev">
          ${(p.awards || []).map((a) => `<span class="stamp">★ ${esc(a)}</span>`).join("")}
          ${(p.publications || []).map((a) => `<span class="stamp">¶ ${esc(a)}</span>`).join("")}
        </div>
      </section>
    </div>

    <a class="next-case wrap" href="/projects/${attr(next.slug)}.html" data-k="${next.kelvin}">
      <span class="nc-label mono">Next record · ${esc(next.index)} · ${next.kelvin} K</span>
      <span class="nc-title serif-display">${esc(next.title)}</span>
    </a>
  </article>
`,
  });
}

/* ------------------------------------------------------------ router */
export function routes(c) {
  const r = ["/", "/work.html", "/archive.html", "/about.html", "/services.html", "/testimonials.html", "/contact.html", "/guide.html"];
  visProjects(c).forEach((p) => r.push(`/projects/${p.slug}.html`));
  const notes = liveNotes(c);
  if (notes.length) { r.push("/notes.html"); notes.forEach((n) => r.push(`/notes/${n.slug}.html`)); }
  return r;
}

export function renderSitemap(c) {
  const base = (c.seo.canonicalBase || "").replace(/\/$/, "");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes(c)
    .map((p) => `  <url><loc>${base}${p}</loc></url>`).join("\n")}\n</urlset>\n`;
}

export function renderPath(c, path) {
  const html = (body) => ({ status: 200, type: "text/html; charset=utf-8", body });
  if (path === "/" || path === "/index.html") return html(homePage(c));
  if (path === "/work.html") return html(workPage(c));
  if (path === "/archive.html") return html(archivePage(c));
  if (path === "/about.html") return html(aboutPage(c));
  if (path === "/services.html") return html(servicesPage(c));
  if (path === "/testimonials.html") return html(testimonialsPage(c));
  if (path === "/contact.html") return html(contactPage(c));
  if (path === "/guide.html") return html(guidePage(c));
  if (path === "/thanks.html") return html(lostPage(c, "thanks", "/thanks.html"));
  if (path === "/404.html") return html(lostPage(c, "notFound", null));
  if (path === "/sitemap.xml") return { status: 200, type: "application/xml", body: renderSitemap(c) };
  if (path === "/robots.txt") {
    const base = (c.seo.canonicalBase || "").replace(/\/$/, "");
    return { status: 200, type: "text/plain; charset=utf-8", body: `${c.seo.robots || "User-agent: *\nAllow: /"}\n\nSitemap: ${base}/sitemap.xml\n` };
  }
  let m = path.match(/^\/projects\/([a-z0-9-]+)\.html$/);
  if (m) {
    const p = visProjects(c).find((x) => x.slug === m[1]);
    if (p) return html(projectPage(c, p));
  }
  if (path === "/notes.html" && liveNotes(c).length) return html(notesIndexPage(c));
  m = path.match(/^\/notes\/([a-z0-9-]+)\.html$/);
  if (m) {
    const n = liveNotes(c).find((x) => x.slug === m[1]);
    if (n) return html(notePage(c, n));
  }
  return { status: 404, type: "text/html; charset=utf-8", body: lostPage(c, "notFound", null) };
}
