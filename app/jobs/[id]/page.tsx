'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getJob, saveJob } from '@/lib/storage';
import { getPlatform, CONTENT_TYPE_INFO } from '@/lib/platforms';
import { VIDEO_MODELS, IMAGE_MODELS, DEFAULT_VIDEO_MODEL, getPlatformAspectRatio } from '@/lib/models';
import { ContentJob, BlueprintClip } from '@/types';

// ─── Clip card ──────────────────────────────────────────────────────────────

function ClipCard({
  clip,
  job,
  index,
  onGenerate,
}: {
  clip: BlueprintClip;
  job: ContentJob;
  index: number;
  onGenerate: (clipId: string) => void;
}) {
  const typeIcons: Record<string, string> = {
    video_clip: '🎞️',
    image: '🖼️',
    voiceover: '🎙️',
    text_overlay: '✏️',
    caption: '📝',
  };

  const icon = typeIcons[clip.type] ?? '📦';

  return (
    <div
      className={`bg-neutral-900 border rounded-2xl p-5 transition-all ${
        clip.status === 'done'
          ? 'border-green-700'
          : clip.status === 'error'
          ? 'border-red-700'
          : clip.status === 'generating'
          ? 'border-yellow-600 animate-pulse'
          : 'border-neutral-800'
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div>
            <span className="font-semibold text-sm text-neutral-100">{clip.label}</span>
            <span className="ml-2 text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">
              {clip.type.replace('_', ' ')}
            </span>
            {clip.duration && (
              <span className="ml-2 text-xs text-neutral-500">{clip.duration}s</span>
            )}
          </div>
        </div>
        <StatusBadge status={clip.status} />
      </div>

      {/* Source image indicator */}
      {clip.sourceImageIndex !== undefined && job.uploadedImages[clip.sourceImageIndex] && (
        <div className="flex items-center gap-2 mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={job.uploadedImages[clip.sourceImageIndex].dataUrl}
            alt="source"
            className="w-10 h-10 object-cover rounded-lg border border-neutral-700"
          />
          <span className="text-xs text-neutral-500">Uses Image {clip.sourceImageIndex + 1}</span>
        </div>
      )}

      {/* Prompt / instructions */}
      <div className="bg-neutral-950 rounded-xl p-3 mb-3">
        <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{clip.prompt}</p>
        {clip.voice && (
          <p className="text-xs text-neutral-500 mt-1">
            Voice: {clip.voice.accent} · {clip.voice.gender}
          </p>
        )}
        {clip.timing && (
          <p className="text-xs text-neutral-500 mt-1">
            Timing: {clip.timing.start}s – {clip.timing.end}s
          </p>
        )}
      </div>

      {/* Result */}
      {clip.status === 'done' && (clip.resultUrl || clip.resultText) && (
        <div className="mb-3">
          {clip.resultUrl && clip.type === 'image' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clip.resultUrl}
              alt={clip.label}
              className="w-full rounded-xl border border-neutral-700 max-h-64 object-cover"
            />
          )}
          {clip.resultUrl && clip.type === 'video_clip' && (
            <video
              src={clip.resultUrl}
              controls
              playsInline
              className="w-full rounded-xl border border-neutral-700 max-h-64"
            />
          )}
          {clip.resultUrl && clip.type === 'voiceover' && (
            <audio src={clip.resultUrl} controls className="w-full mt-1" />
          )}
          {clip.resultText && (
            <div className="bg-green-950/40 border border-green-800 rounded-xl p-3 text-sm text-green-200 whitespace-pre-wrap">
              {clip.resultText}
            </div>
          )}
        </div>
      )}

      {clip.status === 'error' && clip.error && (
        <p className="text-xs text-red-400 mb-3">{clip.error}</p>
      )}

      {/* Generate button */}
      {(clip.type === 'video_clip' || clip.type === 'image' || clip.type === 'voiceover') && (
        <button
          onClick={() => onGenerate(clip.id)}
          disabled={clip.status === 'generating'}
          className="text-sm px-4 py-2 rounded-lg border border-pink-700 text-pink-400 hover:bg-pink-700/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {clip.status === 'generating'
            ? 'Generating…'
            : clip.status === 'done'
            ? '↺ Regenerate'
            : '▶ Generate'}
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    pending: { label: 'Pending', class: 'bg-neutral-800 text-neutral-400' },
    generating: { label: 'Generating…', class: 'bg-yellow-900/60 text-yellow-300' },
    done: { label: 'Done ✓', class: 'bg-green-900/60 text-green-300' },
    error: { label: 'Error', class: 'bg-red-900/60 text-red-300' },
  };
  const s = map[status] ?? map.pending;
  return <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.class}`}>{s.label}</span>;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function JobPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<ContentJob | null>(null);
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false);
  const [storyboardError, setStoryboardError] = useState('');
  const [creating, setCreating] = useState(false);
  const [videoModel, setVideoModel] = useState(DEFAULT_VIDEO_MODEL);
  const [imageModel, setImageModel] = useState(IMAGE_MODELS[0].id);

  useEffect(() => {
    const j = getJob(id);
    setJob(j ?? null);
  }, [id]);

  function persist(updated: ContentJob) {
    saveJob(updated);
    setJob({ ...updated });
  }

  // ── Storyboard generation ──────────────────────────────────────────────────
  async function generateStoryboard() {
    if (!job) return;
    setGeneratingStoryboard(true);
    setStoryboardError('');
    try {
      const res = await fetch('/api/blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: job.platform,
          contentType: job.contentType,
          purpose: job.purpose ?? 'ad',
          brand: job.brand,
          goal: job.goal,
          imageCount: job.uploadedImages.length,
        }),
      });
      const data = await res.json() as { clips?: BlueprintClip[]; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'Unknown error');
      persist({ ...job, blueprint: data.clips });
    } catch (err) {
      setStoryboardError(String(err));
    } finally {
      setGeneratingStoryboard(false);
    }
  }

  // ── Single-clip generation ────────────────────────────────────────────────
  const generateClip = useCallback(
    async (clipId: string) => {
      if (!job?.blueprint) return;

      const clipIndex = job.blueprint.findIndex((c) => c.id === clipId);
      if (clipIndex === -1) return;

      const clip = job.blueprint[clipIndex];
      const sourceImage =
        clip.sourceImageIndex !== undefined
          ? job.uploadedImages[clip.sourceImageIndex]?.dataUrl
          : undefined;

      // Mark as generating
      const updatedBlueprint = [...job.blueprint];
      updatedBlueprint[clipIndex] = { ...clip, status: 'generating' };
      persist({ ...job, blueprint: updatedBlueprint });

      try {
        const res = await fetch('/api/generate-clip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clip, sourceImageDataUrl: sourceImage, videoModelId: videoModel, imageModelId: imageModel, platform: job.platform, contentType: job.contentType }),
        });
        const data = await res.json() as { resultUrl?: string; resultText?: string; error?: string };
        if (!res.ok || data.error) throw new Error(data.error ?? 'Unknown error');

        updatedBlueprint[clipIndex] = {
          ...clip,
          status: 'done',
          resultUrl: data.resultUrl,
          resultText: data.resultText,
        };
      } catch (err) {
        updatedBlueprint[clipIndex] = {
          ...clip,
          status: 'error',
          error: String(err),
        };
      }

      persist({ ...job, blueprint: updatedBlueprint });
    },
    [job, videoModel, imageModel],
  );

  // ── Generate ALL media clips ──────────────────────────────────────────────
  async function generateAll() {
    if (!job?.blueprint) return;
    const mediaClips = job.blueprint.filter(
      (c) => c.type === 'video_clip' || c.type === 'image' || c.type === 'voiceover',
    );
    for (const clip of mediaClips) {
      await generateClip(clip.id);
    }
  }

  // ── CREATE (finalise) ─────────────────────────────────────────────────────
  async function handleCreate() {
    if (!job?.blueprint) return;
    setCreating(true);
    try {
      // Resolve all text-only clips
      const updated = job.blueprint.map((clip) => {
        if ((clip.type === 'text_overlay' || clip.type === 'caption') && clip.status === 'pending') {
          return { ...clip, status: 'done' as const, resultText: clip.prompt };
        }
        return clip;
      });

      // Build a simple manifest linking all generated assets
      const manifest = {
        platform: job.platform,
        contentType: job.contentType,
        brand: job.brand,
        goal: job.goal,
        clips: updated.map((c) => ({
          id: c.id,
          label: c.label,
          type: c.type,
          resultUrl: c.resultUrl,
          resultText: c.resultText,
          timing: c.timing,
          duration: c.duration,
        })),
        createdAt: new Date().toISOString(),
      };

      // Save manifest as a data URL so it's accessible without a server
      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      const finalOutputUrl = URL.createObjectURL(blob);

      persist({ ...job, blueprint: updated, finalOutputUrl });
    } finally {
      setCreating(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (!job) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-xl font-bold mb-4">Job not found</h1>
        <Link href="/jobs" className="text-pink-400 hover:underline">← Back to jobs</Link>
      </div>
    );
  }

  const platform = getPlatform(job.platform);
  const ctInfo = CONTENT_TYPE_INFO[job.contentType];
  const aspectRatio = getPlatformAspectRatio(job.platform, job.contentType);
  const doneCount = job.blueprint?.filter((c) => c.status === 'done').length ?? 0;
  const totalCount = job.blueprint?.length ?? 0;
  const allMediaDone =
    job.blueprint !== undefined &&
    job.blueprint
      .filter((c) => c.type === 'video_clip' || c.type === 'image' || c.type === 'voiceover')
      .every((c) => c.status === 'done');

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Back */}
      <div className="mb-2">
        <Link href="/jobs" className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
          ← All Jobs
        </Link>
      </div>

      {/* Job header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{platform?.icon}</span>
          <h1 className="text-2xl font-bold">{job.brand}</h1>
          <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-1 rounded-full">
            {platform?.name} · {ctInfo.label}
          </span>
        </div>
        <p className="text-neutral-400 text-sm">{job.goal}</p>
        {job.uploadedImages.length > 0 && (
          <div className="flex gap-2 mt-3">
            {job.uploadedImages.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.index}
                src={img.dataUrl}
                alt={img.name}
                className="w-14 h-14 object-cover rounded-lg border border-neutral-700"
              />
            ))}
          </div>
        )}
      </div>

      {/* Storyboard section */}
      {/* Model selector — always visible */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-1">🎬 AI Generation Models</h3>
        <p className="text-xs text-neutral-500 mb-4">
          Output format: <span className="text-orange-400 font-semibold">{aspectRatio}</span> · 
          Experiment with the budget model first, switch to premium only once your prompts are finalised.
        </p>
        <div className="grid gap-3 mb-3">
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Video clips model</label>
            <div className="grid gap-2">
              {VIDEO_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setVideoModel(m.id)}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    videoModel === m.id
                      ? 'border-pink-500 bg-pink-500/10'
                      : 'border-neutral-700 hover:border-neutral-500'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${videoModel === m.id ? 'text-pink-300' : 'text-neutral-300'}`}>{m.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        m.tier === 'budget' ? 'bg-green-900/60 text-green-300'
                        : m.tier === 'standard' ? 'bg-yellow-900/60 text-yellow-300'
                        : 'bg-red-900/60 text-red-300'
                      }`}>{m.costPerClip}</span>
                      {m.recommended && <span className="text-xs text-blue-400">★ {m.recommended}</span>}
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5 leading-tight">{m.description}</p>
                    <div className="flex gap-2 mt-1">
                      {m.supportsAspectRatio && <span className="text-xs text-green-500">✓ Aspect ratio</span>}
                      {m.supportsImageInput && <span className="text-xs text-blue-400">✓ Image input</span>}
                      {!m.supportsAspectRatio && <span className="text-xs text-neutral-600">✗ No aspect ratio control</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Image model</label>
            <div className="flex gap-2">
              {IMAGE_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setImageModel(m.id)}
                  className={`flex-1 px-3 py-2 rounded-xl border text-left transition-all ${
                    imageModel === m.id ? 'border-orange-500 bg-orange-500/10' : 'border-neutral-700 hover:border-neutral-500'
                  }`}
                >
                  <div className={`text-xs font-bold ${imageModel === m.id ? 'text-orange-300' : 'text-neutral-300'}`}>{m.name}</div>
                  <div className="text-xs text-neutral-500">{m.costPerImage} · {m.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!job.blueprint ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🤖</div>
          <h2 className="text-xl font-bold mb-2">No storyboard yet</h2>
          <p className="text-neutral-400 text-sm mb-6">
            Click below to let AI design the production storyboard for your content.
          </p>
          {storyboardError && (
            <p className="text-red-400 text-sm mb-4">{storyboardError}</p>
          )}
          <button
            onClick={generateStoryboard}
            disabled={generatingStoryboard}
            className="bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 disabled:opacity-40 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all"
          >
            {generatingStoryboard ? '✨ Generating Storyboard…' : '✨ Generate Storyboard'}
          </button>
        </div>
      ) : (
        <>
          {/* Storyboard header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Production Storyboard</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {doneCount}/{totalCount} clips generated
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={generateStoryboard}
                disabled={generatingStoryboard}
                className="text-sm px-3 py-1.5 rounded-lg border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200 disabled:opacity-40 transition-all"
              >
                ↺ Rebuild
              </button>
              <button
                onClick={generateAll}
                className="text-sm px-3 py-1.5 rounded-lg border border-pink-700 text-pink-400 hover:bg-pink-700/20 transition-all"
              >
                ⚡ Generate All
              </button>
            </div>
          </div>

          {/* Clip grid */}
          <div className="grid gap-4 mb-8">
            {job.blueprint.map((clip, i) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                job={job}
                index={i}
                onGenerate={generateClip}
              />
            ))}
          </div>

          {/* CREATE button */}
          <div className="sticky bottom-6">
            <button
              onClick={handleCreate}
              disabled={creating || !allMediaDone}
              title={allMediaDone ? '' : 'Generate all media clips first'}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-5 rounded-2xl text-xl transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-2xl"
            >
              {creating ? '🎬 Creating…' : '🎬 CREATE'}
            </button>
            {!allMediaDone && (
              <p className="text-center text-xs text-neutral-500 mt-2">
                Generate all media clips to unlock CREATE
              </p>
            )}
          </div>

          {/* Final output */}
          {job.finalOutputUrl && (
            <div className="mt-8 bg-green-950/40 border border-green-800 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-xl font-bold text-green-300 mb-2">Content Ready!</h3>
              <p className="text-neutral-400 text-sm mb-4">
                Your content manifest has been created. Download it to see all generated assets.
              </p>
              <a
                href={job.finalOutputUrl}
                download={`${job.brand.replace(/\s+/g, '-')}-content.json`}
                className="inline-block bg-green-700 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                ⬇ Download Content Manifest
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
