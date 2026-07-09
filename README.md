# Our Little Magazine 💌

一个极简、浪漫且完全免费的情侣专属私密手账网站。

没有外面的访客，没有社交媒体的点赞焦虑，只有一条永远未完待续的双人时间线。视觉风格参考了拼贴杂志感（Scrapbook Aesthetic）：粗黑边、纸纹理、拍立得相片卡和搞怪的贴纸按钮。

基于纯前端原生 HTML/CSS/JS 构建，搭配 **Cloudflare Pages + Workers (Functions) + KV + R2**，无需购买服务器，利用 Cloudflare 免费额度即可实现“零成本”长久运行。
<img width="2748" height="1548" alt="image" src="https://github.com/user-attachments/assets/b993673b-c6cc-48d9-9059-f9d9aa82cd52" />
<img width="2740" height="1546" alt="image" src="https://github.com/user-attachments/assets/bd83ad1f-5808-48cf-951b-50d448347fea" />
<img width="2744" height="1546" alt="image" src="https://github.com/user-attachments/assets/5aa463cf-606e-449e-80d5-e9f4ed4a0f7c" />
<img width="2748" height="1546" alt="image" src="https://github.com/user-attachments/assets/40de0dd0-e5eb-49ba-86c4-47588146c822" />
<img width="2744" height="1546" alt="image" src="https://github.com/user-attachments/assets/8105b0ab-03a9-4c33-87d5-087ec49e47ea" />

## ✨ 核心特性

- 📸 **前端智能压缩**：上传十几兆的原图会自动在浏览器端无损压缩至几百 KB，既保证秒开，又完美守护 Cloudflare 的 10GB 免费存储额度。
- 🔐 **暗号保护发布**：无需繁琐的注册登录。输入只有你们俩知道的“暗号”才能发布动态和照片。
- 💬 **免登录评论系统**：内置微信聊天风格的评论区，支持一键呼出 Emoji 面板。自带浏览器记忆功能和快捷身份预设，随时随地互相留言。
- 🎨 **杂志感排版**：带封面照片的 5 秒自动轮播、提取最新动态的顶部引语、以及随性错落的拍立得照片墙。
- ⚡ **全 Serverless 架构**：极简的 API 设计，部署极其简单，几乎零维护成本。

## 🚀 极简部署指南 (新手向)

### 1. 准备工作
- 注册一个 [Cloudflare](https://dash.cloudflare.com/) 账号。
- Fork 本仓库到你自己的 GitHub 中。

### 2. 创建数据库与存储桶
进入 Cloudflare 控制台，在左侧导航栏找到：
- **存储和数据库 -> KV**：创建一个命名空间，名字随意（例如：`our-magazine-kv`）。创建后，记下它的 **命名空间 ID (Namespace ID)**。
- **存储和数据库 -> R2**：创建一个存储桶，名字随意（例如：`couple-photos`）。

### 3. 修改配置文件 (⚠️ 非常重要)
在你的 GitHub 仓库中，找到并修改以下两个文件：

**文件 A：`wrangler.toml`**
将其中的 `id` 替换为你刚刚在 Cloudflare 中创建的 KV 命名空间 ID：
```toml
[[kv_namespaces]]
binding = "MY_KV"
id = "填入你自己的_KV_ID" # 👈 修改这里

[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "couple-photos" # 如果你的 R2 名字不一样，也请修改这里
```

**文件 B：`script.js`**
找到大概在文件中间位置的评论预设信息，把名字和头像改成你们俩专属的：
```javascript
  // 分别配置你们的预设名字和预设头像
  const presetNames = ["你的小名", "Ta的小名"]; // 👈 修改这里
  const presetAvatars = ["🐻", "🐰"]; // 👈 换成你们的专属表情
```

### 4. 连接并部署 Pages
- 在 Cloudflare 控制台点击 **Workers 和 Pages** -> **创建应用程序** -> **Pages** -> **连接到 Git**。
- 选择你刚刚 Fork 的仓库，直接点击部署（此时 API 可能会报错，没关系，先让它部署完）。

### 5. 绑定环境变量与资源
进入你刚部署好的 Pages 项目设置页面：
1. **设置 -> 环境变量**：
   - 添加变量 `COUPLE_PASSWORD`，值为你们的专属暗号（支持多个暗号，用英文逗号隔开，如 `love,1234`）。
2. **设置 -> Functions -> KV 命名空间绑定**：
   - 变量名称必须填：`MY_KV`，并选择你刚才创建的 KV。
3. **设置 -> Functions -> R2 存储桶绑定**：
   - 变量名称必须填：`MY_BUCKET`，并选择你刚才创建的 R2。

### 6. 重新部署
绑定完成后，回到项目的 **部署** 选项卡，点击最新的部署记录，选择 **重试部署 (Retry deployment)**。
部署成功后，打开分配的域名，输入暗号，发一条带照片的动态测试吧！

## ⚠️ 隐私提醒与安全建议

1. **防君子不防小人**：当前版本的架构保护的是 **“写入权限”**。不知道暗号的人无法上传照片或发表评论，但如果别人知道了你的网站域名，他们依然可以浏览时间线。
2. **绝对私密方案**：如果你希望整个网站彻底与世隔绝，强烈建议在 Cloudflare 后台开启 **Zero Trust (Cloudflare Access)**，只需简单几步，就能通过邮箱验证码给整个网站加上一把全封闭的锁。
3. **不要在代码里写密码**：永远把你们的真实暗号写在 Cloudflare 的环境变量里，绝不要写进代码并提交到 GitHub，以免历史记录泄露隐私。

---
## [最新版本号] - 2026-07-09

### 🎉 新增 (Added)
- **相恋计数日功能**：页面新增了浪漫的相恋天数计时功能，可以实时展示两人在一起的点滴时光。

### ⚠️ 重要配置提醒 (Configuration Required)
为了让计时器准确显示您自己的相恋天数，请在使用或部署前完成以下简单配置：

1. 打开项目根目录下的 `script.js` 文件。
2. 找到定义起始日期的那行代码（通常在文件的前面部分）。
3. 将默认的时间修改为您自己专属的相恋纪念日。

**修改示例：**
请找到以下代码：
`const startDate = new Date("2024-04-17T00:00:00");`
将其中的 `"2024-04-17T00:00:00"` 替换为您真实的日期和时间（注意保留双引号和 `T` 格式）。
---
*Made for two people who keep choosing each other.*
