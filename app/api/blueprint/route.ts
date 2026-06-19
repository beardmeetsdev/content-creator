import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { BlueprintClip, ContentType, PlatformId, ContentPurpose } from '@/types';

const LLM_MODEL = 'meta/meta-llama-3-70b-instruct';

function getReplicate() {
  return new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
}

// Platform-specific timing and best practices
const PLATFORM_SPECS: Record<PlatformId, { optimalSeconds: number; maxSeconds: number; notes: string }> = {
  tiktok:    { optimalSeconds: 9,  maxSeconds: 15,  notes: 'TikTok ads that convert best run 9–15 seconds. First 3 seconds must hook instantly or viewers scroll. Vertical 9:16. Captions essential as many watch silently.' },
  instagram: { optimalSeconds: 15, maxSeconds: 30,  notes: 'Instagram Reel ads: 7–15 seconds optimal. Stories: 6–15 seconds. High energy, fast cuts, music-driven. First frame must be visually striking.' },
  youtube:   { optimalSeconds: 30, maxSeconds: 60,  notes: 'YouTube Shorts ads: 15–60 seconds. First 5 seconds are unskippable — use them to hook. Can tell a fuller story than other platforms.' },
  facebook:  { optimalSeconds: 15, maxSeconds: 30,  notes: 'Facebook video ads: 15 seconds optimal. 85% watched with sound off — text overlays are critical. Square or vertical. Show value in first 3 seconds.' },
  linkedin:  { optimalSeconds: 20, maxSeconds: 30,  notes: 'LinkedIn video ads: 15–30 seconds. Professional tone. Lead with the business problem, then the solution. ROI-focused messaging.' },
  twitter:   { optimalSeconds: 15, maxSeconds: 30,  notes: 'X/Twitter video ads: 15–30 seconds. Captions essential. Fast paced. Lead with the insight or surprise.' },
};

// Narrative structures per purpose
const NARRATIVE_STRUCTURES: Record<ContentPurpose, string> = {
  ad: `PROVEN AD NARRATIVE — follow this exact structure (this is how successful mobile app ads are structured):
1. HOOK (first 20% of total time): A relatable question, surprising scenario, or strong emotion. Do NOT show the product yet. Show a PERSON in a situation your audience recognises. Example: someone frustrated scrolling through TikTok looking for a recipe they saw earlier.
2. DESIRE/PROBLEM SHOTS (middle 40%): 2–3 rapid-fire cuts showing the specific things the viewer wishes they could save/have/do. Each cut is 1–2 seconds. Diverse and visually interesting. Still no product.
3. SOLUTION REVEAL (10–15%): The product appears for the first time as the answer. If app screenshots are uploaded, use them here — show the app on an iPhone screen. A person's hand holding the phone works well.
4. QUICK DEMO (10–15%): One clear shot of the key feature in action. App on phone. Reference uploaded images.
5. CTA (final 10–15%): Clean text overlay with the call to action. Caption with download link message.`,

  showcase: `PRODUCT SHOWCASE NARRATIVE — structured demo of the product:
1. INTRO SHOT (10%): Visually interesting establishing shot that sets the mood. Can show the product.
2. FEATURE SHOTS (60%): Each key feature gets its own 2–3 second shot. App on iPhone, clear UI. Reference uploaded images for all app screens.
3. BENEFIT SUMMARY (15%): Quick montage showing the outcome/result for the user.
4. CTA (15%): Clear call to action.`,

  tutorial: `TUTORIAL NARRATIVE — step by step how-to:
1. PROBLEM STATEMENT (15%): Show the task/problem to be solved.
2. STEP SHOTS (60%): Each step shown clearly. App on phone, reference uploaded images. Number each step with a text overlay.
3. RESULT (15%): The completed outcome.
4. CTA (10%): Where to get it.`,

  awareness: `BRAND AWARENESS NARRATIVE — emotional and aspirational:
1. EMOTIONAL HOOK (30%): Evocative footage of the lifestyle or aspiration. No product.
2. BRAND MOMENT (40%): Weave the product naturally into the lifestyle. Reference uploaded images.
3. BRAND STATEMENT (20%): Key message/tagline as text overlay.
4. SOFT CTA (10%): Low-pressure call to action.`,
};

function buildSystemPrompt(
  platform: PlatformId,
  contentType: ContentType,
  purpose: ContentPurpose,
  brand: string,
  goal: string,
  imageCount: number,
): string {
  const spec = PLATFORM_SPECS[platform];
  const narrative = NARRATIVE_STRUCTURES[purpose];
  const isVideo = ['video', 'short', 'reel', 'story'].includes(contentType);

  return `You are an expert video advertising director and storyboard artist with 20 years of experience creating high-converting short-form social media ads. You understand cinematography, pacing, and what makes people stop scrolling.

=== PROJECT BRIEF ===
Platform: ${platform.toUpperCase()}
Content type: ${contentType}
Purpose: ${purpose.toUpperCase()}
Brand/Product: ${brand}
Goal/Theme: ${goal}
Uploaded brand images available: ${imageCount} (${imageCount === 0 ? 'none — generate all visuals' : `use sourceImageIndex 0–${imageCount - 1} for any shot showing the app/product`})

=== PLATFORM REQUIREMENTS ===
${spec.notes}
Total video target length: ${spec.optimalSeconds} seconds (HARD LIMIT — sum of all clip durations must not exceed ${spec.optimalSeconds} seconds)

=== NARRATIVE STRUCTURE TO FOLLOW ===
${isVideo ? narrative : ''}
${!isVideo && contentType === 'image_post' ? `Create a single striking image + caption. The image should convey the core value proposition visually. Caption should include a hook, key benefit, and CTA with hashtags.` : ''}
${!isVideo && contentType === 'text_post' ? `Write compelling post copy. Lead with a hook or insight. Explain the value. End with CTA. Include relevant hashtags.` : ''}

=== CRITICAL RULES FOR VIDEO CLIP PROMPTS ===
These rules will save money and produce usable results:

1. NEVER use the brand name or app name in the video_clip prompt. Replicate AI has NO knowledge of "${brand}". If you write "${brand}" in a clip prompt, the AI will generate nonsense.

2. Instead, describe EXACTLY what is visually on screen: camera angle, subject, action, lighting, mood, duration.
   BAD: "Generate a clip of the ${brand} app with its features"  
   GOOD: "Close-up of a person's hand holding an iPhone, finger tapping a glowing bookmark icon, soft warm studio lighting, 1 second"

3. For any shot showing the app/product UI — you MUST use sourceImageIndex to reference an uploaded screenshot. Do not ask Replicate to invent the UI.

4. YOU MUST USE ALL UPLOADED IMAGES. With ${imageCount} image(s) uploaded, you MUST include at least ${imageCount} clip(s) that each use a different sourceImageIndex (0 through ${imageCount - 1}). Spread them across the narrative — don't put them all together.

5. Clip durations for ads must be SHORT: 1–2 seconds for cutaway shots, 2–3 seconds for key moments, 3–4 seconds maximum for the most important shots. A typical ${spec.optimalSeconds}s ad has ${Math.round(spec.optimalSeconds / 1.5)} individual cuts.

6. Always specify: camera angle + subject + action + lighting/mood + duration in the prompt.

7. For iPhone/app shots: "A person's hand holding an iPhone [in portrait/landscape], [action], [lighting]" — do NOT say "${brand} app", say "the app interface shown on screen" and use sourceImageIndex.

8. YOU MUST INCLUDE EXACTLY ONE voiceover clip. This is mandatory. The voiceover must cover the full ${spec.optimalSeconds} seconds. Script must be natural spoken language at a conversational pace. At ~130 words/minute: ${spec.optimalSeconds} seconds = ~${Math.round(spec.optimalSeconds * 130 / 60)} words maximum.

9. YOU MUST INCLUDE at least 2 text_overlay clips — a hook at the start and a CTA at the end.

=== OUTPUT FORMAT ===
Respond with ONLY a raw JSON array. No explanation. No markdown. No code fences. Start with [ and end with ].

Each object must have:
{
  "id": "unique string e.g. clip-1, vo-1, overlay-1, caption-1",
  "type": "video_clip" | "image" | "voiceover" | "text_overlay" | "caption",
  "label": "human readable e.g. Hook – Person scrolling frustrated",
  "prompt": "complete detailed instructions",
  "duration": number in seconds (video_clip and voiceover only),
  "timing": { "start": number, "end": number } (text_overlay only, seconds from start),
  "voice": { "accent": "e.g. British RP", "gender": "female" } (voiceover only),
  "sourceImageIndex": number (ONLY when referencing an uploaded image, 0-based),
  "status": "pending"
}`;
}

function extractJson(raw: string): BlueprintClip[] | null {
  const stripped = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  try {
    const parsed = JSON.parse(stripped);
    if (Array.isArray(parsed)) return parsed;
    const values = Object.values(parsed);
    if (values.length > 0 && Array.isArray(values[0])) return values[0] as BlueprintClip[];
  } catch { /* fall through */ }

  const match = stripped.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* fall through */ }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { platform, contentType, purpose, brand, goal, imageCount } = await req.json() as {
      platform: PlatformId;
      contentType: ContentType;
      purpose: ContentPurpose;
      brand: string;
      goal: string;
      imageCount: number;
    };

    if (!platform || !contentType || !brand || !goal) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(platform, contentType, purpose ?? 'ad', brand, goal, imageCount);
    const replicate = getReplicate();

    const output = await replicate.run(LLM_MODEL, {
      input: {
        system_prompt: systemPrompt,
        prompt: `Create the storyboard JSON array for: "${brand}" — "${goal}". Follow the narrative structure exactly. Remember: output ONLY the JSON array starting with [`,
        max_tokens: 4096,
        temperature: 0.7,
      },
    });

    let raw = '';
    if (output && Symbol.asyncIterator in Object(output)) {
      for await (const chunk of output as AsyncIterable<string>) {
        raw += chunk;
      }
    } else {
      raw = Array.isArray(output) ? (output as string[]).join('') : String(output);
    }

    console.log('[storyboard] raw response (first 600 chars):', raw.slice(0, 600));

    const parsed = extractJson(raw);
    if (!parsed) {
      return NextResponse.json({ error: 'Failed to parse AI response', raw }, { status: 500 });
    }

    const clips: BlueprintClip[] = parsed.map((clip, i) => ({
      ...clip,
      id: clip.id ?? `clip-${i + 1}`,
      status: 'pending' as const,
    }));

    return NextResponse.json({ clips });
  } catch (err) {
    console.error('[storyboard]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
