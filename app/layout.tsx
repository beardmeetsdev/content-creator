import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Content Creator — AI Social Media Studio',
  description: 'Generate platform-ready content for YouTube, TikTok, Instagram, Facebook and more using AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-neutral-950 text-neutral-100 min-h-screen`}>
        <header className="border-b border-neutral-800 px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">🎬</span>
          <a href="/" className="text-lg font-bold tracking-tight hover:text-pink-400 transition-colors">
            Content Creator
          </a>
          <span className="ml-auto">
            <a href="/jobs" className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
              My Jobs →
            </a>
          </span>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
