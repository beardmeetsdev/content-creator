'use client';

import { ContentJob } from '@/types';

const KEY = 'content_jobs';

export function getJobs(): ContentJob[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function getJob(id: string): ContentJob | undefined {
  return getJobs().find((j) => j.id === id);
}

export function saveJob(job: ContentJob): void {
  const jobs = getJobs().filter((j) => j.id !== job.id);
  localStorage.setItem(KEY, JSON.stringify([job, ...jobs]));
}

export function deleteJob(id: string): void {
  const jobs = getJobs().filter((j) => j.id !== id);
  localStorage.setItem(KEY, JSON.stringify(jobs));
}
