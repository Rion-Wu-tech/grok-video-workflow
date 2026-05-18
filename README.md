# Grok Video Workflow

**Languages:** English | [简体中文](./README.zh-CN.md)

A small local CLI workflow for generating videos with the xAI Grok Imagine Video API.

If this project helps you, please give it a ⭐ Star!

## What It Does

This project wraps Grok Imagine Video into a practical local workflow:

- text-to-video
- reference-to-video with local images or HTTPS image URLs
- async polling
- automatic video download
- metadata JSON output
- cost estimates
- contact sheet frame review
- Codex-friendly command usage

It is designed to work well with Codex: ask Codex to write or compress prompts, run the CLI, inspect the generated contact sheet, and decide whether to rerun.

## Important Notes

- This uses the xAI API, not the Grok web app quota.
- You need xAI API credits or billing enabled in the xAI Console.
- Do not commit your `.env` file.
- Grok prompts currently have a 4096 character limit.
- Reference-to-video supports up to 10 seconds.
- Video generation can produce unstable text, hands, or identity details. Review before publishing.

## Setup

```bash
git clone https://github.com/Rion-Wu-tech/grok-video-workflow.git
cd grok-video-workflow
npm install
cp .env.example .env
```

Edit `.env`:

```env
XAI_API_KEY=your-xai-api-key
```

## Generate A Text-To-Video Clip

```bash
npm run video -- --prompt "A cinematic AI creator editing videos at midnight, vertical social media style" --duration 5 --aspect-ratio 9:16 --resolution 480p
```

## Generate A Reference-To-Video Clip

Put your reference image in `examples/`, then run:

```bash
npm run video -- --prompt-file prompts/worldcup-fancam.example.txt --reference-image examples/your-storyboard.png --duration 10 --aspect-ratio 1:1 --resolution 720p --prefix worldcup-fancam
```

The CLI prints:

```text
request_id
status
video_url
saved_video
metadata
```

Generated files are saved to `outputs/` by default.

## Review The Result

Create a contact sheet:

```bash
npm run review -- --video outputs/your-video.mp4
```

Review checklist:

- Is the action sequence continuous?
- Did the subject's identity stay consistent?
- Are hands and fingers acceptable?
- Is text or scoreboard content stable?
- Did the scene jump unexpectedly?

## Cost Estimate

At the time this workflow was created, xAI's public pricing listed Grok Imagine Video around:

```text
480p: $0.05 / second
720p: $0.07 / second
```

Examples:

```text
5s 480p  ~= $0.25
10s 480p ~= $0.50
10s 720p ~= $0.70
```

Always check the xAI Console and official pricing page before large batches.

## CLI Options

```text
--prompt <text>              Text-to-video prompt.
--prompt-file <path>         Read prompt from a UTF-8 text file.
--reference-image <path|url> Reference image. Repeat up to 7 times.
--duration <seconds>         1-15. Reference-to-video max is 10. Default: 5.
--aspect-ratio <ratio>       16:9, 9:16, 1:1, 4:3, 3:4, 3:2, 2:3. Default: 16:9.
--resolution <value>         480p or 720p. Default: 480p.
--output-dir <path>          Default: outputs.
--prefix <name>              Output filename prefix. Default: grok-video.
--poll-interval <seconds>    Default: 5.
--timeout-minutes <minutes>  Default: 20.
--request-id <id>            Poll and download an existing request.
--no-download                Print hosted URL without saving video.
```

## Codex Prompt Examples

```text
Use this repo to generate a 5 second 9:16 Grok video. First compress my prompt under 4096 characters, then run the CLI and review the contact sheet.
```

```text
Generate a reference-to-video clip from examples/storyboard.png, duration 10 seconds, 720p, then create a contact sheet and tell me whether it needs a rerun.
```

## Why Not A Codex Official Grok Plugin?

Codex can run local tools and can be extended through scripts, skills, and MCP servers. xAI Grok video generation is exposed through xAI's API. This repository wraps that API into a local workflow that Codex can operate.

## Author

Created by [Rion-Wu-tech](https://github.com/Rion-Wu-tech).

## Acknowledgements

- [Hermes Agent](https://github.com/Hermes-AGI) - powerful AI agent framework inspiration
- [TechCrunch](https://techcrunch.com/) - AI and technology news source
- [CoinDesk](https://www.coindesk.com/) - crypto news source
- [GitHub Trending](https://github.com/trending) - discovery of high-quality open-source projects

## Safety

Respect image rights, likeness rights, trademarks, and event broadcast rights. Do not present AI-generated event footage as real footage.

If this project helps you, please give it a ⭐ Star!
