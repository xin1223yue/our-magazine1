const TIMELINE_KEY = "timeline";

export async function onRequestGet({ env }) {
  const raw = await env.MY_KV.get(TIMELINE_KEY);
  let entries = [];

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      entries = Array.isArray(parsed) ? parsed : [];
    } catch {
      entries = [];
    }
  }

  return new Response(JSON.stringify({ entries }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}