/* Serves uploaded media from the database, including chunked files. */
import { mediaStore, mediaIndex } from "./lib/store.mjs";

export default async function handler(req) {
  const m = new URL(req.url).pathname.match(/^\/media\/([\w-]+)(?:\/.*)?$/);
  if (!m) return new Response("Not found", { status: 404 });
  const id = m[1];
  const idx = await mediaIndex();
  const item = idx.find((x) => x.id === id);
  if (!item) return new Response("Not found", { status: 404 });

  const store = mediaStore();
  const headers = {
    "content-type": item.type,
    "cache-control": "public, max-age=31536000, immutable",
    "netlify-cache-tag": `media-${id}`,
    "x-content-type-options": "nosniff",
    "content-disposition": `inline; filename="${(item.name || id).replace(/[^\w.\- ]/g, "_")}"`,
  };

  if (!item.chunks || item.chunks <= 1) {
    const blob = await store.get(`file/${id}`, { type: "arrayBuffer" });
    if (!blob) return new Response("Not found", { status: 404 });
    return new Response(blob, { headers });
  }

  // chunked file: stream parts in order
  const total = item.chunks;
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for (let i = 0; i < total; i++) {
          const part = await store.get(`file/${id}/part-${i}`, { type: "arrayBuffer" });
          if (!part) throw new Error(`missing part ${i}`);
          controller.enqueue(new Uint8Array(part));
        }
        controller.close();
      } catch (e) { controller.error(e); }
    },
  });
  if (item.size) headers["content-length"] = String(item.size);
  return new Response(stream, { headers });
}

export const config = { path: "/media/*" };
