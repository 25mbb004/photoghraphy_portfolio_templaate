/* ============================================================
   IRIS KAVAN — Studies in Available Light
   Engine: kelvin ambiance · iris router · develop reveals ·
   light-field shader · contact-sheet loupe · meter cursor
   No dependencies. Everything is handcrafted for this site.
   ============================================================ */

const doc = document;
const root = doc.documentElement;
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE = matchMedia("(pointer: fine)").matches;

root.classList.add("js");
if (FINE && !REDUCED) root.classList.add("cursor-on");

/* ------------------------------------------------------------
   Kelvin → RGB (Tanner Helland approximation, clamped to taste)
   The entire ambient colour system flows through this function.
------------------------------------------------------------ */
function kelvinToRGB(k) {
  const t = Math.min(Math.max(k, 1000), 40000) / 100;
  let r, g, b;
  if (t <= 66) {
    r = 255;
    g = 99.47 * Math.log(t) - 161.12;
    b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
  } else {
    r = 329.7 * Math.pow(t - 60, -0.1332);
    g = 288.12 * Math.pow(t - 60, -0.0755);
    b = 255;
  }
  const c = (v) => Math.round(Math.min(255, Math.max(0, v)));
  return [c(r), c(g), c(b)];
}

/* ------------------------------------------------------------
   Film grain — one generated noise tile, animated by CSS steps
------------------------------------------------------------ */
(function grain() {
  const c = doc.createElement("canvas");
  c.width = c.height = 180;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(180, 180);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  root.style.setProperty("--grain-url", `url(${c.toDataURL("image/png")})`);
})();

/* ------------------------------------------------------------
   Live state
------------------------------------------------------------ */
const state = {
  kTarget: 3200,
  kCurrent: 3200,
  cleanups: [],
  rafHooks: new Set(),
};
function onCleanup(fn) { state.cleanups.push(fn); }
function teardownPage() {
  state.cleanups.forEach((fn) => { try { fn(); } catch (e) {} });
  state.cleanups = [];
  state.rafHooks.clear();
}

/* ------------------------------------------------------------
   Global rAF loop — every scroll/pointer-driven system ticks here
------------------------------------------------------------ */
let mouse = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
addEventListener("pointermove", (e) => { mouse.tx = e.clientX; mouse.ty = e.clientY; }, { passive: true });

function globalTick(t) {
  mouse.x += (mouse.tx - mouse.x) * 0.16;
  mouse.y += (mouse.ty - mouse.y) * 0.16;

  // kelvin ambiance easing (only touch the CSS var when it actually changes)
  state.kCurrent += (state.kTarget - state.kCurrent) * 0.075;
  const kRound = Math.round(state.kCurrent);
  if (kRound !== state.kWritten) {
    state.kWritten = kRound;
    const [r, g, b] = kelvinToRGB(kRound);
    root.style.setProperty("--ambient", `${r}, ${g}, ${b}`);
  }

  // kelvin rail
  if (railNeedle) {
    const span = 12040 - 1859;
    const p = Math.min(1, Math.max(0, (state.kCurrent - 1859) / span));
    railNeedle.style.top = `${(1 - p) * 100}%`;
    if (railRead) railRead.textContent = `${Math.round(state.kCurrent)} K`;
  }
  if (kLive) kLive.textContent = `${Math.round(state.kCurrent)} K`;

  state.rafHooks.forEach((fn) => fn(t));
  cursorTick();
  requestAnimationFrame(globalTick);
}

/* ------------------------------------------------------------
   Custom cursor — a light meter that reads the page
------------------------------------------------------------ */
let cursorEl, cursorRing, cursorTag;
function buildCursor() {
  if (!root.classList.contains("cursor-on")) return;
  cursorEl = doc.createElement("div");
  cursorEl.className = "cursor";
  cursorEl.setAttribute("aria-hidden", "true");
  cursorEl.innerHTML = `<div class="ring"></div><div class="tag"></div>`;
  doc.body.appendChild(cursorEl);
  cursorRing = cursorEl.querySelector(".ring");
  cursorTag = cursorEl.querySelector(".tag");

  doc.addEventListener("pointerover", (e) => {
    const tagged = e.target.closest("[data-cursor]");
    const plate = e.target.closest(".plate, .frame, .video-slot");
    const link = e.target.closest("a, button, [role='button'], label, input, textarea, select, summary");
    cursorEl.classList.toggle("is-link", !!link && !plate);
    cursorEl.classList.toggle("is-plate", !!plate);
    const label = tagged ? tagged.getAttribute("data-cursor") : plate && plate.closest("a") ? "open record" : "";
    cursorTag.textContent = label;
    cursorEl.classList.toggle("has-tag", !!label);
  });
  addEventListener("pointerdown", () => cursorEl.classList.add("is-down"));
  addEventListener("pointerup", () => cursorEl.classList.remove("is-down"));
}
function cursorTick() {
  if (cursorEl) cursorEl.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
}

/* ------------------------------------------------------------
   Kelvin ambiance — sections tagged data-k tune the room
------------------------------------------------------------ */
let railNeedle, railRead, kLive;
function initAmbiance() {
  railNeedle = doc.querySelector(".k-rail .needle");
  railRead = doc.querySelector(".k-rail .read");
  kLive = doc.querySelector(".k-live");
  const zones = [...doc.querySelectorAll("[data-k]")];
  const main = doc.querySelector("main");
  const base = parseFloat(main?.dataset.kDefault || "3200");
  state.kTarget = base;

  if (!zones.length) return;
  const pick = () => {
    const mid = innerHeight * 0.5;
    let best = null;
    for (const z of zones) {
      const r = z.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) { best = z; break; }
    }
    state.kTarget = best ? parseFloat(best.dataset.k) : base;
  };
  pick();
  addEventListener("scroll", pick, { passive: true });
  onCleanup(() => removeEventListener("scroll", pick));
}

/* ------------------------------------------------------------
   Develop reveals — prints surfacing in the bath
------------------------------------------------------------ */
function initReveals() {
  const els = doc.querySelectorAll(".dev, .wipe, .ap-mask");
  if (!els.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add("on");
          io.unobserve(en.target);
        }
      }
    },
    { threshold: 0.18, rootMargin: "0px 0px -6% 0px" }
  );
  els.forEach((el) => io.observe(el));
  onCleanup(() => io.disconnect());
}

/* ------------------------------------------------------------
   Motion typography — headline letters develop in
------------------------------------------------------------ */
function splitDevTitle() {
  doc.querySelectorAll(".dev-title:not([data-split])").forEach((el) => {
    el.dataset.split = "1";
    el.setAttribute("aria-label", el.textContent.trim());
    const frag = doc.createDocumentFragment();
    let i = 0;
    const walk = (node, wonk) => {
      if (node.nodeType === 3) {
        for (const ch of node.textContent) {
          const s = doc.createElement("span");
          s.className = "ch" + (wonk ? " ch--wonk" : "");
          s.textContent = ch;
          s.style.setProperty("--chd", `${0.05 + i * 0.045}s`);
          s.setAttribute("aria-hidden", "true");
          frag.appendChild(s);
          i++;
        }
      } else if (node.nodeType === 1) {
        [...node.childNodes].forEach((n) => walk(n, node.tagName === "EM" || wonk));
      }
    };
    [...el.childNodes].forEach((n) => walk(n, false));
    el.textContent = "";
    el.appendChild(frag);
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) { el.classList.add("developed"); io.disconnect(); }
      });
    }, { threshold: 0.2 });
    io.observe(el);
    onCleanup(() => io.disconnect());
  });
}

/* ------------------------------------------------------------
   Pointer tilt on plates
------------------------------------------------------------ */
function initTilt() {
  if (!FINE || REDUCED) return;
  doc.querySelectorAll(".tilt").forEach((el) => {
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--ry", `${px * 7}deg`);
      el.style.setProperty("--rx", `${-py * 7}deg`);
    };
    const leave = () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    onCleanup(() => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); });
  });
}

/* ------------------------------------------------------------
   Parallax — subtle vertical drift, scroll-linked
------------------------------------------------------------ */
function initParallax() {
  if (REDUCED) return;
  const els = [...doc.querySelectorAll("[data-plx]")];
  if (!els.length) return;
  const hook = () => {
    for (const el of els) {
      const f = parseFloat(el.dataset.plx);
      const r = el.getBoundingClientRect();
      const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      el.style.setProperty("--py", (c * f * -60).toFixed(1));
      el.classList.add("plx");
    }
  };
  state.rafHooks.add(hook);
}

/* ------------------------------------------------------------
   Meter strip — sprocket ticker driven by scroll position
------------------------------------------------------------ */
function initMeterStrip() {
  const track = doc.querySelector(".meter-strip .strip-track");
  if (!track) return;
  track.innerHTML += track.innerHTML; // loop seam
  const hook = () => {
    const half = track.scrollWidth / 2;
    if (!half) return;
    const x = REDUCED ? 0 : (scrollY * 0.55) % half;
    track.style.transform = `translateX(${-x}px)`;
  };
  state.rafHooks.add(hook);
}

/* ------------------------------------------------------------
   WebGL light field — the home hero's breathing atmosphere
------------------------------------------------------------ */
function initField() {
  const canvas = doc.querySelector(".field-canvas");
  if (!canvas || REDUCED) return;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: true });
  if (!gl) { canvas.remove(); return; }

  const vs = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  const fs = `
    precision mediump float;
    uniform vec2 u_res; uniform float u_t; uniform vec2 u_m; uniform vec3 u_tint;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x),
                 mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
    }
    float fbm(vec2 p){
      float v = 0.; float a = .5;
      for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= .5; }
      return v;
    }
    void main(){
      vec2 uv = gl_FragCoord.xy / u_res;
      vec2 asp = vec2(u_res.x / u_res.y, 1.);
      vec2 m = (u_m - .5) * .18;
      // drifting light field
      vec2 q = uv * asp * 1.35 + m;
      float n = fbm(q * 1.6 + vec2(u_t * .022, -u_t * .014));
      float n2 = fbm(q * 3.1 - vec2(u_t * .01, u_t * .018) + n);
      // window light: a diagonal shaft
      float shaft = smoothstep(.62, .0, abs((uv.x - .72 + m.x * 2.) * .85 - (uv.y - .3) * .5)) * (.35 + .65 * n2);
      float glowTL = smoothstep(1.25, .1, length((uv - vec2(.85, .85) - m) * asp));
      float lum = shaft * .5 + glowTL * .3 * n + n2 * .12;
      vec3 base = vec3(.055, .078, .07);
      vec3 col = base + u_tint * lum;
      // breathing vignette
      float vig = smoothstep(1.35, .35, length((uv - .5) * asp * 1.15));
      col *= mix(.55, 1.06, vig);
      // fine dither to kill banding
      col += (hash(gl_FragCoord.xy + u_t) - .5) / 255. * 3.;
      gl_FragColor = vec4(col, 1.);
    }`;

  function sh(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, "u_res");
  const uT = gl.getUniformLocation(prog, "u_t");
  const uM = gl.getUniformLocation(prog, "u_m");
  const uTint = gl.getUniformLocation(prog, "u_tint");

  const dpr = Math.min(devicePixelRatio || 1, 1.5) * 0.66;
  function size() {
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  size();
  addEventListener("resize", size);
  onCleanup(() => removeEventListener("resize", size));

  let visible = true;
  const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; });
  io.observe(canvas);
  onCleanup(() => io.disconnect());

  const t0 = performance.now();
  const hook = () => {
    if (!visible || doc.hidden) return;
    const t = (performance.now() - t0) / 1000;
    const [r, g, b] = kelvinToRGB(state.kCurrent);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uT, t);
    gl.uniform2f(uM, mouse.x / innerWidth, 1 - mouse.y / innerHeight);
    gl.uniform3f(uTint, (r / 255) * 0.62, (g / 255) * 0.55, (b / 255) * 0.5);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  state.rafHooks.add(hook);
  onCleanup(() => gl.getExtension("WEBGL_lose_context")?.loseContext());
}

/* ------------------------------------------------------------
   Archive — contact sheet: category tabs + reading loupe
------------------------------------------------------------ */
function initArchive() {
  const sheet = doc.querySelector(".contact-sheet");
  if (!sheet) return;

  // tabs
  const tabs = doc.querySelectorAll(".tabs button");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      const cat = btn.dataset.cat;
      sheet.querySelectorAll(":scope > .frame").forEach((f) => {
        f.classList.toggle("dim", cat !== "all" && f.dataset.cat !== cat);
      });
      requestAnimationFrame(buildLoupeClone);
    });
  });

  // loupe
  if (!FINE || REDUCED) return;
  const loupe = doc.createElement("div");
  loupe.className = "loupe";
  loupe.setAttribute("aria-hidden", "true");
  loupe.inert = true;
  const inner = doc.createElement("div");
  inner.className = "loupe-sheet";
  loupe.appendChild(inner);
  sheet.appendChild(loupe);
  const SCALE = 2.1, R = 110;

  function buildLoupeClone() {
    inner.innerHTML = "";
    const clone = sheet.cloneNode(true);
    clone.querySelector(".loupe")?.remove();
    clone.style.width = `${sheet.clientWidth}px`;
    clone.style.margin = "0";
    clone.style.border = "none";
    inner.appendChild(clone);
  }
  buildLoupeClone();
  addEventListener("resize", buildLoupeClone);
  onCleanup(() => removeEventListener("resize", buildLoupeClone));

  const move = (e) => {
    const r = sheet.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    loupe.style.left = `${x}px`;
    loupe.style.top = `${y}px`;
    inner.style.transform = `translate(${R - x * SCALE}px, ${R - y * SCALE}px) scale(${SCALE})`;
    inner.style.transformOrigin = "0 0";
    loupe.classList.add("on");
  };
  const out = () => loupe.classList.remove("on");
  sheet.addEventListener("pointermove", move);
  sheet.addEventListener("pointerleave", out);
  onCleanup(() => { sheet.removeEventListener("pointermove", move); sheet.removeEventListener("pointerleave", out); });
}

/* ------------------------------------------------------------
   Guide — table of contents scroll-spy
------------------------------------------------------------ */
function initGuide() {
  const toc = doc.querySelectorAll(".guide-toc a");
  if (!toc.length) return;
  const map = new Map();
  toc.forEach((a) => {
    const id = a.getAttribute("href").slice(1);
    const sec = doc.getElementById(id);
    if (sec) map.set(sec, a);
  });
  const io = new IntersectionObserver(
    (ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) {
          toc.forEach((a) => a.classList.remove("here"));
          map.get(en.target)?.classList.add("here");
        }
      });
    },
    { rootMargin: "-20% 0px -70% 0px" }
  );
  map.forEach((_, sec) => io.observe(sec));
  onCleanup(() => io.disconnect());
}

/* ------------------------------------------------------------
   Menu overlay
------------------------------------------------------------ */
function initMenu() {
  const menu = doc.querySelector(".menu");
  const openBtn = doc.querySelector(".menu-btn[data-open]");
  const closeBtn = doc.querySelector(".menu-close");
  if (!menu || !openBtn) return;
  let lastFocus = null;
  const open = () => {
    lastFocus = doc.activeElement;
    menu.classList.add("open");
    openBtn.setAttribute("aria-expanded", "true");
    doc.body.style.overflow = "hidden";
    closeBtn?.focus();
  };
  const close = () => {
    menu.classList.remove("open");
    openBtn.setAttribute("aria-expanded", "false");
    doc.body.style.overflow = "";
    lastFocus?.focus?.();
  };
  openBtn.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  // hovering an index entry retunes the room to that page's temperature
  menu.querySelectorAll(".menu-list a[data-k]").forEach((a) => {
    a.addEventListener("pointerenter", () => { state.kTarget = parseFloat(a.dataset.k); });
  });
  doc.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("open")) close(); });
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  markCurrentNav();
}

function markCurrentNav() {
  const here = location.pathname.replace(/index\.html$/, "");
  doc.querySelectorAll(".menu-list a, .site-foot a").forEach((a) => {
    const path = new URL(a.href, location.href).pathname.replace(/index\.html$/, "");
    if (path === here) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

/* ------------------------------------------------------------
   Iris router — every navigation passes through the aperture
------------------------------------------------------------ */
const iris = (() => {
  const el = doc.createElement("div");
  el.className = "iris shut";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `
    <div class="leaf-field"></div>
    <div class="bladework">
      <svg viewBox="0 0 100 100" fill="none" stroke="rgba(240,232,214,.8)" stroke-width="1">
        <circle cx="50" cy="50" r="47" stroke-dasharray="4 7"/>
        <circle cx="50" cy="50" r="30" stroke-opacity=".5"/>
        <path d="M50 3 L50 20 M97 50 L80 50 M50 97 L50 80 M3 50 L20 50" stroke-opacity=".6"/>
      </svg>
    </div>
    <div class="k-stamp"></div>`;
  doc.body.appendChild(el);
  const stamp = el.querySelector(".k-stamp");
  return {
    async close(x, y, label) {
      el.style.setProperty("--ix", `${x}px`);
      el.style.setProperty("--iy", `${y}px`);
      stamp.textContent = label || "";
      el.classList.add("active");
      void el.offsetWidth;
      el.classList.remove("shut");
      await new Promise((r) => setTimeout(r, REDUCED ? 10 : 640));
    },
    async open() {
      el.classList.add("shut");
      await new Promise((r) => setTimeout(r, REDUCED ? 10 : 640));
      el.classList.remove("active");
    },
  };
})();

const live = (() => {
  const el = doc.createElement("div");
  el.className = "visually-hidden";
  el.setAttribute("aria-live", "polite");
  doc.body.appendChild(el);
  return el;
})();

async function navigateTo(url, { x = innerWidth / 2, y = innerHeight / 2, push = true } = {}) {
  if (state.navigating) return;
  state.navigating = true;
  const fetching = fetch(url, { headers: { "X-Requested-With": "iris" } }).then((r) => {
    if (!r.ok) throw new Error(r.status);
    return r.text();
  });
  await iris.close(x, y, "advancing frame");
  let html;
  try {
    html = await fetching;
  } catch (e) {
    state.navigating = false;
    location.href = url; // graceful fallback
    return;
  }
  const next = new DOMParser().parseFromString(html, "text/html");
  const newMain = next.querySelector("main");
  const oldMain = doc.querySelector("main");
  if (!newMain || !oldMain) { location.href = url; return; }

  teardownPage();
  doc.title = next.title;
  oldMain.replaceWith(newMain);
  const theme = newMain.dataset.theme || "dark";
  doc.body.dataset.theme = theme;
  root.dataset.themeRoot = theme;
  doc.querySelector('meta[name="description"]')?.setAttribute(
    "content",
    next.querySelector('meta[name="description"]')?.getAttribute("content") || ""
  );
  if (push) history.pushState({ iris: true }, "", url);
  state.lastPath = location.pathname;
  scrollTo({ top: 0, behavior: "instant" });
  live.textContent = `Loaded: ${doc.title}`;
  initPage();
  newMain.setAttribute("tabindex", "-1");
  newMain.focus({ preventScroll: true });
  await iris.open();
  state.navigating = false;
}

function initRouter() {
  doc.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download") || a.classList.contains("no-pjax")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return; // in-page anchor
    if (/\.(pdf|zip|jpg|png|webp)$/i.test(url.pathname)) return;
    e.preventDefault();
    if (url.pathname === location.pathname && !url.hash) return;
    navigateTo(url.href, { x: e.clientX || innerWidth / 2, y: e.clientY || innerHeight / 2 });
  });
  addEventListener("popstate", () => {
    // hash-only history moves (e.g. guide TOC) stay native
    if (location.pathname === state.lastPath) return;
    state.lastPath = location.pathname;
    navigateTo(location.href, { push: false });
  });
  state.lastPath = location.pathname;
  history.scrollRestoration = "manual";
}

/* ------------------------------------------------------------
   Boot — the light meter warms up before the first frame
------------------------------------------------------------ */
function boot() {
  const el = doc.querySelector(".boot");
  if (!el) { return; }
  const seen = sessionStorage.getItem("ik-boot");
  const num = el.querySelector(".k-num span");
  const bar = el.querySelector(".meter i");
  const target = parseFloat(doc.querySelector("main")?.dataset.kDefault || "3200");
  const dur = REDUCED || seen ? 250 : 1750;
  const t0 = performance.now();
  const ease = (p) => 1 - Math.pow(1 - p, 3);
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    el.classList.add("done");
    try { sessionStorage.setItem("ik-boot", "1"); } catch (e) {}
    setTimeout(() => el.remove(), 900);
  };
  (function tick(t) {
    const p = Math.min(1, (t - t0) / dur);
    const e = ease(p);
    if (num) num.textContent = String(Math.round(1859 + (target - 1859) * e)).padStart(5, "0");
    if (bar) bar.style.scale = `${e} 1`;
    if (p < 1) requestAnimationFrame(tick);
    else finish();
  })(t0);
  // background tabs throttle rAF: never let the meter hold the page hostage
  setTimeout(finish, dur + 2600);
}

/* ------------------------------------------------------------
   Per-page init (runs on load and after each iris navigation)
------------------------------------------------------------ */
/* ------------------------------------------------------------
   Projections — films mount only when the viewer asks for them
------------------------------------------------------------ */
function initProjections() {
  doc.querySelectorAll(".projection[data-src], .projection[data-embed]").forEach((slot) => {
    const btn = slot.querySelector(".play-btn");
    if (!btn) return;
    const start = () => {
      if (slot.classList.contains("playing")) return;
      slot.classList.add("playing");
      let media;
      const d = slot.dataset;
      if (d.src) {
        media = doc.createElement("video");
        media.src = d.src;
        if (d.poster) media.poster = d.poster;
        media.controls = !d.nocontrols;
        media.autoplay = true; // the viewer just pressed play
        media.loop = !!d.loop;
        media.muted = !!d.muted;
        media.playsInline = true;
        media.preload = "metadata";
        media.setAttribute("aria-label", d.title || "Film");
      } else {
        media = doc.createElement("iframe");
        const url = new URL(d.embed, location.href);
        url.searchParams.set("autoplay", "1");
        if (d.loop) url.searchParams.set("loop", "1");
        if (d.muted) { url.searchParams.set("muted", "1"); url.searchParams.set("mute", "1"); }
        if (d.nocontrols) url.searchParams.set("controls", "0");
        media.src = url.href;
        media.allow = "autoplay; fullscreen; picture-in-picture";
        media.allowFullscreen = true;
        media.title = d.title || "Film";
      }
      media.className = "media";
      slot.appendChild(media);
      btn.remove();
      media.focus?.();
    };
    btn.addEventListener("click", start);
    onCleanup(() => btn.removeEventListener("click", start));
  });
}

function initForms() {
  // Netlify handles the POST in production; keep local demos graceful
  const form = doc.querySelector("form[data-netlify]");
  if (!form || !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  const onSubmit = (e) => {
    if (!form.checkValidity()) return;
    e.preventDefault();
    navigateTo("/thanks.html");
  };
  form.addEventListener("submit", onSubmit);
  onCleanup(() => form.removeEventListener("submit", onSubmit));
}

function initPage() {
  initAmbiance();
  initReveals();
  splitDevTitle();
  initTilt();
  initParallax();
  initMeterStrip();
  initField();
  initArchive();
  initGuide();
  initProjections();
  initForms();
  markCurrentNav();
}

/* ------------------------------------------------------------
   Go
------------------------------------------------------------ */
buildCursor();
initMenu();
initRouter();
initPage();
boot();
requestAnimationFrame(globalTick);

// bfcache restore: never come back with the aperture stuck closed
addEventListener("pageshow", (e) => {
  if (e.persisted) {
    doc.querySelector(".iris")?.classList.remove("active");
    state.navigating = false;
  }
});
