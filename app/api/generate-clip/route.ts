import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { BlueprintClip } from '@/types';
import { getModelById, DEFAULT_VIDEO_MODEL, getPlatformAspectRatio, IMAGE_MODELS } from '@/lib/models';
import type { PlatformId, ContentType } from '@/types';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

function getReplicate() {
  return new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
}

// Downloads a Replicate URL and saves it to public/media/, returns the local /media/... URL.
async function downloadAndSave(replicateUrl: string, clipType: string): Promise<string> {
  if (!replicateUrl || replicateUrl === 'undefined' || replicateUrl === 'null') {
    throw new Error(`No output URL returned from Replicate (got: "${replicateUrl}"). The model may have failed silently.`);
  }
  // Validate it's actually a URL before fetching
  try { new URL(replicateUrl); } catch {
    throw new Error(`Replicate returned an invalid URL: "${replicateUrl.slice(0, 200)}"`);
  }
  const ext = clipType === 'voiceover' ? 'wav' : clipType === 'image' ? 'jpg' : 'mp4';
  const filename = `${crypto.randomUUID()}.${ext}`;
  const mediaDir = path.join(process.cwd(), 'public', 'media');
  await mkdir(mediaDir, { recursive: true });

  const res = await fetch(replicateUrl);
  if (!res.ok) throw new Error(`Failed to download media: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(mediaDir, filename), buffer);
  return `/media/${filename}`;
}

function buildVideoInput(
  modelId: string,
  prompt: string,
  aspectRatio: string,
  duration: number,
  sourceImageDataUrl?: string,
): Record<string, unknown> {
  const model = getModelById(modelId);
  const cleanPrompt = prompt.replace(/,?\s*\d+\s*seconds?/gi, '').replace(/,?\s*\d+s\b/gi, '').trim();
  const enhancedPrompt = model ? `${cleanPrompt}. ${model.promptSuffix}` : cleanPrompt;
  const negativePrompt = 'blurry, low quality, distorted, watermark, text overlay, bad anatomy, jerky motion';

  switch (model?.family) {
    case 'pvideo':
      return {
        prompt: enhancedPrompt,
        aspect_ratio: aspectRatio,
        duration: Math.max(1, Math.min(20, Math.round(duration))),
        resolution: '720p',
        draft: true,  // cheap draft mode for iteration
        ...(sourceImageDataUrl ? { image: sourceImageDataUrl } : {}),
      };

    case 'wan25-t2v': {
      // size uses WxH notation; duration must be 5 or 10
      const sizeMap: Record<string, string> = {
        '9:16': '720*1280', '16:9': '1280*720', '1:1': '960*960', '4:3': '960*720', '3:4': '720*960',
      };
      const snapDuration = duration <= 7 ? 5 : 10;
      return {
        prompt: enhancedPrompt,
        size: sizeMap[aspectRatio] ?? '720*1280',
        duration: snapDuration,
        negative_prompt: negativePrompt,
      };
    }

    case 'wan-t2v':
      return {
        prompt: enhancedPrompt,
        aspect_ratio: aspectRatio,
        negative_prompt: negativePrompt,
        fast_mode: 'Balanced',
        lora_scale: 1,
        sample_shift: 5,
        sample_steps: 30,
        sample_guide_scale: 5,
      };

    case 'wan-i2v':
      return {
        prompt: enhancedPrompt,
        aspect_ratio: aspectRatio,
        negative_prompt: negativePrompt,
        ...(sourceImageDataUrl ? { image: sourceImageDataUrl } : {}),
      };

    case 'happyhorse':
      return {
        prompt: enhancedPrompt,
        aspect_ratio: aspectRatio,
        duration: Math.max(3, Math.min(15, Math.round(duration))),
        resolution: '720p',
        ...(sourceImageDataUrl ? { image: sourceImageDataUrl } : {}),
      };

    case 'minimax':
      return {
        prompt: enhancedPrompt,
        ...(sourceImageDataUrl ? { first_frame_image: sourceImageDataUrl } : {}),
      };

    default:
      return { prompt: enhancedPrompt };
  }
}

function extractUrl(output: unknown): string {
  console.log('[extractUrl] raw output type:', typeof output, JSON.stringify(output)?.slice(0, 300));
  if (typeof output === 'string') return output;
  // Replicate SDK wraps some outputs in a FileOutput object with a .url() method or .href
  if (output && typeof output === 'object') {
    const o = output as Record<string, unknown>;
    // FileOutput: has .url() method
    if (typeof o.url === 'function') {
      try { return String((o.url as () => unknown)()); } catch { /* fallthrough */ }
    }
    // FileOutput: has .href string
    if (typeof o.href === 'string') return o.href;
    // Plain object with known keys
    if (typeof o.url === 'string') return o.url;
    if (typeof o.video === 'string') return o.video;
    if (typeof o.output === 'string') return o.output;
  }
  if (Array.isArray(output) && output.length > 0) {
    return extractUrl(output[0]);
  }
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const { clip, sourceImageDataUrl, videoModelId, imageModelId, platform, contentType } =
      await req.json() as {
        clip: BlueprintClip;
        sourceImageDataUrl?: string;
        videoModelId?: string;
        imageModelId?: string;
        platform: PlatformId;
        contentType: ContentType;
      };

    if (!clip) return NextResponse.json({ error: 'Missing clip' }, { status: 400 });

    const aspectRatio = getPlatformAspectRatio(platform ?? 'tiktok', contentType ?? 'reel');
    const replicate = getReplicate();

    // Text-only clips
    if (clip.type === 'text_overlay' || clip.type === 'caption') {
      return NextResponse.json({ resultText: clip.prompt });
    }

    if (clip.type === 'video_clip') {
      const modelId = videoModelId ?? DEFAULT_VIDEO_MODEL;
      const duration = clip.duration ?? 3;
      const input = buildVideoInput(modelId, clip.prompt, aspectRatio, duration, sourceImageDataUrl);

      console.log(`[generate-clip] model=${modelId} aspect=${aspectRatio}`);
      console.log(`[generate-clip] prompt: ${String(input.prompt).slice(0, 150)}`);

      // Retry with back-off — handles both transient E002 and 429 rate limits
      let output: unknown;
      let lastError: unknown;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          output = await replicate.run(modelId as `${string}/${string}`, { input });
          lastError = undefined;
          break;
        } catch (err) {
          lastError = err;
          const msg = String(err);
          console.warn(`[generate-clip] attempt ${attempt} failed:`, msg.slice(0, 300));

          if (attempt >= 3) break;

          // Parse retry_after from 429 responses
          const retryMatch = msg.match(/"retry_after"\s*:\s*(\d+)/);
          const waitMs = retryMatch ? (parseInt(retryMatch[1]) + 2) * 1000 : 5000;
          console.log(`[generate-clip] waiting ${waitMs}ms before retry…`);
          await new Promise((r) => setTimeout(r, waitMs));
        }
      }
      if (lastError) {
        const msg = String(lastError);
        // Surface a friendly message for rate limit errors
        if (msg.includes('429') || msg.includes('rate limit') || msg.includes('throttled')) {
          throw new Error('Replicate rate limit hit. Add $5+ credit at replicate.com/account/billing to increase your limit, then try again.');
        }
        throw lastError;
      }

      const replicateUrl = extractUrl(output);
      const localUrl = await downloadAndSave(replicateUrl, 'video_clip');
      return NextResponse.json({ resultUrl: localUrl });
    }

    if (clip.type === 'image') {
      const modelId = imageModelId ?? IMAGE_MODELS[0].id;
      const input: Record<string, unknown> = {
        prompt: `${clip.prompt}. High quality, professional photography, sharp focus.`,
        aspect_ratio: aspectRatio,
        output_format: 'jpg',
      };
      const output = await replicate.run(modelId as `${string}/${string}`, { input });
      const replicateUrl = extractUrl(output);
      const localUrl = await downloadAndSave(replicateUrl, 'image');
      return NextResponse.json({ resultUrl: localUrl });
    }

    if (clip.type === 'voiceover') {
      const output = await replicate.run('jaaari/kokoro-82m', {
        input: {
          text: clip.prompt,
          voice: clip.voice?.accent?.toLowerCase().includes('british') ? 'bf_emma' : 'af_sky',
          speed: 1.0,
        },
      });
      const replicateUrl = extractUrl(output);
      const localUrl = await downloadAndSave(replicateUrl, 'voiceover');
      return NextResponse.json({ resultUrl: localUrl });
    }

    return NextResponse.json({ error: `Unknown clip type: ${clip.type}` }, { status: 400 });
  } catch (err) {
    console.error('[generate-clip]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
