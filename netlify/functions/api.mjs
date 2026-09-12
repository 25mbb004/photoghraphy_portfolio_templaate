/* ============================================================
   Admin API — auth, content, media, revisions, logs, backup.
   Security model:
   - scrypt password hashes, HMAC session tokens in HttpOnly
     SameSite=Strict cookies, 12 h expiry, per-user token version
   - every mutation requires a valid session AND the X-IK-CSRF
     header matching the session's token (double-submit)
   - fixed-window rate limits on login/reset and on mutations
   - role check: 'owner' for users/backup/restore, 'editor'+ for content
   - all rich text is sanitized server-side (allowlist), all plain
     text is stripped of markup, uploads are magic-byte checked
   ============================================================ */
import { purgeCache } from "@netlify/functions";
import {
  getContent, setContent, saveRevision, listRevisions, getRevision,
  appendLog, readLog, mediaIndex, setMediaIndex, mediaStore, contentStore,
} from "./lib/store.mjs";
import {
  getUsers, setUsers, hashPassword, verifyPassword, issueSession,
  sessionCookie, getSession, csrfOk, rateLimit, clientIp, newRecoveryCode,
} from "./lib/auth.mjs";
import { sanitizeHtml, sanitizeText, sanitizeSvg } from "./lib/sanitize.mjs";

const J = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
const err = (msg, status = 400) => J({ error: msg }, status);

async function purge() { try { await purgeCache({ tags: ["content"] }); } catch (e) { /* swr fallback covers us */ } }

/* ---------- content sanitization ---------- */
const HTML_KEYS = /(Html|html)$/;
const HTML_FIELD_NAMES = new Set(["a", "sig", "bodyHtml"]);
function deepSanitize(value, key = "") {
  if (typeof value === "string") {
    if (HTML_KEYS.test(key) || HTML_FIELD_NAMES.has(key)) return sanitizeHtml(value).slice(0, 20000);
    return sanitizeText(value, 8000);
  }
  if (Array.isArray(value)) return value.slice(0, 200).map((v) => deepSanitize(v, key));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith("__")) continue;
      out[k] = deepSanitize(v, k);
    }
    return out;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "boolean" || value === null) return value;
  return null;
}
function validDoc(doc) {
  return doc && typeof doc === "object" &&
    doc.settings && doc.pages && Array.isArray(doc.nav) && Array.isArray(doc.projects) &&
    Array.isArray(doc.voices) && Array.isArray(doc.services) &&
    doc.projects.length <= 60 && JSON.stringify(doc).length < 4_000_000;
}

/* ---------- upload validation ---------- */
const MAGIC = [
  { type: "image/png", ext: "png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/gif", ext: "gif", test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  { type: "image/webp", ext: "webp", test: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 },
  { type: "video/mp4", ext: "mp4", test: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 },
  { type: "video/webm", ext: "webm", test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
];
function sniff(bytes, claimed) {
  if (claimed === "image/svg+xml") {
    const head = Buffer.from(bytes.slice(0, 300)).toString("utf8").trim().toLowerCase();
    return head.startsWith("<?xml") || head.startsWith("<svg") ? { type: "image/svg+xml", ext: "svg" } : null;
  }
  const hit = MAGIC.find((m) => m.test(bytes));
  return hit && hit.type === claimed ? hit : null;
}
const newId = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/* ---------- handler ---------- */
export default async function handler(req, context) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "") || "/";
  const method = req.method;
  const ip = clientIp(req, context);

  const body = async () => { try { return await req.json(); } catch { return {}; } };

  /* ============ AUTH ============ */
  if (path === "/status" && method === "GET") {
    const users = await getUsers();
    const session = await getSession(req);
    return J({ setup: users.length > 0, session });
  }

  if (path === "/setup" && method === "POST") {
    const users = await getUsers();
    if (users.length) return err("Already set up", 403);
    if (!(await rateLimit(`setup:${ip}`, 5, 600))) return err("Too many attempts", 429);
    const { email, password, name } = await body();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || "")) return err("Valid email required");
    if (!password || password.length < 10) return err("Password must be at least 10 characters");
    const recovery = newRecoveryCode();
    const user = {
      email: email.toLowerCase(), name: sanitizeText(name || "Owner", 80), role: "owner",
      hash: hashPassword(password), recoveryHash: hashPassword(recovery), tokenVersion: 0,
      createdAt: new Date().toISOString(),
    };
    await setUsers([user]);
    await getContent("draft"); // seed content on first run
    const { token, csrf } = await issueSession(user);
    await appendLog({ user: user.email, action: "setup", detail: "Owner account created" });
    return J({ ok: true, recoveryCode: recovery, session: { email: user.email, name: user.name, role: user.role, csrf } },
      200, { "set-cookie": sessionCookie(token) });
  }

  if (path === "/login" && method === "POST") {
    const { email, password } = await body();
    const key = `login:${ip}:${String(email || "").toLowerCase()}`;
    if (!(await rateLimit(key, 5, 900))) return err("Too many attempts — try again in 15 minutes", 429);
    const users = await getUsers();
    const user = users.find((u) => u.email === String(email || "").toLowerCase());
    if (!user || !verifyPassword(password || "", user.hash)) {
      await appendLog({ user: String(email || "?"), action: "login_failed", detail: `from ${ip}` });
      return err("Wrong email or password", 401);
    }
    const { token, csrf } = await issueSession(user);
    await appendLog({ user: user.email, action: "login", detail: `from ${ip}` });
    return J({ ok: true, session: { email: user.email, name: user.name, role: user.role, csrf } },
      200, { "set-cookie": sessionCookie(token) });
  }

  if (path === "/reset" && method === "POST") {
    if (!(await rateLimit(`reset:${ip}`, 5, 900))) return err("Too many attempts", 429);
    const { email, recoveryCode, newPassword } = await body();
    if (!newPassword || newPassword.length < 10) return err("New password must be at least 10 characters");
    const users = await getUsers();
    const user = users.find((u) => u.email === String(email || "").toLowerCase());
    if (!user || !user.recoveryHash || !verifyPassword(recoveryCode || "", user.recoveryHash)) {
      return err("Recovery code does not match", 401);
    }
    user.hash = hashPassword(newPassword);
    user.tokenVersion = (user.tokenVersion || 0) + 1; // invalidate all sessions
    const recovery = newRecoveryCode();
    user.recoveryHash = hashPassword(recovery);
    await setUsers(users);
    await appendLog({ user: user.email, action: "password_reset", detail: `from ${ip}` });
    return J({ ok: true, recoveryCode: recovery });
  }

  /* -------- everything below requires a session -------- */
  const session = await getSession(req);
  if (!session) return err("Not signed in", 401);
  const mutating = method !== "GET";
  if (mutating && !csrfOk(req, session)) return err("CSRF check failed", 403);
  if (mutating && !(await rateLimit(`mut:${session.email}`, 240, 60))) return err("Slow down", 429);
  const ownerOnly = () => session.role !== "owner" ? err("Owner role required", 403) : null;

  if (path === "/logout" && method === "POST") {
    await appendLog({ user: session.email, action: "logout" });
    return J({ ok: true }, 200, { "set-cookie": sessionCookie("", true) });
  }

  if (path === "/password" && method === "POST") {
    const { current, newPassword } = await body();
    if (!newPassword || newPassword.length < 10) return err("New password must be at least 10 characters");
    const users = await getUsers();
    const user = users.find((u) => u.email === session.email);
    if (!verifyPassword(current || "", user.hash)) return err("Current password is wrong", 401);
    user.hash = hashPassword(newPassword);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await setUsers(users);
    const { token, csrf } = await issueSession(user);
    await appendLog({ user: session.email, action: "password_change" });
    return J({ ok: true, session: { ...session, csrf } }, 200, { "set-cookie": sessionCookie(token) });
  }

  /* ============ USERS (owner) ============ */
  if (path === "/users" && method === "GET") {
    const g = ownerOnly(); if (g) return g;
    const users = await getUsers();
    return J(users.map((u) => ({ email: u.email, name: u.name, role: u.role, createdAt: u.createdAt })));
  }
  if (path === "/users" && method === "POST") {
    const g = ownerOnly(); if (g) return g;
    const { email, name, password, role } = await body();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || "")) return err("Valid email required");
    if (!password || password.length < 10) return err("Password must be at least 10 characters");
    const users = await getUsers();
    if (users.length >= 10) return err("User limit reached");
    if (users.some((u) => u.email === email.toLowerCase())) return err("User already exists");
    const recovery = newRecoveryCode();
    users.push({
      email: email.toLowerCase(), name: sanitizeText(name || email, 80),
      role: role === "owner" ? "owner" : "editor",
      hash: hashPassword(password), recoveryHash: hashPassword(recovery), tokenVersion: 0,
      createdAt: new Date().toISOString(),
    });
    await setUsers(users);
    await appendLog({ user: session.email, action: "user_add", detail: email.toLowerCase() });
    return J({ ok: true, recoveryCode: recovery });
  }
  if (path === "/users" && method === "DELETE") {
    const g = ownerOnly(); if (g) return g;
    const email = url.searchParams.get("email");
    if (email === session.email) return err("You cannot delete yourself");
    const users = await getUsers();
    await setUsers(users.filter((u) => u.email !== email));
    await appendLog({ user: session.email, action: "user_delete", detail: email });
    return J({ ok: true });
  }

  /* ============ CONTENT ============ */
  if (path === "/content" && method === "GET") {
    const kind = url.searchParams.get("kind") === "published" ? "published" : "draft";
    return J(await getContent(kind));
  }
  if (path === "/content" && method === "PUT") {
    const doc = deepSanitize(await body());
    if (!validDoc(doc)) return err("Content document failed validation");
    await setContent("draft", doc);
    return J({ ok: true, savedAt: new Date().toISOString() });
  }
  if (path === "/publish" && method === "POST") {
    const { note } = await body();
    const draft = await getContent("draft");
    const revId = await saveRevision(draft, session.email, sanitizeText(note || "Publish", 140));
    await setContent("published", draft);
    await purge();
    await appendLog({ user: session.email, action: "publish", detail: revId });
    return J({ ok: true, revId });
  }
  if (path === "/discard" && method === "POST") {
    const pub = await getContent("published");
    await setContent("draft", pub);
    await appendLog({ user: session.email, action: "discard_draft" });
    return J({ ok: true });
  }

  /* ============ REVISIONS ============ */
  if (path === "/revisions" && method === "GET") return J(await listRevisions());
  if (path === "/revisions/restore" && method === "POST") {
    const { id, target } = await body();
    const rev = await getRevision(String(id || ""));
    if (!rev) return err("Revision not found", 404);
    await setContent("draft", rev.doc);
    if (target === "publish") { await setContent("published", rev.doc); await purge(); }
    await appendLog({ user: session.email, action: "restore_revision", detail: `${id}${target === "publish" ? " → published" : " → draft"}` });
    return J({ ok: true });
  }

  /* ============ SCHEDULE ============ */
  if (path === "/schedule" && method === "GET") {
    return J((await contentStore().get("schedule", { type: "json" })) || {});
  }
  if (path === "/schedule" && method === "POST") {
    const { publishAt } = await body();
    if (publishAt && isNaN(Date.parse(publishAt))) return err("Bad date");
    await contentStore().setJSON("schedule", publishAt ? { publishAt, by: session.email } : {});
    await appendLog({ user: session.email, action: "schedule", detail: publishAt || "cleared" });
    return J({ ok: true });
  }

  /* ============ LOGS / BACKUP ============ */
  if (path === "/logs" && method === "GET") return J(await readLog());
  if (path === "/backup" && method === "GET") {
    const g = ownerOnly(); if (g) return g;
    return J({
      exportedAt: new Date().toISOString(),
      draft: await getContent("draft"),
      published: await getContent("published"),
      media: await mediaIndex(),
    });
  }
  if (path === "/restore" && method === "POST") {
    const g = ownerOnly(); if (g) return g;
    const { draft } = await body();
    const doc = deepSanitize(draft);
    if (!validDoc(doc)) return err("Backup failed validation");
    const current = await getContent("draft");
    await saveRevision(current, session.email, "Before backup restore");
    await setContent("draft", doc);
    await appendLog({ user: session.email, action: "restore_backup" });
    return J({ ok: true });
  }

  /* ============ MEDIA ============ */
  if (path === "/media" && method === "GET") {
    const idx = await mediaIndex();
    return J({ items: idx, usage: idx.reduce((n, x) => n + (x.size || 0), 0) });
  }
  if (path === "/media/upload" && method === "POST") {
    const { name, type, folder, data, alt, caption, w, h } = await body();
    if (typeof data !== "string" || data.length > 8_500_000) return err("File too large for single upload (use chunks)");
    const bytes = Buffer.from(data, "base64");
    const kind = sniff(bytes, type);
    if (!kind) return err("File type not allowed or does not match its contents");
    const id = newId();
    const store = mediaStore();
    if (kind.type === "image/svg+xml") {
      await store.set(`file/${id}`, sanitizeSvg(bytes.toString("utf8")));
    } else {
      await store.set(`file/${id}`, bytes);
    }
    const idx = await mediaIndex();
    idx.unshift({
      id, name: sanitizeText(name || `upload.${kind.ext}`, 120), folder: sanitizeText(folder || "", 60),
      type: kind.type, size: bytes.length, w: w || 0, h: h || 0,
      alt: sanitizeText(alt || "", 300), caption: sanitizeText(caption || "", 300),
      at: new Date().toISOString(), by: session.email, chunks: 1,
    });
    await setMediaIndex(idx);
    await appendLog({ user: session.email, action: "upload", detail: `${name} (${(bytes.length / 1024).toFixed(0)} kB)` });
    return J({ ok: true, id, url: `/media/${id}` });
  }
  if (path === "/media/chunk" && method === "POST") {
    const { uploadId, seq, total, name, type, data } = await body();
    if (typeof data !== "string" || data.length > 4_200_000) return err("Chunk too large");
    if (!Number.isInteger(seq) || !Number.isInteger(total) || total > 60 || seq >= total) return err("Bad chunk numbering");
    const id = uploadId && /^m[a-z0-9]+$/.test(uploadId) ? uploadId : newId();
    const bytes = Buffer.from(data, "base64");
    if (seq === 0 && !sniff(bytes, type)) return err("File type not allowed or does not match its contents");
    const store = mediaStore();
    await store.set(`file/${id}/part-${seq}`, bytes);
    if (seq === total - 1) {
      let size = 0;
      for (let i = 0; i < total; i++) {
        const part = await store.get(`file/${id}/part-${i}`, { type: "arrayBuffer" });
        if (!part) return err(`Upload incomplete: missing part ${i}`);
        size += part.byteLength;
      }
      const idx = await mediaIndex();
      idx.unshift({
        id, name: sanitizeText(name || "upload", 120), folder: "",
        type: ["video/mp4", "video/webm", "image/png", "image/jpeg", "image/webp", "image/gif"].includes(type) ? type : "application/octet-stream",
        size, alt: "", caption: "", at: new Date().toISOString(), by: session.email, chunks: total,
      });
      await setMediaIndex(idx);
      await appendLog({ user: session.email, action: "upload", detail: `${name} (${(size / 1048576).toFixed(1)} MB, chunked)` });
      return J({ ok: true, id, url: `/media/${id}`, done: true });
    }
    return J({ ok: true, id });
  }
  let mm = path.match(/^\/media\/([\w-]+)$/);
  if (mm && method === "PATCH") {
    const { alt, caption, name, folder } = await body();
    const idx = await mediaIndex();
    const item = idx.find((x) => x.id === mm[1]);
    if (!item) return err("Not found", 404);
    if (alt !== undefined) item.alt = sanitizeText(alt, 300);
    if (caption !== undefined) item.caption = sanitizeText(caption, 300);
    if (name !== undefined) item.name = sanitizeText(name, 120);
    if (folder !== undefined) item.folder = sanitizeText(folder, 60);
    await setMediaIndex(idx);
    return J({ ok: true });
  }
  if (mm && method === "DELETE") {
    const idx = await mediaIndex();
    const item = idx.find((x) => x.id === mm[1]);
    if (!item) return err("Not found", 404);
    const store = mediaStore();
    if (item.chunks > 1) {
      for (let i = 0; i < item.chunks; i++) await store.delete(`file/${item.id}/part-${i}`);
    } else {
      await store.delete(`file/${item.id}`);
    }
    await setMediaIndex(idx.filter((x) => x.id !== item.id));
    try { await purgeCache({ tags: [`media-${item.id}`] }); } catch {}
    await appendLog({ user: session.email, action: "delete_media", detail: item.name });
    return J({ ok: true });
  }

  return err("No such endpoint", 404);
}

export const config = { path: "/api/*" };
