// --- 全局 Emoji 面板配置 ---
const pickerPopup = document.createElement('div');
pickerPopup.className = 'emoji-picker-popup';
pickerPopup.innerHTML = '<emoji-picker></emoji-picker>';
document.body.appendChild(pickerPopup);

const picker = pickerPopup.querySelector('emoji-picker');
let currentEmojiInput = null;

picker.addEventListener('emoji-click', event => {
  if (currentEmojiInput) {
    const start = currentEmojiInput.selectionStart;
    const end = currentEmojiInput.selectionEnd;
    const text = currentEmojiInput.value;
    currentEmojiInput.value = text.slice(0, start) + event.detail.unicode + text.slice(end);
    currentEmojiInput.selectionStart = currentEmojiInput.selectionEnd = start + event.detail.unicode.length;
    currentEmojiInput.dispatchEvent(new Event('input')); // 触发文字预览
  }
  pickerPopup.classList.remove('visible');
});

document.addEventListener('click', (e) => {
  if (!pickerPopup.contains(e.target) && !e.target.classList.contains('emoji-btn')) {
    pickerPopup.classList.remove('visible');
  }
});

function openEmojiPicker(button, inputElement) {
  if (pickerPopup.classList.contains('visible') && currentEmojiInput === inputElement) {
    pickerPopup.classList.remove('visible');
    return;
  }
  currentEmojiInput = inputElement;
  const rect = button.getBoundingClientRect();
  
  // 自动计算面板位置（如果靠右，就往左对齐弹）
  let leftPos = rect.left + window.scrollX;
  if (window.innerWidth - rect.left < 320) {
    leftPos = window.innerWidth - 340; 
  }
  pickerPopup.style.top = (rect.bottom + window.scrollY + 8) + 'px';
  pickerPopup.style.left = leftPos + 'px';
  pickerPopup.classList.add('visible');
}

// 绑定首页大输入框的表情按钮
setTimeout(() => {
  const mainBtn = document.getElementById('main-emoji-btn');
  const mainInput = document.getElementById('desc');
  if(mainBtn && mainInput) {
    mainBtn.addEventListener('click', () => openEmojiPicker(mainBtn, mainInput));
  }
}, 500);

const form = document.querySelector("#memoryForm");
const passInput = document.querySelector("#pass");
const descInput = document.querySelector("#desc");
const fileInput = document.querySelector("#file");
const submitBtn = document.querySelector("#submitBtn");
const timeline = document.querySelector("#timeline");
const statusEl = document.querySelector("#formStatus");
const previewText = document.querySelector("#previewText");
const previewPhoto = document.querySelector("#previewPhoto");
const previewDate = document.querySelector("#previewDate");
const noteClose = document.querySelector(".note-close");
const topNote = document.querySelector(".top-note");

const sampleEntries = [
  {
    desc: "第一次部署前的占位动态。上线后，它会被你们真正上传的照片替换。",
    createdAt: new Date().toISOString(),
    photoUrl: ""
  },
  {
    desc: "可以写今天吃到了什么、去了哪里、或者一句只有彼此懂的话。",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    photoUrl: ""
  }
];

noteClose?.addEventListener("click", () => {
  topNote.hidden = true;
});

descInput?.addEventListener("input", () => {
  previewText.textContent = descInput.value.trim() || "你的文字会先在这里预览。";
});

fileInput?.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) {
    previewPhoto.innerHTML = "<span>photo preview</span>";
    return;
  }

  const imageUrl = URL.createObjectURL(file);
  previewPhoto.innerHTML = "";
  const img = document.createElement("img");
  img.alt = "照片预览";
  img.src = imageUrl;
  img.onload = () => URL.revokeObjectURL(imageUrl);
  previewPhoto.append(img);
});

// --- 👇 替换后的全新提交事件（包含自动压缩逻辑） ---
form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("正在处理照片...");
  submitBtn.disabled = true;

  try {
    const formData = new FormData(form);
    const originalFile = formData.get("file");

    // 🌟 如果上传了照片，且照片大于 500KB，就触发自动压缩
    if (originalFile && originalFile.name && originalFile.size > 500 * 1024) {
      try {
        setStatus("正在努力把照片变轻巧...");
        const compressedFile = await compressImage(originalFile);
        // 用压缩后的小文件替换掉原来的大文件
        formData.set("file", compressedFile); 
      } catch (err) {
        console.warn("压缩失败，将尝试上传原图", err);
      }
    }

    setStatus("正在贴到时间线...");
    
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "发布失败，请稍后再试。");
    }

    setStatus("已经贴好了。");
    form.reset();
    previewText.textContent = "你的文字会先在这里预览。";
    previewPhoto.innerHTML = "<span>photo preview</span>";
    
    // 不阻塞页面，后台去同步
    silentSync();
  } catch (error) {
    setStatus(error.message || "发布失败，请稍后再试。", true);
  } finally {
    submitBtn.disabled = false;
  }
});

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b00020" : "#050505";
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function createMemoryCard(entry) {
  const card = document.createElement("article");
  card.className = "memory-card";
  card.id = `entry-${entry.id}`;

  const imageWrap = document.createElement("div");
  imageWrap.className = "memory-image-wrap";

  if (entry.photoUrl) {
    const img = document.createElement("img");
    img.className = "memory-image";
    img.loading = "lazy";
    img.alt = "情侣动态照片";
    img.src = entry.photoUrl;
    imageWrap.append(img);
  }

  const body = document.createElement("div");
  body.className = "memory-body";

  const time = document.createElement("time");
  time.className = "memory-time";
  time.textContent = formatDate(entry.createdAt);

  const text = document.createElement("p");
  text.className = "memory-text";
  text.textContent = entry.desc;

  // --- 评论展示区 ---
  const commentsWrap = document.createElement("div");
  commentsWrap.className = "comments-wrap";
  
  if (entry.comments && entry.comments.length > 0) {
    entry.comments.forEach(c => {
      const cRow = document.createElement("div");
      cRow.className = "comment-row";
      
      // 判断 avatar 是表情还是图片链接
      const avatarHTML = c.authorAvatar.length > 5 && c.authorAvatar.startsWith("http")
        ? `<img src="${c.authorAvatar}" class="c-avatar-img">` 
        : `<span class="c-avatar-emoji">${c.authorAvatar}</span>`;

      cRow.innerHTML = `
        <div class="c-avatar">${avatarHTML}</div>
        <div class="c-content">
          <span class="c-name">${c.authorName}</span>
          <span class="c-text">${c.text}</span>
        </div>
      `;
      commentsWrap.append(cRow);
    });
  }

  // 读取浏览器记忆的名字和头像
  const savedName = localStorage.getItem("my_name") || "";
  const savedAvatar = localStorage.getItem("my_avatar") || "";

  // --- 自定义评论输入区 ---
  const replyBox = document.createElement("form");
  replyBox.className = "reply-box";
  
  // 分别配置你们的预设名字和预设头像
  const presetNames = ["小崔", "小安"]; // 换成你们的名字
  const presetAvatars = ["🐻", "🐰"]; // 换成你们的专属表情

  replyBox.innerHTML = `
    <div class="preset-users">
      <span class="preset-label">选名字:</span>
      <button type="button" class="preset-btn name-btn" data-value="${presetNames[0]}">${presetNames[0]}</button>
      <button type="button" class="preset-btn name-btn" data-value="${presetNames[1]}">${presetNames[1]}</button>
      
      <span class="preset-label" style="margin-left: 0.8rem;">选头像:</span>
      <button type="button" class="preset-btn avatar-btn" data-value="${presetAvatars[0]}">${presetAvatars[0]}</button>
      <button type="button" class="preset-btn avatar-btn" data-value="${presetAvatars[1]}">${presetAvatars[1]}</button>
    </div>
    <div class="reply-user-info">
      <input type="text" name="authorName" class="reply-name" placeholder="你的昵称" value="${savedName}" required autocomplete="off" maxlength="10">
      <input type="text" name="authorAvatar" class="reply-avatar" placeholder="头像(填Emoji或链接)" value="${savedAvatar}" required autocomplete="off">
    </div>
    <div class="reply-actions">
      <div class="input-with-emoji" style="flex-grow: 1;">
        <input type="text" name="text" class="reply-input" placeholder="回复这条动态..." required autocomplete="off">
        <button type="button" class="emoji-btn reply-emoji-btn">😊</button>
      </div>
      <input type="password" name="pass" class="reply-pass" placeholder="暗号" required autocomplete="new-password">
      <button type="submit" class="reply-btn">发送</button>
    </div>
  `;

  // 绑定名字预设按钮：点哪个，就把哪个填进名字框
  replyBox.querySelectorAll('.name-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      replyBox.querySelector('.reply-name').value = btn.getAttribute('data-value');
    });
  });

  // 绑定头像预设按钮：点哪个，就把哪个填进头像框
  replyBox.querySelectorAll('.avatar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      replyBox.querySelector('.reply-avatar').value = btn.getAttribute('data-value');
    });
  });

  // 绑定评论区的表情面板按钮
  const replyEmojiBtn = replyBox.querySelector('.reply-emoji-btn');
  const replyInput = replyBox.querySelector('.reply-input');
  replyEmojiBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openEmojiPicker(replyEmojiBtn, replyInput);
  });

  // --- 👇 修复卡死Bug：重新设计了发送提交逻辑 ---
  replyBox.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = replyBox.querySelector(".reply-btn");
    
    // 保存名字和头像到浏览器，下次自动填
    const formData = new FormData(replyBox);
    localStorage.setItem("my_name", formData.get("authorName"));
    localStorage.setItem("my_avatar", formData.get("authorAvatar"));

    btn.disabled = true;
    btn.textContent = "发送中...";

    try {
      formData.append("entryId", entry.id);
      const res = await fetch("/api/comment", { method: "POST", body: formData });
      
      // 容错处理：即使后端返回的不是标准JSON也能扛过去
      const data = await res.json().catch(() => ({})); 
      
      if (!res.ok) throw new Error(data.error || "发送失败，可能是暗号不对");
      
      // 成功发送后立刻清空输入框，不等后台同步了！
      replyInput.value = ""; 

      // 触发后台静默同步去抓取新评论，但不堵塞现在的按钮
      silentSync(); 

    } catch (err) {
      alert(err.message || "网络开了个小差，没发出去哦");
    } finally {
      // 🌟 终极保险：不管上面是报错了还是正常跑完，最后统统强制把按钮点亮！
      btn.disabled = false;
      btn.textContent = "发送";
    }
  });

  body.append(time, text, commentsWrap, replyBox);
  card.append(imageWrap, body);
  return card;
}

function renderTimeline(entries) {
  timeline.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "这里还没有动态。输入暗号，上传第一张照片吧。";
    timeline.append(empty);
    return;
  }

  entries.forEach((entry) => timeline.append(createMemoryCard(entry)));
}

async function loadTimeline() {
  try {
    const response = await fetch("/api/timeline", {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) throw new Error("Timeline endpoint unavailable");
    const data = await response.json();
    const entries = Array.isArray(data.entries) ? data.entries : [];
    
    renderTimeline(entries);
    setupDynamicCoverAndStrip(entries);
  } catch {
    renderTimeline(sampleEntries);
  }
}

function setupDynamicCoverAndStrip(entries) {
  if (!entries || entries.length === 0) return;

  // 魔法 1：更新顶部 01/02/03 的文字并加上跳转链接
  for (let i = 0; i < 3; i++) {
    const pEl = document.getElementById(`top-text-${i + 1}`);
    if (pEl && entries[i]) {
      // 如果文字太长，截取前22个字加上省略号
      const text = entries[i].desc.length > 22 ? entries[i].desc.substring(0, 22) + "..." : entries[i].desc;
      pEl.innerHTML = `<a href="#entry-${entries[i].id}" style="text-decoration: underline; text-underline-offset: 4px; cursor: pointer;">${text}</a>`;
    } else if (pEl) {
      pEl.textContent = "这里还在等待你们的故事...";
    }
  }

  // 魔法 2：封面照片 3 秒轮播
  const photos = entries.filter(e => e.photoUrl).map(e => e.photoUrl);
  if (photos.length > 0) {
    const coverPhotoDiv = document.querySelector('.cover-photo');
    if (!coverPhotoDiv) return;
    let currentIndex = 0;

    coverPhotoDiv.innerHTML = `<img src="${photos[currentIndex]}" alt="cover" style="width:100%; height:100%; object-fit:cover;">`;

    // 🌟 修复底层隐患：清除旧的定时器，防止静默刷新时产生无数个闹钟导致页面发烫卡死
    if (window.coverInterval) {
      clearInterval(window.coverInterval);
    }

    // 每 5 秒（5000毫秒）切换一次
    window.coverInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % photos.length;
      // 重新生成 img 标签以触发 CSS 的 fadeIn 动画
      coverPhotoDiv.innerHTML = `<img src="${photos[currentIndex]}" alt="cover" style="width:100%; height:100%; object-fit:cover;">`;
    }, 5000);
  }
}

// --- 👇 全新的图片压缩核心函数 ---
function compressImage(file, maxWidth = 1600, maxHeight = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // 计算等比例缩放后的尺寸（限制最大宽高）
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height *= maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width *= maxHeight / height));
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        
        // 在虚拟画布上绘制压缩后的图片
        ctx.drawImage(img, 0, 0, width, height);
        
        // 导出为 Blob，0.8 代表 80% 的画质，既清晰又极度省空间
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // 伪装成普通的 File 对象发给后端
              const compressedFile = new File([blob], file.name || "photo.jpg", {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error("图片压缩失败"));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

previewDate.textContent = formatDate(new Date().toISOString());
loadTimeline();

// --- 实时交互：静默同步魔法 ---
async function silentSync() {
  try {
    const response = await fetch("/api/timeline", {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return;
    const data = await response.json();
    const newEntries = Array.isArray(data.entries) ? data.entries : [];

    newEntries.forEach(entry => {
      const card = document.getElementById(`entry-${entry.id}`);
      
      // 1. 如果发现了全新的动态（之前页面上没有的）
      if (!card) {
        const newCard = createMemoryCard(entry);
        newCard.style.animation = "fadeIn 0.5s ease-out"; // 加个渐显动画
        
        // 移除空状态提示（如果有的话）
        const emptyState = timeline.querySelector('.empty-state');
        if(emptyState) emptyState.remove();
        
        // 把新动态插到最前面
        timeline.insertBefore(newCard, timeline.firstChild);
      } 
      // 2. 如果动态已经存在，检查有没有新评论
      else {
        const commentsWrap = card.querySelector('.comments-wrap');
        const existingCommentsCount = commentsWrap.querySelectorAll('.comment-row').length;
        const newCommentsCount = entry.comments ? entry.comments.length : 0;

        // 如果后台的评论数比当前页面多，说明有新消息！
        if (newCommentsCount > existingCommentsCount) {
          // 只把新增的那几条评论抽出来
          const commentsToAdd = entry.comments.slice(existingCommentsCount);
          
          commentsToAdd.forEach(c => {
            const cRow = document.createElement("div");
            cRow.className = "comment-row";
            const avatarHTML = c.authorAvatar.length > 5 && c.authorAvatar.startsWith("http")
              ? `<img src="${c.authorAvatar}" class="c-avatar-img">` 
              : `<span class="c-avatar-emoji">${c.authorAvatar}</span>`;

            cRow.innerHTML = `
              <div class="c-avatar">${avatarHTML}</div>
              <div class="c-content">
                <span class="c-name">${c.authorName}</span>
                <span class="c-text">${c.text}</span>
              </div>
            `;
            // 给新消息加个轻微的弹出动画
            cRow.style.animation = "fadeIn 0.5s ease-out";
            commentsWrap.append(cRow);
          });
        }
      }
    });
    
    // 顺便更新顶部封面轮播的引语数据
    setupDynamicCoverAndStrip(newEntries);
  } catch (err) {
    // 静默失败，不打扰用户，等下一次轮询
  }
}

// 设定每 8 秒钟偷偷同步一次（每天就算一直开着网页也绝对不会超出 10 万次的免费额度）
setInterval(silentSync, 8000);

// --- 👇 恋爱计时器魔法 👇 ---
// ⚠️ 请在这里填入你们的纪念日（格式：年-月-日T时:分:秒）
const startDate = new Date("2024-04-17T00:00:00"); 

const dEl = document.getElementById("t-days");
const hEl = document.getElementById("t-hours");
const mEl = document.getElementById("t-mins");
const sEl = document.getElementById("t-secs");

function updateTimer() {
  const now = new Date();
  const diff = now - startDate;

  // 如果填写的日期在未来，则显示 0
  if (diff < 0) return;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / 1000 / 60) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  if(dEl) dEl.textContent = days;
  // 时分秒保持两位数排版（比如 05 秒）
  if(hEl) hEl.textContent = hours.toString().padStart(2, '0');
  if(mEl) mEl.textContent = mins.toString().padStart(2, '0');
  if(sEl) sEl.textContent = secs.toString().padStart(2, '0');
}

// 每 1000 毫秒（1秒）自动刷新一次数字
setInterval(updateTimer, 1000);
updateTimer(); // 网页刚打开时立刻计算一次，防止显示 00
