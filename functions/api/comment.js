// functions/api/comment.js
const PASSWORD = "change-this-password";
const TIMELINE_KEY = "timeline";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const form = await request.formData();
    const pass = String(form.get("pass") || "");
    const entryId = String(form.get("entryId") || "");
    const authorName = String(form.get("authorName") || "神秘人").trim();
    const authorAvatar = String(form.get("authorAvatar") || "👻").trim();
    const text = String(form.get("text") || "").trim();

    // 校验暗号
    const expectedPasswords = (env.COUPLE_PASSWORD || PASSWORD).split(",");
    if (!expectedPasswords.includes(pass)) {
      return json({ error: "暗号不对，无法评论。" }, 401);
    }
    if (!text) {
      return json({ error: "评论不能是空的喔。" }, 400);
    }

    const raw = await env.MY_KV.get(TIMELINE_KEY);
    if (!raw) return json({ error: "找不到时间线数据。" }, 404);
    
    let entries = JSON.parse(raw);
    const entryIndex = entries.findIndex(e => e.id === entryId);
    if (entryIndex === -1) return json({ error: "找不到这条动态了。" }, 404);

    if (!entries[entryIndex].comments) {
      entries[entryIndex].comments = [];
    }
    
    // 把自定义的昵称和头像存进数据库
    const newComment = {
      id: crypto.randomUUID(),
      authorName,
      authorAvatar,
      text,
      createdAt: new Date().toISOString()
    };
    
    entries[entryIndex].comments.push(newComment);
    await env.MY_KV.put(TIMELINE_KEY, JSON.stringify(entries));

    return json({ ok: true, comment: newComment });
  } catch (error) {
    return json({ error: "服务器暂时开小差了。" }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
