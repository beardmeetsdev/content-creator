import { Platform, ContentType, ContentTypeInfo } from '@/types';

export const PLATFORMS: Platform[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '▶️',
    tagline: 'Long-form video & Shorts',
    contentTypes: ['video', 'short'],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    tagline: 'Short-form viral video',
    contentTypes: ['reel'],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    tagline: 'Reels, Stories & image posts',
    contentTypes: ['reel', 'story', 'image_post'],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '👥',
    tagline: 'Video, Stories & image posts',
    contentTypes: ['video', 'story', 'image_post'],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    tagline: 'Professional video, images & text',
    contentTypes: ['video', 'image_post', 'text_post'],
  },
  {
    id: 'twitter',
    name: 'X / Twitter',
    icon: '𝕏',
    tagline: 'Image posts & threads',
    contentTypes: ['image_post', 'text_post'],
  },
];

export const CONTENT_TYPE_INFO: Record<ContentType, ContentTypeInfo> = {
  video: { id: 'video', label: 'Video', description: 'Full video with clips, voiceover and text overlays' },
  short: { id: 'short', label: 'YouTube Short', description: 'Vertical short-form video (≤60 s)' },
  reel: { id: 'reel', label: 'Reel / TikTok', description: 'Vertical short-form video (15–90 s)' },
  story: { id: 'story', label: 'Story', description: 'Full-screen 9:16 image or short clip (≤15 s)' },
  image_post: { id: 'image_post', label: 'Image Post', description: 'AI-generated image with a caption' },
  text_post: { id: 'text_post', label: 'Text Post', description: 'AI-written copy — no media' },
};

export function getPlatform(id: string): Platform | undefined {
  return PLATFORMS.find((p) => p.id === id);
}
