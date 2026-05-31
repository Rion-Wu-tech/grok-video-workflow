# Grok 视频生成工作流

**语言：** [English](./README.md) | 简体中文

这是一个基于 xAI Grok Imagine Video API 的本地视频生成 CLI 工作流。

如果这个项目对你有帮助，请给个 ⭐ Star！

## 它能做什么

这个项目把 Grok Imagine Video 封装成一套适合本地使用、也适合 Codex 操作的工作流：

- 文生视频
- 参考图生成视频
- 支持本地图片或 HTTPS 图片链接
- 异步轮询生成状态
- 自动下载视频
- 自动保存 metadata JSON
- 生成成本预估
- 生成抽帧审查图
- 适合和 Codex 配合使用

你可以让 Codex 帮你压缩 prompt、调用 CLI、检查抽帧图，并判断是否需要重跑。

## 重要说明

- 这里使用的是 xAI API，不是 Grok 网页版额度。
- 你需要在 xAI Console 开通 API credits 或 billing。
- 不要把 `.env` 提交到 GitHub。
- Grok prompt 当前有 4096 字符限制。
- 参考图生成视频最长支持 10 秒。
- 视频模型可能出现文字不稳定、手部错误、人物一致性波动等问题，发布前要审查。

## 安装

```bash
git clone https://github.com/Rion-Wu-tech/grok-video-workflow.git
cd grok-video-workflow
npm install
cp .env.example .env
```

编辑 `.env`：

```env
XAI_API_KEY=your-xai-api-key
XAI_VIDEO_MODEL=grok-imagine-video
```

## 文生视频

```bash
npm run video -- --prompt "A cinematic AI creator editing videos at midnight, vertical social media style" --duration 5 --aspect-ratio 9:16 --resolution 480p
```

工作流已经内置两个 xAI 视频模型。你可以先列出可选模型：

```bash
npm run models
```

常规批量生成，建议用标准模型：

```bash
npm run video:standard -- --prompt "A cinematic AI creator editing videos at midnight, vertical social media style" --duration 5 --aspect-ratio 9:16 --resolution 480p
```

如果你想测试更新的预览模型：

```bash
npm run video:latest -- --prompt "A cinematic AI creator editing videos at midnight, vertical social media style" --duration 5 --aspect-ratio 9:16 --resolution 720p
```

## 参考图生成视频

把参考图放到 `examples/` 目录，然后运行：

```bash
npm run video -- --prompt-file prompts/worldcup-fancam.example.txt --reference-image examples/your-storyboard.png --duration 10 --aspect-ratio 1:1 --resolution 720p --prefix worldcup-fancam
```

CLI 会输出：

```text
request_id
status
video_url
saved_video
metadata
```

生成文件默认保存在 `outputs/`。

## 审查生成结果

生成抽帧审查图：

```bash
npm run review -- --video outputs/your-video.mp4
```

建议检查：

- 动作是否连贯
- 人物身份是否一致
- 手指和手势是否正常
- 文字、比分牌等是否稳定
- 场景是否突然跳变

## 成本预估

创建这个项目时，xAI 公开价格中 Grok Imagine Video 大约是：

```text
grok-imagine-video:
  480p: $0.05 / 秒
  720p: $0.07 / 秒

grok-imagine-video-1.5-preview:
  480p: $0.08 / 秒
  720p: $0.14 / 秒
```

示例：

```text
5 秒 480p  ~= $0.25
10 秒 480p ~= $0.50
10 秒 720p ~= $0.70
```

批量生成前，请以 xAI Console 和官方价格页为准。

## CLI 参数

```text
--prompt <text>              文生视频 prompt。
--prompt-file <path>         从 UTF-8 文本文件读取 prompt。
--reference-image <path|url> 参考图，可重复传入，最多 7 张。
--duration <seconds>         1-15 秒。参考图生成视频最长 10 秒。默认 5 秒。
--aspect-ratio <ratio>       16:9, 9:16, 1:1, 4:3, 3:4, 3:2, 2:3。默认 16:9。
--resolution <value>         480p 或 720p。默认 480p。
--output-dir <path>          默认 outputs。
--prefix <name>              输出文件名前缀。默认 grok-video。
--poll-interval <seconds>    默认 5 秒。
--timeout-minutes <minutes>  默认 20 分钟。
--request-id <id>            轮询并下载已有请求。
--model <name>               默认 grok-imagine-video。也可设置 XAI_VIDEO_MODEL。
--list-models                显示支持的视频模型。
--no-download                只输出 hosted URL，不下载视频。
```

## Codex 使用示例

```text
使用这个 repo 生成一个 5 秒 9:16 的 Grok 视频。先把我的 prompt 压缩到 4096 字符以内，然后运行 CLI，并检查抽帧图。
```

```text
根据 examples/storyboard.png 生成一个参考图视频，10 秒，720p，然后创建 contact sheet 并判断是否需要重跑。
```

## 为什么不是 Codex 官方 Grok 插件？

Codex 可以运行本地工具，也可以通过脚本、skills 和 MCP server 扩展能力。xAI Grok 视频生成能力来自 xAI API。这个仓库的作用是把 xAI API 封装成本地工作流，让 Codex 可以稳定调用。

## 作者

作者：[Rion-Wu-tech](https://github.com/Rion-Wu-tech)
X/Twitter: [@rionaifantasy]

## 安全与合规

请尊重图片版权、肖像权、商标权和赛事转播权。不要把 AI 生成的赛事画面伪装成真实转播画面。

如果这个项目对你有帮助，请给个 ⭐ Star！
