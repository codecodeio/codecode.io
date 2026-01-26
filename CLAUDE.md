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

# Netlify (for testing serverless functions)
netlify dev              # Local dev with Netlify functions
```

## Architecture

**Stack**: Astro 5 + React 18 + Tailwind CSS 4 + TypeScript + MDX

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

- `RESEND_API_KEY` - Email service for subscriptions
- `SEND_EMAIL_FROM` - Default sender email address
