import { PlatformId, ContentType } from '@/types';

export type VideoModelFamily = 'wan-t2v' | 'wan-i2v' | 'wan25-t2v' | 'pvideo' | 'happyhorse' | 'minimax';

export interface VideoModelDef {
  id: string;
  name: string;
  tier: 'draft' | 'budget' | 'standard' | 'premium';
  costPerClip: string;
  description: string;
  supportsAspectRatio: boolean;
  supportsDuration: boolean;
  supportsImageInput: boolean;
  family: VideoModelFamily;
  promptSuffix: string;
  recommended?: string;
}

export const VIDEO_MODELS: VideoModelDef[] = [
  {
    id: 'prunaai/p-video',
    name: 'p-video · Draft Mode',
    tier: 'draft',
    costPerClip: '~$0.03',
    description: 'Fast cheap draft previews — perfect for iterating on prompts before spending more. 9:16 support, 1–20s duration. Switch to a quality model when happy.',
    supportsAspectRatio: true,
    supportsDuration: true,
    supportsImageInput: true,
    family: 'pvideo',
    promptSuffix: 'smooth motion, clear subject, good lighting',
    recommended: 'Start here — cheapest',
  },
  {
    id: 'wan-video/wan-2.5-t2v-fast',
    name: 'Wan 2.5 · T2V Fast',
    tier: 'budget',
    costPerClip: '~$0.08',
    description: 'Open-source Wan 2.5 from the official provider. Good quality, fast. Duration 5s or 10s only. 9:16 supported.',
    supportsAspectRatio: true,
    supportsDuration: true,
    supportsImageInput: false,
    family: 'wan25-t2v',
    promptSuffix: 'cinematic, smooth motion, professional lighting',
  },
  {
    id: 'alibaba/happyhorse-1.0',
    name: 'Happy Horse 1.0 · 720p',
    tier: 'standard',
    costPerClip: '~$0.42 (3s)',
    description: '720p quality with exact duration (3–15s), 9:16 and image-to-video. Use for final quality renders once prompts are dialled in.',
    supportsAspectRatio: true,
    supportsDuration: true,
    supportsImageInput: true,
    family: 'happyhorse',
    promptSuffix: 'cinematic quality, professional production, smooth motion',
  },
  {
    id: 'minimax/video-01',
    name: 'Minimax Video-01',
    tier: 'premium',
    costPerClip: '~$0.50',
    description: 'Highest quality. Most expensive. Only use once prompts are finalised.',
    supportsAspectRatio: false,
    supportsDuration: false,
    supportsImageInput: true,
    family: 'minimax',
    promptSuffix: 'cinematic, professional ad quality, smooth motion',
  },
];

export const IMAGE_MODELS = [
  {
    id: 'black-forest-labs/flux-1.1-pro',
    name: 'Flux 1.1 Pro',
    costPerImage: '~$0.04',
    description: 'High quality, excellent prompt following.',
  },
  {
    id: 'black-forest-labs/flux-schnell',
    name: 'Flux Schnell',
    costPerImage: '~$0.003',
    description: 'Very fast and cheap. Good for experiments.',
  },
];

export function getPlatformAspectRatio(platform: PlatformId, contentType: ContentType): string {
  if (platform === 'tiktok') return '9:16';
  if (contentType === 'reel' || contentType === 'short' || contentType === 'story') return '9:16';
  if (contentType === 'image_post' && ['instagram', 'facebook'].includes(platform)) return '1:1';
  if (contentType === 'video' && platform === 'youtube') return '16:9';
  if (['instagram', 'facebook'].includes(platform)) return '9:16';
  return '16:9';
}

export function getModelById(id: string): VideoModelDef | undefined {
  return VIDEO_MODELS.find((m) => m.id === id);
}

export const DEFAULT_VIDEO_MODEL = 'prunaai/p-video';
