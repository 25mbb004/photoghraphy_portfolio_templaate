/* Hourly scheduler: executes scheduled publishes and refreshes the
   cache when a note crosses its publish/unpublish boundary. */
import { purgeCache } from "@netlify/functions";
import { getContent, setContent, saveRevision, appendLog, contentStore } from "./lib/store.mjs";

export default async function handler() {
  const store = contentStore();
  const now = Date.now();
  let purgeNeeded = false;

  // 1. whole-site scheduled publish
  const sched = (await store.get("schedule", { type: "json" })) || {};
  if (sched.publishAt && Date.parse(sched.publishAt) <= now) {
    const draft = await getContent("draft");
    await saveRevision(draft, sched.by || "scheduler", "Scheduled publish");
    await setContent("published", draft);
    await store.setJSON("schedule", {});
    await appendLog({ user: sched.by || "scheduler", action: "publish", detail: "scheduled" });
    purgeNeeded = true;
  }

  // 2. notes whose publishAt/unpublishAt crossed within the last hour
  const pub = await getContent("published");
  const hourAgo = now - 65 * 60 * 1000;
  for (const n of pub.notes || []) {
    for (const key of ["publishAt", "unpublishAt"]) {
      const t = n[key] && Date.parse(n[key]);
      if (t && t <= now && t > hourAgo) purgeNeeded = true;
    }
  }

  if (purgeNeeded) { try { await purgeCache({ tags: ["content"] }); } catch {} }
  return new Response("ok");
}

export const config = { schedule: "@hourly" };
