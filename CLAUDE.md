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
npm run check            # Astro type checking (catches type errors in .astro, .ts, .tsx)
npm run format           # ESLint + Prettier formatting (run before commits)
npm run lint             # Run ESLint only

# Project Scripts
npm run config-i18n      # Interactive CLI wizard to configure i18n (locale folders, config files)
npm run remove-keystatic # Removes Keystatic CMS entirely (moves files, updates config, uninstalls packages)

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
- `src/js/` - Utility functions (blogUtils, translationUtils, localeUtils, cacheHeaders)
- `src/actions/` - Astro server actions (subscribe, resendConfirmation)
- `src/emails/` - React Email components for newsletter templates
- `netlify/functions/` - Serverless functions (social sharing, newsletter)
- `.agents/skills/` - Installed Claude Code skills (resend, react-email, email-best-practices)

**Path Aliases** (configured in tsconfig.json):
- `@components`, `@js`, `@config`, `@layouts`, `@assets`, `@images`

## Key Patterns

**Blog Posts**: Use `getAllPosts()` and `formatPosts()` from `src/js/blogUtils.ts`

**Styling**: Tailwind CSS v4 with CSS variables in `src/styles/`. Dark mode is default.

**i18n**: Infrastructure exists but currently single-language (English). Locale utilities in `src/js/localeUtils.ts`.

**Animations**: AOS (Animate On Scroll) via anime.js. Toggle with `siteSettings.useAnimations`.

**Email Subscriptions**: Double opt-in flow using Supabase OTP for subscriber storage and Resend for transactional emails. Form actions are in `src/actions/index.ts` (`subscribe`, `resendConfirmation`). Users submit email → receive OTP confirmation link → confirmed in Supabase on click.

**UI Components**: Starwind UI component library (accordion, switch, input, label, textarea, alert) configured in `starwind.config.json`. Components live in `src/components/starwind/`.

**Cache Headers**: `src/js/cacheHeaders.ts` provides a `setCacheHeaders()` utility for Netlify CDN caching (1-year CDN durability, always-revalidate for browsers). Used on server-rendered pages like `/subscribe` and `/coming-soon`.

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
- `RESEND_AUDIENCE_ID` - Resend audience ID for newsletter broadcasts (the segment containing all subscribers)

## Auto-Sharing to Social Media and Newsletter

New blog posts are automatically shared to social media and emailed to subscribers via Netlify functions. Each function:

1. Is triggered by Netlify deploy notifications (webhook)
2. Fetches the RSS feed to get the latest post
3. Checks if the post is recent (today or yesterday UTC)
4. Uses Supabase `social_posts` table for deduplication (optional)
5. Posts to the respective platform or sends the newsletter

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

### Newsletter (`netlify/functions/send-newsletter.ts`)

Sends an email to all Resend subscribers when a new post is published. Uses React Email (`src/emails/NewPostEmail.tsx`) to render the HTML template, then creates and sends a Resend Broadcast to the audience.

**Setup Requirements:**
1. Run the Supabase migration to add the `email_sent_at` column:
   ```sql
   ALTER TABLE social_posts ADD COLUMN email_sent_at TIMESTAMPTZ;
   ```
2. Configure environment variables in Netlify:
   - `RESEND_API_KEY` - Already configured
   - `SEND_EMAIL_FROM` - Already configured
   - `RESEND_AUDIENCE_ID` - The Resend audience ID (e.g., `b196b0c9-...`)
3. Add a deploy notification webhook in Netlify pointing to `/.netlify/functions/send-newsletter`

**Testing (sends to a single address, skips recency check and dedup):**
```bash
netlify functions:invoke send-newsletter --payload '{"test_email": "you@example.com"}'
```

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
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
