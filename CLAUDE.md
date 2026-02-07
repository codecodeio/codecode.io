# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

codecode.io is a tech education site built with Astro 5 and the Cosmic Themes Voyager template. It features blog posts, project showcases, and a resume page with Keystatic CMS integration.

## Commands

```bash
# Development
npm run dev              # Start local dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run format           # ESLint + Prettier formatting (run before commits)
npm run lint             # Run ESLint only

# Netlify CLI (use pnpm, not npm)
pnpm install             # Install dependencies for Netlify
netlify dev              # Local dev with Netlify functions
netlify functions:invoke <function-name> --payload '{}'  # Test a function
```

**Note:** Netlify CLI requires pnpm. Always use `pnpm install` instead of `npm install` when working with Netlify functions.

## Architecture

**Stack**: Astro 5 + React 18 + Tailwind CSS 4 + TypeScript + MDX + Supabase

**Content Management**:
- Keystatic CMS provides admin UI at `/keystatic`
- Content stored in `/src/data/` as MD/MDX/JSON files
- Astro Content Collections provide type safety via `/src/content.config.ts`

**Key Directories**:
- `src/pages/` - Route pages (file-based routing)
- `src/components/` - Astro and React components
- `src/layouts/` - Page templates (BaseLayout, BlogLayoutCentered, etc.)
- `src/data/` - Blog posts, authors, projects, resume data
- `src/config/` - Site settings, navigation, translations
- `src/js/` - Utility functions (blogUtils, translationUtils, localeUtils)

**Path Aliases** (configured in tsconfig.json):
- `@components`, `@js`, `@config`, `@layouts`, `@assets`, `@images`

## Key Patterns

**Blog Posts**: Use `getAllPosts()` and `formatPosts()` from `src/js/blogUtils.ts`

**Styling**: Tailwind CSS v4 with CSS variables in `src/styles/`. Dark mode is default.

**i18n**: Infrastructure exists but currently single-language (English). Locale utilities in `src/js/localeUtils.ts`.

**Animations**: AOS (Animate On Scroll) via anime.js. Toggle with `siteSettings.useAnimations`.

**Email Subscriptions**: Double opt-in flow using Supabase for subscriber storage and Resend for transactional emails. Users submit email, receive confirmation link, and are marked confirmed in Supabase upon clicking.

## Branching Strategy

- **`main`**: Site customizations (make all changes here)
- **`theme`**: Clean upstream theme copy (never edit directly)
- **`upstream`**: Points to `Cosmic-Themes/voyager`

To update from theme:
```bash
git fetch upstream
git checkout theme && git merge upstream/main && git push origin theme
git checkout main && git merge theme && git push origin main
```

## Environment Variables

- `RESEND_API_KEY` - Email service for transactional emails
- `SEND_EMAIL_FROM` - Default sender email address
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `SUPABASE_SECRET_KEY` - Supabase secret key (for server-side functions, bypasses RLS)
- `TWITTER_API_KEY` - X/Twitter API consumer key
- `TWITTER_API_SECRET` - X/Twitter API consumer secret
- `TWITTER_ACCESS_TOKEN` - X/Twitter OAuth access token
- `TWITTER_ACCESS_SECRET` - X/Twitter OAuth access token secret
- `BLUESKY_HANDLE` - Bluesky handle (e.g., yourname.bsky.social)
- `BLUESKY_APP_PASSWORD` - Bluesky app-specific password (not your main login password)

## Auto-Sharing to Social Media

New blog posts are automatically shared to social media via Netlify functions. Each function:

1. Is triggered by Netlify deploy notifications (webhook)
2. Fetches the RSS feed to get the latest post
3. Checks if the post is recent (< 10 minutes old)
4. Uses Supabase `social_posts` table for deduplication (optional)
5. Posts to the respective platform

### Bluesky (`netlify/functions/share-to-bluesky.ts`)

**Setup Requirements:**
1. Create a Bluesky account at https://bsky.app
2. Create an App Password: Settings → Privacy and Security → App passwords → Add App Password
3. Configure environment variables in Netlify:
   - `BLUESKY_HANDLE` - Your handle (e.g., yourname.bsky.social)
   - `BLUESKY_APP_PASSWORD` - The app password you created
4. Add a deploy notification webhook in Netlify pointing to `/.netlify/functions/share-to-bluesky`

### X/Twitter (`netlify/functions/share-to-twitter.ts`)

**Setup Requirements:**
- Configure Twitter credentials in Netlify environment variables
- Add a deploy notification webhook in Netlify pointing to `/.netlify/functions/share-to-twitter`

### Supabase Deduplication (Optional)

Create a `social_posts` table in Supabase to prevent duplicate posts:

```sql
CREATE TABLE social_posts (
  id SERIAL PRIMARY KEY,
  post_url TEXT NOT NULL,
  twitter_posted_at TIMESTAMPTZ,
  twitter_post_id TEXT,
  bluesky_posted_at TIMESTAMPTZ,
  bluesky_post_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
