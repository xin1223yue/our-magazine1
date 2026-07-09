const PASSWORD = "change-this-password";
const TIMELINE_KEY = "timeline";
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const form = await request.formData();
    const pass = String(form.get("pass") || "");
    const desc = String(form.get("desc") || "").trim();
    const file = form.get("file");
    const expectedPassword = env.COUPLE_PASSWORD || PASSWORD;

    if (pass !== expectedPassword) {
      return json({ error: "暗号不对。" }, 401);
    }

    if (!desc) {
      return json({ error: "先写一句这一刻。" }, 400);
    }

    if (desc.length > 500) {
      return json({ error: "文字最多 500 个字。" }, 400);
    }

    let photoKey = "";
    let photoUrl = "";

    if (file && typeof file === "object" && file.size > 0) {
      if (!file.type || !file.type.startsWith("image/")) {
        return json({ error: "只能上传图片文件。" }, 400);
      }

      if (file.size > MAX_IMAGE_SIZE) {
        return json({ error: "图片不能超过 8MB。" }, 400);
      }

      const extension = extensionFromType(file.type);
      photoKey = `${crypto.randomUUID()}.${extension}`;
      await env.MY_BUCKET.put(photoKey, await file.arrayBuffer(), {
        httpMetadata: {
          contentType: file.type
        }
      });
      photoUrl = `/api/photo/${photoKey}`;
    }

    const entry = {
      id: crypto.randomUUID(),
      desc,
      photoKey,
      photoUrl,
      createdAt: new Date().toISOString()
    };

    const entries = await readTimeline(env);
    entries.unshift(entry);
    await env.MY_KV.put(TIMELINE_KEY, JSON.stringify(entries.slice(0, 200)));

    return json({ ok: true, entry });
  } catch (error) {
    return json({ error: "服务器暂时没有收下这条动态。" }, 500);
  }
}

function extensionFromType(type) {
  const clean = type.split(";")[0].toLowerCase();
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif"
  };

  return map[clean] || "jpg";
}

async function readTimeline(env) {
  const raw = await env.MY_KV.get(TIMELINE_KEY);
  if (!raw) return [];

  try {
    const entries = JSON.parse(raw);
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}