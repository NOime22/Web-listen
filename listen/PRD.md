## PRD｜Listen（READO）AI 朗读助手 v1.0.0

### 一、背景与目标
- 通过浏览器扩展，用主流 AI TTS 将网页中的选中文本（或未来的截图 OCR 文本）快速转换为语音，支持即点即听、极简操作与清晰的产品结构。
- 面向需要高效获取信息、进行语言学习/发音练习的用户，强调自然音色、低操作复杂度与稳定输出。

### 二、用户画像
- 资讯重度用户：希望浏览时“听”为主，提高信息摄入效率。
- 语言学习者：希望跟读/模仿主流 AI 的自然音色。
- 无障碍与多任务用户：希望在阅读受限环境下以听取代读。

### 三、核心价值与原则
- 极简：可视化浮标 + 简洁弹窗 + 极少设置。
- 可靠：使用云端 AI TTS，规避浏览器本地语音一致性问题。
- 快速：即时播放（最佳努力），失败兜底为 WebAudio 解码播放（不再本地 TTS）。

---

## 产品范围

### 1) 页面交互
- **浮标（Floating Button）**
  - 划词后在选区旁显示 “R” 深色圆角矩形按钮。
  - 点击即发送朗读请求并播放。
  - 是否显示受“Enable Floating Button”开关控制。
- **选中文本朗读**
  - 从内容脚本读取当前选区文本，调用后台 AI TTS，前端音频播放器播放。
  - 播放失败自动切换 WebAudio 解码尝试。

### 2) 弹窗（Popup）
- **结构与定位（与 Figma 一致）**
  - 顶部“READO + 横线”：整体高度 2/15 处。
  - 主按钮“Read it to me”：整体高度 1/3 处。
  - “Pace of Speech”（三档）：整体高度 2/3 处。
  - 底栏（设置齿轮 + 居中版本号）。
- **功能**
  - Read it to me：触发当前页“朗读选中文本”。
  - Pace of Speech：下拉（Slow=0.85、Normal=1.0、Fast=1.2），映射为存储中的 `rate`。

### 3) 设置页（Options）
- **结构（单卡片，标题与卡片上下圆角相接，内部使用分隔线）**
  - 顶部：READO 标题 + 横线。
  - 卡片内容（自上而下垂直排布）：
    - Model（OpenAI/Gemini/Deepseek）
    - API KEY（右侧“眼睛”可见性切换，严格垂直居中）
    - URL（完整 Base URL 或直达端点）
    - Connection Test（展示成功/失败与耗时）
    - 分隔线
    - Enable Floating Button（开关，开启色为 #1ADB87）
    - Enable OCR（开关，开启色为 #1ADB87；当前 OCR 仍为占位）
    - 重置为默认、保存设置（间距与分隔均按 Figma 的 2.5x 指定比例放大）
- **下拉箭头**
  - 与弹窗一致的内嵌 SVG 样式、位置与尺寸。

### 4) AI TTS 提供商
- **Model（aiProvider）**
  - OpenAI：/audio/speech（mp3）
  - Google Cloud TTS：/text:synthesize（mp3）
  - Gemini：/models/...:generateContent（返回 PCM，后台转 WAV 并前端播放）
- **默认配置（首次安装）**
  - Provider：Gemini
  - API Base URL：`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`
  - Voice：Kore
  - API Key：空（用户需在设置页手动填写；仓库与安装包中不得包含任何密钥）
  - useAdvancedAI：true
  - Enable Floating Button：true
  - Enable OCR：true
- **连接测试（Connection Test）**
  - 直接调用 generateTTS('Hello') 并计时，显示 mime 与耗时。

---

### 本地测试固定参数（仅本地）
- Model：Gemini
- URL：`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`
- API KEY：`AIzaSyCS5PHtyldxjajMFaAcqXDwfWg1cqA5f7c`

> 仅用于本地调试与便捷复现。生产发布前必须移除硬编码，并要求用户在设置页填写自己的 Key。

### 5) 音频播放策略
- 优先用 HTMLAudio 播放对象 URL。
- 播放错误自动尝试 WebAudio 解码播放。
- 不再使用本地 TTS（浏览器 SpeechSynthesis）作为回退。

### 6) 图标与品牌
- 浮标与扩展图标统一为深底白“R”风格。
- `manifest.json` icons：16/48/128 PNG 已配置。

---

## 项目结构与打包

### 目录结构（关键文件）
```
listen/
  listen/
    manifest.json          # MV3 主清单（入口、权限、脚本）
    popup.html             # 弹窗 UI
    options.html           # 设置页 UI
    js/
      background.js        # 后台：上下文菜单、消息路由、TTS 调用
      content.js           # 内容脚本：选区、浮标、播放
      options.js           # 设置页逻辑：存储、连接测试
      popup.js             # 弹窗逻辑：读选区、速率映射
    css/
      content.css          # 浮标样式与动画
    images/
      icon16.png / 48 / 128
    PRD.md                 # 本文件
  README.md
  manifest.json            # 根级文件（当前未使用）
```

### 本地调试
- 打开 `chrome://extensions` → 打开“开发者模式” → “加载已解压的扩展程序” → 选择 `listen/listen/` 目录。

### 打包与发布
- 打包：将 `listen/listen/` 目录压缩为 zip（确保不包含源码中的密钥或调试脚本）。
- 发布：Chrome 网上应用店开发者后台上传 zip，完善素材与描述。
- 版本号：与 `listen/manifest.json` 中的 `version` 保持一致并递增。

---

## 交互流程

### 划词 → 浮标 → 播放
1. 用户划词 → 内容脚本计算选区位置 → 按 `enableFloatingButton` 判断是否显示浮标“R”。
2. 点击“R” → 内容脚本向后台 `generateTTS` 发送文本。
3. 后台调用对应 Provider：
   - OpenAI：返回 mp3 ArrayBuffer
   - Google：返回 base64 mp3，解码为 ArrayBuffer
   - Gemini：返回 base64 PCM，拼接 WAV header 得到 ArrayBuffer，并附带 `audioB64` 供前端稳健构造 Blob
4. 内容脚本构造 Blob URL → HTMLAudio 播放；失败则 WebAudio 解码播放。

### 弹窗 → 朗读选中
1. 用户点击“Read it to me” → popup 向当前 Tab 发送 `readSelectedText`。
2. 内容脚本获取选区文本 → 与上述流程一致。

### 设置页 → 保存/重置/测试
1. 用户配置 Model、API KEY、URL、开关 → Save 写入 `chrome.storage.sync`
2. Reset to Default 写入默认 Gemini 配置
3. Connection Test 发起一次最小 TTS 请求并显示结果

---

## 数据模型与存储

### chrome.storage.sync（关键键）
- aiProvider: 'gemini'|'openai'|'deepseek'
- apiKey: string
- apiBaseUrl: string（可为完整端点）
- aiVoice: string（例如 'Kore'）
- rate: number（0.85 / 1.0 / 1.2 来自弹窗 Pace of Speech）
- enableFloatingButton: boolean（默认 true）
- enableOCR: boolean（默认 true）
- useAdvancedAI: true（默认；无 UI 暴露）

说明：
- 兼容性保留 `preferredLanguage/autoDetectLanguage` 等旧键，但 UI 不再暴露且逻辑固定（autoDetectLanguage=true）。

---

## 权限与安全
- **manifest 权限**
  - permissions: activeTab, storage, contextMenus, scripting, tabs
  - host_permissions: `<all_urls>`, OpenAI、Google TTS、Deepseek、Gemini 域名
- **安全策略**
  - API Key 仅存储在 `chrome.storage.sync`，不在日志中打印
  - Connection Test 仅测试连通性与耗时，不持久化音频
  - 生产发布：禁止在仓库与安装包中硬编码任何 API Key；默认 Key 必须为空，由用户在设置页填写
  - 开发/本地测试：允许为便捷调试临时硬编码 Key，但不得提交至公共仓库或生产包
  - 提交与发版前执行敏感信息扫描（如 git-secrets / truffleHog），并人工复核
  - 最小权限原则：只保留必要 `permissions` 与 `host_permissions`，发布前复核域名白名单
  - 严控日志：避免输出请求头/正文等敏感数据

---

## 非功能性要求
- **性能**：即时播放最佳努力；Gemini 音频构造走 WAV 头拼接优化，前端优先用 base64 构造 Blob 规避结构化克隆问题。
- **稳定性**：HTMLAudio 播放失败自动尝试 WebAudio 解码；消息通信带错误处理。
- **可用性**：UI 还原 Figma 布局（弹窗三锚点 2/15、1/3、2/3；设置页单卡片、2.5x 间距倍增、统一箭头/开关/字体）。
- **兼容性**：系统字体栈；不依赖外链字体（满足 MV3 CSP）。

---

## UI 规范（设计来源）
- 弹窗（popup）：[Figma](https://www.figma.com/design/ykP1pV2rJF0vyJGiPUxekG/Untitled?node-id=6-6)
- 设置页（options）：[Figma](https://www.figma.com/design/ykP1pV2rJF0vyJGiPUxekG/Untitled?node-id=86-54)
- 浮标（floating）：[Figma](https://www.figma.com/design/ykP1pV2rJF0vyJGiPUxekG/Untitled?node-id=76-93)

---

## 已实现功能清单
- 浮标“R”展示/点击朗读，支持开关控制（Enable Floating Button）
- 弹窗
  - Read it to me（朗读选中）
  - Pace of Speech 三档（映射 `rate`）
  - 布局锚点精确（2/15、1/3、2/3）+ 底栏设置与版本
- 设置页
  - Model（OpenAI/Gemini/Deepseek）
  - API KEY（眼睛可见性切换，严格居中）
  - URL（支持完整端点，适配 Gemini generateContent）
  - Connection Test（结果与耗时）
  - Enable Floating Button、Enable OCR 两个开关（绿色开启）
  - 单卡片、统一 2.5x 间距、统一下拉箭头
- 后台
  - generateTTS：OpenAI、Google、Gemini 分支；Gemini PCM→WAV 构造；提供 `audioB64`
  - onInstalled 默认写入 Gemini 配置与 enableFloatingButton=true
- 音频播放与容错：HTMLAudio 播放 + WebAudio 兜底
- 图标：扩展 icons（16/48/128）“R”风格并写入 manifest

---

## 尚未实现 / 待办
- 截图 OCR（当前仍为占位提示）
- 朗读进度/暂停/恢复控制
- 文本分片流式播放与更低延迟的“即点即听”优化
- 多语音/多语言的智能选择
- 可视化错误提示（当前主要在控制台）
- 快捷键：为 `read-selection` / `stop-reading` 在 `chrome://extensions/shortcuts` 中提供推荐绑定，并完善后台处理逻辑
- 生产发布前：移除任何硬编码 API Key，默认 Key 为空，更新安装引导

---

## 验收标准
- 划词后“R”浮标出现（开启开关时），点击能听到 AI 语音播放，无控制台未处理异常。
- 弹窗布局符合 2/15、1/3、2/3 锚点；Pace of Speech 改变后影响后续朗读速率。
- 设置页按 2.5x 间距规范；眼睛按钮垂直居中；下拉箭头一致；Connection Test 显示耗时并成功/失败状态。
- 首次安装默认 Gemini 可正常工作（用户填入真实 API Key）。

---

## 关键用例（测试建议）
- **浮标流程**：普通网页划词→浮标出现→点击播放→正常朗读；关闭开关后不出现。
- **弹窗**：有选区点击“Read it to me”朗读；Pace of Speech Slow/Fast 生效。
- **设置页**：切换 Model/URL/Key→Connection Test 反馈；重置为默认；保存设置持久化。
- **异常**：缺少 Key→报错；播放 error→WebAudio 兜底。

---

## 上线清单
- MV3 manifest、icons、权限域名校对
- 默认配置与 Figma 布局复核
- 至少 Gemini 联调通过
- 常见站点播放 10+ 次无异常
- 准备商店素材（icon、描述、截图）
- 敏感信息扫描：确认无硬编码 API Key / Token（git-secrets 等）
- 快捷键：在 `chrome://extensions/shortcuts` 中验证命令项出现并给出推荐绑定

---

## 里程碑建议
- **M1（当前）**：AI 朗读 + Popup/Options/浮标 + Gemini 默认（已达成）
- **M2**：截图 OCR（真实识别与朗读）、错误可视化
- **M3**：流式分片/更低延迟、任务队列与重试策略
- **M4**：国际化与多语音策略、音色预览 