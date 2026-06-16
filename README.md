# Content Creator

AI-powered social media content generator. Works alongside the [Marketing Strategy](https://github.com/beardmeetsdev/marketing-strategy) repo.

## What it does

1. **Pick your platform** — YouTube, TikTok, Instagram, Facebook, LinkedIn or X/Twitter
2. **Choose content type** — Video, Short, Reel, Story, Image Post or Text Post
3. **Describe your brand & goal** — free-text, e.g. *"Star Galaxy Granite worktops — showcase to new kitchen prospects"*
4. **Upload reference images** *(optional)* — product shots the AI can use as source material
5. **Generate Blueprint** — OpenAI designs the full production plan: video clips, voiceover, text overlays, captions
6. **Generate each clip** — Replicate AI generates every media asset
7. **CREATE** — assembles the final content manifest

## Tech stack

- Next.js 16, React 19, TypeScript, Tailwind v4
- OpenAI (or GitHub Models) for blueprint generation
- [Replicate](https://replicate.com) for media generation
  - Video: `minimax/video-01`
  - Images: `black-forest-labs/flux-1.1-pro`
  - Voiceover: `suno-ai/bark`

## Setup

```bash
cp .env.example .env.local
# Fill in OPENAI_API_KEY and REPLICATE_API_TOKEN
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
