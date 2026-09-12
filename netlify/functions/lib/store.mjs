/* Data layer — Netlify Blobs as the CMS database. */
import { getStore } from "@netlify/blobs";
import defaultContent from "./default-content.mjs";

export const contentStore = () => getStore({ name: "ik-content", consistency: "strong" });
export const authStore = () => getStore({ name: "ik-auth", consistency: "strong" });
export const mediaStore = () => getStore({ name: "ik-media", consistency: "strong" });
export const logStore = () => getStore({ name: "ik-logs", consistency: "strong" });

export async function getContent(kind /* 'draft' | 'published' */) {
  const store = contentStore();
  const doc = await store.get(kind, { type: "json" });
  if (doc) return doc;
  // first run: seed both copies from the default document
  await store.setJSON("draft", defaultContent);
  await store.setJSON("published", defaultContent);
  return structuredClone(defaultContent);
}

export async function setContent(kind, doc) {
  await contentStore().setJSON(kind, doc);
}

export async function saveRevision(doc, user, note) {
  const store = contentStore();
  const id = `rev-${Date.now()}`;
  await store.setJSON(`revisions/${id}`, { id, at: new Date().toISOString(), user, note, doc });
  // prune: keep the newest 30
  const { blobs } = await store.list({ prefix: "revisions/" });
  const ids = blobs.map((b) => b.key).sort().reverse();
  for (const key of ids.slice(30)) await store.delete(key);
  return id;
}

export async function listRevisions() {
  const store = contentStore();
  const { blobs } = await store.list({ prefix: "revisions/" });
  const out = [];
  for (const b of blobs.sort((a, z) => z.key.localeCompare(a.key)).slice(0, 30)) {
    const r = await store.get(b.key, { type: "json" });
    if (r) out.push({ id: r.id, at: r.at, user: r.user, note: r.note });
  }
  return out;
}

export async function getRevision(id) {
  if (!/^rev-\d+$/.test(id)) return null;
  return contentStore().get(`revisions/${id}`, { type: "json" });
}

export async function appendLog(entry) {
  const store = logStore();
  const log = (await store.get("activity", { type: "json" })) || [];
  log.unshift({ at: new Date().toISOString(), ...entry });
  await store.setJSON("activity", log.slice(0, 500));
}

export async function readLog() {
  return (await logStore().get("activity", { type: "json" })) || [];
}

/* media index: [{id, name, folder, type, size, w, h, alt, caption, at, chunks}] */
export async function mediaIndex() {
  return (await mediaStore().get("index", { type: "json" })) || [];
}
export async function setMediaIndex(idx) {
  await mediaStore().setJSON("index", idx);
}
