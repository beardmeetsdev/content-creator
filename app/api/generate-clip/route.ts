import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { BlueprintClip, ClipType } from '@/types';

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const MODELS: Record<ClipType, string | null> = {
  video_clip: 'minimax/video-01',
  image: 'black-forest-labs/flux-1.1-pro',
  voiceover: 'suno-ai/bark',
  text_overlay: null, // text only — no model needed
  caption: null,       // text only — no model needed
};

export async function POST(req: NextRequest) {
  try {
    const { clip, sourceImageDataUrl } = await req.json() as {
      clip: BlueprintClip;
      sourceImageDataUrl?: string; // base64 data URL of the reference image, if any
    };

    if (!clip) {
      return NextResponse.json({ error: 'Missing clip' }, { status: 400 });
    }

    // Text-only clips resolve immediately
    if (clip.type === 'text_overlay' || clip.type === 'caption') {
      return NextResponse.json({ resultText: clip.prompt });
    }

    const model = MODELS[clip.type];
    if (!model) {
      return NextResponse.json({ error: `No model configured for type: ${clip.type}` }, { status: 400 });
    }

    let output: unknown;

    if (clip.type === 'video_clip') {
      const input: Record<string, unknown> = {
        prompt: clip.prompt,
        ...(clip.duration ? { num_frames: Math.round(clip.duration * 8) } : {}),
        ...(sourceImageDataUrl ? { first_frame_image: sourceImageDataUrl } : {}),
      };
      output = await replicate.run(model as `${string}/${string}`, { input });
    } else if (clip.type === 'image') {
      const input: Record<string, unknown> = {
        prompt: clip.prompt,
        aspect_ratio: '1:1',
        output_format: 'jpg',
      };
      output = await replicate.run(model as `${string}/${string}`, { input });
    } else if (clip.type === 'voiceover') {
      const voiceText = clip.voice
        ? `[${clip.voice.accent} ${clip.voice.gender} voice] ${clip.prompt}`
        : clip.prompt;
      output = await replicate.run(model as `${string}/${string}`, {
        input: { prompt: voiceText },
      });
    }

    // Replicate returns either a string URL or an array with a URL
    const resultUrl = Array.isArray(output)
      ? (output[0] as string)
      : typeof output === 'string'
      ? output
      : (output as { url?: string })?.url ?? '';

    return NextResponse.json({ resultUrl });
  } catch (err) {
    console.error('[generate-clip]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
