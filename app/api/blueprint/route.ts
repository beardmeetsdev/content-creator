import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { BlueprintClip, ContentType, PlatformId } from '@/types';

function getClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? 'missing',
    ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
  });
}

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

function buildSystemPrompt(
  platform: PlatformId,
  contentType: ContentType,
  brand: string,
  goal: string,
  imageCount: number,
): string {
  const isVideo = ['video', 'short', 'reel', 'story'].includes(contentType);

  return `You are a professional social media content director. Your job is to create a detailed production blueprint for AI-generated content.

The user wants to create content for: ${platform.toUpperCase()}
Content type: ${contentType}
Brand/Subject: ${brand}
Goal/Theme: ${goal}
Number of uploaded reference images: ${imageCount}

${
  isVideo
    ? `For video content, design a production blueprint with:
- Between 5 and 8 video_clip segments (each 2–5 seconds for shorts/reels, 3–8 seconds for full video)
- Exactly 1 voiceover track with the exact script, timing, and a voice description (accent + gender)
- 2–4 text_overlay cards showing key text at specific timestamps
- 0 or 1 caption for the post description

Each video_clip must have a vivid, detailed Replicate AI prompt (for model minimax/video-01 or luma/dream-machine).
If an uploaded reference image is available, instruct the AI to use it by referencing sourceImageIndex (0-based).

Voiceover: write the complete spoken script. Specify duration in seconds. Specify voice accent (e.g. "British RP", "American Midwest") and gender.
Text overlays: specify exact text, start/end timestamps (in seconds from video start), brief description.`
    : contentType === 'image_post'
    ? `For an image post, design a blueprint with:
- Exactly 1 image clip with a detailed Replicate AI image prompt (for model black-forest-labs/flux-1.1-pro)
- If an uploaded reference image exists, reference it as the style/subject base using sourceImageIndex
- Exactly 1 caption clip with the complete post copy including hashtags and a call to action`
    : `For a text post, design a blueprint with:
- Exactly 1 caption clip with the complete post copy tailored for ${platform}, including any hashtags and a call to action`
}

Respond ONLY with a valid JSON array of blueprint clips. Each clip must match this TypeScript interface:
{
  id: string,            // unique, e.g. "clip-1", "vo-1", "overlay-1", "caption-1"
  type: "video_clip" | "image" | "voiceover" | "text_overlay" | "caption",
  label: string,         // human-readable, e.g. "Clip 1 – Couple browsing brochure"
  prompt: string,        // complete AI prompt / instructions
  duration?: number,     // seconds (video_clip, voiceover only)
  timing?: { start: number, end: number },  // for text_overlay, in seconds
  voice?: { accent: string, gender: string },  // for voiceover
  sourceImageIndex?: number,   // 0-based index of uploaded image to use, if applicable
  status: "pending"
}

Do not include any explanation — return only the JSON array.`;
}

export async function POST(req: NextRequest) {
  try {
    const { platform, contentType, brand, goal, imageCount } = await req.json() as {
      platform: PlatformId;
      contentType: ContentType;
      brand: string;
      goal: string;
      imageCount: number;
    };

    if (!platform || !contentType || !brand || !goal) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(platform, contentType, brand, goal, imageCount);

    const completion = await getClient().chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create the content blueprint for: ${brand} — ${goal}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const raw = completion.choices[0]?.message?.content ?? '[]';

    // The model may wrap the array in an object key
    let parsed: BlueprintClip[];
    try {
      const obj = JSON.parse(raw);
      parsed = Array.isArray(obj) ? obj : (obj.clips ?? obj.blueprint ?? Object.values(obj)[0]);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw }, { status: 500 });
    }

    // Ensure every clip has status: pending and a unique id
    const clips: BlueprintClip[] = parsed.map((clip, i) => ({
      ...clip,
      id: clip.id ?? `clip-${i + 1}`,
      status: 'pending' as const,
    }));

    return NextResponse.json({ clips });
  } catch (err) {
    console.error('[blueprint]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
