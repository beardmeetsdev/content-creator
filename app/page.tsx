'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { saveJob } from '@/lib/storage';
import { PLATFORMS, CONTENT_TYPE_INFO } from '@/lib/platforms';
import { PlatformId, ContentType, UploadedImage, ContentJob } from '@/types';

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null);
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
    files.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages((prev) => [
          ...prev,
          { name: file.name, dataUrl: ev.target?.result as string, index: prev.length + i },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function removeImage(index: number) {
    setImages((prev) =>
      prev
        .filter((img) => img.index !== index)
        .map((img, i) => ({ ...img, index: i }))
    );
  }

  const canGo =
    selectedPlatform !== null &&
    selectedContentType !== null &&
    brand.trim().length > 0 &&
    goal.trim().length > 0;

  function handleGo() {
    if (!canGo) return;
    const job: ContentJob = {
      id: Date.now().toString(),
      platform: selectedPlatform!,
      contentType: selectedContentType!,
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
          Describe your content idea and let AI build the full production blueprint — then generate every asset with one click.
        </p>
      </div>

      <div className="space-y-8">
        {/* Step 1: Platform */}
        <section>
          <label className="block text-sm font-semibold text-neutral-300 mb-3 uppercase tracking-wider">
            1 · Choose Platform
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PLATFORMS.map((p) => {
              const active = selectedPlatform === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePlatformSelect(p.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    active
                      ? 'border-pink-500 bg-pink-500/10 text-pink-300'
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
            <label className="block text-sm font-semibold text-neutral-300 mb-3 uppercase tracking-wider">
              2 · Content Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {platform.contentTypes.map((ct) => {
                const info = CONTENT_TYPE_INFO[ct];
                const active = selectedContentType === ct;
                return (
                  <button
                    key={ct}
                    onClick={() => setSelectedContentType(ct)}
                    className={`px-4 py-3 rounded-xl border text-left transition-all ${
                      active
                        ? 'border-orange-500 bg-orange-500/10 text-orange-300'
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

        {/* Step 3: Brand + Goal */}
        {selectedContentType && (
          <>
            <section>
              <label className="block text-sm font-semibold text-neutral-300 mb-3 uppercase tracking-wider">
                3 · Brand / Subject
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Star Galaxy Granite, BookMaster App, Nike Air Max…"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </section>

            <section>
              <label className="block text-sm font-semibold text-neutral-300 mb-3 uppercase tracking-wider">
                4 · Goal / Theme
              </label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
                placeholder="e.g. Showcase the worktop to new kitchen renovation prospects&#10;e.g. Show reasons why this app saves time for busy parents&#10;e.g. Announce the summer sale with an emotional lifestyle feel"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors resize-none"
              />
            </section>

            {/* Step 4: Optional images */}
            <section>
              <label className="block text-sm font-semibold text-neutral-300 mb-1 uppercase tracking-wider">
                5 · Reference Images <span className="text-neutral-500 font-normal normal-case">(optional)</span>
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                Upload photos to use as source material — e.g. a product shot that AI will transform into video clips.
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
                      <button
                        onClick={() => removeImage(img.index)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <div className="text-xs text-neutral-500 mt-1 text-center w-20 truncate">
                        Image {img.index + 1}
                      </div>
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </section>
          </>
        )}

        {/* GO */}
        <button
          onClick={handleGo}
          disabled={!canGo}
          className="w-full bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-all transform hover:scale-[1.01] active:scale-[0.99]"
        >
          Generate Blueprint →
        </button>
      </div>
    </div>
  );
}
