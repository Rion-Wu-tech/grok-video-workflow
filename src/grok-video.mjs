#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const API_BASE = "https://api.x.ai/v1";
const DEFAULT_MODEL = "grok-imagine-video";
const MODEL_PRICES_USD = {
  "grok-imagine-video": { "480p": 0.05, "720p": 0.07 },
  "grok-imagine-video-1.5-preview": { "480p": 0.08, "720p": 0.14 },
};
const SUPPORTED_MODELS = new Set(Object.keys(MODEL_PRICES_USD));
const ASPECT_RATIOS = new Set(["16:9", "9:16", "1:1", "4:3", "3:4", "3:2", "2:3"]);
const RESOLUTIONS = new Set(["480p", "720p"]);

function help() {
  console.log(`Grok Imagine Video CLI

Usage:
  npm run video -- --prompt "your prompt" [options]
  npm run video -- --prompt-file prompts/example.txt --reference-image ref.png [options]
  npm run video -- --request-id <id> [options]

Options:
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
  --model <name>               Default: ${DEFAULT_MODEL}. Or set XAI_VIDEO_MODEL.
  --list-models                Show supported video models.
  --no-download                Print hosted URL without saving video.
  --help                       Show this help.

Environment:
  XAI_API_KEY must be set in your shell or in a local .env file.`);
}

function printModelList() {
  console.log("Supported Grok Imagine video models:");
  for (const model of SUPPORTED_MODELS) {
    const prices = MODEL_PRICES_USD[model];
    console.log(`- ${model}`);
    console.log(`  480p: $${prices["480p"].toFixed(2)}/s`);
    console.log(`  720p: $${prices["720p"].toFixed(2)}/s`);
  }
}

function parseArgs(argv) {
  const args = {
    duration: 5,
    aspectRatio: "16:9",
    resolution: "480p",
    outputDir: path.resolve("outputs"),
    prefix: "grok-video",
    model: process.env.XAI_VIDEO_MODEL || DEFAULT_MODEL,
    pollIntervalSeconds: 5,
    timeoutMinutes: 20,
    download: true,
    referenceImages: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
      i += 1;
      return value;
    };

    switch (arg) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "--list-models":
        args.listModels = true;
        break;
      case "-p":
      case "--prompt":
        args.prompt = next();
        break;
      case "--prompt-file":
        args.promptFile = path.resolve(next());
        break;
      case "--reference-image":
        args.referenceImages.push(next());
        break;
      case "--duration":
        args.duration = Number(next());
        break;
      case "--aspect-ratio":
        args.aspectRatio = next();
        break;
      case "--resolution":
        args.resolution = next();
        break;
      case "--output-dir":
        args.outputDir = path.resolve(next());
        break;
      case "--prefix":
        args.prefix = next().replace(/[^a-zA-Z0-9._-]/g, "-");
        break;
      case "--poll-interval":
        args.pollIntervalSeconds = Number(next());
        break;
      case "--timeout-minutes":
        args.timeoutMinutes = Number(next());
        break;
      case "--request-id":
        args.requestId = next();
        break;
      case "--model":
        args.model = next();
        break;
      case "--no-download":
        args.download = false;
        break;
      default:
        if (!arg.startsWith("--") && !args.prompt) {
          args.prompt = [arg, ...argv.slice(i + 1)].join(" ");
          i = argv.length;
          break;
        }
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return args;
}

async function loadDotEnv() {
  try {
    const text = await readFile(path.resolve(".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function hydratePrompt(args) {
  if (args.promptFile) args.prompt = (await readFile(args.promptFile, "utf8")).trim();
  return args;
}

function validate(args) {
  if (args.help || args.listModels) return;
  if (!args.prompt && !args.requestId) throw new Error("Provide --prompt, --prompt-file, or --request-id.");
  if (!SUPPORTED_MODELS.has(args.model)) {
    throw new Error(`--model must be one of: ${[...SUPPORTED_MODELS].join(", ")}`);
  }
  if (!Number.isInteger(args.duration) || args.duration < 1 || args.duration > 15) {
    throw new Error("--duration must be an integer from 1 to 15.");
  }
  if (args.referenceImages.length > 0 && args.duration > 10) {
    throw new Error("Reference-to-video supports a maximum duration of 10 seconds.");
  }
  if (args.referenceImages.length > 7) throw new Error("--reference-image supports up to 7 images.");
  if (!ASPECT_RATIOS.has(args.aspectRatio)) throw new Error(`--aspect-ratio must be one of: ${[...ASPECT_RATIOS].join(", ")}`);
  if (!RESOLUTIONS.has(args.resolution)) throw new Error(`--resolution must be one of: ${[...RESOLUTIONS].join(", ")}`);
  if (!Number.isFinite(args.pollIntervalSeconds) || args.pollIntervalSeconds < 1) throw new Error("--poll-interval must be at least 1.");
  if (!Number.isFinite(args.timeoutMinutes) || args.timeoutMinutes <= 0) throw new Error("--timeout-minutes must be greater than 0.");
  if (args.prompt && args.prompt.length > 4096) throw new Error(`Prompt is ${args.prompt.length} characters. xAI currently allows up to 4096.`);
}

function pricePerSecond(model, resolution) {
  return MODEL_PRICES_USD[model]?.[resolution] ?? null;
}

async function requestJson(url, { method = "GET", apiKey, body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`xAI API ${response.status} ${response.statusText}\n${JSON.stringify(data, null, 2)}`);
  }
  return data;
}

async function toReferenceUrl(input) {
  if (/^https:\/\//i.test(input) || /^data:image\//i.test(input)) return input;
  if (/^http:\/\//i.test(input)) throw new Error("Reference image URLs must use HTTPS.");

  const filePath = path.resolve(input);
  const buffer = await readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : null;
  if (!mime) throw new Error(`Unsupported reference image extension: ${ext || "(none)"}`);
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function startGeneration(args, apiKey) {
  const perSecondPrice = pricePerSecond(args.model, args.resolution);
  const body = {
    model: args.model,
    prompt: args.prompt,
    duration: args.duration,
    aspect_ratio: args.aspectRatio,
    resolution: args.resolution,
  };

  if (args.referenceImages.length) {
    body.reference_images = await Promise.all(args.referenceImages.map(async (image) => ({ url: await toReferenceUrl(image) })));
  }

  console.log(`model: ${args.model}`);
  if (perSecondPrice === null) {
    console.log(`estimated_cost_usd: unknown (${args.duration}s ${args.resolution}; check xAI pricing)`);
  } else {
    console.log(`estimated_cost_usd: ${(args.duration * perSecondPrice).toFixed(2)} (${args.duration}s ${args.resolution})`);
  }
  if (body.reference_images) console.log(`reference_images: ${body.reference_images.length}`);

  const data = await requestJson(`${API_BASE}/videos/generations`, { method: "POST", apiKey, body });
  if (!data.request_id) throw new Error(`No request_id returned: ${JSON.stringify(data, null, 2)}`);
  console.log(`request_id: ${data.request_id}`);
  return data.request_id;
}

async function poll(requestId, args, apiKey) {
  const startedAt = Date.now();
  const timeoutMs = args.timeoutMinutes * 60 * 1000;

  while (Date.now() - startedAt < timeoutMs) {
    const data = await requestJson(`${API_BASE}/videos/${encodeURIComponent(requestId)}`, { apiKey });
    const status = data.status ?? "unknown";
    console.log(`status: ${status}`);
    if (status === "done") {
      if (!data.video?.url) throw new Error(`Done, but no video URL returned: ${JSON.stringify(data, null, 2)}`);
      return data;
    }
    if (status === "failed" || status === "expired") throw new Error(`Video request ${status}: ${JSON.stringify(data, null, 2)}`);
    await new Promise((resolve) => setTimeout(resolve, args.pollIntervalSeconds * 1000));
  }

  throw new Error(`Timed out after ${args.timeoutMinutes} minutes. Request id: ${requestId}`);
}

async function download(url, args, requestId) {
  await mkdir(args.outputDir, { recursive: true });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = `${args.prefix}-${timestamp}-${requestId.slice(0, 8)}`;
  const videoPath = path.join(args.outputDir, `${base}.mp4`);
  await writeFile(videoPath, Buffer.from(await response.arrayBuffer()));
  return videoPath;
}

async function writeMetadata(args, requestId, result, localVideoPath) {
  await mkdir(args.outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const metadataPath = path.join(args.outputDir, `${args.prefix}-${timestamp}-${requestId.slice(0, 8)}.json`);
  await writeFile(metadataPath, `${JSON.stringify({
    request_id: requestId,
    model: args.model,
    prompt: args.prompt,
    duration: args.duration,
    aspect_ratio: args.aspectRatio,
    resolution: args.resolution,
    reference_images: args.referenceImages,
    hosted_url: result.video?.url,
    local_video_path: localVideoPath,
    response: result,
    created_at: new Date().toISOString(),
  }, null, 2)}\n`);
  return metadataPath;
}

async function main() {
  await loadDotEnv();
  const args = await hydratePrompt(parseArgs(process.argv.slice(2)));
  if (args.help) return help();
  if (args.listModels) return printModelList();
  validate(args);

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Missing XAI_API_KEY. Set it in your shell or local .env file.");

  const requestId = args.requestId ?? await startGeneration(args, apiKey);
  const result = await poll(requestId, args, apiKey);
  console.log(`video_url: ${result.video.url}`);

  const localVideoPath = args.download ? await download(result.video.url, args, requestId) : null;
  if (localVideoPath) console.log(`saved_video: ${localVideoPath}`);

  const metadataPath = await writeMetadata(args, requestId, result, localVideoPath);
  console.log(`metadata: ${metadataPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
