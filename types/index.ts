export type PlatformId =
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'twitter';

export type ContentType =
  | 'video'
  | 'short'
  | 'reel'
  | 'story'
  | 'image_post'
  | 'text_post';

export type ClipType =
  | 'video_clip'
  | 'image'
  | 'voiceover'
  | 'text_overlay'
  | 'caption';

export type ClipStatus = 'pending' | 'generating' | 'done' | 'error';

export type ContentPurpose = 'ad' | 'showcase' | 'tutorial' | 'awareness';

export interface Platform {
  id: PlatformId;
  name: string;
  icon: string;
  tagline: string;
  contentTypes: ContentType[];
}

export interface ContentTypeInfo {
  id: ContentType;
  label: string;
  description: string;
}

export interface UploadedImage {
  name: string;
  dataUrl: string;
  index: number;
}

export interface BlueprintClip {
  id: string;
  type: ClipType;
  label: string;
  prompt: string;
  duration?: number;
  timing?: { start: number; end: number };
  voice?: { accent: string; gender: string };
  sourceImageIndex?: number;
  status: ClipStatus;
  resultUrl?: string;
  resultText?: string;
  error?: string;
}

export interface ContentJob {
  id: string;
  platform: PlatformId;
  contentType: ContentType;
  purpose: ContentPurpose;
  brand: string;
  goal: string;
  uploadedImages: UploadedImage[];
  createdAt: string;
  selectedVideoModel?: string;
  selectedImageModel?: string;
  blueprint?: BlueprintClip[];
  finalOutputUrl?: string;
}
