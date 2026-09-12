/* ============================================================
   THE LEDGER — admin panel application
   Schema-driven editors over the content document. No frameworks.
   ============================================================ */
const $ = (sel, root = document) => root.querySelector(sel);
const app = $("#app");

/* ---------------- state ---------------- */
const S = {
  session: null, doc: null, media: [], usage: 0,
  dirty: false, saving: false, savedAt: null,
  route: location.hash.slice(2) || "overview",
  pubDoc: null, schedule: {},
};

/* ---------------- helpers ---------------- */
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null) n.append(kid.nodeType ? kid : document.createTextNode(kid));
  return n;
}
function toast(msg, kind = "") {
  const t = el("div", { class: `toast ${kind}` }, msg);
  $("#toasts").append(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .4s"; setTimeout(() => t.remove(), 400); }, 2600);
}
async function api(path, opts = {}) {
  const headers = { "content-type": "application/json", ...(opts.headers || {}) };
  if (S.session && opts.method && opts.method !== "GET") headers["x-ik-csrf"] = S.session.csrf;
  const res = await fetch(`/api${path}`, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && S.session) { S.session = null; render(); throw new Error("Signed out"); }
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}
const fmtBytes = (n) => n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} kB`;
const fmtDate = (iso) => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/* path get/set on the doc */
const get = (path) => path.split(".").reduce((o, k) => o?.[/^\d+$/.test(k) ? +k : k], S.doc);
function set(path, value) {
  const keys = path.split(".");
  let o = S.doc;
  for (let i = 0; i < keys.length - 1; i++) o = o[/^\d+$/.test(keys[i]) ? +keys[i] : keys[i]];
  o[/^\d+$/.test(keys.at(-1)) ? +keys.at(-1) : keys.at(-1)] = value;
  markDirty();
}
function markDirty() { S.dirty = true; updateSaveState(); autosave(); }
function updateSaveState() {
  const elx = $(".save-state");
  if (!elx) return;
  elx.className = `save-state ${S.saving ? "" : S.dirty ? "dirty" : "ok"}`;
  elx.textContent = S.saving ? "Saving…" : S.dirty ? "Unsaved changes" : S.savedAt ? `Draft saved ${new Date(S.savedAt).toLocaleTimeString([], { timeStyle: "short" })}` : "Draft";
}
async function saveDraft(silent = false) {
  if (!S.doc || S.saving) return;
  S.saving = true; updateSaveState();
  try {
    const r = await api("/content", { method: "PUT", body: S.doc });
    S.dirty = false; S.savedAt = r.savedAt;
    if (!silent) toast("Draft saved", "ok");
  } catch (e) { toast(e.message, "err"); }
  S.saving = false; updateSaveState();
}
const autosave = debounce(() => saveDraft(true), 2500);

/* ---------------- field builders ---------------- */
function fText(label, path, { hint = "", type = "text", oninput } = {}) {
  const input = el("input", { type, value: get(path) ?? "" });
  input.addEventListener("input", () => { set(path, type === "number" ? +input.value : input.value); oninput?.(input.value); });
  return el("div", { class: "f-row" }, el("label", {}, label, hint && el("span", { class: "hint" }, hint)), input);
}
function fArea(label, path, { hint = "" } = {}) {
  const input = el("textarea", {}, get(path) ?? "");
  input.addEventListener("input", () => set(path, input.value));
  return el("div", { class: "f-row" }, el("label", {}, label, hint && el("span", { class: "hint" }, hint)), input);
}
function fToggle(label, path) {
  const input = el("input", { type: "checkbox" });
  input.checked = get(path) !== false;
  input.addEventListener("change", () => set(path, input.checked));
  return el("label", { class: "f-check" }, input, label);
}
function fSelect(label, path, options) {
  const sel = el("select", {}, ...options.map((o) => el("option", { value: o, selected: String(get(path)) === String(o) }, o)));
  sel.addEventListener("change", () => set(path, isNaN(+sel.value) ? sel.value : (typeof get(path) === "number" ? +sel.value : sel.value)));
  return el("div", { class: "f-row" }, el("label", {}, label), sel);
}
function fLines(label, path, { hint = "one per line" } = {}) {
  const input = el("textarea", {}, (get(path) || []).join("\n"));
  input.addEventListener("input", () => set(path, input.value.split("\n").map((s) => s.trim()).filter(Boolean)));
  return el("div", { class: "f-row" }, el("label", {}, label, el("span", { class: "hint" }, hint)), input);
}

/* rich text editor */
function fRich(label, path, { inline = false, hint = "" } = {}) {
  const body = el("div", { class: "rich-body", contenteditable: "true", html: get(path) ?? "" });
  const cmd = (c, v = null) => () => { body.focus(); document.execCommand(c, false, v); sync(); };
  const sync = () => set(path, body.innerHTML);
  body.addEventListener("input", sync);
  const btn = (lbl, fn, title) => el("button", { type: "button", title: title || lbl, onclick: fn, onmousedown: (e) => e.preventDefault() }, lbl);
  const colorIn = el("input", { type: "color", style: "width:0;height:0;opacity:0;position:absolute" });
  colorIn.addEventListener("input", () => { document.execCommand("foreColor", false, colorIn.value); sync(); });
  const bar = el("div", { class: "rich-bar" },
    btn("B", cmd("bold"), "Bold"), btn("I", cmd("italic"), "Italic"), btn("U", cmd("underline"), "Underline"),
    el("span", { class: "sep" }),
    btn("H2", cmd("formatBlock", "h2")), btn("H3", cmd("formatBlock", "h3")), btn("¶", cmd("formatBlock", "p")),
    el("span", { class: "sep" }),
    btn("⌫F", cmd("removeFormat"), "Clear formatting"),
    btn("≡L", cmd("justifyLeft"), "Align left"), btn("≡C", cmd("justifyCenter"), "Align centre"), btn("≡R", cmd("justifyRight"), "Align right"),
    el("span", { class: "sep" }),
    btn("•", cmd("insertUnorderedList"), "Bullet list"), btn("1.", cmd("insertOrderedList"), "Numbered list"),
    btn("🔗", () => { const u = prompt("Link URL (https://…)"); if (u) { body.focus(); document.execCommand("createLink", false, u); sync(); } }, "Link"),
    el("label", { title: "Text colour", onmousedown: (e) => e.preventDefault() }, "A🎨", colorIn),
    btn("⌗", () => { body.focus(); document.execCommand("insertHTML", false, "<table><tbody><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p></p>"); sync(); }, "Table"),
    btn("</>", cmd("formatBlock", "pre"), "Code block"),
    el("span", { class: "sep" }),
    btn("↶", cmd("undo"), "Undo"), btn("↷", cmd("redo"), "Redo"),
  );
  return el("div", { class: "f-row" },
    el("label", {}, label, hint && el("span", { class: "hint" }, hint)),
    el("div", { class: `rich ${inline ? "inline" : ""}` }, bar, body));
}

/* image field: seed placeholder or media-library pick */
function fImage(label, basePath, { srcKey = "src", seedKey = "seed" } = {}) {
  const cur = () => get(basePath) || {};
  const preview = el("div", { class: "prev" });
  const meta = el("span", { class: "mono" });
  const refresh = () => {
    const c = cur();
    const url = c[srcKey] || (c[seedKey] ? `https://picsum.photos/seed/${c[seedKey]}/240/180` : "");
    preview.style.backgroundImage = url ? `url("${url}")` : "none";
    meta.textContent = c[srcKey] ? c[srcKey] : c[seedKey] ? `placeholder seed: ${c[seedKey]}` : "no image";
  };
  refresh();
  return el("div", { class: "f-row" },
    el("label", {}, label),
    el("div", { class: "img-field" },
      preview,
      el("div", { class: "meta" },
        meta,
        el("div", { style: "display:flex;gap:.4rem;flex-wrap:wrap" },
          el("button", { class: "btn small", type: "button", onclick: () => pickMedia((item) => { set(`${basePath}.${srcKey}`, `/media/${item.id}`); refresh(); }) }, "Choose from library"),
          el("button", { class: "btn small", type: "button", onclick: () => { const u = prompt("External image URL", cur()[srcKey] || ""); if (u !== null) { set(`${basePath}.${srcKey}`, u.trim()); refresh(); } } }, "URL"),
          el("button", { class: "btn small danger", type: "button", onclick: () => { set(`${basePath}.${srcKey}`, ""); refresh(); } }, "Reset to placeholder"),
        ))));
}

/* list editor: array of objects with per-item fields + reorder + delete */
function fList(title, path, { itemTitle, fields, blank, addLabel = "Add", hiddenFlag }) {
  const wrap = el("div", { class: "f-row" });
  const listEl = el("div", { class: "li-list" });
  const rebuild = () => {
    listEl.replaceChildren();
    const arr = get(path) || [];
    arr.forEach((item, i) => {
      const ip = `${path}.${i}`;
      const bodyEl = el("div", { class: "li-body" }, fields(ip, item, i));
      const itemEl = el("div", { class: `li-item closed ${hiddenFlag && item[hiddenFlag] === false ? "hidden-item" : ""}`, draggable: "true" },
        el("div", { class: "li-head", onclick: (e) => { if (!e.target.closest(".ctl")) itemEl.classList.toggle("closed"); } },
          el("span", { class: "mono" }, String(i + 1).padStart(2, "0")),
          el("span", { class: "t" }, itemTitle(item, i) || "Untitled"),
          el("div", { class: "ctl" },
            el("button", { title: "Move up", onclick: () => { if (i > 0) { const a = get(path); [a[i - 1], a[i]] = [a[i], a[i - 1]]; markDirty(); rebuild(); } } }, "↑"),
            el("button", { title: "Move down", onclick: () => { const a = get(path); if (i < a.length - 1) { [a[i + 1], a[i]] = [a[i], a[i + 1]]; markDirty(); rebuild(); } } }, "↓"),
            el("button", { title: "Delete", onclick: () => { if (confirm("Delete this item?")) { get(path).splice(i, 1); markDirty(); rebuild(); } } }, "✕"),
          )),
        bodyEl);
      itemEl.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", i); itemEl.classList.add("dragging"); });
      itemEl.addEventListener("dragend", () => itemEl.classList.remove("dragging"));
      itemEl.addEventListener("dragover", (e) => e.preventDefault());
      itemEl.addEventListener("drop", (e) => {
        e.preventDefault();
        const from = +e.dataTransfer.getData("text/plain");
        if (isNaN(from) || from === i) return;
        const a = get(path); const [moved] = a.splice(from, 1); a.splice(i, 0, moved);
        markDirty(); rebuild();
      });
      listEl.append(itemEl);
    });
  };
  rebuild();
  wrap.append(
    el("label", {}, title, el("span", { class: "hint" }, "drag or use ↑↓ to reorder")),
    listEl,
    el("div", {}, el("button", { class: "btn small", type: "button", onclick: () => { (get(path) || set(path, []) || get(path)).push(structuredClone(blank)); markDirty(); rebuild(); } }, `+ ${addLabel}`)));
  return wrap;
}

/* ---------------- media library ---------------- */
async function loadMedia() {
  try { const r = await api("/media"); S.media = r.items; S.usage = r.usage; } catch {}
}
function compressImage(file, { maxW = 2400, quality = 0.82 } = {}) {
  return new Promise((resolve) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return resolve(null);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const cv = el("canvas", { width: w, height: h });
      cv.getContext("2d").drawImage(img, 0, 0, w, h);
      cv.toBlob((blob) => resolve(blob && blob.size < file.size ? { blob, w, h, type: "image/webp" } : null), "image/webp", quality);
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}
const toB64 = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.readAsDataURL(blob); });

async function uploadFile(file, { compress = true } = {}) {
  let blob = file, type = file.type, w = 0, h = 0, name = file.name;
  if (compress) {
    const c = await compressImage(file);
    if (c) { blob = c.blob; type = c.type; w = c.w; h = c.h; name = name.replace(/\.\w+$/, "") + ".webp"; }
  }
  if (blob.size <= 4.5 * 1048576) {
    const data = await toB64(blob);
    return api("/media/upload", { method: "POST", body: { name, type, data, w, h } });
  }
  // chunked
  const CHUNK = 2.5 * 1048576;
  const total = Math.ceil(blob.size / CHUNK);
  if (total > 60) throw new Error("File too large (150 MB max)");
  let id;
  for (let i = 0; i < total; i++) {
    const part = blob.slice(i * CHUNK, (i + 1) * CHUNK);
    const r = await api("/media/chunk", { method: "POST", body: { uploadId: id, seq: i, total, name, type, data: await toB64(part) } });
    id = r.id;
    toast(`Uploading ${name}: ${Math.round(((i + 1) / total) * 100)}%`);
    if (r.done) return r;
  }
}

function pickMedia(onPick) {
  const root = $("#modal-root");
  const grid = el("div", { class: "media-grid" });
  const fill = (q = "") => {
    grid.replaceChildren(...S.media
      .filter((m) => m.type.startsWith("image/") || m.type.startsWith("video/"))
      .filter((m) => !q || (m.name + m.alt + m.folder).toLowerCase().includes(q.toLowerCase()))
      .map((m) => el("div", { class: "m-item", onclick: () => { root.replaceChildren(); onPick(m); } },
        el("div", { class: "th" }, m.type.startsWith("image/") ? el("img", { src: `/media/${m.id}`, loading: "lazy", alt: m.alt || m.name }) : el("span", { class: "mono" }, "video")),
        el("div", { class: "nm" }, m.name))));
  };
  fill();
  const search = el("input", { type: "search", placeholder: "Search media…", style: "width:100%;background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:.5rem 1rem;color:var(--fg)" });
  search.addEventListener("input", () => fill(search.value));
  const fileIn = el("input", { type: "file", multiple: true, accept: "image/*,video/mp4,video/webm", style: "display:none" });
  fileIn.addEventListener("change", async () => {
    for (const f of fileIn.files) { try { await uploadFile(f); } catch (e) { toast(e.message, "err"); } }
    await loadMedia(); fill(search.value); toast("Uploaded", "ok");
  });
  root.replaceChildren(el("div", { class: "modal" },
    el("h3", {}, "Media library"),
    el("div", { style: "display:flex;gap:.6rem" }, search, el("button", { class: "btn", onclick: () => fileIn.click() }, "Upload"), fileIn),
    grid,
    el("div", { class: "m-actions" }, el("button", { class: "btn", onclick: () => root.replaceChildren() }, "Cancel"))));
}

/* ---------------- views ---------------- */
const VIEWS = {};
const NAVSECTIONS = [
  ["Studio", [["overview", "◉", "Overview"], ["pages", "¶", "Pages"], ["records", "▣", "Records & galleries"], ["media", "▤", "Media & files"], ["notes", "✎", "Notes (blog)"]]],
  ["Content", [["voices", "❝", "Testimonials"], ["team", "☰", "Team"], ["services", "ƒ", "Services"], ["faqs", "?", "FAQs"]]],
  ["Site", [["nav", "≡", "Navigation"], ["footer", "▁", "Footer"], ["contact", "@", "Contact info"], ["seo", "◎", "SEO"]]],
  ["System", [["settings", "⚙", "Settings & users"], ["backup", "⎘", "Backup & restore"], ["revisions", "↺", "Version history"], ["activity", "⏱", "Activity log"]]],
];
const VIEWTITLES = Object.fromEntries(NAVSECTIONS.flatMap(([, items]) => items.map(([id, , t]) => [id, t])));

function viewShell(title, ...kids) {
  return el("div", { class: "view" }, el("div", { class: "view-head" }, el("h2", {}, title)), ...kids);
}

/* ---- overview ---- */
VIEWS.overview = () => {
  const changed = JSON.stringify(S.doc) !== JSON.stringify(S.pubDoc);
  const logDays = {};
  (S.log || []).forEach((e) => { const d = e.at.slice(0, 10); logDays[d] = (logDays[d] || 0) + 1; });
  const days = [...Array(14)].map((_, i) => { const d = new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10); return logDays[d] || 0; });
  const max = Math.max(1, ...days);
  const pts = days.map((v, i) => `${(i / 13) * 300},${54 - (v / max) * 48}`).join(" ");
  return viewShell("Overview",
    el("div", { class: "card-grid" },
      el("div", { class: "stat" }, el("b", {}, String(Object.keys(S.doc.pages).length)), el("span", { class: "mono" }, "pages")),
      el("div", { class: "stat" }, el("b", {}, String(S.doc.projects.length)), el("span", { class: "mono" }, "records")),
      el("div", { class: "stat" }, el("b", {}, String(S.media.length)), el("span", { class: "mono" }, `media · ${fmtBytes(S.usage)}`)),
      el("div", { class: "stat" }, el("b", {}, String((S.doc.notes || []).length)), el("span", { class: "mono" }, "notes")),
    ),
    el("div", { class: "card" },
      el("h3", {}, el("span", { class: "mono" }, "PUB"), "Publishing"),
      el("p", { class: changed ? "accent" : "mute" }, changed ? "The draft has unpublished changes." : "Draft and live site are identical."),
      S.schedule.publishAt ? el("p", { class: "mute" }, `Scheduled publish: ${fmtDate(S.schedule.publishAt)}`) : null,
      el("div", { style: "display:flex;gap:.6rem;flex-wrap:wrap" },
        el("a", { class: "btn", href: "/?preview=1", target: "_blank" }, "Preview draft"),
        el("button", { class: "btn primary", onclick: publish }, "Publish"),
        el("button", { class: "btn", onclick: schedulePublish }, "Schedule…"),
        changed ? el("button", { class: "btn danger", onclick: discardDraft }, "Discard draft") : null)),
    el("div", { class: "card" },
      el("h3", {}, el("span", { class: "mono" }, "ACT"), "Activity, last 14 days"),
      el("div", { html: `<svg class="spark" viewBox="0 0 300 56" preserveAspectRatio="none"><polygon class="area" points="0,56 ${pts} 300,56"/><polyline points="${pts}"/></svg>` }),
      el("table", { class: "table" }, el("tbody", {},
        ...(S.log || []).slice(0, 8).map((e) => el("tr", {},
          el("td", { class: "mono" }, fmtDate(e.at)), el("td", {}, e.action), el("td", { class: "mono" }, e.user), el("td", { class: "mono" }, e.detail || "")))))),
  );
};

/* ---- pages ---- */
const PAGE_SCHEMAS = {
  home: (b) => [
    fText("Kicker", `${b}.kicker`), fRich("Headline", `${b}.titleHtml`, { inline: true, hint: "italic = the wonky cut" }),
    fArea("Lede", `${b}.lede`),
    el("div", { class: "f-cols" }, fText("Range label", `${b}.rangeLabel`), fText("Range value", `${b}.rangeValue`), fText("Range accent", `${b}.rangeAccent`), fText("Scroll hint", `${b}.scrollHint`)),
    el("hr"), fRich("Practice — statement", `${b}.practice.bigHtml`), fArea("Practice — note", `${b}.practice.note`),
    el("hr"), fLines("Featured record slugs", `${b}.records.featured`, { hint: "slugs from Records, in order" }),
    el("div", { class: "f-cols" }, fText("Open label", `${b}.records.openLabel`), fText("Browse button", `${b}.records.browseCta`)),
    el("hr"), fRich("Photographer — heading", `${b}.photographer.headingHtml`, { inline: true }), fArea("Photographer — note", `${b}.photographer.note`),
    fText("Photographer — link label", `${b}.photographer.linkLabel`), fImage("Portrait", `${b}.photographer.portrait`),
    el("hr"), fRich("Commissions — statement", `${b}.commissions.bigHtml`, { inline: true }), fText("Commissions — button", `${b}.commissions.ctaLabel`),
  ],
  work: (b) => [fRich("Title", `${b}.titleHtml`, { inline: true }), fArea("Lede", `${b}.lede`), el("div", { class: "f-cols" }, fText("File label", `${b}.fileLabel`), fText("Open label", `${b}.openLabel`), fText("Film stamp", `${b}.filmStamp`))],
  archive: (b) => [fRich("Title", `${b}.titleHtml`, { inline: true }), fArea("Lede", `${b}.lede`), fText("Loupe hint", `${b}.hint`), el("div", { class: "f-cols" }, fText("File label", `${b}.fileLabel`), fText("'All' tab label", `${b}.allLabel`))],
  about: (b) => [
    fRich("Title", `${b}.hero.titleHtml`, { inline: true }), fArea("Lede", `${b}.hero.lede`), fImage("Portrait", `${b}.hero.portrait`),
    el("div", { class: "f-cols" }, fText("Caption left", `${b}.hero.figA`), fText("Caption middle", `${b}.hero.figB`), fText("Caption right", `${b}.hero.figC`)),
    el("hr"),
    fRich("Practice ¶1", `${b}.practice.paras.0`, { inline: true }), fRich("Practice ¶2", `${b}.practice.paras.1`, { inline: true }), fRich("Practice ¶3", `${b}.practice.paras.2`, { inline: true }),
    fList("Equipment", `${b}.equipment.items`, { itemTitle: (x) => x.name, blank: { name: "New item", note: "" }, fields: (ip) => [el("div", { class: "f-cols" }, fText("Name", `${ip}.name`), fText("Note", `${ip}.note`))] }),
    fList("Exposure log", `${b}.log.entries`, { itemTitle: (x) => `${x.yr} — ${x.html?.slice(0, 40)}`, blank: { yr: "2026", html: "" }, fields: (ip) => [el("div", { class: "f-cols" }, fText("Year", `${ip}.yr`)), fRich("Entry", `${ip}.html`, { inline: true })] }),
    fLines("Client stamps", `${b}.clients.stamps`),
    fList("Distinctions", `${b}.awards.entries`, { itemTitle: (x) => `${x.yr} — ${x.text?.slice(0, 40)}`, blank: { yr: "2026", text: "" }, fields: (ip) => [el("div", { class: "f-cols" }, fText("Year", `${ip}.yr`), fText("Text", `${ip}.text`))] }),
    el("hr"), fRich("CTA statement", `${b}.cta.bigHtml`, { inline: true }), fText("CTA button", `${b}.cta.ctaLabel`),
  ],
  services: (b) => [fRich("Title", `${b}.titleHtml`, { inline: true }), fArea("Lede", `${b}.lede`), fText("Terms line", `${b}.terms`), el("div", { class: "f-cols" }, fText("File label", `${b}.fileLabel`), fText("FAQ heading", `${b}.faqLabel`), fText("CTA button", `${b}.ctaLabel`))],
  testimonials: (b) => [fRich("Title", `${b}.titleHtml`, { inline: true }), fText("File label", `${b}.fileLabel`), fRich("CTA statement", `${b}.cta.bigHtml`, { inline: true }), fText("CTA button", `${b}.cta.ctaLabel`)],
  contact: (b) => [
    fRich("Title", `${b}.titleHtml`, { inline: true }), fArea("Lede", `${b}.lede`),
    el("h3", {}, "Form"),
    el("div", { class: "f-cols" }, fText("Name label", `${b}.form.nameLabel`), fText("Email label", `${b}.form.emailLabel`), fText("Type label", `${b}.form.kindLabel`), fText("Brief label", `${b}.form.briefLabel`), fText("Deadline label", `${b}.form.deadlineLabel`), fText("Submit button", `${b}.form.submitLabel`)),
    fLines("Order types", `${b}.form.kinds`),
    el("div", { class: "f-cols" }, fText("Brief placeholder", `${b}.form.briefPlaceholder`), fText("Deadline placeholder", `${b}.form.deadlinePlaceholder`)),
  ],
  notes: (b) => [fRich("Title", `${b}.titleHtml`, { inline: true }), fArea("Lede", `${b}.lede`), el("div", { class: "f-cols" }, fText("Read label", `${b}.readLabel`), fText("Back label", `${b}.backLabel`))],
  guide: (b) => [
    fRich("Title", `${b}.titleHtml`, { inline: true }), fArea("Lede", `${b}.lede`),
    fList("Sections", `${b}.sections`, { itemTitle: (x) => x.title, blank: { id: "new-section", title: "New section", html: "<p></p>" }, fields: (ip) => [el("div", { class: "f-cols" }, fText("Anchor id", `${ip}.id`), fText("Title", `${ip}.title`)), fRich("Body", `${ip}.html`)] }),
  ],
  notFound: (b) => [fText("Stamp", `${b}.stamp`), fRich("Title", `${b}.titleHtml`, { inline: true }), fArea("Lede", `${b}.lede`), fText("Button", `${b}.ctaLabel`)],
  thanks: (b) => [fText("Stamp", `${b}.stamp`), fRich("Title", `${b}.titleHtml`, { inline: true }), fArea("Lede", `${b}.lede`), fText("Button", `${b}.ctaLabel`)],
};
let pageSel = "home";
VIEWS.pages = () => {
  const body = el("div", { class: "card" });
  const build = () => {
    const b = `pages.${pageSel}`;
    const meta = S.doc.pages[pageSel].metaTitle !== undefined
      ? el("div", { class: "f-cols" }, fText("Meta title", `${b}.metaTitle`), fText("Meta description", `${b}.metaDesc`)) : null;
    body.replaceChildren(el("h3", {}, el("span", { class: "mono" }, "PG"), VIEWTITLES.pages, ` · ${pageSel}`), meta, ...(PAGE_SCHEMAS[pageSel]?.(b) || [el("p", { class: "mute" }, "No editor for this page.")]));
  };
  const sel = el("select", { style: "max-width:220px" }, ...Object.keys(S.doc.pages).map((p) => el("option", { value: p, selected: p === pageSel }, p)));
  sel.addEventListener("change", () => { pageSel = sel.value; build(); });
  build();
  return viewShell("Pages", el("div", { class: "f-row", style: "max-width:220px" }, el("label", {}, "Page"), sel), body);
};

/* ---- records ---- */
const LAYOUTS = ["full", "row", "inset", "off-l", "off-r"];
VIEWS.records = () => viewShell("Records & galleries",
  el("p", { class: "mute" }, "Each record is a full case study: metadata, plates (gallery), films, behind-the-scenes, laurels. Order here is the site order."),
  fList("Records", "projects", {
    itemTitle: (p) => `${p.title} · ${p.kelvin} K`, hiddenFlag: "visible", addLabel: "New record",
    blank: { slug: `new-record-${Date.now().toString(36)}`, title: "New record", kelvin: 3200, client: "", role: "Photography", year: "2026", category: "Editorial", location: "", camera: "", lens: "", index: "REC-NEW", summary: "", description: "", plates: [{ seed: "new-plate", w: 1600, h: 1067, caption: "Plate", layout: "full" }], bts: [], videos: [], awards: [], publications: [], visible: true },
    fields: (ip, p) => [
      el("div", { class: "f-cols" },
        fText("Title", `${ip}.title`), fText("Slug", `${ip}.slug`, { hint: "/projects/<slug>.html" }), fText("Kelvin", `${ip}.kelvin`, { type: "number" }),
        fText("Client", `${ip}.client`), fText("Role", `${ip}.role`), fText("Year", `${ip}.year`),
        fText("Category", `${ip}.category`), fText("Location", `${ip}.location`), fText("Camera", `${ip}.camera`),
        fText("Lens", `${ip}.lens`), fText("Index no.", `${ip}.index`)),
      fToggle("Visible on the site", `${ip}.visible`),
      fArea("Summary", `${ip}.summary`), fArea("Description", `${ip}.description`),
      fList("Plates (image collection)", `${ip}.plates`, {
        itemTitle: (x) => x.caption || x.seed, addLabel: "Plate",
        blank: { seed: "plate", src: "", w: 1600, h: 1067, caption: "", layout: "full" },
        fields: (pp) => [
          fImage("Image", pp),
          el("div", { class: "f-cols" }, fText("Caption", `${pp}.caption`), fSelect("Layout", `${pp}.layout`, LAYOUTS), fText("Width", `${pp}.w`, { type: "number" }), fText("Height", `${pp}.h`, { type: "number" })),
        ],
      }),
      fList("Films (motion)", `${ip}.videos`, {
        itemTitle: (x) => x.title, addLabel: "Film",
        blank: { title: "New film", duration: "", note: "", src: "", embed: "", poster: "", posterSrc: "", autoplay: false, loop: false, muted: false, controls: true },
        fields: (vp) => [
          el("div", { class: "f-cols" }, fText("Title", `${vp}.title`), fText("Duration", `${vp}.duration`), fText("Caption note", `${vp}.note`)),
          el("div", { class: "f-cols" }, fText("MP4/WebM URL", `${vp}.src`, { hint: "upload in Media, copy /media/… url" }), fText("Embed URL", `${vp}.embed`, { hint: "player.vimeo.com / youtube-nocookie.com" })),
          fImage("Poster", vp, { srcKey: "posterSrc", seedKey: "poster" }),
          el("div", { style: "display:flex;gap:1.2rem;flex-wrap:wrap" }, fToggle("Autoplay", `${vp}.autoplay`), fToggle("Loop", `${vp}.loop`), fToggle("Mute", `${vp}.muted`), fToggle("Controls", `${vp}.controls`)),
        ],
      }),
      fList("Behind the scenes", `${ip}.bts`, {
        itemTitle: (x) => x.caption || x.seed, addLabel: "Frame",
        blank: { seed: "bts", src: "", caption: "" },
        fields: (bp) => [fImage("Image", bp), fText("Caption", `${bp}.caption`)],
      }),
      fLines("Awards", `${ip}.awards`), fLines("Publications", `${ip}.publications`),
    ],
  }));

/* ---- media ---- */
VIEWS.media = () => {
  const grid = el("div", { class: "media-grid" });
  let q = "";
  const CAP = 500 * 1048576;
  const fill = () => {
    grid.replaceChildren(...S.media
      .filter((m) => !q || (m.name + m.alt + m.folder).toLowerCase().includes(q.toLowerCase()))
      .map((m) => el("div", { class: "m-item", onclick: () => mediaDetail(m, fill) },
        el("div", { class: "th" }, m.type.startsWith("image/") ? el("img", { src: `/media/${m.id}`, loading: "lazy", alt: m.alt || m.name }) : el("span", { class: "mono" }, m.type.split("/")[1] || "file")),
        el("div", { class: "nm" }, `${m.name} · ${fmtBytes(m.size)}`))));
    if (!S.media.length) grid.append(el("p", { class: "mute" }, "Nothing here yet — upload your first files."));
  };
  fill();
  const search = el("input", { type: "search", placeholder: "Search files…" });
  search.addEventListener("input", () => { q = search.value; fill(); });
  const fileIn = el("input", { type: "file", multiple: true, accept: "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/mp4,video/webm", style: "display:none" });
  const doUpload = async (files) => {
    for (const f of files) {
      try { await uploadFile(f); toast(`${f.name} uploaded`, "ok"); }
      catch (e) { toast(`${f.name}: ${e.message}`, "err"); }
    }
    await loadMedia(); fill(); renderTop();
  };
  fileIn.addEventListener("change", () => doUpload(fileIn.files));
  const drop = el("div", { class: "dropzone" }, "Drop images or videos here — images are compressed and resized automatically. PNG · JPG · WEBP · GIF · SVG · MP4 · WEBM");
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); doUpload(e.dataTransfer.files); });
  return viewShell("Media & files",
    el("div", { class: "media-toolbar" },
      search,
      el("div", { class: "usage" }, el("span", { class: "mono" }, `Storage · ${fmtBytes(S.usage)} of ${fmtBytes(CAP)}`), el("div", { class: "bar" }, el("i", { style: `width:${Math.min(100, (S.usage / CAP) * 100)}%` }))),
      el("button", { class: "btn primary", onclick: () => fileIn.click() }, "Upload"), fileIn),
    drop, grid);
};
function mediaDetail(m, onChange) {
  const root = $("#modal-root");
  const altIn = el("input", { type: "text", value: m.alt || "" });
  const capIn = el("input", { type: "text", value: m.caption || "" });
  const nameIn = el("input", { type: "text", value: m.name || "" });
  root.replaceChildren(el("div", { class: "modal" },
    el("h3", {}, m.name),
    m.type.startsWith("image/") ? el("img", { src: `/media/${m.id}`, style: "max-height:40svh;object-fit:contain;border-radius:8px" }) :
      el("video", { src: `/media/${m.id}`, controls: true, style: "max-height:40svh;width:100%;border-radius:8px" }),
    el("p", { class: "mono mute" }, `${m.type} · ${fmtBytes(m.size)} · uploaded ${fmtDate(m.at)} · url: /media/${m.id}`),
    el("div", { class: "f-cols" },
      el("div", { class: "f-row" }, el("label", {}, "Name"), nameIn),
      el("div", { class: "f-row" }, el("label", {}, "Alt text"), altIn),
      el("div", { class: "f-row" }, el("label", {}, "Caption"), capIn)),
    el("div", { class: "m-actions" },
      el("button", { class: "btn", onclick: () => { navigator.clipboard?.writeText(`/media/${m.id}`); toast("URL copied", "ok"); } }, "Copy URL"),
      el("a", { class: "btn", href: `/media/${m.id}`, download: m.name }, "Download"),
      m.type.startsWith("image/") && m.type !== "image/svg+xml" ? el("button", { class: "btn", onclick: () => cropDialog(m, onChange) }, "Crop copy…") : null,
      el("button", { class: "btn danger", onclick: async () => {
        if (!confirm("Delete this file? Anything using it will lose its image.")) return;
        await api(`/media/${m.id}`, { method: "DELETE" }); await loadMedia(); onChange(); root.replaceChildren(); toast("Deleted", "ok");
      } }, "Delete"),
      el("button", { class: "btn primary", onclick: async () => {
        await api(`/media/${m.id}`, { method: "PATCH", body: { alt: altIn.value, caption: capIn.value, name: nameIn.value } });
        await loadMedia(); onChange(); root.replaceChildren(); toast("Saved", "ok");
      } }, "Save")),
  ));
}
function cropDialog(m, onChange) {
  const root = $("#modal-root");
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const stage = el("div", { class: "crop-stage" });
    const cv = el("canvas", { width: img.width, height: img.height });
    cv.getContext("2d").drawImage(img, 0, 0);
    const rect = el("div", { class: "crop-rect" });
    stage.append(cv, rect);
    let sel = { x: img.width * .1, y: img.height * .1, w: img.width * .8, h: img.height * .8 };
    let ratio = 0;
    const sync = () => {
      const scale = cv.getBoundingClientRect().width / img.width;
      const off = cv.offsetLeft, offT = cv.offsetTop;
      Object.assign(rect.style, { left: `${off + sel.x * scale}px`, top: `${offT + sel.y * scale}px`, width: `${sel.w * scale}px`, height: `${sel.h * scale}px` });
    };
    let drag = null;
    rect.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, sx: sel.x, sy: sel.y }; rect.setPointerCapture(e.pointerId); });
    rect.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const scale = cv.getBoundingClientRect().width / img.width;
      sel.x = Math.max(0, Math.min(img.width - sel.w, drag.sx + (e.clientX - drag.x) / scale));
      sel.y = Math.max(0, Math.min(img.height - sel.h, drag.sy + (e.clientY - drag.y) / scale));
      sync();
    });
    rect.addEventListener("pointerup", () => drag = null);
    const setRatio = (r) => () => {
      ratio = r;
      if (r) { sel.h = Math.min(img.height, sel.w / r); sel.w = sel.h * r; }
      sel.x = Math.min(sel.x, img.width - sel.w); sel.y = Math.min(sel.y, img.height - sel.h);
      sync();
    };
    const zoomSel = (f) => () => {
      const w = Math.max(60, Math.min(img.width, sel.w * f));
      const h = ratio ? w / ratio : Math.max(60, Math.min(img.height, sel.h * f));
      sel = { x: Math.max(0, Math.min(sel.x, img.width - w)), y: Math.max(0, Math.min(sel.y, img.height - h)), w, h };
      sync();
    };
    root.replaceChildren(el("div", { class: "modal" },
      el("h3", {}, `Crop · ${m.name}`),
      el("div", { style: "display:flex;gap:.4rem;flex-wrap:wrap" },
        el("button", { class: "btn small", onclick: setRatio(0) }, "Free"), el("button", { class: "btn small", onclick: setRatio(1) }, "1:1"),
        el("button", { class: "btn small", onclick: setRatio(4 / 3) }, "4:3"), el("button", { class: "btn small", onclick: setRatio(3 / 2) }, "3:2"),
        el("button", { class: "btn small", onclick: setRatio(16 / 9) }, "16:9"), el("button", { class: "btn small", onclick: setRatio(4 / 5) }, "4:5"),
        el("button", { class: "btn small", onclick: zoomSel(0.85) }, "−"), el("button", { class: "btn small", onclick: zoomSel(1.18) }, "+")),
      stage,
      el("div", { class: "m-actions" },
        el("button", { class: "btn", onclick: () => root.replaceChildren() }, "Cancel"),
        el("button", { class: "btn primary", onclick: async () => {
          const out = el("canvas", { width: Math.round(sel.w), height: Math.round(sel.h) });
          out.getContext("2d").drawImage(img, sel.x, sel.y, sel.w, sel.h, 0, 0, sel.w, sel.h);
          out.toBlob(async (blob) => {
            const data = await toB64(blob);
            await api("/media/upload", { method: "POST", body: { name: m.name.replace(/\.\w+$/, "") + "-crop.webp", type: "image/webp", data, w: out.width, h: out.height } });
            await loadMedia(); onChange(); root.replaceChildren(); toast("Cropped copy saved", "ok");
          }, "image/webp", 0.85);
        } }, "Save cropped copy"))));
    requestAnimationFrame(sync);
  };
  img.src = `/media/${m.id}`;
}

/* ---- notes (blog) ---- */
VIEWS.notes = () => viewShell("Notes (blog)",
  el("p", { class: "mute" }, "Published notes appear at /notes.html (add it to Navigation when you're ready). Drafts stay invisible."),
  fList("Notes", "notes", {
    itemTitle: (n) => `${n.status === "published" ? "●" : "○"} ${n.title}`, addLabel: "New note",
    blank: { slug: `note-${Date.now().toString(36)}`, title: "New note", date: new Date().toISOString().slice(0, 10), author: "Iris Kavan", cat: "", tags: [], cover: { seed: "", src: "" }, excerpt: "", bodyHtml: "<p></p>", metaTitle: "", metaDesc: "", status: "draft", publishAt: "", unpublishAt: "" },
    fields: (ip) => [
      el("div", { class: "f-cols" }, fText("Title", `${ip}.title`), fText("Slug", `${ip}.slug`), fText("Date", `${ip}.date`, { hint: "YYYY-MM-DD" }), fText("Author", `${ip}.author`), fText("Category", `${ip}.cat`), fSelect("Status", `${ip}.status`, ["draft", "published"])),
      fLines("Tags", `${ip}.tags`, { hint: "one per line" }),
      el("div", { class: "f-cols" }, fText("Schedule publish (ISO)", `${ip}.publishAt`, { hint: "e.g. 2026-08-01T09:00:00Z" }), fText("Schedule unpublish (ISO)", `${ip}.unpublishAt`)),
      fImage("Cover", `${ip}.cover`), fArea("Excerpt", `${ip}.excerpt`),
      fRich("Body", `${ip}.bodyHtml`),
      el("div", { class: "f-cols" }, fText("Meta title", `${ip}.metaTitle`), fText("Meta description", `${ip}.metaDesc`)),
    ],
  }));

/* ---- voices / team / services / faqs ---- */
VIEWS.voices = () => viewShell("Testimonials",
  fList("Voices", "voices", {
    itemTitle: (v) => v.who, hiddenFlag: "visible", addLabel: "Testimonial",
    blank: { id: `v${Date.now().toString(36)}`, q: "", who: "", role: "", company: "", rating: 5, photo: "", k: 3200, where: "", visible: true },
    fields: (ip) => [
      fArea("Quote", `${ip}.q`),
      el("div", { class: "f-cols" }, fText("Name", `${ip}.who`), fText("Position / role line", `${ip}.role`), fText("Company", `${ip}.company`), fSelect("Rating", `${ip}.rating`, [5, 4, 3, 2, 1]), fText("Kelvin", `${ip}.k`, { type: "number" }), fText("Recorded-at line", `${ip}.where`)),
      fImage("Photo (stored, not displayed by the current design)", ip, { srcKey: "photo", seedKey: "_none" }),
      fToggle("Visible", `${ip}.visible`),
    ],
  }));
VIEWS.team = () => viewShell("Team",
  el("p", { class: "mute" }, "Team members render on the About page as 'The studio' — only when at least one is visible, so the current design stays untouched until you need it."),
  fList("Members", "team", {
    itemTitle: (t) => `${t.name} · ${t.role}`, hiddenFlag: "visible", addLabel: "Member",
    blank: { name: "New member", role: "Role", bioHtml: "", photo: "", email: "", socials: [], visible: true },
    fields: (ip) => [
      el("div", { class: "f-cols" }, fText("Name", `${ip}.name`), fText("Role", `${ip}.role`), fText("Email", `${ip}.email`)),
      fRich("Bio", `${ip}.bioHtml`, { inline: true }),
      fImage("Photo", ip, { srcKey: "photo", seedKey: "_none" }),
      fList("Social links", `${ip}.socials`, { itemTitle: (s) => s.label, addLabel: "Link", blank: { label: "Instagram", url: "https://" }, fields: (sp) => [el("div", { class: "f-cols" }, fText("Label", `${sp}.label`), fText("URL", `${sp}.url`))] }),
      fToggle("Visible", `${ip}.visible`),
    ],
  }));
VIEWS.services = () => viewShell("Services",
  fList("Orders", "services", {
    itemTitle: (s) => `${s.no} · ${s.titleHtml?.replace(/<[^>]+>/g, "")}`, hiddenFlag: "visible", addLabel: "Service",
    blank: { id: `s${Date.now().toString(36)}`, no: "Order 04", lead: "lead time", titleHtml: "New service", price: "From €0", desc: "", specs: [{ dt: "Duration", dd: "" }], steps: [{ f: "f/1.4", text: "" }], buttonLabel: "", buttonHref: "", visible: true },
    fields: (ip) => [
      el("div", { class: "f-cols" }, fText("Order no.", `${ip}.no`), fText("Lead time", `${ip}.lead`), fText("Price", `${ip}.price`)),
      fRich("Title", `${ip}.titleHtml`, { inline: true }), fArea("Description", `${ip}.desc`),
      el("div", { class: "f-cols" }, fText("Button label (optional)", `${ip}.buttonLabel`), fText("Button link", `${ip}.buttonHref`)),
      fList("Spec grid", `${ip}.specs`, { itemTitle: (x) => `${x.dt}: ${x.dd}`, addLabel: "Spec", blank: { dt: "Label", dd: "Value" }, fields: (sp) => [el("div", { class: "f-cols" }, fText("Label", `${sp}.dt`), fText("Value", `${sp}.dd`))] }),
      fList("F-stop process", `${ip}.steps`, { itemTitle: (x) => `${x.f} ${x.text?.slice(0, 30)}`, addLabel: "Step", blank: { f: "f/1.4", text: "" }, fields: (sp) => [el("div", { class: "f-cols" }, fText("F-stop", `${sp}.f`)), fRich("Text", `${sp}.text`, { inline: true })] }),
      fToggle("Visible", `${ip}.visible`),
    ],
  }));
VIEWS.faqs = () => viewShell("FAQs",
  el("p", { class: "mute" }, "FAQs render at the bottom of Services — only when at least one is visible."),
  fList("Questions", "faqs", {
    itemTitle: (f) => f.q, hiddenFlag: "visible", addLabel: "Question",
    blank: { q: "New question?", a: "<p></p>", cat: "", visible: true },
    fields: (ip) => [fText("Question", `${ip}.q`), fRich("Answer", `${ip}.a`), fText("Category", `${ip}.cat`), fToggle("Visible", `${ip}.visible`)],
  }));

/* ---- nav / footer / contact / seo ---- */
VIEWS.nav = () => viewShell("Navigation",
  el("p", { class: "mute" }, "The Index overlay and footer both follow this list. Kelvin sets each entry's hover colour and the room temperature it suggests."),
  fList("Menu items", "nav", {
    itemTitle: (n) => `${n.label} → ${n.href}`, hiddenFlag: "visible", addLabel: "Menu item",
    blank: { href: "/", label: "New item", k: 3200, visible: true, children: [] },
    fields: (ip) => [
      el("div", { class: "f-cols" }, fText("Label", `${ip}.label`), fText("Link", `${ip}.href`), fText("Kelvin", `${ip}.k`, { type: "number" })),
      fToggle("Visible", `${ip}.visible`),
      fList("Sub-items", `${ip}.children`, { itemTitle: (x) => x.label, addLabel: "Sub-item", blank: { href: "/", label: "Sub-item", visible: true }, fields: (cp) => [el("div", { class: "f-cols" }, fText("Label", `${cp}.label`), fText("Link", `${cp}.href`)), fToggle("Visible", `${cp}.visible`)] }),
    ],
  }));
VIEWS.footer = () => viewShell("Footer",
  el("div", { class: "card" },
    fRich("Signature line", "settings.footer.sig", { inline: true }),
    el("div", { class: "f-cols" }, fText("Column: index", "settings.footer.colIndex"), fText("Column: records", "settings.footer.colRecords"), fText("Column: elsewhere", "settings.footer.colElsewhere")),
    el("div", { class: "f-cols" }, fText("Base left (©)", "settings.footer.baseLeft"), fText("Base middle", "settings.footer.baseMid"), fText("Base right", "settings.footer.baseRight")),
    el("hr"),
    fToggle("Newsletter signup", "settings.footer.newsletterEnabled"),
    el("div", { class: "f-cols" }, fText("Newsletter title", "settings.footer.newsletterTitle"), fText("Note", "settings.footer.newsletterNote"), fText("Placeholder", "settings.footer.newsletterPlaceholder"), fText("Button", "settings.footer.newsletterButton")),
    el("hr"),
    fList("Social links", "settings.socials", { itemTitle: (s) => s.label, addLabel: "Link", blank: { label: "Instagram", url: "https://" }, fields: (sp) => [el("div", { class: "f-cols" }, fText("Label", `${sp}.label`), fText("URL", `${sp}.url`))] })));
VIEWS.contact = () => viewShell("Contact info",
  el("div", { class: "card" },
    el("div", { class: "f-cols" }, fText("Public email", "settings.email"), fText("Phone", "pages.contact.phone", { hint: "shown when set" }), fText("WhatsApp number", "pages.contact.whatsapp", { hint: "digits, intl format" })),
    fRich("Email display (2 lines)", "pages.contact.emailDisplayHtml", { inline: true }),
    fRich("Address", "pages.contact.addressHtml", { inline: true }),
    fRich("Business hours", "pages.contact.hoursHtml", { inline: true }),
    fRich("Representation", "pages.contact.repHtml", { inline: true }),
    el("div", { class: "f-cols" }, fText("Google Maps embed URL", "pages.contact.mapsEmbed", { hint: "google.com/maps/embed?... — shown when set" }), fText("Map label", "pages.contact.mapsLabel"))));
VIEWS.seo = () => viewShell("SEO",
  el("div", { class: "card" },
    el("h3", {}, el("span", { class: "mono" }, "GLB"), "Global"),
    el("div", { class: "f-cols" }, fText("Canonical base URL", "seo.canonicalBase"), fText("Open Graph image URL", "seo.ogImage", { hint: "pick from Media, paste /media/… url" })),
    fArea("robots.txt", "seo.robots"),
    fArea("Schema markup (JSON-LD)", "settings.schemaMarkup", { hint: "raw JSON-LD, injected into every page head" }),
    el("p", { class: "mono mute" }, "sitemap.xml is generated automatically from all live pages, records and notes.")),
  el("div", { class: "card" },
    el("h3", {}, el("span", { class: "mono" }, "PGS"), "Per-page meta"),
    ...Object.keys(S.doc.pages).filter((p) => S.doc.pages[p].metaTitle !== undefined).map((p) =>
      el("div", { class: "f-cols" }, fText(`${p} · title`, `pages.${p}.metaTitle`), fText(`${p} · description`, `pages.${p}.metaDesc`)))));

/* ---- settings / backup / revisions / activity ---- */
VIEWS.settings = () => {
  const curIn = el("input", { type: "password", autocomplete: "current-password" });
  const newIn = el("input", { type: "password", autocomplete: "new-password" });
  const userCard = el("div", { class: "card" }, el("h3", {}, el("span", { class: "mono" }, "USR"), "Users"));
  if (S.session.role === "owner") {
    api("/users").then((users) => {
      const table = el("table", { class: "table" },
        el("thead", {}, el("tr", {}, el("th", {}, "Email"), el("th", {}, "Name"), el("th", {}, "Role"), el("th", {}, ""))),
        el("tbody", {}, ...users.map((u) => el("tr", {},
          el("td", {}, u.email), el("td", {}, u.name), el("td", {}, el("span", { class: `pill ${u.role === "owner" ? "amber" : ""}` }, u.role)),
          el("td", {}, u.email !== S.session.email ? el("button", { class: "btn small danger", onclick: async () => { if (confirm(`Remove ${u.email}?`)) { await api(`/users?email=${encodeURIComponent(u.email)}`, { method: "DELETE" }); render(); } } }, "Remove") : el("span", { class: "mono mute" }, "you"))))));
      const em = el("input", { type: "email", placeholder: "email" }), nm = el("input", { type: "text", placeholder: "name" }), pw = el("input", { type: "password", placeholder: "password (10+ chars)" });
      const role = el("select", {}, el("option", { value: "editor" }, "editor"), el("option", { value: "owner" }, "owner"));
      userCard.append(table,
        el("p", { class: "mute" }, "Editors can change content and media; owners can also manage users, backups and settings."),
        el("div", { class: "f-cols" }, el("div", { class: "f-row" }, el("label", {}, "Email"), em), el("div", { class: "f-row" }, el("label", {}, "Name"), nm), el("div", { class: "f-row" }, el("label", {}, "Password"), pw), el("div", { class: "f-row" }, el("label", {}, "Role"), role)),
        el("div", {}, el("button", { class: "btn", onclick: async () => {
          try {
            const r = await api("/users", { method: "POST", body: { email: em.value, name: nm.value, password: pw.value, role: role.value } });
            showRecovery(r.recoveryCode, `Account created. Give ${em.value} this recovery code:`);
            render();
          } catch (e) { toast(e.message, "err"); }
        } }, "Add user")));
    }).catch(() => {});
  } else {
    userCard.append(el("p", { class: "mute" }, "Only owners manage users."));
  }
  return viewShell("Settings & users",
    el("div", { class: "card" },
      el("h3", {}, el("span", { class: "mono" }, "IDN"), "Identity"),
      el("div", { class: "f-cols" }, fText("Site title", "settings.siteTitle"), fText("Wordmark", "settings.wordmark"), fText("Masthead tagline", "settings.mastheadTag"), fText("Boot line", "settings.bootLine")),
      fRich("Menu ledger line", "settings.menuLedgerLine", { inline: true })),
    userCard,
    el("div", { class: "card" },
      el("h3", {}, el("span", { class: "mono" }, "PWD"), "Change password"),
      el("div", { class: "f-cols" },
        el("div", { class: "f-row" }, el("label", {}, "Current password"), curIn),
        el("div", { class: "f-row" }, el("label", {}, "New password (10+ chars)"), newIn)),
      el("div", {}, el("button", { class: "btn", onclick: async () => {
        try { const r = await api("/password", { method: "POST", body: { current: curIn.value, newPassword: newIn.value } }); S.session = r.session; toast("Password changed", "ok"); curIn.value = newIn.value = ""; }
        catch (e) { toast(e.message, "err"); }
      } }, "Change password"))));
};
VIEWS.backup = () => viewShell("Backup & restore",
  el("div", { class: "card" },
    el("h3", {}, el("span", { class: "mono" }, "EXP"), "Export"),
    el("p", { class: "mute" }, "Downloads the complete content database (draft + published + media index) as JSON. Media binaries stay in storage; keep original files locally too."),
    el("div", {}, el("button", { class: "btn primary", onclick: async () => {
      try {
        const data = await api("/backup");
        const a = el("a", { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })), download: `ledger-backup-${new Date().toISOString().slice(0, 10)}.json` });
        a.click(); toast("Backup downloaded", "ok");
      } catch (e) { toast(e.message, "err"); }
    } }, "Download backup"))),
  el("div", { class: "card" },
    el("h3", {}, el("span", { class: "mono" }, "IMP"), "Restore"),
    el("p", { class: "mute" }, "Restores a backup into the draft (the live site is untouched until you publish). The current draft is snapshotted first."),
    el("div", {}, el("input", { type: "file", accept: "application/json", onchange: async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        await api("/restore", { method: "POST", body: { draft: data.draft || data } });
        S.doc = await api("/content"); toast("Restored to draft — review, then publish", "ok"); render();
      } catch (err2) { toast(err2.message, "err"); }
    } }))));
VIEWS.revisions = () => {
  const wrap = viewShell("Version history", el("div", { class: "card" }, el("div", { class: "skeleton", style: "height:80px" })));
  api("/revisions").then((revs) => {
    const card = el("div", { class: "card" },
      el("h3", {}, el("span", { class: "mono" }, "REV"), "Every publish is filed here"),
      revs.length ? el("table", { class: "table" },
        el("thead", {}, el("tr", {}, el("th", {}, "When"), el("th", {}, "By"), el("th", {}, "Note"), el("th", {}, ""))),
        el("tbody", {}, ...revs.map((r) => el("tr", {},
          el("td", { class: "mono" }, fmtDate(r.at)), el("td", { class: "mono" }, r.user), el("td", {}, r.note || ""),
          el("td", {}, el("div", { style: "display:flex;gap:.4rem;justify-content:flex-end" },
            el("button", { class: "btn small", onclick: async () => { if (confirm("Load this version into the draft?")) { await api("/revisions/restore", { method: "POST", body: { id: r.id } }); S.doc = await api("/content"); toast("Loaded into draft", "ok"); render(); } } }, "To draft"),
            el("button", { class: "btn small danger", onclick: async () => { if (confirm("Roll the LIVE site back to this version?")) { await api("/revisions/restore", { method: "POST", body: { id: r.id, target: "publish" } }); S.doc = await api("/content"); S.pubDoc = await api("/content?kind=published"); toast("Rolled back live site", "ok"); render(); } } }, "Rollback live"))))))) :
        el("p", { class: "mute" }, "No revisions yet — the first publish will create one."));
    wrap.replaceChildren(el("div", { class: "view-head" }, el("h2", {}, "Version history")), card);
  }).catch((e) => toast(e.message, "err"));
  return wrap;
};
VIEWS.activity = () => {
  const wrap = viewShell("Activity log", el("div", { class: "card" }, el("div", { class: "skeleton", style: "height:120px" })));
  api("/logs").then((log) => {
    S.log = log;
    let page = 0, filter = "";
    const PER = 25;
    const card = el("div", { class: "card" });
    const build = () => {
      const rows = log.filter((e) => !filter || e.action === filter);
      const slice = rows.slice(page * PER, page * PER + PER);
      card.replaceChildren(
        el("div", { style: "display:flex;gap:.7rem;align-items:center;flex-wrap:wrap" },
          el("select", { onchange: (e) => { filter = e.target.value; page = 0; build(); } },
            el("option", { value: "" }, "All actions"),
            ...[...new Set(log.map((e) => e.action))].map((a) => el("option", { value: a, selected: filter === a }, a))),
          el("span", { class: "mono mute" }, `${rows.length} entries`),
          el("span", { style: "flex:1" }),
          el("button", { class: "btn small", disabled: page === 0, onclick: () => { page--; build(); } }, "← Newer"),
          el("button", { class: "btn small", disabled: (page + 1) * PER >= rows.length, onclick: () => { page++; build(); } }, "Older →")),
        el("table", { class: "table" },
          el("thead", {}, el("tr", {}, el("th", {}, "When"), el("th", {}, "User"), el("th", {}, "Action"), el("th", {}, "Detail"))),
          el("tbody", {}, ...slice.map((e) => el("tr", {},
            el("td", { class: "mono" }, fmtDate(e.at)), el("td", { class: "mono" }, e.user),
            el("td", {}, el("span", { class: `pill ${/fail|delete/.test(e.action) ? "red" : /publish|login/.test(e.action) ? "amber" : ""}` }, e.action)),
            el("td", { class: "mono" }, e.detail || ""))))));
    };
    build();
    wrap.replaceChildren(el("div", { class: "view-head" }, el("h2", {}, "Activity log")), card);
  }).catch((e) => toast(e.message, "err"));
  return wrap;
};

/* ---------------- publish workflow ---------------- */
async function publish() {
  const note = prompt("Publish note (for version history):", "Content update");
  if (note === null) return;
  await saveDraft(true);
  try {
    await api("/publish", { method: "POST", body: { note } });
    S.pubDoc = structuredClone(S.doc);
    toast("Published — live now", "ok");
    render();
  } catch (e) { toast(e.message, "err"); }
}
async function discardDraft() {
  if (!confirm("Throw away all unpublished changes and reload the live version?")) return;
  try { await api("/discard", { method: "POST" }); S.doc = await api("/content"); S.dirty = false; toast("Draft reset to live", "ok"); render(); }
  catch (e) { toast(e.message, "err"); }
}
function schedulePublish() {
  const root = $("#modal-root");
  const input = el("input", { type: "datetime-local" });
  root.replaceChildren(el("div", { class: "modal small" },
    el("h3", {}, "Schedule publish"),
    el("p", { class: "mute" }, "The current draft will go live at this time (checked hourly)."),
    el("div", { class: "f-row" }, el("label", {}, "When"), input),
    el("div", { class: "m-actions" },
      S.schedule.publishAt ? el("button", { class: "btn danger", onclick: async () => { await api("/schedule", { method: "POST", body: { publishAt: null } }); S.schedule = {}; root.replaceChildren(); toast("Schedule cleared", "ok"); render(); } }, "Clear schedule") : null,
      el("button", { class: "btn", onclick: () => root.replaceChildren() }, "Cancel"),
      el("button", { class: "btn primary", onclick: async () => {
        if (!input.value) return;
        await saveDraft(true);
        const iso = new Date(input.value).toISOString();
        await api("/schedule", { method: "POST", body: { publishAt: iso } });
        S.schedule = { publishAt: iso };
        root.replaceChildren(); toast("Publish scheduled", "ok"); render();
      } }, "Schedule"))));
}

/* ---------------- search palette ---------------- */
function openPalette() {
  const root = $("#modal-root");
  const entries = [];
  NAVSECTIONS.forEach(([, items]) => items.forEach(([id, , t]) => entries.push({ label: t, kind: "section", go: () => nav(id) })));
  Object.keys(S.doc.pages).forEach((p) => entries.push({ label: `Page: ${p}`, kind: "page", go: () => { pageSel = p; nav("pages"); } }));
  S.doc.projects.forEach((p) => entries.push({ label: p.title, sub: `${p.kelvin} K · ${p.category}`, kind: "record", go: () => nav("records") }));
  (S.doc.notes || []).forEach((n) => entries.push({ label: n.title, sub: n.status, kind: "note", go: () => nav("notes") }));
  S.doc.voices.forEach((v) => entries.push({ label: v.who, sub: "testimonial", kind: "voice", go: () => nav("voices") }));
  S.doc.services.forEach((s) => entries.push({ label: s.titleHtml.replace(/<[^>]+>/g, ""), sub: "service", kind: "service", go: () => nav("services") }));
  (S.doc.faqs || []).forEach((f) => entries.push({ label: f.q, kind: "faq", go: () => nav("faqs") }));
  (S.doc.team || []).forEach((t) => entries.push({ label: t.name, sub: "team", kind: "team", go: () => nav("team") }));
  S.media.forEach((m) => entries.push({ label: m.name, sub: m.type, kind: "media", go: () => nav("media") }));
  const results = el("div", { class: "results" });
  let hot = 0;
  const input = el("input", { type: "search", placeholder: "Search everything… (pages, records, media, notes)" });
  const fill = () => {
    const q = input.value.toLowerCase();
    const hits = entries.filter((e) => (e.label + (e.sub || "") + e.kind).toLowerCase().includes(q)).slice(0, 12);
    hot = Math.min(hot, Math.max(0, hits.length - 1));
    results.replaceChildren(...hits.map((e, i) => el("button", { class: `res ${i === hot ? "hot" : ""}`, onclick: () => { root.replaceChildren(); e.go(); } },
      el("span", { class: "mono" }, e.kind), e.label, e.sub ? el("span", { class: "sub" }, e.sub) : null)));
  };
  input.addEventListener("input", () => { hot = 0; fill(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { hot++; fill(); e.preventDefault(); }
    if (e.key === "ArrowUp") { hot = Math.max(0, hot - 1); fill(); e.preventDefault(); }
    if (e.key === "Enter") { results.children[hot]?.click(); }
  });
  fill();
  root.replaceChildren(el("div", { class: "palette" }, input, results));
  root.onclick = (e) => { if (e.target === root) root.replaceChildren(); };
  input.focus();
}

/* ---------------- auth views ---------------- */
function showRecovery(code, msg) {
  const root = $("#modal-root");
  root.replaceChildren(el("div", { class: "modal small" },
    el("h3", {}, "Recovery code"),
    el("p", { class: "mute" }, msg || "Store this somewhere safe — it is the only way to reset a forgotten password. It will not be shown again."),
    el("div", { class: "code-show" }, code),
    el("div", { class: "m-actions" },
      el("button", { class: "btn", onclick: () => { navigator.clipboard?.writeText(code); toast("Copied", "ok"); } }, "Copy"),
      el("button", { class: "btn primary", onclick: () => root.replaceChildren() }, "I stored it"))));
}
function authView(mode) {
  const email = el("input", { type: "email", autocomplete: "username", required: true });
  const pass = el("input", { type: "password", autocomplete: mode === "login" ? "current-password" : "new-password", required: true });
  const name = el("input", { type: "text", autocomplete: "name" });
  const code = el("input", { type: "text", placeholder: "xxxx-xxxx-xxxx" });
  const form = el("form", { class: "auth-card" },
    el("div", { class: "k-strip" }),
    el("h1", {}, mode === "setup" ? "Open the " : mode === "reset" ? "Reset the " : "Enter the ", el("em", {}, "ledger")),
    el("p", { class: "auth-note" },
      mode === "setup" ? "First run: create the owner account for this site's admin panel." :
      mode === "reset" ? "Use the recovery code you were given when the account was created." :
      "Sign in to edit the site. Every change stays a draft until you publish."),
    mode === "setup" ? el("div", { class: "f-row" }, el("label", {}, "Your name"), name) : null,
    el("div", { class: "f-row" }, el("label", {}, "Email"), email),
    mode === "reset" ? el("div", { class: "f-row" }, el("label", {}, "Recovery code"), code) : null,
    el("div", { class: "f-row" }, el("label", {}, mode === "login" ? "Password" : "New password (10+ characters)"), pass),
    el("button", { class: "btn primary", type: "submit", style: "justify-content:center" },
      mode === "setup" ? "Create owner account" : mode === "reset" ? "Reset password" : "Sign in"),
    mode === "login" ? el("button", { class: "btn", type: "button", onclick: () => render(authView("reset")) }, "Forgot password?") : null,
    mode === "reset" ? el("button", { class: "btn", type: "button", onclick: () => render(authView("login")) }, "Back to sign in") : null,
  );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      if (mode === "setup") {
        const r = await api("/setup", { method: "POST", body: { email: email.value, password: pass.value, name: name.value } });
        S.session = r.session;
        await enterApp();
        showRecovery(r.recoveryCode);
      } else if (mode === "reset") {
        const r = await api("/reset", { method: "POST", body: { email: email.value, recoveryCode: code.value.trim(), newPassword: pass.value } });
        showRecovery(r.recoveryCode, "Password reset. This is your NEW recovery code:");
        render(authView("login"));
      } else {
        const r = await api("/login", { method: "POST", body: { email: email.value, password: pass.value } });
        S.session = r.session;
        await enterApp();
      }
    } catch (err2) { toast(err2.message, "err"); }
  });
  return el("div", { class: "auth-wrap" }, form);
}

/* ---------------- frame & routing ---------------- */
function nav(route) {
  S.route = route;
  location.hash = `/${route}`;
  render();
}
function renderTop() { updateSaveState(); }
function frameView() {
  const side = el("aside", { class: "sidebar" },
    el("div", { class: "side-brand" }, el("span", { class: "dot" }), el("b", {}, S.doc.settings.siteTitle), el("span", { class: "mono" }, "admin")),
    ...NAVSECTIONS.map(([label, items]) => el("div", { class: "nav-group" },
      el("h5", {}, label),
      ...items.map(([id, ic, t]) => el("button", { class: `nav-item ${S.route === id ? "here" : ""}`, onclick: () => { nav(id); side.classList.remove("open"); } },
        el("span", { class: "ic" }, ic[0]), t)))),
    el("div", { class: "side-foot" },
      el("span", { class: "mono mute" }, S.session.email),
      el("div", { style: "display:flex;gap:.4rem;flex-wrap:wrap" },
        el("button", { class: "btn small", onclick: () => { document.documentElement.classList.toggle("light"); localStorage.setItem("ik-admin-theme", document.documentElement.classList.contains("light") ? "light" : "dark"); } }, "◐ Theme"),
        el("button", { class: "btn small", onclick: async () => { await api("/logout", { method: "POST" }); S.session = null; render(); } }, "Sign out"))));
  const view = (VIEWS[S.route] || VIEWS.overview)();
  const main = el("div", { class: "maincol" },
    el("div", { class: "topbar" },
      el("button", { class: "btn icon menu-toggle", "aria-label": "Menu", onclick: () => side.classList.toggle("open") }, "≡"),
      el("div", { class: "crumb" }, el("span", { class: "mono" }, "The Ledger /"), VIEWTITLES[S.route] || "Overview"),
      el("span", { class: "save-state" }),
      el("button", { class: "btn icon", title: "Search (Ctrl+K)", onclick: openPalette }, "⌕"),
      el("button", { class: "btn", onclick: () => saveDraft() }, "Save"),
      el("a", { class: "btn", href: "/?preview=1", target: "_blank" }, "Preview"),
      el("button", { class: "btn primary", onclick: publish }, "Publish")),
    view);
  updateSaveStateSoon();
  return el("div", { class: "frame" }, side, main);
}
const updateSaveStateSoon = () => requestAnimationFrame(updateSaveState);

function render(explicit) {
  app.replaceChildren(explicit || (S.session && S.doc ? frameView() : S.authMode ? authView(S.authMode) : el("div", { class: "boot-skel" }, el("div", { class: "skel-bar" }))));
}

async function enterApp() {
  S.doc = await api("/content");
  S.pubDoc = await api("/content?kind=published");
  try { S.schedule = await api("/schedule"); } catch { S.schedule = {}; }
  try { S.log = await api("/logs"); } catch { S.log = []; }
  await loadMedia();
  render();
}

/* ---------------- boot ---------------- */
if (localStorage.getItem("ik-admin-theme") === "light") document.documentElement.classList.add("light");
addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveDraft(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (S.doc) openPalette(); }
  if (e.key === "Escape") $("#modal-root").replaceChildren();
});
addEventListener("hashchange", () => { const r = location.hash.slice(2); if (r && r !== S.route && S.doc) { S.route = r; render(); } });
addEventListener("beforeunload", (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ""; } });

(async function boot() {
  try {
    const st = await api("/status");
    if (!st.setup) { S.authMode = "setup"; render(); return; }
    if (!st.session) { S.authMode = "login"; render(); return; }
    S.session = st.session;
    await enterApp();
  } catch (e) {
    app.replaceChildren(el("div", { class: "auth-wrap" }, el("div", { class: "auth-card" },
      el("div", { class: "k-strip" }), el("h1", {}, "The ledger is ", el("em", {}, "offline")),
      el("p", { class: "auth-note" }, `The admin API is unreachable (${e.message}). If the site was just deployed, give it a minute and refresh.`))));
  }
})();
