'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { saveJob } from '@/lib/storage';
import { PLATFORMS, CONTENT_TYPE_INFO } from '@/lib/platforms';
import { PlatformId, ContentType, ContentPurpose, UploadedImage, ContentJob } from '@/types';

const PURPOSES: { id: ContentPurpose; icon: string; label: string; description: string }[] = [
  { id: 'ad',        icon: '📢', label: 'Advertisement',    description: 'Drive downloads or sales — Hook → Problem → Solution → CTA' },
  { id: 'showcase',  icon: '🎯', label: 'Product Showcase', description: 'Demonstrate features and benefits in detail' },
  { id: 'tutorial',  icon: '💡', label: 'Tutorial / How-to', description: 'Step-by-step guide showing the product in action' },
  { id: 'awareness', icon: '🌟', label: 'Brand Awareness',  description: 'Emotional, aspirational — build the brand feeling' },
];

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null);
  const [selectedPurpose, setSelectedPurpose] = useState<ContentPurpose | null>(null);
  const [brand, setBrand] = useState('');
  const [goal, setGoal] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);

  const platform = PLATFORMS.find((p) => p.id === selectedPlatform);

  function handlePlatformSelect(id: PlatformId) {
    setSelectedPlatform(id);
    setSelectedContentType(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages((prev) => [
          ...prev,
          { name: file.name, dataUrl: ev.target?.result as string, index: prev.length },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function removeImage(index: number) {
    setImages((prev) =>
      prev.filter((img) => img.index !== index).map((img, i) => ({ ...img, index: i }))
    );
  }

  const step = !selectedPlatform ? 1
    : !selectedContentType ? 2
    : !selectedPurpose ? 3
    : !brand.trim() ? 4
    : 5;

  const canGo = selectedPlatform && selectedContentType && selectedPurpose && brand.trim() && goal.trim();

  function handleGo() {
    if (!canGo) return;
    const job: ContentJob = {
      id: Date.now().toString(),
      platform: selectedPlatform!,
      contentType: selectedContentType!,
      purpose: selectedPurpose!,
      brand: brand.trim(),
      goal: goal.trim(),
      uploadedImages: images,
      createdAt: new Date().toISOString(),
    };
    saveJob(job);
    router.push(`/jobs/${job.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      {/* Hero */}
      <div className="mb-12 text-center">
        <div className="text-5xl mb-4">🎬</div>
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent">
          Content Creator
        </h1>
        <p className="text-neutral-400 text-lg">
          Describe your content idea and AI will build a complete production storyboard — then generate every asset with one click.
        </p>
      </div>

      <div className="space-y-8">
        {/* Step 1: Platform */}
        <section>
          <StepLabel n={1} label="Choose Platform" active={step >= 1} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PLATFORMS.map((p) => {
              const active = selectedPlatform === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePlatformSelect(p.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    active ? 'border-pink-500 bg-pink-500/10 text-pink-300'
                           : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500'
                  }`}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-xs text-neutral-500 leading-tight">{p.tagline}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2: Content Type */}
        {platform && (
          <section>
            <StepLabel n={2} label="Content Type" active={step >= 2} />
            <div className="grid grid-cols-2 gap-2">
              {platform.contentTypes.map((ct) => {
                const info = CONTENT_TYPE_INFO[ct];
                const active = selectedContentType === ct;
                return (
                  <button
                    key={ct}
                    onClick={() => setSelectedContentType(ct)}
                    className={`px-4 py-3 rounded-xl border text-left transition-all ${
                      active ? 'border-orange-500 bg-orange-500/10 text-orange-300'
                             : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500'
                    }`}
                  >
                    <div className="font-semibold text-sm">{info.label}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{info.description}</div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Step 3: Purpose */}
        {selectedContentType && (
          <section>
            <StepLabel n={3} label="Purpose" active={step >= 3} />
            <div className="grid grid-cols-1 gap-2">
              {PURPOSES.map((p) => {
                const active = selectedPurpose === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPurpose(p.id)}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl border text-left transition-all ${
                      active ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                             : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500'
                    }`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <div>
                      <div className="font-semibold text-sm">{p.label}</div>
                      <div className="text-xs text-neutral-500">{p.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Steps 4 & 5: Brand + Goal */}
        {selectedPurpose && (
          <>
            <section>
              <StepLabel n={4} label="Brand / Product Name" active={step >= 4} />
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. ClipSave, Star Galaxy Granite, Nike Air Max…"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </section>

            <section>
              <StepLabel n={5} label="Goal / Theme" active={step >= 5} />
              <p className="text-xs text-neutral-500 mb-2">
                Describe what the content should achieve and what the product does. The more detail, the better the storyboard.
              </p>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={4}
                placeholder="e.g. Wishing to save short form video clips to view later? Save recipes, holidays, film recommendations etc. Now you can with ClipSave.&#10;&#10;e.g. Showcase the Star Galaxy Granite worktop to new kitchen renovation prospects — emphasise the natural stone texture and premium feel."
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors resize-none"
              />
            </section>

            {/* Step 6: Images */}
            <section>
              <StepLabel n={6} label="Brand Images / Screenshots" active />
              <p className="text-xs text-neutral-500 mb-3">
                Upload app screenshots, product photos, or brand assets. These will be referenced in the storyboard for any shot showing your product — the AI will not invent your UI.
              </p>

              {images.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-3">
                  {images.map((img) => (
                    <div key={img.index} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        className="w-20 h-20 object-cover rounded-lg border border-neutral-700"
                      />
                      <div className="absolute top-0 left-0 bg-black/60 text-white text-xs px-1 rounded-tl-lg rounded-br-lg">
                        {img.index + 1}
                      </div>
                      <button
                        onClick={() => removeImage(img.index)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-neutral-600 rounded-xl text-neutral-400 hover:border-pink-500 hover:text-pink-400 transition-all text-sm"
              >
                <span>＋</span> Add images
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
            </section>
          </>
        )}

        {/* GO */}
        <button
          onClick={handleGo}
          disabled={!canGo}
          className="w-full bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-all transform hover:scale-[1.01] active:scale-[0.99]"
        >
          Generate Storyboard →
        </button>
      </div>
    </div>
  );
}

function StepLabel({ n, label, active }: { n: number; label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${active ? 'bg-pink-600 text-white' : 'bg-neutral-800 text-neutral-500'}`}>
        {n}
      </span>
      <span className={`text-sm font-semibold uppercase tracking-wider ${active ? 'text-neutral-300' : 'text-neutral-600'}`}>{label}</span>
    </div>
  );
}
