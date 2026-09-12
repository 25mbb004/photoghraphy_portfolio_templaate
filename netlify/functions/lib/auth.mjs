/* Auth layer — scrypt password hashing, HMAC-signed session tokens,
   HttpOnly cookies, CSRF double-check, rate limiting. No third-party
   auth code; everything is node:crypto. */
import crypto from "node:crypto";
import { authStore, appendLog } from "./store.mjs";

const b64u = (buf) => Buffer.from(buf).toString("base64url");
const SESSION_HOURS = 12;

/* ---------- secrets ---------- */
let cachedSecret = null;
export async function jwtSecret() {
  if (cachedSecret) return cachedSecret;
  const store = authStore();
  let s = await store.get("secret", { type: "text" });
  if (!s) {
    s = b64u(crypto.randomBytes(48));
    await store.set("secret", s);
  }
  cachedSecret = s;
  return s;
}

/* ---------- passwords ---------- */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const ref = Buffer.from(hash, "hex");
  return test.length === ref.length && crypto.timingSafeEqual(test, ref);
}

/* ---------- users ---------- */
export async function getUsers() {
  return (await authStore().get("users", { type: "json" })) || [];
}
export async function setUsers(users) {
  await authStore().setJSON("users", users);
}

/* ---------- tokens ---------- */
async function sign(payload) {
  const secret = await jwtSecret();
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify(payload));
  const sig = b64u(crypto.createHmac("sha256", secret).update(`${head}.${body}`).digest());
  return `${head}.${body}.${sig}`;
}
export async function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const secret = await jwtSecret();
  const expect = b64u(crypto.createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest());
  const a = Buffer.from(parts[2]); const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}

export async function issueSession(user) {
  const csrf = b64u(crypto.randomBytes(24));
  const token = await sign({
    sub: user.email, role: user.role, tv: user.tokenVersion || 0, csrf,
    exp: Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600,
  });
  return { token, csrf };
}

export function sessionCookie(token, clear = false) {
  const base = `ik_admin=${clear ? "" : token}; Path=/; HttpOnly; Secure; SameSite=Strict`;
  return clear ? `${base}; Max-Age=0` : `${base}; Max-Age=${SESSION_HOURS * 3600}`;
}

export function readCookie(req, name = "ik_admin") {
  const jar = req.headers.get("cookie") || "";
  const m = jar.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}

/* Resolve the request's session: valid token + live user + token version match. */
export async function getSession(req) {
  const payload = await verifyToken(readCookie(req));
  if (!payload) return null;
  const users = await getUsers();
  const user = users.find((u) => u.email === payload.sub);
  if (!user || (user.tokenVersion || 0) !== payload.tv) return null;
  return { email: user.email, name: user.name, role: user.role, csrf: payload.csrf };
}

/* CSRF: mutating requests must echo the session's csrf token in a header. */
export function csrfOk(req, session) {
  return req.headers.get("x-ik-csrf") === session.csrf;
}

/* ---------- rate limiting (fixed window, stored in Blobs) ---------- */
export async function rateLimit(bucket, limit, windowSec) {
  const store = authStore();
  const key = `rl/${bucket}/${Math.floor(Date.now() / 1000 / windowSec)}`;
  const n = ((await store.get(key, { type: "json" })) || 0) + 1;
  await store.setJSON(key, n);
  return n <= limit;
}

export function clientIp(req, context) {
  return context?.ip || req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
}

/* ---------- recovery codes (password reset without email) ---------- */
export function newRecoveryCode() {
  return crypto.randomBytes(4).toString("hex") + "-" + crypto.randomBytes(4).toString("hex") + "-" + crypto.randomBytes(4).toString("hex");
}

export { appendLog };
