import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';
import { BlueprintClip } from '@/types';

const execAsync = promisify(exec);

function ffmpegBin(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('ffmpeg-static') as string;
  } catch {
    return 'ffmpeg'; // fall back to system ffmpeg
  }
}

// Escape text for ffmpeg drawtext filter
function escapeFfmpegText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\u2019") // replace straight apostrophe with curly
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

// Convert a /media/xxx.mp4 resultUrl to an absolute file path
function urlToPath(resultUrl: string): string {
  const filename = resultUrl.replace(/^\/media\//, '');
  return path.join(process.cwd(), 'public', 'media', filename);
}

export async function POST(req: NextRequest) {
  const { jobId, blueprint, brand } = await req.json() as {
    jobId: string;
    blueprint: BlueprintClip[];
    brand: string;
  };

  const ffmpeg = ffmpegBin();
  const mediaDir = path.join(process.cwd(), 'public', 'media');
  await mkdir(mediaDir, { recursive: true });

  const outputFilename = `final-${jobId}-${crypto.randomUUID().slice(0, 8)}.mp4`;
  const outputPath = path.join(mediaDir, outputFilename);
  const tmpDir = path.join(mediaDir, `tmp-${jobId}`);
  await mkdir(tmpDir, { recursive: true });

  try {
    // ── 1. Gather video clips in storyboard order ─────────────────────────
    const videoClips = blueprint.filter(
      (c) => c.type === 'video_clip' && c.resultUrl && c.resultUrl.startsWith('/media/'),
    );

    if (videoClips.length === 0) {
      return NextResponse.json({ error: 'No generated video clips found. Generate all clips first.' }, { status: 400 });
    }

    // ── 2. Verify all clip files exist ────────────────────────────────────
    for (const clip of videoClips) {
      const p = urlToPath(clip.resultUrl!);
      if (!existsSync(p)) {
        return NextResponse.json({ error: `Clip file not found: ${clip.label}. Re-generate it.` }, { status: 400 });
      }
    }

    // ── 3. Build concat list ──────────────────────────────────────────────
    const concatListPath = path.join(tmpDir, 'concat.txt');
    const concatContent = videoClips.map((c) => `file '${urlToPath(c.resultUrl!)}'`).join('\n');
    await writeFile(concatListPath, concatContent, 'utf-8');

    // ── 4. Concatenate video clips ────────────────────────────────────────
    const concatOutputPath = path.join(tmpDir, 'concat.mp4');
    await execAsync(
      `"${ffmpeg}" -y -f concat -safe 0 -i "${concatListPath}" -c copy "${concatOutputPath}"`,
    );

    // ── 5. Find voiceover ─────────────────────────────────────────────────
    const voiceoverClip = blueprint.find(
      (c) => c.type === 'voiceover' && c.resultUrl?.startsWith('/media/'),
    );

    // ── 6. Build text overlay filter ─────────────────────────────────────
    const textOverlays = blueprint.filter((c) => c.type === 'text_overlay' && c.timing);
    const drawtextFilters = textOverlays.map((c) => {
      const text = escapeFfmpegText(c.prompt.split('\n')[0].slice(0, 80));
      const start = c.timing?.start ?? 0;
      const end = c.timing?.end ?? (start + 2);
      return `drawtext=text='${text}':fontsize=36:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=8:x=(w-text_w)/2:y=h*0.82:enable='between(t,${start},${end})'`;
    });

    // ── 7. Compose final video ────────────────────────────────────────────
    let finalCommand: string;

    if (voiceoverClip?.resultUrl) {
      const voPath = urlToPath(voiceoverClip.resultUrl);
      if (drawtextFilters.length > 0) {
        const vf = drawtextFilters.join(',');
        finalCommand = `"${ffmpeg}" -y -i "${concatOutputPath}" -i "${voPath}" -map 0:v -map 1:a -vf "${vf}" -c:v libx264 -c:a aac -shortest "${outputPath}"`;
      } else {
        finalCommand = `"${ffmpeg}" -y -i "${concatOutputPath}" -i "${voPath}" -map 0:v -map 1:a -c:v libx264 -c:a aac -shortest "${outputPath}"`;
      }
    } else {
      if (drawtextFilters.length > 0) {
        const vf = drawtextFilters.join(',');
        finalCommand = `"${ffmpeg}" -y -i "${concatOutputPath}" -vf "${vf}" -c:v libx264 -c:a aac "${outputPath}"`;
      } else {
        finalCommand = `"${ffmpeg}" -y -i "${concatOutputPath}" -c:v libx264 -c:a aac "${outputPath}"`;
      }
    }

    console.log('[create-video] running:', finalCommand);
    await execAsync(finalCommand);

    // ── 8. Clean up temp files ────────────────────────────────────────────
    await unlink(concatListPath).catch(() => {});
    await unlink(concatOutputPath).catch(() => {});

    return NextResponse.json({ outputUrl: `/media/${outputFilename}` });
  } catch (err) {
    console.error('[create-video]', err);
    // Clean up on error
    await unlink(outputPath).catch(() => {});
    const errMsg = String(err);
    if (errMsg.includes('not found') || errMsg.includes('ENOENT') || errMsg.includes('No such file')) {
      return NextResponse.json({
        error: 'ffmpeg not found. Install it with: brew install ffmpeg',
      }, { status: 500 });
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
