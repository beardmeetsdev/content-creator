'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getJobs, deleteJob } from '@/lib/storage';
import { PLATFORMS, CONTENT_TYPE_INFO } from '@/lib/platforms';
import { ContentJob } from '@/types';

export default function JobsPage() {
  const [jobs, setJobs] = useState<ContentJob[]>([]);

  useEffect(() => {
    setJobs(getJobs());
  }, []);

  function handleDelete(id: string) {
    deleteJob(id);
    setJobs(getJobs());
  }

  if (jobs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <div className="text-5xl mb-4">📭</div>
        <h1 className="text-2xl font-bold mb-3">No content jobs yet</h1>
        <p className="text-neutral-400 mb-6">Create your first piece of AI-generated content.</p>
        <Link
          href="/"
          className="inline-block bg-gradient-to-r from-pink-600 to-orange-600 text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
        >
          ＋ New Job
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Content Jobs</h1>
        <Link
          href="/"
          className="bg-gradient-to-r from-pink-600 to-orange-600 text-white font-semibold px-4 py-2 rounded-xl text-sm hover:opacity-90 transition-opacity"
        >
          ＋ New Job
        </Link>
      </div>

      <div className="grid gap-4">
        {jobs.map((job) => {
          const platform = PLATFORMS.find((p) => p.id === job.platform);
          const ctInfo = CONTENT_TYPE_INFO[job.contentType];
          const doneCount = job.blueprint?.filter((c) => c.status === 'done').length ?? 0;
          const totalCount = job.blueprint?.length ?? 0;

          return (
            <div key={job.id} className="bg-neutral-900 border border-neutral-800 hover:border-neutral-600 rounded-2xl p-5 transition-all">
              <div className="flex items-start justify-between gap-4">
                <Link href={`/jobs/${job.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{platform?.icon}</span>
                    <span className="font-bold text-lg truncate">{job.brand}</span>
                    <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">
                      {ctInfo.label}
                    </span>
                  </div>
                  <p className="text-neutral-400 text-sm truncate">{job.goal}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                    <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                    {totalCount > 0 && (
                      <span>{doneCount}/{totalCount} clips generated</span>
                    )}
                    {!job.blueprint && <span className="text-yellow-500">Blueprint pending</span>}
                    {job.finalOutputUrl && <span className="text-green-500">✓ Complete</span>}
                  </div>
                </Link>
                <button
                  onClick={() => handleDelete(job.id)}
                  className="text-neutral-600 hover:text-red-400 transition-colors text-lg leading-none"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
